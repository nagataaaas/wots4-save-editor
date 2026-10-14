// 技ごとの斬殺数と、道具ごとの使用回数。出典：docs/save_format/chunks/kill-counts・item-uses（🟢）。
//
//   技ごとの斬殺数   周回中 0x0C64 + 4n、累計 0x1C04 + 4n（u32 × 1000）🟢。n は技の ID（datatable/sect/skill.csv、0〜961 が使われる）。
//                    とどめを刺した技の両方が +1。累計で最大の技が記録の画面の「得意技」。上限は ❓（エディタの目安 9,999,999）
//   道具の使用回数   周回中 0x2BA4 + 4id、累計 0x2FA4 + 4id（u32 × 256）🟢。id はアイテムの ID。使うと両方 +1、9,999,999 まで。
//                    累計で最大の道具が記録の画面の「好きな道具」
// 周回中の表は周回の終わりに 0、累計の表は残る。
// 通常モードは表にある技・道具だけ、0〜9,999,999。上級者モードは任意の添字・u32。
// 固定オフセットで読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { NUM_TYPE_RANGE, readU32, writeU32, type NumType } from './binary'
import { validateRange, type EditOpts, type ViewStatus } from './field'
import { assertWritable, checkLayout } from './layout'
import { ITEMS } from './master/item-names'
import { itemLabel } from './master/labels'
import { findSkillInfo, skillName } from './master/sect-data'

export type ScoreTableId = 'arts' | 'items'
export type ScoreScope = 'cycle' | 'total'

/** 🟢 1件の回数の型 */
export const SCORE_TYPE = 'u32' satisfies NumType
/** 上級者モードの上限（回数の型の最大値） */
export const SCORE_SYSTEM_MAX = NUM_TYPE_RANGE[SCORE_TYPE].max

export type ScoreTable = {
  id: ScoreTableId
  label: string
  cycleStart: number
  totalStart: number
  count: number
  /** 通常モードの上限 */
  max: number
}

export const SCORE_TABLES: Readonly<Record<ScoreTableId, ScoreTable>> = {
  arts: { id: 'arts', label: '技ごとの斬殺数', cycleStart: 0x0c64, totalStart: 0x1c04, count: 1000, max: 9_999_999 },
  items: { id: 'items', label: '道具の使用回数', cycleStart: 0x2ba4, totalStart: 0x2fa4, count: 256, max: 9_999_999 },
}

export function scoreOffset(table: ScoreTableId, scope: ScoreScope, index: number): number {
  const t = SCORE_TABLES[table]
  return (scope === 'cycle' ? t.cycleStart : t.totalStart) + 4 * index
}

/** 添字の名前。表にない添字は null */
export function scoreEntryName(table: ScoreTableId, index: number): string | null {
  if (table === 'arts') {
    const s = findSkillInfo(index)
    return s ? skillName(s) : null
  }
  const it = ITEMS.find((x) => x.id === index)
  return it ? itemLabel(it.labelId) : null
}

/** 通常モードで選べる添字（表にある技・道具） */
export function scoreEntries(table: ScoreTableId): readonly { index: number; name: string }[] {
  const out: { index: number; name: string }[] = []
  for (let i = 0; i < SCORE_TABLES[table].count; i++) {
    const name = scoreEntryName(table, i)
    if (name !== null) out.push({ index: i, name })
  }
  return out
}

export type ScoreTableView = ViewStatus & {
  cycle: readonly number[]
  total: readonly number[]
}

export function readScoreTable(bytes: Uint8Array, table: ScoreTableId): ScoreTableView {
  const t = SCORE_TABLES[table]
  if (bytes.byteLength < t.totalStart + 4 * t.count) throw new RangeError(`ファイルが小さすぎて${t.label}を読めません`)
  const read = (start: number) => Array.from({ length: t.count }, (_, i) => readU32(bytes, start + 4 * i))
  return { warnings: [], cycle: read(t.cycleStart), total: read(t.totalStart), problem: checkLayout(bytes) }
}

/** 問題がなければ null */
export function validateScore(table: ScoreTableId, index: number, value: number, opts: EditOpts): string | null {
  const t = SCORE_TABLES[table]
  if (!Number.isInteger(index) || index < 0 || index >= t.count) return "範囲外の技・道具です"
  if (!opts.advanced && scoreEntryName(table, index) === null) return "表にない技・道具です（上級者モードで書けます）"
  return validateRange(value, { systemMax: SCORE_SYSTEM_MAX, normalMax: t.max }, opts)
}

/** 1件の4バイトだけを書く */
export function writeScore(
  bytes: Uint8Array,
  table: ScoreTableId,
  scope: ScoreScope,
  index: number,
  value: number,
  opts: EditOpts,
): void {
  assertWritable(bytes)
  const error = validateScore(table, index, value, opts)
  if (error) throw new RangeError(error)
  writeU32(bytes, scoreOffset(table, scope, index), value)
}
