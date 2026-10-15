// 流派・技の覚え状況。出典：docs/save_format/chunks/styles・sect-scrolls・skill-states（並びは 🟢）、
// datatable/sect/*.csv（流派・技の表 🟢）。
//
// 技の状態（1＝覚えた、2＝派生先を覚えた派生元）の書き込みは、ゲームで読めて技の表・戦闘・俺流の画面に
// 反映されることを確かめた（✅ [U] 2026-10-09。docs/save_format/chunks/skill-states/reserch）。
// 修練度・段・倒した数の書き込みは 🟢（要ゲーム内確認）。
//
// 固定オフセットを使い、ファイルサイズと各値の範囲を検証する。検証に落ちたら読み取り専用。
import { tr } from '@/lib/i18n'
import { readI16, readU16, recordCodec, writeU16, writeU8 } from './binary'
import { type EditOpts, NORMAL_EDIT_OPTS, validateRange, type ViewStatus } from './field'
import { assertWritable, checkLayout } from './layout'
import {
  SECTS,
  SKILL_NO_COUNT,
  SKILL_SHEETS,
  SLOT_COUNT,
  STANCE_COUNT,
  findSect,
  findSectByScroll,
  findSkillSheet,
  type Sect,
  type SheetSkill,
  type SkillSheet,
} from './master/sect-data'
import { uniqueSkillSects } from './unique-weapons'
import { sectRecordCodec, scrollSlotCodec, type SectValues, SCROLL_SLOT_BYTES } from './sect-record'

// 技の覚え状況 🟢（chunks/skill-states）
export const SHEET_STATES_OFFSET = 0x1417c
export const SHEET_STATE_BYTES = 0x84
export const SHEET_STATE_SLOTS = 128
/** 🟢 技の覚え状況の枠：+0 技の表 ID（i16、−1 は空き）、+2 状態が 0 でない技の数（u16）、+4〜 技の番号ごとの状態（u8 × 128） */
const sheetSlotFields = recordCodec({
  sheetId: { rel: 0, type: 'i16' },
  count: { rel: 2, type: 'u16' },
})
const SHEET_STATES_REL = 4
export const STANCE_STATES_OFFSET = 0x1837c
export function stanceStateOffset(stance: number, skillNo: number): number {
  if (!Number.isInteger(stance) || stance < 0 || stance >= STANCE_COUNT || !Number.isInteger(skillNo) || skillNo < 0 || skillNo >= SKILL_NO_COUNT) throw new RangeError(tr({ ja: '構えの技が範囲外です', en: 'Stance move is out of range' }))
  return STANCE_STATES_OFFSET + stance * SKILL_NO_COUNT + skillNo
}
/** 構えごとの状態の終わり（この位置は含まない） */
export const STANCE_STATES_END = STANCE_STATES_OFFSET + STANCE_COUNT * SKILL_NO_COUNT

// 流派 🟢（chunks/styles）
export const LEARNED_COUNT_OFFSET = 0x189fc
export const SKILL_POINTS_OFFSET = 0x189fe
export const EQUIP_OFFSET = 0x18a00
export const SECT_COUNT_OFFSET = 0x18a0c
export const SECT_RECORDS_OFFSET = 0x18a0e
export const SECT_RECORD_BYTES = 16
export const SECT_RECORD_SLOTS = 128
/** 流派の表の終わり（この位置は含まない） */
export const SECT_RECORDS_END = SECT_RECORDS_OFFSET + SECT_RECORD_SLOTS * SECT_RECORD_BYTES

// 流派の書 🟢（chunks/sect-scrolls）
export const SCROLL_HELD_OFFSET = 0x48cc
export const SCROLL_HELD_SLOTS = 20
export const SCROLL_STORED_OFFSET = 0x4aac
export const SCROLL_STORED_SLOTS = 150
export const SCROLL_STORED_COUNT_OFFSET = 0x58bc
/** 流派の書の終わり（箪笥の件数 u16 まで。この位置は含まない） */
export const SCROLLS_END = SCROLL_STORED_COUNT_OFFSET + 2

