// 俺流（プレイヤーが作った流派）と俺流の技の表。出典：docs/save_format/chunks/custom-style・belt-copy・sect-scrolls（並び 🟢）。
//
// 俺流の技の表の技（8 B）は、構えごとの技の表（datatable/sect/stance-skill.csv 🟢）から作る：
// 技の番号、初段の印（bit7）と繋がる技の数、技の ID、繋がる技の番号 × 4（使わない分は FF）。
// 繋がる技は「続けて出せる技」のうち、その俺流に入れた技だけ（実セーブの俺流の技の表と一致 🟢）。
//
// 書き込みはすべて 🟢（要ゲーム内確認）。
// 固定オフセットを使い、ファイルサイズ・件数・相互参照を検証する。検証に落ちたら読み取り専用。
import { readI16, readU16, readUtf16Fixed, recordCodec, writeI16, writeU16, writeU8, writeUtf16Fixed } from './binary'
import { type EditOpts, NORMAL_EDIT_OPTS, validateText, type ViewStatus } from './field'
import { assertWritable } from './layout'
import {
  STANCE_COUNT,
  findSkillInfo,
  findStance,
  findStanceSkill,
  skillName,
} from './master/sect-data'
import {
  isUsableInOreRyu,
  SCROLL_STORED_COUNT_OFFSET,
  readSects,
  type ScrollSlot,
  type SectsView,
} from './sects'

import { sectRecordCodec, scrollSlotCodec, validateSectValues, type SectValues, SCROLL_SLOT_BYTES } from './sect-record'

export const CUSTOM_COUNT_OFFSET = 0x1920e
export const CUSTOM_OFFSET = 0x19210
export const CUSTOM_BYTES = 80
export const CUSTOM_SLOTS = 64
export const CUSTOM_NAME_BYTES = 64
/** 🟢 俺流レコードの名前欄（chunks/custom-style）。 */
export const CUSTOM_NAME_REL = 8
/** 🟢 俺流レコードの技の表3つ（chunks/custom-style）。 */
export const CUSTOM_SHEET_RELS = [0x48, 0x4a, 0x4c] as const
/** 1つの俺流に入れられる構え（技の表）の数 🟢 */
export const CUSTOM_STANCE_MAX = CUSTOM_SHEET_RELS.length
const customSheetOffset = (offset: number, index: number) => offset + CUSTOM_SHEET_RELS[index]

export function customNameOffset(base: number): number {
  return base + CUSTOM_NAME_REL
}

export const CUSTOM_SHEET_COUNT_OFFSET = 0x1a610
export const CUSTOM_SHEET_OFFSET = 0x1a612
export const CUSTOM_SHEET_BYTES = 0x408
export const CUSTOM_SHEET_SLOTS = 128
/** 1つの俺流の技の表に入る技の数（(0x408 − 8) / 8）🟢 */
export const CUSTOM_SHEET_SKILL_MAX = 128
/** 1つの技から繋がる技の数の上限 🟢 */
export const LINK_MAX = 4

/** 🟢 主人公が作る俺流の流派 ID・技の表 ID の範囲。生きた証の写しは 2000＋n・4000＋n */
export const PLAYER_STYLE_ID_MIN = 1000
export const PLAYER_STYLE_ID_MAX = 1169
export const PLAYER_SHEET_ID_MIN = 2000
export const PLAYER_SHEET_ID_MAX = 2509
export const LIVE_PROOF_STYLE_ID_MIN = 2000

/** 🟢 名前はゲーム内の入力で 10 文字まで。セーブの枠は 32 文字分（終端を残して 31 文字まで書く） */
export const NAME_MAX = 10
export const NAME_MAX_ADVANCED = 31

