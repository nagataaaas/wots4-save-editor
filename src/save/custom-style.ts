// 俺流（プレイヤーが作った流派）と俺流の技の表。出典：docs/save_format/chunks/custom-style・belt-copy・sect-scrolls（並び 🟢）。
//
// 俺流の技の表の技（8 B）は、構えごとの技の表（datatable/sect/stance-skill.csv 🟢）から作る：
// 技の番号、初段の印（bit7）と繋がる技の数、技の ID、繋がる技の番号 × 4（使わない分は FF）。
// 繋がる技は「続けて出せる技」のうち、その俺流に入れた技だけ（実セーブの俺流の技の表と一致 🟢）。
//
// 書き込みはすべて 🟢（要ゲーム内確認）。
// 固定オフセットを使い、ファイルサイズ・件数・相互参照を検証する。検証に落ちたら読み取り専用。
import { readI16, readU16, readUtf16Fixed, writeI16, writeU16, writeU8 } from './binary'
import { type EditOpts, NORMAL_EDIT_OPTS, type ViewStatus } from './field'
import { assertWritable } from './layout'
import {
  SKILL_NO_COUNT,
  STANCE_COUNT,
  findSkillInfo,
  findStance,
  findStanceSkill,
  skillName,
  type StanceSkill,
} from './master/sect-data'
import {
  I16_MAX,
  isUsableInOreRyu,
  MASTERY_MAX,
  RANK_MAX,
  SCROLL_STORED_COUNT_OFFSET,
  readSects,
  sectValueOffset,
  type ScrollSlot,
  type SectsView,
} from './sects'

export const CUSTOM_COUNT_OFFSET = 0x1920e
export const CUSTOM_OFFSET = 0x19210
export const CUSTOM_BYTES = 80
export const CUSTOM_SLOTS = 64
export const CUSTOM_NAME_BYTES = 64
/** 🟢 俺流レコードの名前欄（chunks/custom-style）。 */
export const CUSTOM_NAME_REL = 8

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
/** 🟢 流派の書の +0x04〜+0x17 にある名前の写し（10 文字） */
const SCROLL_NAME_OFFSET = 4
const SCROLL_NAME_CHARS = 10