/** 技の状態 🟢。0＝覚えていない、1＝覚えた、2＝派生先を覚えた（派生元）、3＝覚えたがまだ俺流に組み込めない */
export const SKILL_STATE = {
  notLearned: 0,
  learned: 1,
  learnedParent: 2,
  notInOreRyu: 3,
} as const
export type SkillState = (typeof SKILL_STATE)[keyof typeof SKILL_STATE]
const SKILL_STATE_MAX = SKILL_STATE.notInOreRyu

/** 覚えている（状態 1・2・3）か 🟢 */
export const isLearned = (state: number): boolean => state !== SKILL_STATE.notLearned
/** nos のうち、states で覚えている技の数 */
export const countLearned = (states: readonly number[], nos: readonly number[]): number =>
  nos.filter((no) => isLearned(states[no])).length

/** 武器・技の斬殺数で覚える特別な技の習得条件 🟢（「今 装備している武器で100人惨殺する」など） */
export const isSpecialCond = (cond: number): boolean => cond >= 51 && cond <= 56

export type ScrollSlot = {
  /** 'held' 持ち歩き、'stored' 道場の箪笥 */
  place: 'held' | 'stored'
  index: number
  offset: number
  /** 流派の書の番号（+0x00）。−1 は俺流か空き */
  scrollNo: number
  /** 俺流の流派 ID（+0x02）。−1 は空き */
  customId: number
  /** 通常の流派の書なら、その流派 */
  sect: Sect | null
  empty: boolean
}

export type SectRecord = {
  index: number
  offset: number
  id: number
  mastery: number
  rank: number
  kills: number
  sect: Sect | null
}

export type SheetStateSlot = {
  index: number
  offset: number
  sheetId: number
  /** +0x02 状態が 0 でない技の数 */
  count: number
  states: number[]
}

export type SectsView = ViewStatus & {
  learnedCount: number
  skillPoints: number
  /** 構えの組 0〜5 に装備している流派 ID */
  equipped: number[]
  held: ScrollSlot[]
  stored: ScrollSlot[]
  storedCount: number
  records: SectRecord[]
  sheetSlots: SheetStateSlot[]
  /** 構えごとの状態 [構え][技の番号] */
  stanceStates: number[][]
}

function readScroll(bytes: Uint8Array, place: 'held' | 'stored', index: number): ScrollSlot {
  const base = place === 'held' ? SCROLL_HELD_OFFSET : SCROLL_STORED_OFFSET
  const offset = base + index * SCROLL_SLOT_BYTES
  const { scrollNo, customId } = scrollSlotCodec.read(bytes, offset)
  return {
    place,
    index,
    offset,
    scrollNo,
    customId,
    sect: scrollNo >= 0 ? (findSectByScroll(scrollNo) ?? null) : null,
    empty: scrollNo < 0 && customId < 0,
  }
}

export function sheetStateOffset(index: number): number {
  return SHEET_STATES_OFFSET + index * SHEET_STATE_BYTES
}

function readSheetSlot(bytes: Uint8Array, index: number): SheetStateSlot {
  const offset = sheetStateOffset(index)
  const statesAt = offset + SHEET_STATES_REL
  return {
    index,
    offset,
    ...sheetSlotFields.read(bytes, offset),
    states: Array.from(bytes.subarray(statesAt, statesAt + SKILL_NO_COUNT)),
  }
}

const readSheetSlots = (bytes: Uint8Array): SheetStateSlot[] =>
  Array.from({ length: SHEET_STATE_SLOTS }, (_, i) => readSheetSlot(bytes, i))