/** 🟢 俺流の技の表の先頭 8 B：+0 技の表 ID、+2 種類（2）、+4 構え、+6 技の数 */
const sheetHeaderCodec = recordCodec({
  id: { rel: 0, type: 'i16' },
  type: { rel: 2, type: 'u16' },
  stance: { rel: 4, type: 'i16' },
  count: { rel: 6, type: 'i16' },
})
const SHEET_HEADER_BYTES = 8
/** 🟢 俺流の技の表の種類（+2） */
const CUSTOM_SHEET_TYPE = 2

/** 🟢 俺流の技の表の技（8 B）：+0 技の番号、+1 初段の印（bit7）と繋がる技の数、+2 技の ID、+4〜+7 繋がる技の番号（使わない分は FF） */
const CUSTOM_SKILL_BYTES = 8
const customSkillCodec = recordCodec({
  skillNo: { rel: 0, type: 'u8' },
  flags: { rel: 1, type: 'u8' },
  skillId: { rel: 2, type: 'u16' },
})
const LINKS_REL = 4
const NO_LINK = 0xff
/** 初段の印 🟢 */
const FIRST_BIT = 0x80
const LINK_COUNT_MASK = 0x7f
const customSkillOffset = (sheetOffset: number, j: number) => sheetOffset + SHEET_HEADER_BYTES + CUSTOM_SKILL_BYTES * j

/** 技 1 つを読む。linkCount は書いてある繋がる技の数（LINK_MAX を超えていても、next は LINK_MAX までにする） */
function readCustomSkill(bytes: Uint8Array, at: number): { skill: CustomSkill; linkCount: number } {
  const { skillNo, flags, skillId } = customSkillCodec.read(bytes, at)
  const linkCount = flags & LINK_COUNT_MASK
  const linksAt = at + LINKS_REL
  return {
    skill: {
      skillNo,
      first: (flags & FIRST_BIT) !== 0,
      skillId,
      next: Array.from(bytes.subarray(linksAt, linksAt + Math.min(linkCount, LINK_MAX))),
    },
    linkCount,
  }
}

function writeCustomSkill(bytes: Uint8Array, at: number, s: CustomSkill): void {
  customSkillCodec.writeField(bytes, at, 'skillNo', s.skillNo)
  customSkillCodec.writeField(bytes, at, 'flags', (s.first ? FIRST_BIT : 0) | s.next.length)
  customSkillCodec.writeField(bytes, at, 'skillId', s.skillId)
  for (let k = 0; k < LINK_MAX; k++) writeU8(bytes, at + LINKS_REL + k, s.next[k] ?? NO_LINK)
}

export type CustomSkill = {
  skillNo: number
  first: boolean
  skillId: number
  next: number[]
}

export type CustomSheet = {
  index: number
  offset: number
  id: number
  type: number
  stance: number
  skills: CustomSkill[]
}

export type CustomStyleKind = 'player' | 'live-proof' | 'other'

export type CustomStyle = {
  index: number
  offset: number
  id: number
  kind: CustomStyleKind
  mastery: number
  rank: number
  kills: number
  name: string
  /** +0x48〜+0x4C（−1 はなし） */
  sheetIds: number[]
  /** 流派の書の枠（主人公の俺流だけ） */
  scroll: ScrollSlot | null
  equipped: boolean
}

export type CustomStylesView = ViewStatus & {
  styles: CustomStyle[]
  sheets: CustomSheet[]
  sects: SectsView
}

export const styleKind = (id: number): CustomStyleKind =>
  id >= PLAYER_STYLE_ID_MIN && id <= PLAYER_STYLE_ID_MAX ? 'player' : id >= LIVE_PROOF_STYLE_ID_MIN ? 'live-proof' : 'other'

const styleOffset = (index: number) => CUSTOM_OFFSET + index * CUSTOM_BYTES
const sheetOffset = (index: number) => CUSTOM_SHEET_OFFSET + index * CUSTOM_SHEET_BYTES

