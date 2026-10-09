// 流派・技の覚え状況。出典：docs/save_format/chunks/styles・sect-scrolls・skill-states（並びは 🟢）、
// datatable/sect/*.csv（流派・技の表 🟢）。
//
// 技の状態（1＝覚えた、2＝派生先を覚えた派生元）の書き込みは、ゲームで読めて技の表・戦闘・俺流の画面に
// 反映されることを確かめた（✅ [U] 2026-10-09。docs/save_format/chunks/skill-states/reserch）。
// 修練度・段・倒した数の書き込みは 🟢（要ゲーム内確認）。
//
// ❓ U-1：固定オフセットを使い、ファイルサイズと各値の範囲を検証する。検証に落ちたら読み取り専用。
import { readI16, readU16, writeI16, writeU16, writeU8 } from './binary'
import { checkLayout } from './hero'
import {
  SKILL_NO_COUNT,
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

// 技の覚え状況 🟢（chunks/skill-states）
export const SHEET_STATES_OFFSET = 0x1417c
export const SHEET_STATE_BYTES = 0x84
export const SHEET_STATE_SLOTS = 128
export const STANCE_STATES_OFFSET = 0x1837c

// 流派 🟢（chunks/styles）
export const LEARNED_COUNT_OFFSET = 0x189fc
export const SKILL_POINTS_OFFSET = 0x189fe
export const EQUIP_OFFSET = 0x18a00
export const SECT_COUNT_OFFSET = 0x18a0c
export const SECT_RECORDS_OFFSET = 0x18a0e
export const SECT_RECORD_BYTES = 16
export const SECT_RECORD_SLOTS = 128

// 流派の書 🟢（chunks/sect-scrolls）
export const SCROLL_HELD_OFFSET = 0x48cc
export const SCROLL_HELD_SLOTS = 20
export const SCROLL_STORED_OFFSET = 0x4aac
export const SCROLL_STORED_SLOTS = 150
export const SCROLL_STORED_COUNT_OFFSET = 0x58bc
export const SCROLL_SLOT_BYTES = 24

/** 修練度・段の範囲 🟢 */
export const MASTERY_MAX = 10000
export const RANK_MAX = 5
export const I16_MAX = 0x7fff

/** 技の状態 🟢。0＝覚えていない、1＝覚えた、2＝派生先を覚えた（派生元）、3＝覚えたがまだ俺流に組み込めない */
export type SkillState = 0 | 1 | 2 | 3

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

export type SectsView = {
  /** 検証に落ちた理由。あれば読み取り専用 */
  problem: string | null
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
  const scrollNo = readI16(bytes, offset)
  const customId = readI16(bytes, offset + 2)
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
  return {
    index,
    offset,
    sheetId: readI16(bytes, offset),
    count: readU16(bytes, offset + 2),
    states: Array.from(bytes.subarray(offset + 4, offset + 4 + SKILL_NO_COUNT)),
  }
}

export function readSects(bytes: Uint8Array): SectsView {
  if (bytes.byteLength < SECT_RECORDS_OFFSET + SECT_RECORD_SLOTS * SECT_RECORD_BYTES) {
    throw new RangeError('ファイルが小さすぎて流派を読めません')
  }
  const problems: string[] = []
  const layout = checkLayout(bytes)
  if (layout) problems.push(layout)

  const sectCount = readU16(bytes, SECT_COUNT_OFFSET)
  if (sectCount > SECT_RECORD_SLOTS) problems.push(`流派の件数が大きすぎます（${sectCount}）`)
  const records: SectRecord[] = []
  for (let i = 0; i < Math.min(sectCount, SECT_RECORD_SLOTS); i++) {
    const offset = SECT_RECORDS_OFFSET + i * SECT_RECORD_BYTES
    const id = readI16(bytes, offset)
    const sect = findSect(id) ?? null
    if (!sect) problems.push(`流派の表に知らない流派 ID があります（${i + 1}件目：${id}）`)
    records.push({
      index: i,
      offset,
      id,
      mastery: readI16(bytes, offset + 2),
      rank: readI16(bytes, offset + 4),
      kills: readI16(bytes, offset + 6),
      sect,
    })
  }

  const held = Array.from({ length: SCROLL_HELD_SLOTS }, (_, i) => readScroll(bytes, 'held', i))
  const stored = Array.from({ length: SCROLL_STORED_SLOTS }, (_, i) => readScroll(bytes, 'stored', i))
  const storedCount = readU16(bytes, SCROLL_STORED_COUNT_OFFSET)
  if (storedCount > SCROLL_STORED_SLOTS) problems.push(`流派の箪笥の件数が大きすぎます（${storedCount}）`)

  const sheetSlots: SheetStateSlot[] = []
  for (let i = 0; i < SHEET_STATE_SLOTS; i++) {
    const s = readSheetSlot(bytes, i)
    if (s.states.some((v) => v > 3)) problems.push(`技の状態に 0〜3 以外の値があります（技の表 ${s.sheetId}）`)
    sheetSlots.push(s)
  }
  const stanceStates = Array.from({ length: STANCE_COUNT }, (_, c) =>
    Array.from(bytes.subarray(STANCE_STATES_OFFSET + c * SKILL_NO_COUNT, STANCE_STATES_OFFSET + (c + 1) * SKILL_NO_COUNT)),
  )

  return {
    problem: problems.length ? problems.join(' ／ ') : null,
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

/** 技の表の状態（覚えていない技は 0）。その技の表の枠がなければすべて 0 */
export function sheetStates(view: SectsView, sheetId: number): number[] {
  return view.sheetSlots.find((s) => s.sheetId === sheetId)?.states ?? new Array<number>(SKILL_NO_COUNT).fill(0)
}

// 書き込み。不正な値は例外にして、バイト列を変えない。

function assertWritable(bytes: Uint8Array): SectsView {
  const view = readSects(bytes)
  if (view.problem) throw new RangeError(view.problem)
  return view
}

/**
 * ゲームが状態を書くときの規則 🟢：今が 0 なら書く。今が 3 で新しい値が 1 なら書く。新しい値が 2 なら必ず書く。
 * それ以外は書かない（1 → 3 には戻らない）。
 */
export function nextState(current: number, value: SkillState): number {
  if (current === 0 || value === 2 || (current === 3 && value === 1)) return value
  return current
}

function ensureSheetSlot(bytes: Uint8Array, view: SectsView, sheetId: number): SheetStateSlot {
  const found = view.sheetSlots.find((s) => s.sheetId === sheetId)
  if (found) return found
  const free = view.sheetSlots.find((s) => s.sheetId < 0)
  if (!free) throw new RangeError('技の覚え状況の枠（128）に空きがありません')
  writeI16(bytes, free.offset, sheetId)
  writeU16(bytes, free.offset + 2, 0)
  bytes.fill(0, free.offset + 4, free.offset + 4 + SKILL_NO_COUNT)
  return readSheetSlot(bytes, free.index)
}

function writeSheetStates(bytes: Uint8Array, slot: SheetStateSlot, states: number[]): void {
  states.forEach((v, i) => writeU8(bytes, slot.offset + 4 + i, v))
  // 🟢 +0x02 は 0 でない状態の数
  writeU16(bytes, slot.offset + 2, states.filter((v) => v !== 0).length)
}

/**
 * 技の表の技を覚えた状態にする。skillNos を省くと、その技の表の固有技以外の全部の技（固有技は learnUniqueSkills）。
 * 覚えた技は 1、派生先を覚えた派生元は 2 にする（ゲームと同じ）。状態 3 の技を対象にすると 1 にする。
 * 構えごとの状態にも同じ値をゲームの規則で書く。覚えた技の数を返す（新しく覚えた数ではない）。
 */
export function learnSheetSkills(bytes: Uint8Array, sheetId: number, skillNos?: readonly number[]): number {
  const sheet = findSkillSheet(sheetId)
  if (!sheet) throw new RangeError(`知らない技の表です（${sheetId}）`)
  const view = assertWritable(bytes)
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
  const before = sheetStates(view, sheetId)
  const learned = (s: SheetSkill) => before[s.skillNo] !== 0 || targets.has(s.skillNo)
  const hasLearnedChild = (no: number) => sheet.skills.some((c) => c.parent === no && learned(c))

  const states = [...before]
  for (const s of sheet.skills) {
    if (!learned(s)) continue
    if (hasLearnedChild(s.skillNo)) states[s.skillNo] = 2
    else if (targets.has(s.skillNo) || states[s.skillNo] === 0) states[s.skillNo] = states[s.skillNo] === 2 ? 2 : 1
  }

  const slot = ensureSheetSlot(bytes, view, sheetId)
  writeSheetStates(bytes, slot, states)
  // 構えごとの状態にも書く。技の表ごとの状態が前から同じでも、対象にした技は構えごとの状態を揃える
  for (const s of sheet.skills) {
    if (states[s.skillNo] === 0) continue
    if (states[s.skillNo] === before[s.skillNo] && !targets.has(s.skillNo)) continue
    const at = STANCE_STATES_OFFSET + sheet.stance * SKILL_NO_COUNT + s.skillNo
    writeU8(bytes, at, nextState(bytes[at], states[s.skillNo] as SkillState))
  }
  return states.filter((v) => v !== 0).length
}

/**
 * 固有技を「習得済（俺流には未組み込み）」（状態 3）にする。ゲームが武器の斬殺数の条件で書く値と同じ 🟢（要ゲーム内確認）。
 * 技の表ごとの状態と構えごとの状態の両方に、ゲームの規則（nextState）で書く。すでに 1・2・3 の技は変えない。
 * 「俺流で表示」（状態 1）にするときは learnSheetSkills を使う（3 → 1）
 */
export function learnUniqueSkills(bytes: Uint8Array, sheetId: number, skillNos: readonly number[]): void {
  const sheet = findSkillSheet(sheetId)
  if (!sheet) throw new RangeError(`知らない技の表です（${sheetId}）`)
  const view = assertWritable(bytes)
  const targets = skillNos.filter((no) => sheet.skills.some((s) => s.skillNo === no))
  if (targets.length === 0) return
  const states = [...sheetStates(view, sheetId)]
  for (const no of targets) states[no] = nextState(states[no], 3)
  writeSheetStates(bytes, ensureSheetSlot(bytes, view, sheetId), states)
  for (const no of targets) {
    const at = STANCE_STATES_OFFSET + sheet.stance * SKILL_NO_COUNT + no
    writeU8(bytes, at, nextState(bytes[at], 3))
  }
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
  const sect = findSect(sectId)
  if (!sect) throw new RangeError(`知らない流派です（${sectId}）`)
  for (const id of sect.sheets) {
    const sheet = findSkillSheet(id)
    if (!sheet) continue
    const skills = sectSheetSkills(sect, sheet)
    const normal = skills.filter((s) => !isUniqueSkill(s)).map((s) => s.skillNo)
    // 覚える技がないのに技の表の枠だけを割り当てない
    if (normal.length > 0) learnSheetSkills(bytes, id, normal)
    learnUniqueSkills(bytes, id, skills.filter(isUniqueSkill).map((s) => s.skillNo))
  }
}

/**
 * 技を覚えていない状態（0）にする（上級者モード用。ゲームは技を忘れさせない）。
 * 派生先がなくなった派生元は 1 に戻す。構えごとの状態は、同じ構えのほかの技の表で覚えていなければ 0 にする。
 */
export function forgetSheetSkill(bytes: Uint8Array, sheetId: number, skillNo: number): void {
  const sheet = findSkillSheet(sheetId)
  if (!sheet) throw new RangeError(`知らない技の表です（${sheetId}）`)
  const view = assertWritable(bytes)
  const slot = view.sheetSlots.find((s) => s.sheetId === sheetId)
  if (!slot || slot.states[skillNo] === 0) return
  const states = [...slot.states]
  states[skillNo] = 0
  const parent = sheet.skills.find((s) => s.skillNo === skillNo)?.parent ?? null
  if (parent !== null && states[parent] === 2 && !sheet.skills.some((c) => c.parent === parent && states[c.skillNo] !== 0)) {
    states[parent] = 1
  }
  writeSheetStates(bytes, slot, states)
  const elsewhere = view.sheetSlots.some(
    (s) => s.sheetId !== sheetId && findSkillSheet(s.sheetId)?.stance === sheet.stance && s.states[skillNo] !== 0,
  )
  if (!elsewhere) writeU8(bytes, STANCE_STATES_OFFSET + sheet.stance * SKILL_NO_COUNT + skillNo, 0)
}

export type SectValues = { mastery: number; rank: number; kills: number }

export function validateSectValues(v: SectValues): string | null {
  if (!Number.isInteger(v.mastery) || v.mastery < 0 || v.mastery > MASTERY_MAX) return `修練度は 0〜${MASTERY_MAX} です`
  if (!Number.isInteger(v.rank) || v.rank < 0 || v.rank > RANK_MAX) return `段は 0〜${RANK_MAX} です`
  if (!Number.isInteger(v.kills) || v.kills < 0 || v.kills > I16_MAX) return `倒した数は 0〜${I16_MAX} です`
  return null
}

/** 流派の表の修練度・段・倒した数を書く 🟢（要ゲーム内確認） */
export function writeSectValues(bytes: Uint8Array, sectId: number, v: SectValues): void {
  const problem = validateSectValues(v)
  if (problem) throw new RangeError(problem)
  const view = assertWritable(bytes)
  const rec = view.records.find((r) => r.id === sectId)
  if (!rec) throw new RangeError(`流派の表に流派 ${sectId} がありません`)
  writeI16(bytes, rec.offset + 2, v.mastery)
  writeI16(bytes, rec.offset + 4, v.rank)
  writeI16(bytes, rec.offset + 6, v.kills)
}

/** 腕前点のゲーム上の上限 🟢（chunks/styles。9999 で止まる） */
export const SKILL_POINTS_MAX = 9999
const U16_MAX = 0xffff

/**
 * 腕前点（0x189FE、u16）を書く 🟢（要ゲーム内確認）。通常は 0〜9999、上級者モードでは u16 の範囲（0〜65535）まで。
 * 俺流を作る画面は、開いたときにこの値を写して使う（技の腕前点の合計がこれ以下である必要がある）
 */
export function writeSkillPoints(bytes: Uint8Array, value: number, options: { advanced?: boolean } = {}): void {
  const max = options.advanced ? U16_MAX : SKILL_POINTS_MAX
  if (!Number.isInteger(value) || value < 0 || value > max) throw new RangeError(`腕前点は 0〜${max} です`)
  assertWritable(bytes)
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