export function readSects(bytes: Uint8Array): SectsView {
  if (bytes.byteLength < SECT_RECORDS_END) {
    throw new RangeError(tr({ ja: 'ファイルが小さすぎて流派を読めません', en: 'The file is too small to read styles' }))
  }
  const problems: string[] = []
  const layout = checkLayout(bytes)
  if (layout) problems.push(layout)

  const sectCount = readU16(bytes, SECT_COUNT_OFFSET)
  if (sectCount > SECT_RECORD_SLOTS) problems.push(tr({ ja: '流派の件数が大きすぎます', en: 'Too many styles' }))
  const records: SectRecord[] = []
  for (let i = 0; i < Math.min(sectCount, SECT_RECORD_SLOTS); i++) {
    const offset = SECT_RECORDS_OFFSET + i * SECT_RECORD_BYTES
    const fields = sectRecordCodec.read(bytes, offset)
    const sect = findSect(fields.id) ?? null
    if (!sect) problems.push(tr({ ja: '流派の表に知らない流派があります', en: 'The style list contains an unknown style' }))
    records.push({ index: i, offset, ...fields, sect })
  }

  const held = Array.from({ length: SCROLL_HELD_SLOTS }, (_, i) => readScroll(bytes, 'held', i))
  const stored = Array.from({ length: SCROLL_STORED_SLOTS }, (_, i) => readScroll(bytes, 'stored', i))
  const storedCount = readU16(bytes, SCROLL_STORED_COUNT_OFFSET)
  if (storedCount > SCROLL_STORED_SLOTS) problems.push(tr({ ja: '流派の箪笥の件数が大きすぎます', en: 'Too many styles in the chest' }))

  const sheetSlots = readSheetSlots(bytes)
  if (sheetSlots.some((s) => s.states.some((v) => v > SKILL_STATE_MAX))) problems.push(tr({ ja: '技の覚え状況に不明な値があります', en: 'Move learning status contains an unknown value' }))
  const stanceStates = Array.from({ length: STANCE_COUNT }, (_, c) =>
    Array.from(bytes.subarray(stanceStateOffset(c, 0), stanceStateOffset(c, 0) + SKILL_NO_COUNT)),
  )

  return {
    warnings: [],
    problem: problems.length ? [...new Set(problems)].join(' ／ ') : null,
    learnedCount: readU16(bytes, LEARNED_COUNT_OFFSET),
    skillPoints: readU16(bytes, SKILL_POINTS_OFFSET),
    equipped: Array.from({ length: SLOT_COUNT }, (_, s) => readI16(bytes, EQUIP_OFFSET + 2 * s)),
    held,
    stored,
    storedCount,
    records,
    sheetSlots,
    stanceStates,
  }
}

/** 主人公が持っている通常の流派の ID（装備中・持ち歩き・箪笥）。俺流は含まない */
export function ownedSectIds(view: SectsView): Set<number> {
  const ids = new Set<number>()
  for (const id of view.equipped) if (findSect(id)) ids.add(id)
  for (const s of [...view.held, ...view.stored]) if (s.sect) ids.add(s.sect.id)
  return ids
}

const NO_STATES: readonly number[] = new Array<number>(SKILL_NO_COUNT).fill(SKILL_STATE.notLearned)

function statesOf(slots: readonly SheetStateSlot[], sheetId: number): number[] {
  return [...(slots.find((s) => s.sheetId === sheetId)?.states ?? NO_STATES)]
}

/** 技の表の状態（覚えていない技は 0）。その技の表の枠がなければすべて 0 */
export function sheetStates(view: SectsView, sheetId: number): number[] {
  return statesOf(view.sheetSlots, sheetId)
}

// 書き込み。不正な値は例外にして、バイト列を変えない。
//
// 公開の関数は requireEditable で1回だけ検証し、中の apply* に渡す。apply* は検証済みのバイト列に書き、
// 技の表ごとの状態は毎回バイト列から読み直す（前の apply* が割り当てた枠や書いた状態を、次の apply* が見る）。

function requireEditable(bytes: Uint8Array): SectsView {
  const view = readSects(bytes)
  if (view.problem) throw new RangeError(view.problem)
  return view
}

function requireSheet(sheetId: number): SkillSheet {
  const sheet = findSkillSheet(sheetId)
  if (!sheet) throw new RangeError(tr({ ja: '知らない技の表です', en: 'Unknown move list' }))
  return sheet
}

/**
 * ゲームが状態を書くときの規則 🟢：今が 0 なら書く。今が 3 で新しい値が 1 なら書く。新しい値が 2 なら必ず書く。
 * それ以外は書かない（1 → 3 には戻らない）。
 */
export function nextState(current: number, value: SkillState): number {
  if (
    current === SKILL_STATE.notLearned ||
    value === SKILL_STATE.learnedParent ||
    (current === SKILL_STATE.notInOreRyu && value === SKILL_STATE.learned)
  ) {
    return value
  }
  return current
}