function readSheet(bytes: Uint8Array, index: number, problems: string[]): CustomSheet {
  const offset = sheetOffset(index)
  const { id, type, stance, count: n } = sheetHeaderCodec.read(bytes, offset)
  if (type !== CUSTOM_SHEET_TYPE) problems.push('俺流の技の表の種類が正しくありません')
  if (stance < 0 || stance >= STANCE_COUNT) problems.push('俺流の技の表の構えが正しくありません')
  if (n < 0 || n > CUSTOM_SHEET_SKILL_MAX) problems.push('俺流の技の表の技の数が正しくありません')
  const skills: CustomSkill[] = []
  for (let j = 0; j < Math.max(0, Math.min(n, CUSTOM_SHEET_SKILL_MAX)); j++) {
    const { skill, linkCount } = readCustomSkill(bytes, customSkillOffset(offset, j))
    if (linkCount > LINK_MAX) problems.push('俺流の技の表の、続けて出す技の数が多すぎます')
    skills.push(skill)
  }
  const nos = new Set(skills.map((s) => s.skillNo))
  if (skills.some((s) => s.next.some((x) => !nos.has(x)))) problems.push('俺流の技の表に、表にない技へのつながりがあります')
  return { index, offset, id, type, stance, skills }
}

export function readCustomStyles(bytes: Uint8Array): CustomStylesView {
  const sects = readSects(bytes)
  const problems: string[] = sects.problem ? [sects.problem] : []
  const count = readU16(bytes, CUSTOM_COUNT_OFFSET)
  const sheetCount = readU16(bytes, CUSTOM_SHEET_COUNT_OFFSET)
  if (count > CUSTOM_SLOTS) problems.push('俺流の件数が大きすぎます')
  if (sheetCount > CUSTOM_SHEET_SLOTS) problems.push('俺流の技の表の件数が大きすぎます')

  const sheets = Array.from({ length: Math.min(sheetCount, CUSTOM_SHEET_SLOTS) }, (_, i) => readSheet(bytes, i, problems))
  const scrolls = [...sects.held, ...sects.stored]
  const styles: CustomStyle[] = []
  for (let i = 0; i < Math.min(count, CUSTOM_SLOTS); i++) {
    const offset = styleOffset(i)
    const fields = sectRecordCodec.read(bytes, offset)
    const id = fields.id
    const sheetIds = CUSTOM_SHEET_RELS.map((d) => readI16(bytes, offset + d))
    for (const sid of sheetIds) {
      if (sid >= 0 && !sheets.some((s) => s.id === sid)) problems.push('俺流に対応する技の表がありません')
    }
    styles.push({
      index: i,
      offset,
      ...fields,
      kind: styleKind(id),
      name: readUtf16Fixed(bytes, customNameOffset(offset), CUSTOM_NAME_BYTES).text,
      sheetIds,
      scroll: scrolls.find((s) => s.scrollNo < 0 && s.customId === id) ?? null,
      equipped: sects.equipped.includes(id),
    })
  }
  return { warnings: [], problem: problems.length ? [...new Set(problems)].join(' ／ ') : null, styles, sheets, sects }
}

// 書き込み。不正な値は例外にして、バイト列を変えない（呼び出し側は save-context の update で包む）。

function requireEditable(bytes: Uint8Array): CustomStylesView {
  const view = readCustomStyles(bytes)
  if (view.problem) throw new RangeError(view.problem)
  return view
}

function findStyle(view: CustomStylesView, id: number): CustomStyle {
  const s = view.styles.find((x) => x.id === id)
  if (!s) throw new RangeError('その俺流がありません')
  return s
}

/**
 * 俺流に入っている技の表（+0x48〜+0x4C の順）。readCustomStyles が、どの ID にも技の表があることを検証している
 * （ない ID は problem になる）ので、検証に通った view ではすべてそろう。ない ID は飛ばす
 */