/** 初段の印 🟢 */
const FIRST_BIT = 0x80

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
  const id = readI16(bytes, offset)
  const type = readU16(bytes, offset + 2)
  const stance = readI16(bytes, offset + 4)
  const n = readI16(bytes, offset + 6)
  if (type !== 2) problems.push('俺流の技の表の種類が正しくありません')
  if (stance < 0 || stance >= STANCE_COUNT) problems.push('俺流の技の表の構えが正しくありません')
  if (n < 0 || n > CUSTOM_SHEET_SKILL_MAX) problems.push('俺流の技の表の技の数が正しくありません')
  const skills: CustomSkill[] = []
  for (let j = 0; j < Math.max(0, Math.min(n, CUSTOM_SHEET_SKILL_MAX)); j++) {
    const at = offset + 8 + 8 * j
    const flags = bytes[at + 1]
    const linkCount = flags & 0x7f
    if (linkCount > LINK_MAX) problems.push('俺流の技の表の、続けて出す技の数が多すぎます')
    skills.push({
      skillNo: bytes[at],
      first: (flags & FIRST_BIT) !== 0,
      skillId: readU16(bytes, at + 2),
      next: Array.from(bytes.subarray(at + 4, at + 4 + Math.min(linkCount, LINK_MAX))),
    })
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
    const id = readI16(bytes, offset)
    const sheetIds = [0x48, 0x4a, 0x4c].map((d) => readI16(bytes, offset + d))
    for (const sid of sheetIds) {
      if (sid >= 0 && !sheets.some((s) => s.id === sid)) problems.push('俺流に対応する技の表がありません')
    }
    styles.push({
      index: i,
      offset,
      id,
      kind: styleKind(id),
      mastery: readI16(bytes, sectValueOffset(offset, 'mastery')),
      rank: readI16(bytes, sectValueOffset(offset, 'rank')),
      kills: readI16(bytes, sectValueOffset(offset, 'kills')),
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

export function validateCustomName(name: string, options: EditOpts = NORMAL_EDIT_OPTS): string | null {
  const max = options.advanced ? NAME_MAX_ADVANCED : NAME_MAX
  if (name.length === 0) return '名前が空です'
  if (name.length > max) return `名前は${max}文字までです`
  for (let i = 0; i < name.length; i++) if (name.charCodeAt(i) < 0x20) return '制御文字は使えません'
  return null
}

function writeName(bytes: Uint8Array, style: CustomStyle, name: string): void {
  for (let i = 0; i < CUSTOM_NAME_BYTES / 2; i++) writeU16(bytes, customNameOffset(style.offset) + 2 * i, i < name.length ? name.charCodeAt(i) : 0)
  // 🟢 流派の書の枠に、名前の先頭 10 文字の写しがある
  if (style.scroll) {
    for (let i = 0; i < SCROLL_NAME_CHARS; i++) {
      writeU16(bytes, style.scroll.offset + SCROLL_NAME_OFFSET + 2 * i, i < name.length ? name.charCodeAt(i) : 0)
    }
  }
}

export function writeCustomName(bytes: Uint8Array, id: number, name: string, options: EditOpts = NORMAL_EDIT_OPTS): void {
  assertWritable(bytes)
  const problem = validateCustomName(name, options)
  if (problem) throw new RangeError(problem)
  const view = requireEditable(bytes)
  writeName(bytes, findStyle(view, id), name)
}

export type CustomValues = { mastery: number; rank: number; kills: number }

export function validateCustomValues(v: CustomValues): string | null {
  if (!Number.isInteger(v.mastery) || v.mastery < 0 || v.mastery > MASTERY_MAX) return `修練度は 0〜${MASTERY_MAX} です`
  if (!Number.isInteger(v.rank) || v.rank < 0 || v.rank > RANK_MAX) return '段が正しくありません'
  if (!Number.isInteger(v.kills) || v.kills < 0 || v.kills > I16_MAX) return `倒した数は 0〜${I16_MAX} です`
  return null
}

export function writeCustomValues(bytes: Uint8Array, id: number, v: CustomValues): void {
  assertWritable(bytes)
  const problem = validateCustomValues(v)
  if (problem) throw new RangeError(problem)
  const style = findStyle(requireEditable(bytes), id)
  writeI16(bytes, sectValueOffset(style.offset, 'mastery'), v.mastery)
  writeI16(bytes, sectValueOffset(style.offset, 'rank'), v.rank)
  writeI16(bytes, sectValueOffset(style.offset, 'kills'), v.kills)
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
  const entries = [...set].map((no) => ({ no, s: findStanceSkill(stance, no) })).filter((e) => e.s)
  const info = (no: number) => findSkillInfo(findStanceSkill(stance, no)?.skillId ?? -1)
  const name = (no: number) => skillName(findStanceSkill(stance, no) ?? { nameJa: String(no) })
  const isAttack = (no: number) => (info(no)?.defenseGroup ?? null) === null

  for (const { no, s } of entries) {
    if (!s!.first && !s!.prev.some((p) => set.has(p))) {
      add(no, `前に出す技（${s!.prev.map(name).join('・')}）が入っていません`)
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
    entries.filter(({ no, s }) => s!.first && isAttack(no)).map(({ no }) => no),
    '初段',
  )
  for (const parent of set) {
    const children = entries.filter(({ s }) => s!.prev.includes(parent)).map(({ no }) => no)
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
    const state = view.sects.stanceStates[stance][no]
    if (state !== 1 && state !== 2) return `${s.nameJa || 'この技'} はまだ俺流に入れられません（覚えていないか、斬殺数が足りない技）`
  }
  if (options.advanced) return null
  const conflicts = findSkillConflicts(stance, skillNos)
  const first = [...conflicts.byNo].sort(([a], [b]) => a - b)[0]
  if (first) return `${skillName(findStanceSkill(stance, first[0])!)}：${first[1][0]}`
  return conflicts.sheet[0] ?? null
}

/** 技の番号の集まりから、俺流の技の表の技を作る（番号の小さい順） */
export function buildCustomSkills(stance: number, skillNos: readonly number[]): CustomSkill[] {
  const set = new Set(skillNos)
  return [...set]
    .sort((a, b) => a - b)
    .map((no) => {
      const s = findStanceSkill(stance, no) as StanceSkill
      return { skillNo: no, first: s.first, skillId: s.skillId, next: s.next.filter((x) => set.has(x)).slice(0, LINK_MAX) }
    })
}

function writeSheetBody(bytes: Uint8Array, offset: number, id: number, stance: number, skills: CustomSkill[]): void {
  bytes.fill(0, offset, offset + CUSTOM_SHEET_BYTES)
  writeI16(bytes, offset, id)
  writeU16(bytes, offset + 2, 2)
  writeI16(bytes, offset + 4, stance)
  writeI16(bytes, offset + 6, skills.length)
  skills.forEach((s, j) => {
    const at = offset + 8 + 8 * j
    writeU8(bytes, at, s.skillNo)
    writeU8(bytes, at + 1, (s.first ? FIRST_BIT : 0) | s.next.length)
    writeU16(bytes, at + 2, s.skillId)
    for (let k = 0; k < LINK_MAX; k++) writeU8(bytes, at + 4 + k, s.next[k] ?? 0xff)
  })
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
  if (free < 0) throw new RangeError('構えは 3 つまでです')
  const stances = style.sheetIds.filter((s) => s >= 0).map((sid) => view.sheets.find((x) => x.id === sid)!.stance)
  const slot = findStance(stances[0])?.slot
  if (findStance(stance)?.slot !== slot) throw new RangeError('構えはすべて同じ構えの組にします')
  if (stances.includes(stance)) throw new RangeError('同じ構えがすでに入っています')
  if (view.sheets.length >= CUSTOM_SHEET_SLOTS) throw new RangeError('俺流の技の表に空きがありません')
  const problem = validateSkillSelection(view, stance, skillNos, options)
  if (problem) throw new RangeError(problem)
  const sheetId = newSheetId(view)
  writeSheetBody(bytes, sheetOffset(view.sheets.length), sheetId, stance, buildCustomSkills(stance, skillNos))
  writeU16(bytes, CUSTOM_SHEET_COUNT_OFFSET, view.sheets.length + 1)
  writeI16(bytes, style.offset + 0x48 + 2 * free, sheetId)
}

/** 俺流の技の表を消して、後ろの表を前に詰める */
function removeSheet(bytes: Uint8Array, view: CustomStylesView, sheetId: number): void {
  const sheet = view.sheets.find((s) => s.id === sheetId)
  if (!sheet) return
  const last = view.sheets.length - 1
  bytes.copyWithin(sheetOffset(sheet.index), sheetOffset(sheet.index + 1), sheetOffset(last + 1))
  bytes.fill(0, sheetOffset(last), sheetOffset(last + 1))
  writeU16(bytes, CUSTOM_SHEET_COUNT_OFFSET, last)
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
  ;[0, 1, 2].forEach((k) => writeI16(bytes, style.offset + 0x48 + 2 * k, rest[k] ?? -1))
  removeSheet(bytes, view, sheetId)
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
  writeI16(bytes, offset + 0x48, sheetId)
  writeI16(bytes, offset + 0x4a, -1)
  writeI16(bytes, offset + 0x4c, -1)
  writeU16(bytes, CUSTOM_COUNT_OFFSET, view.styles.length + 1)

  bytes.fill(0, scroll.offset, scroll.offset + 24)
  writeI16(bytes, scroll.offset, -1)
  writeI16(bytes, scroll.offset + 2, id)
  if (scroll.place === 'stored') writeU16(bytes, SCROLL_STORED_COUNT_OFFSET, view.sects.storedCount + 1)

  const style: CustomStyle = { ...findStyle(readCustomStyles(bytes), id) }
  writeName(bytes, style, spec.name)
  return id
}

/** 流派の書の枠を空きにし、後ろを前に詰める（ゲームが捨てたあとと同じ 🟢） */
function removeScroll(bytes: Uint8Array, view: SectsView, scroll: ScrollSlot): void {
  const list = scroll.place === 'held' ? view.held : view.stored
  const used = scroll.place === 'held' ? list.length : view.storedCount
  const start = list[0].offset
  const end = start + used * 24
  bytes.copyWithin(scroll.offset, scroll.offset + 24, end)
  const lastOffset = end - 24
  bytes.fill(0, lastOffset, lastOffset + 24)
  writeI16(bytes, lastOffset, -1)
  writeI16(bytes, lastOffset + 2, -1)
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
  for (const sid of style.sheetIds.filter((s) => s >= 0)) removeSheet(bytes, readCustomStyles(bytes), sid)
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

export { SKILL_NO_COUNT }

/**
 * 🟢 構えを足した直後に入れておく技（あとで選び直す）。states はその構えの技の状態（番号順）。
 * 初段の技のうち、俺流に入れられるもの（上級者モードでは状態を問わない）を選ぶ
 */
export function initialStanceSkills(states: readonly number[], stance: number, { advanced }: EditOpts): number[] {
  return states.flatMap((state, no) =>
    (advanced || isUsableInOreRyu(state)) && findStanceSkill(stance, no)?.first ? [no] : [],
  )
}