/** 技の表の枠。なければ先頭の空き枠を割り当てて（状態はすべて 0）、書いたあとの枠を返す */
function ensureSheetSlot(bytes: Uint8Array, sheetId: number): SheetStateSlot {
  const slots = readSheetSlots(bytes)
  const found = slots.find((s) => s.sheetId === sheetId)
  if (found) return found
  const free = slots.find((s) => s.sheetId < 0)
  if (!free) throw new RangeError(tr({ ja: '技の覚え状況に空きがありません', en: 'No free space for move learning status' }))
  sheetSlotFields.writeField(bytes, free.offset, 'sheetId', sheetId)
  sheetSlotFields.writeField(bytes, free.offset, 'count', 0)
  bytes.fill(SKILL_STATE.notLearned, free.offset + SHEET_STATES_REL, free.offset + SHEET_STATES_REL + SKILL_NO_COUNT)
  return readSheetSlot(bytes, free.index)
}

function writeSheetStates(bytes: Uint8Array, slotOffset: number, states: readonly number[]): void {
  states.forEach((v, i) => writeU8(bytes, slotOffset + SHEET_STATES_REL + i, v))
  // 🟢 +0x02 は 0 でない状態の数
  sheetSlotFields.writeField(bytes, slotOffset, 'count', states.filter(isLearned).length)
}

/**
 * 技の表の技を覚えた状態にする。skillNos を省くと、その技の表の固有技以外の全部の技（固有技は learnUniqueSkills）。
 * 覚えた技は 1、派生先を覚えた派生元は 2 にする（ゲームと同じ）。状態 3 の技を対象にすると 1 にする。
 * 構えごとの状態にも同じ値をゲームの規則で書く。覚えた技の数を返す（新しく覚えた数ではない）。
 */
export function learnSheetSkills(bytes: Uint8Array, sheetId: number, skillNos?: readonly number[]): number {
  assertWritable(bytes)
  requireEditable(bytes)
  return applyLearnSheetSkills(bytes, requireSheet(sheetId), skillNos)
}
function applyLearnSheetSkills(bytes: Uint8Array, sheet: SkillSheet, skillNos?: readonly number[]): number {
  const targets = new Set<number>(
    (skillNos ?? sheet.skills.filter((s) => !isUniqueSkill(s)).map((s) => s.skillNo)).filter(
      (no) => sheet.skills.some((s) => s.skillNo === no),
    ),
  )
  // 派生先だけを覚えることはないので、派生元もたどって覚えさせる
  for (const no of [...targets]) {
    let parent = sheet.skills.find((s) => s.skillNo === no)?.parent ?? null
    while (parent !== null && !targets.has(parent)) {
      targets.add(parent)
      const p: number = parent
      parent = sheet.skills.find((s) => s.skillNo === p)?.parent ?? null
    }
  }
  const slot = ensureSheetSlot(bytes, sheet.id)
  const before = slot.states
  const learned = (s: SheetSkill) => isLearned(before[s.skillNo]) || targets.has(s.skillNo)
  const hasLearnedChild = (no: number) => sheet.skills.some((c) => c.parent === no && learned(c))

  const states = [...before]
  for (const s of sheet.skills) {
    if (!learned(s)) continue
    if (hasLearnedChild(s.skillNo)) states[s.skillNo] = SKILL_STATE.learnedParent
    else if (targets.has(s.skillNo) || !isLearned(states[s.skillNo])) {
      states[s.skillNo] = states[s.skillNo] === SKILL_STATE.learnedParent ? SKILL_STATE.learnedParent : SKILL_STATE.learned
    }
  }

  writeSheetStates(bytes, slot.offset, states)
  // 構えごとの状態にも書く。技の表ごとの状態が前から同じでも、対象にした技は構えごとの状態を揃える
  for (const s of sheet.skills) {
    if (!isLearned(states[s.skillNo])) continue
    if (states[s.skillNo] === before[s.skillNo] && !targets.has(s.skillNo)) continue
    const at = stanceStateOffset(sheet.stance, s.skillNo)
    writeU8(bytes, at, nextState(bytes[at], states[s.skillNo] as SkillState))
  }
  return states.filter(isLearned).length
}

/**
 * 固有技を「習得済（俺流には未組み込み）」（状態 3）にする。ゲームが武器の斬殺数の条件で書く値と同じ 🟢（要ゲーム内確認）。
 * 技の表ごとの状態と構えごとの状態の両方に、ゲームの規則（nextState）で書く。すでに 1・2・3 の技は変えない。
 * 「俺流で表示」（状態 1）にするときは learnSheetSkills を使う（3 → 1）
 */