export function styleSheets(view: CustomStylesView, style: CustomStyle): CustomSheet[] {
  return style.sheetIds.flatMap((id) => (id < 0 ? [] : view.sheets.filter((s) => s.id === id)))
}

export function validateCustomName(name: string, options: EditOpts = NORMAL_EDIT_OPTS): string | null {
  return validateText(name, options.advanced ? NAME_MAX_ADVANCED : NAME_MAX)
}

function writeName(bytes: Uint8Array, style: Pick<CustomStyle, 'offset' | 'scroll'>, name: string): void {
  writeUtf16Fixed(bytes, customNameOffset(style.offset), CUSTOM_NAME_BYTES, name)
  // 🟢 流派の書の枠に、名前の先頭 10 文字の写しがある
  if (style.scroll) scrollSlotCodec.writeNameCopy(bytes, style.scroll.offset, name)
}

export function writeCustomName(bytes: Uint8Array, id: number, name: string, options: EditOpts = NORMAL_EDIT_OPTS): void {
  assertWritable(bytes)
  const problem = validateCustomName(name, options)
  if (problem) throw new RangeError(problem)
  const view = requireEditable(bytes)
  writeName(bytes, findStyle(view, id), name)
}

export type CustomValues = SectValues
export const validateCustomValues = validateSectValues

export function writeCustomValues(bytes: Uint8Array, id: number, v: CustomValues): void {
  assertWritable(bytes)
  const style = findStyle(requireEditable(bytes), id)
  // 値の検証は codec が書く前に1回だけ行う（validateCustomValues と同じ）
  sectRecordCodec.writeValues(bytes, style.offset, v)
}

/**
 * 1 つの構え（技の表）の中の技の組み方の問題 🟢（ゲームの俺流の画面の判定と同じ規則）。
 * - 初段でない技は、前に出す技（prev）のどれかを入れる
 * - 初段の攻撃技どうしで、コマンドが重ならない
 * - 同じ技から続けて出す技（その技を prev に持つ技）どうしで、コマンドが重ならない（別の技から続く技どうしなら重なってよい）
 * - 防御技は、同じ組のものを 1 つまで
 * - 攻撃技を 1 つ以上入れる
 * byNo は技の番号ごとの問題、sheet は表全体の問題
 */
export type SkillConflicts = { byNo: Map<number, string[]>; sheet: string[] }

export function findSkillConflicts(stance: number, skillNos: readonly number[]): SkillConflicts {
  const set = new Set(skillNos)
  const byNo = new Map<number, string[]>()
  const add = (no: number, text: string) => byNo.set(no, [...(byNo.get(no) ?? []), text])
  const entries = [...set].flatMap((no) => {
    const s = findStanceSkill(stance, no)
    return s ? [{ no, s }] : []
  })
  const info = (no: number) => findSkillInfo(findStanceSkill(stance, no)?.skillId ?? -1)
  const name = (no: number) => skillName(findStanceSkill(stance, no) ?? { nameJa: String(no) })
  const isAttack = (no: number) => (info(no)?.defenseGroup ?? null) === null

  for (const { no, s } of entries) {
    if (!s.first && !s.prev.some((p) => set.has(p))) {
      add(no, `前に出す技（${s.prev.map(name).join('・')}）が入っていません`)
    }
  }
  const sameCommand = (nos: number[], where: string) => {
    const byCmd = new Map<number, number[]>()
    for (const no of nos) {
      const cmd = info(no)?.command ?? 0
      if (cmd === 0) continue
      byCmd.set(cmd, [...(byCmd.get(cmd) ?? []), no])
    }
    for (const [cmd, group] of byCmd) {
      if (group.length < 2) continue
      for (const no of group) {
        const others = group.filter((x) => x !== no).map(name).join('・')
        add(no, `${where}でコマンド（${info(no)?.commandJa || cmd}）が ${others} と重なっています`)
      }
    }
  }
  sameCommand(
    entries.filter(({ no, s }) => s.first && isAttack(no)).map(({ no }) => no),
    '初段',
  )
  for (const parent of set) {
    const children = entries.filter(({ s }) => s.prev.includes(parent)).map(({ no }) => no)
    sameCommand(children, `${name(parent)}の次`)
  }
  const byGroup = new Map<number, number[]>()
  for (const { no } of entries) {
    const g = info(no)?.defenseGroup ?? null
    if (g !== null) byGroup.set(g, [...(byGroup.get(g) ?? []), no])
  }
  for (const group of byGroup.values()) {
    if (group.length < 2) continue
    for (const no of group) add(no, `同じ種類の防御技（${group.filter((x) => x !== no).map(name).join('・')}）と一緒には入れられません`)
  }
  const sheet: string[] = []
  if (entries.length > 0 && !entries.some(({ no }) => isAttack(no))) sheet.push('攻撃技が 1 つもありません')
  return { byNo, sheet }
}

/**
 * 今の選択に、候補の技を問題（findSkillConflicts）が出ない範囲で足せるだけ足す。
 * 候補は攻撃力の高い順に試し、派生元が後から入る技のために、足せる技がなくなるまで繰り返す。
 * 今の選択に問題があっても、それは消さずに残す（足す技だけ判定する）
 */
export function pickWithoutConflicts(stance: number, candidates: readonly number[], current: ReadonlySet<number>): Set<number> {
  const result = new Set(current)
  const attack = (no: number) => findSkillInfo(findStanceSkill(stance, no)?.skillId ?? -1)?.attack ?? 0
  const order = [...candidates].filter((no) => !result.has(no)).sort((a, b) => attack(b) - attack(a) || a - b)
  const before = new Set(findSkillConflicts(stance, [...result]).byNo.keys())
  let added = true
  while (added && result.size < CUSTOM_SHEET_SKILL_MAX) {
    added = false
    for (const no of order) {
      if (result.has(no) || result.size >= CUSTOM_SHEET_SKILL_MAX) continue
      const next = [...result, no]
      const problems = findSkillConflicts(stance, next).byNo
      if ([...problems.keys()].every((x) => before.has(x))) {
        result.add(no)
        added = true
      }
    }
  }
  return result
}

/**
 * 技の選び方の検証。
 * - 通常モード：構えごとの状態が 1 か 2 の技だけ（ゲームの俺流の画面と同じ 🟢）。findSkillConflicts の問題があれば拒否
 * - 上級者モード：構えにある技なら何でも。組み方の問題があっても書ける（画面には出す）
 */
export function validateSkillSelection(
  view: CustomStylesView,
  stance: number,
  skillNos: readonly number[],
  options: EditOpts = NORMAL_EDIT_OPTS,
): string | null {
  if (skillNos.length === 0) return '技が 1 つもありません'
  if (skillNos.length > CUSTOM_SHEET_SKILL_MAX) return `技は ${CUSTOM_SHEET_SKILL_MAX} 個までです`
  const set = new Set(skillNos)
  if (set.size !== skillNos.length) return '同じ技が 2 回入っています'
  for (const no of skillNos) {
    const s = findStanceSkill(stance, no)
    if (!s) return 'この構えにない技が含まれています'
    if (options.advanced) continue
    if (!isUsableInOreRyu(view.sects.stanceStates[stance][no])) {
      return `${s.nameJa || 'この技'} はまだ俺流に入れられません（覚えていないか、斬殺数が足りない技）`
    }
  }
  if (options.advanced) return null
  const conflicts = findSkillConflicts(stance, skillNos)
  const first = [...conflicts.byNo].sort(([a], [b]) => a - b)[0]
  if (first) {
    // 問題の出る技は findSkillConflicts が構えの技の表から引いたものだけなので、名前は必ず引ける
    const s = findStanceSkill(stance, first[0])
    return `${s ? skillName(s) : customSkillLabel(stance, first[0])}：${first[1][0]}`
  }
  return conflicts.sheet[0] ?? null
}