export function learnUniqueSkills(bytes: Uint8Array, sheetId: number, skillNos: readonly number[]): void {
  assertWritable(bytes)
  requireEditable(bytes)
  applyLearnUniqueSkills(bytes, requireSheet(sheetId), skillNos)
}
function applyLearnUniqueSkills(bytes: Uint8Array, sheet: SkillSheet, skillNos: readonly number[]): void {
  const targets = skillNos.filter((no) => sheet.skills.some((s) => s.skillNo === no))
  if (targets.length === 0) return
  const slot = ensureSheetSlot(bytes, sheet.id)
  const states = [...slot.states]
  for (const no of targets) states[no] = nextState(states[no], SKILL_STATE.notInOreRyu)
  writeSheetStates(bytes, slot.offset, states)
  for (const no of targets) {
    const at = stanceStateOffset(sheet.stance, no)
    writeU8(bytes, at, nextState(bytes[at], SKILL_STATE.notInOreRyu))
  }
}

/** 技の表の技 1 つを習得する。固有技は状態 3（applyLearnUniqueSkills）、ほかは 1（applyLearnSheetSkills） */
function applyLearnSheetSkill(bytes: Uint8Array, sheet: SkillSheet, skillNo: number): void {
  const skill = sheet.skills.find((s) => s.skillNo === skillNo)
  if (!skill) throw new RangeError(tr({ ja: 'この技の表にない技です', en: 'This move is not in this move list' }))
  if (isUniqueSkill(skill)) applyLearnUniqueSkills(bytes, sheet, [skillNo])
  else applyLearnSheetSkills(bytes, sheet, [skillNo])
}

/**
 * 技の表の技 1 つを習得する（流派の画面の「習得する」）。固有技は状態 3（習得済・俺流には未組み込み。learnUniqueSkills 🟢 要ゲーム内確認）、
 * ほかの技は 1（派生元も覚える。learnSheetSkills）。技の表にない技は拒否する
 */
export function learnSheetSkill(bytes: Uint8Array, sheetId: number, skillNo: number): void {
  assertWritable(bytes)
  requireEditable(bytes)
  applyLearnSheetSkill(bytes, requireSheet(sheetId), skillNo)
}

/**
 * その流派の画面に出す技の表の技。固有技（習得条件 51・52）は、覚えられる流派（固有武器の流派 🟢）でだけ出す。
 * ほかの流派の技の表にも同じ固有技が入っているが、そこでは覚えられず、覚えられる流派で覚えたものが装備したときに写る 🟢（chunks/skill-states「固有技」）
 */
export function sectSheetSkills(sect: Sect, sheet: SkillSheet): SheetSkill[] {
  return sheet.skills.filter((s) => !isUniqueSkill(s) || uniqueSkillSects(s.skillId).includes(sect.id))
}

/** 固有技を覚えられる流派か（sectSheetSkills に固有技が残るか）🟢 */
export function sectHasUniqueSkill(sect: Sect): boolean {
  return sect.sheets.some((id) => {
    const sheet = findSkillSheet(id)
    return sheet !== undefined && sectSheetSkills(sect, sheet).some(isUniqueSkill)
  })
}

/** 固有技か（習得条件 51・52 など、または固有武器の秘伝の技） */
export const isUniqueSkill = (s: SheetSkill) => isSpecialCond(s.cond) || uniqueSkillSects(s.skillId).length > 0

/**
 * 流派のすべての技の表の技を覚えた状態にする。覚えるのは sectSheetSkills の技だけ。
 * 固有技（覚えられる流派でだけ残る）は、状態 3（習得済・俺流には未組み込み。learnUniqueSkills）にする
 */