/** 技の番号の集まりから、俺流の技の表の技を作る（番号の小さい順）。構えにない技は拒否する */
export function buildCustomSkills(stance: number, skillNos: readonly number[]): CustomSkill[] {
  const set = new Set(skillNos)
  return [...set]
    .sort((a, b) => a - b)
    .map((no) => {
      const s = findStanceSkill(stance, no)
      if (!s) throw new RangeError('この構えにない技が含まれています')
      return { skillNo: no, first: s.first, skillId: s.skillId, next: s.next.filter((x) => set.has(x)).slice(0, LINK_MAX) }
    })
}

function writeSheetBody(bytes: Uint8Array, offset: number, id: number, stance: number, skills: CustomSkill[]): void {
  bytes.fill(0, offset, offset + CUSTOM_SHEET_BYTES)
  sheetHeaderCodec.writeField(bytes, offset, 'id', id)
  sheetHeaderCodec.writeField(bytes, offset, 'type', CUSTOM_SHEET_TYPE)
  sheetHeaderCodec.writeField(bytes, offset, 'stance', stance)
  sheetHeaderCodec.writeField(bytes, offset, 'count', skills.length)
  skills.forEach((s, j) => writeCustomSkill(bytes, customSkillOffset(offset, j), s))
}

/** 俺流の技の表の技を入れ替える */
export function writeCustomSheetSkills(bytes: Uint8Array, sheetId: number, skillNos: readonly number[], options: EditOpts = NORMAL_EDIT_OPTS): void {
  assertWritable(bytes)
  const view = requireEditable(bytes)
  const sheet = view.sheets.find((s) => s.id === sheetId)
  if (!sheet) throw new RangeError('その構えの技の表がありません')
  const problem = validateSkillSelection(view, sheet.stance, skillNos, options)
  if (problem) throw new RangeError(problem)
  writeSheetBody(bytes, sheet.offset, sheet.id, sheet.stance, buildCustomSkills(sheet.stance, skillNos))
}

function unusedId(min: number, max: number, used: Set<number>): number {
  for (let id = min; id <= max; id++) if (!used.has(id)) return id
  throw new RangeError('俺流を作る空きがありません')
}

/** 技の覚え状況（chunks/skill-states）に残っている ID も避ける（捨てた俺流の状態を引き継がないため 🔶） */
function newSheetId(view: CustomStylesView): number {
  const used = new Set([...view.sheets.map((s) => s.id), ...view.sects.sheetSlots.map((s) => s.sheetId)])
  return unusedId(PLAYER_SHEET_ID_MIN, PLAYER_SHEET_ID_MAX, used)
}

/** 俺流に構え（技の表）を足す。同じ構えの組で、まだ入っていない構えだけ 🟢 */
export function addCustomStance(bytes: Uint8Array, id: number, stance: number, skillNos: readonly number[], options: EditOpts = NORMAL_EDIT_OPTS): void {
  assertWritable(bytes)
  const view = requireEditable(bytes)
  const style = findStyle(view, id)
  const free = style.sheetIds.indexOf(-1)
  if (free < 0) throw new RangeError(`構えは ${CUSTOM_STANCE_MAX} つまでです`)
  const stances = styleSheets(view, style).map((s) => s.stance)
  const slot = findStance(stances[0])?.slot
  if (findStance(stance)?.slot !== slot) throw new RangeError('構えはすべて同じ構えの組にします')
  if (stances.includes(stance)) throw new RangeError('同じ構えがすでに入っています')
  if (view.sheets.length >= CUSTOM_SHEET_SLOTS) throw new RangeError('俺流の技の表に空きがありません')
  const problem = validateSkillSelection(view, stance, skillNos, options)
  if (problem) throw new RangeError(problem)
  const sheetId = newSheetId(view)
  writeSheetBody(bytes, sheetOffset(view.sheets.length), sheetId, stance, buildCustomSkills(stance, skillNos))
  writeU16(bytes, CUSTOM_SHEET_COUNT_OFFSET, view.sheets.length + 1)
  writeI16(bytes, customSheetOffset(style.offset, free), sheetId)
}