export function learnSectSkills(bytes: Uint8Array, sectId: number): void {
  assertWritable(bytes)
  const sect = findSect(sectId)
  if (!sect) throw new RangeError(tr({ ja: '知らない流派です', en: 'Unknown style' }))
  requireEditable(bytes)
  for (const id of sect.sheets) {
    const sheet = findSkillSheet(id)
    if (!sheet) continue
    const skills = sectSheetSkills(sect, sheet)
    const normal = skills.filter((s) => !isUniqueSkill(s)).map((s) => s.skillNo)
    // 覚える技がないのに技の表の枠だけを割り当てない
    if (normal.length > 0) applyLearnSheetSkills(bytes, sheet, normal)
    applyLearnUniqueSkills(bytes, sheet, skills.filter(isUniqueSkill).map((s) => s.skillNo))
  }
}

/**
 * 技を覚えていない状態（0）にする（上級者モード用。ゲームは技を忘れさせない）。
 * 派生先がなくなった派生元は 1 に戻す。構えごとの状態は、同じ構えのほかの技の表で覚えていなければ 0 にする。
 */
export function forgetSheetSkill(bytes: Uint8Array, sheetId: number, skillNo: number): void {
  assertWritable(bytes)
  requireEditable(bytes)
  applyForgetSheetSkill(bytes, requireSheet(sheetId), skillNo)
}
function applyForgetSheetSkill(bytes: Uint8Array, sheet: SkillSheet, skillNo: number): void {
  const slots = readSheetSlots(bytes)
  const slot = slots.find((s) => s.sheetId === sheet.id)
  if (!slot || !isLearned(slot.states[skillNo])) return
  const states = [...slot.states]
  states[skillNo] = SKILL_STATE.notLearned
  const parent = sheet.skills.find((s) => s.skillNo === skillNo)?.parent ?? null
  if (
    parent !== null &&
    states[parent] === SKILL_STATE.learnedParent &&
    !sheet.skills.some((c) => c.parent === parent && isLearned(states[c.skillNo]))
  ) {
    states[parent] = SKILL_STATE.learned
  }
  writeSheetStates(bytes, slot.offset, states)
  const elsewhere = slots.some(
    (s) => s.sheetId !== sheet.id && findSkillSheet(s.sheetId)?.stance === sheet.stance && isLearned(s.states[skillNo]),
  )
  if (!elsewhere) writeU8(bytes, stanceStateOffset(sheet.stance, skillNo), SKILL_STATE.notLearned)
}

/** 流派の表の修練度・段・倒した数を書く 🟢（要ゲーム内確認） */
export function writeSectValues(bytes: Uint8Array, sectId: number, v: SectValues): void {
  assertWritable(bytes)
  const view = requireEditable(bytes)
  const rec = view.records.find((r) => r.id === sectId)
  if (!rec) throw new RangeError(tr({ ja: 'この流派が流派の表にありません', en: 'This style is not in the style list' }))
  // 値の検証は codec が書く前に1回だけ行う（validateSectValues）
  sectRecordCodec.writeValues(bytes, rec.offset, v)
}

/** 腕前点のゲーム上の上限 🟢（chunks/styles。9999 で止まる） */
export const SKILL_POINTS_MAX = 9999
const U16_MAX = 0xffff

/**
 * 腕前点（0x189FE、u16）を書く 🟢（要ゲーム内確認）。通常は 0〜9999、上級者モードでは u16 の範囲（0〜65535）まで。
 * 俺流を作る画面は、開いたときにこの値を写して使う（技の腕前点の合計がこれ以下である必要がある）
 */
export function writeSkillPoints(bytes: Uint8Array, value: number, options: EditOpts = NORMAL_EDIT_OPTS): void {
  assertWritable(bytes)
  const problem = validateRange(value, { systemMax: U16_MAX, normalMax: SKILL_POINTS_MAX }, options)
  if (problem) throw new RangeError(problem)
  requireEditable(bytes)
  writeU16(bytes, SKILL_POINTS_OFFSET, value)
}

/** 修練度に見合う段（しきい値から求める。極にはしない）🟢 */
export function rankForMastery(sect: Sect, mastery: number): number {
  let rank = 0
  sect.thresholds.forEach((t, i) => {
    if (mastery >= t) rank = i + 1
  })
  return rank
}

// 構えごとの技（技の画面）。構えの技を、その技が入っている技の表すべてで覚えさせる。

/**
 * 構えの技が入っている技の表 🟢（datatable/sect）。固有技は覚えられる流派の技の表だけ（sectSheetSkills と同じ）。
 * 主人公が手に入れられない流派（「……」）の技の表も含む
 */
export function stanceSkillSheets(stance: number, skillNo: number): SkillSheet[] {
  return SKILL_SHEETS.filter(
    (sheet) =>
      sheet.stance === stance &&
      SECTS.some((sect) => sect.sheets.includes(sheet.id) && sectSheetSkills(sect, sheet).some((s) => s.skillNo === skillNo)),
  )
}

/** 構えの技が固有技か（技の表のどれかで固有技として入っているか） */
export function isUniqueStanceSkill(stance: number, skillNo: number): boolean {
  return SKILL_SHEETS.some((sheet) => sheet.stance === stance && sheet.skills.some((s) => s.skillNo === skillNo && isUniqueSkill(s)))
}

/**
 * 構えの技をまとめて、それぞれ入っている技の表（stanceSkillSheets）すべてで習得する。派生元も覚える（learnSheetSkills）。
 * 固有技は状態 3（習得済・俺流には未組み込み。learnUniqueSkills 🟢 要ゲーム内確認）。
 * どの技の表にもない技が 1 つでもあれば、何も書かずに拒否する
 */
export function learnStanceSkills(bytes: Uint8Array, stance: number, skillNos: readonly number[]): void {
  assertWritable(bytes)
  requireEditable(bytes)
  const plans = skillNos.map((skillNo) => {
    const sheets = stanceSkillSheets(stance, skillNo)
    if (sheets.length === 0) throw new RangeError(tr({ ja: 'この技が入っている流派がないので習得できません', en: 'No style includes this move, so it cannot be learned' }))
    return { skillNo, sheets }
  })
  for (const { skillNo, sheets } of plans) {
    for (const sheet of sheets) applyLearnSheetSkill(bytes, sheet, skillNo)
  }
}

/** 構えの技 1 つを習得する（learnStanceSkills） */
export function learnStanceSkill(bytes: Uint8Array, stance: number, skillNo: number): void {
  learnStanceSkills(bytes, stance, [skillNo])
}

/** 状態 3 の固有技を、入っている技の表すべてで 1（俺流に組み込める）にする（3 → 1） */
export function showStanceSkillInOreRyu(bytes: Uint8Array, stance: number, skillNo: number): void {
  assertWritable(bytes)
  requireEditable(bytes)
  const sheets = stanceSkillSheets(stance, skillNo)
  if (sheets.length === 0) throw new RangeError(tr({ ja: 'この技が入っている流派がありません', en: 'No style includes this move' }))
  for (const sheet of sheets) applyLearnSheetSkills(bytes, sheet, [skillNo])
}

/**
 * 構えの技を、すべての技の表と構えごとの状態で覚えていない状態（0）にする（上級者モード用。forgetSheetSkill）。
 * 構えごとの状態は、技の表に残っていなくても 0 にする
 */
export function forgetStanceSkill(bytes: Uint8Array, stance: number, skillNo: number): void {
  assertWritable(bytes)
  requireEditable(bytes)
  for (const sheet of SKILL_SHEETS) {
    if (sheet.stance === stance && sheet.skills.some((s) => s.skillNo === skillNo)) applyForgetSheetSkill(bytes, sheet, skillNo)
  }
  writeU8(bytes, stanceStateOffset(stance, skillNo), SKILL_STATE.notLearned)
}

/** 🟢 状態1・2の技を俺流で選べる（chunks/skill-states）。 */
export function isUsableInOreRyu(state: number): boolean {
  return state === SKILL_STATE.learned || state === SKILL_STATE.learnedParent
}

/**
 * 技の行に出す操作（chunks/skill-states）。
 * 🟢 固有技は 0 →「習得する」（3）→「俺流で表示」（1）の 2 段階。ほかの技は 0・3 から「習得する」（1）。
 * state が null（未読み込み）のときも「習得する」を出す（画面で無効にする）。❓ 忘れさせる操作は上級者モードで、習得後だけに出す
 */
export function skillActions(state: number | null, unique: boolean, advanced: boolean) {
  return {
    learn: state === null || !isLearned(state) || (state === SKILL_STATE.notInOreRyu && !unique),
    showInOreRyu: state === SKILL_STATE.notInOreRyu && unique,
    forget: advanced && state !== null && isLearned(state),
  }
}