/**
 * count 件ある俺流の技の表から index 番目を消して、後ろの表を前に詰める。
 * 消したあと index より後ろの表は 1 つ前にずれるので、複数消すときは index の大きい順に呼ぶ（removeSheetsAt）
 */
function removeSheetAt(bytes: Uint8Array, count: number, index: number): void {
  const last = count - 1
  bytes.copyWithin(sheetOffset(index), sheetOffset(index + 1), sheetOffset(last + 1))
  bytes.fill(0, sheetOffset(last), sheetOffset(last + 1))
  writeU16(bytes, CUSTOM_SHEET_COUNT_OFFSET, last)
}

/** view の俺流の技の表のうち、sheetIds の表を消して詰める。後ろの表から消すので、view の index は消し終わるまで正しい */
function removeSheets(bytes: Uint8Array, view: CustomStylesView, sheetIds: readonly number[]): void {
  const indexes = view.sheets.filter((s) => sheetIds.includes(s.id)).map((s) => s.index).sort((a, b) => b - a)
  indexes.forEach((index, k) => removeSheetAt(bytes, view.sheets.length - k, index))
}

/** 俺流から構えを外す（最後の 1 つは外せない） */
export function removeCustomStance(bytes: Uint8Array, id: number, sheetId: number): void {
  assertWritable(bytes)
  const view = requireEditable(bytes)
  const style = findStyle(view, id)
  const ids = style.sheetIds.filter((s) => s >= 0)
  if (!ids.includes(sheetId)) throw new RangeError('この俺流にその構えはありません')
  if (ids.length === 1) throw new RangeError('最後の構えは外せません')
  const rest = ids.filter((s) => s !== sheetId)
  CUSTOM_SHEET_RELS.forEach((_, k) => writeI16(bytes, customSheetOffset(style.offset, k), rest[k] ?? -1))
  removeSheets(bytes, view, [sheetId])
}

/** 流派の書の空き：持ち歩きの最初の空き、なければ箪笥の末尾（🟢 ゲームが作った俺流を入れる順） */
function freeScroll(view: SectsView): ScrollSlot {
  const held = view.held.find((s) => s.empty)
  if (held) return held
  if (view.storedCount >= view.stored.length) throw new RangeError('流派の書の持ち歩き・箪笥に空きがありません')
  return view.stored[view.storedCount]
}

export type NewCustomStyle = { name: string; stance: number; skillNos: readonly number[] }

/**
 * 俺流を新しく作る 🟢（要ゲーム内確認）。ゲームと同じく、流派 ID・技の表 ID は空いている最小の番号、
 * 流派の書は持ち歩きの最初の空き（なければ箪笥）に入れる。白紙目録は使わない。作った流派 ID を返す
 */
export function createCustomStyle(bytes: Uint8Array, spec: NewCustomStyle, options: EditOpts = NORMAL_EDIT_OPTS): number {
  assertWritable(bytes)
  const view = requireEditable(bytes)
  const nameProblem = validateCustomName(spec.name, options)
  if (nameProblem) throw new RangeError(nameProblem)
  if (view.styles.length >= CUSTOM_SLOTS) throw new RangeError('俺流に空きがありません')
  if (view.sheets.length >= CUSTOM_SHEET_SLOTS) throw new RangeError('俺流の技の表に空きがありません')
  const selection = validateSkillSelection(view, spec.stance, spec.skillNos, options)
  if (selection) throw new RangeError(selection)
  const scroll = freeScroll(view.sects)

  const usedStyleIds = new Set([...view.styles.map((s) => s.id), ...[...view.sects.held, ...view.sects.stored].map((s) => s.customId)])
  const id = unusedId(PLAYER_STYLE_ID_MIN, PLAYER_STYLE_ID_MAX, usedStyleIds)
  const sheetId = newSheetId(view)

  writeSheetBody(bytes, sheetOffset(view.sheets.length), sheetId, spec.stance, buildCustomSkills(spec.stance, spec.skillNos))
  writeU16(bytes, CUSTOM_SHEET_COUNT_OFFSET, view.sheets.length + 1)

  const offset = styleOffset(view.styles.length)
  bytes.fill(0, offset, offset + CUSTOM_BYTES)
  writeI16(bytes, offset, id)
  CUSTOM_SHEET_RELS.forEach((rel, index) => writeI16(bytes, offset + rel, index === 0 ? sheetId : -1))
  writeU16(bytes, CUSTOM_COUNT_OFFSET, view.styles.length + 1)

  scrollSlotCodec.writeCustom(bytes, scroll.offset, id)
  if (scroll.place === 'stored') writeU16(bytes, SCROLL_STORED_COUNT_OFFSET, view.sects.storedCount + 1)

  writeName(bytes, { offset, scroll }, spec.name)
  return id
}

/** 流派の書の枠を空きにし、後ろを前に詰める（ゲームが捨てたあとと同じ 🟢） */
function removeScroll(bytes: Uint8Array, view: SectsView, scroll: ScrollSlot): void {
  const list = scroll.place === 'held' ? view.held : view.stored
  const used = scroll.place === 'held' ? list.length : view.storedCount
  const start = list[0].offset
  const end = start + used * SCROLL_SLOT_BYTES
  bytes.copyWithin(scroll.offset, scroll.offset + SCROLL_SLOT_BYTES, end)
  const lastOffset = end - SCROLL_SLOT_BYTES
  scrollSlotCodec.clear(bytes, lastOffset)
  if (scroll.place === 'stored') writeU16(bytes, SCROLL_STORED_COUNT_OFFSET, view.storedCount - 1)
}

/** 俺流を消す（ゲームで捨てたときと同じく、俺流・技の表・流派の書を消す 🟢）。装備中は消せない */
export function deleteCustomStyle(bytes: Uint8Array, id: number, options: EditOpts = NORMAL_EDIT_OPTS): void {
  assertWritable(bytes)
  const view = requireEditable(bytes)
  const style = findStyle(view, id)
  if (style.equipped) throw new RangeError('装備している俺流は消せません')
  if (style.kind !== 'player' && !options.advanced) throw new RangeError('生きた証の写しは上級者モードでだけ消せます')
  if (style.scroll) removeScroll(bytes, view.sects, style.scroll)
  removeSheets(bytes, view, style.sheetIds.filter((s) => s >= 0))
  const last = view.styles.length - 1
  bytes.copyWithin(styleOffset(style.index), styleOffset(style.index + 1), styleOffset(last + 1))
  bytes.fill(0, styleOffset(last), styleOffset(last + 1))
  writeU16(bytes, CUSTOM_COUNT_OFFSET, last)
}

/** 技の番号の名前（構えの技の表から） */
export function customSkillLabel(stance: number, skillNo: number): string {
  const s = findStanceSkill(stance, skillNo)
  return s ? s.nameJa || `（名前なし ${skillNo}）` : `技 ${skillNo}`
}

/**
 * 🟢 構えを足した直後に入れておく技（あとで選び直す）。states はその構えの技の状態（番号順）。
 * 初段の技のうち、俺流に入れられるもの（上級者モードでは状態を問わない）を選ぶ
 */
export function initialStanceSkills(states: readonly number[], stance: number, { advanced }: EditOpts): number[] {
  return states.flatMap((state, no) =>
    (advanced || isUsableInOreRyu(state)) && findStanceSkill(stance, no)?.first ? [no] : [],
  )
}
