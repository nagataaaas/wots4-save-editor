// 勢力ごとの記録（3×3 表）。出典：解析ノート §3.5「勢力の 3×3 表の候補」、§9.4（[U] 2026-10-05 のシナリオ差分）。
//
// 🔶 差分6回からの推定で、**意味も書き込みもゲーム内で未確認**（要ゲーム内確認）。0x3780〜0x3788 の u8 × 9 を
// 3列（勢力）× 3行 に並べる。列の並び（幕府・外国・攘夷）は、3勢力のイベントの成功で各列の行0 が立ったことによる。
//   行0（0x3780〜）その勢力のイベントに参加・成功した回数   志士との出会い・海兵隊の横暴・代官所潜入で攘夷が 1→2→3、阿片密売で幕府、辻斬りで外国
//   行1（0x3783〜）その勢力の人物と戦った・斬った記録        海兵隊の横暴で赤城と戦う→攘夷、密売人を斬る→外国
//   行2（0x3786〜）その勢力に敵対するイベントに参加した記録  上の2つに加え、代官所潜入→幕府（行1 は立たない）
// 行1・行2 で見たのは 0 と 1 だけ。符号付きの友好度（§9.4 の −4 の報告）は別の場所にある可能性がある（❓）。
//
// ❓ U-1 判定待ちのため [TS] の固定オフセット（案A）の位置で読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU8, writeU8 } from './binary'
import { checkLayout } from './hero'

export const FACTION_TABLE_OFFSET = 0x3780 // 🔶 §3.5

export const FACTIONS = ['幕府', '外国', '攘夷'] as const
export const FACTION_ROWS = [
  { label: '協力・成功した回数', note: 'その勢力のイベントに参加・成功するたびに +1' },
  { label: '人物と戦った', note: 'その勢力の人物と戦った・斬ったときに 1' },
  { label: '敵対イベントに参加', note: 'その勢力に敵対するイベントに参加したときに 1' },
] as const

/**
 * 値の範囲。🔶 正規の範囲は推測：行0 は1〜3日目の各勢力のイベント数（3日×3枠）の 9 まで。
 * 行1・行2 は差分で 0 と 1 しか見ていないが、回数の可能性もあるので同じく 9 まで。
 * 読み込み時に妥当とみなす上限（PLAUSIBLE_MAX）を超えたら、位置がずれているとみなして読み取り専用にする
 */
export const FACTION_VALUE_MAX = { normal: 9, system: 0xff } as const
const PLAUSIBLE_MAX = 50

export function factionOffset(row: number, col: number): number {
  if (!Number.isInteger(row) || row < 0 || row >= FACTION_ROWS.length) throw new RangeError(`行が範囲外です: ${row}`)
  if (!Number.isInteger(col) || col < 0 || col >= FACTIONS.length) throw new RangeError(`列が範囲外です: ${col}`)
  return FACTION_TABLE_OFFSET + row * FACTIONS.length + col
}

export type FactionsView = {
  layoutProblem: string | null
  /** values[行][列] */
  values: number[][]
  problem: string | null
}

export function readFactions(bytes: Uint8Array): FactionsView {
  if (bytes.byteLength < FACTION_TABLE_OFFSET + 9) throw new RangeError('ファイルが小さすぎて勢力の記録を読めません')
  const layoutProblem = checkLayout(bytes)
  const values = FACTION_ROWS.map((_, r) => FACTIONS.map((_, c) => readU8(bytes, factionOffset(r, c))))
  const max = Math.max(...values.flat())
  const problem = max > PLAUSIBLE_MAX ? `値が大きすぎます（${max}）。位置がずれている可能性があります` : null
  return { layoutProblem, values, problem: layoutProblem ?? problem }
}

export function validateFactionValue(value: number, opts: { advanced: boolean }): string | null {
  const max = opts.advanced ? FACTION_VALUE_MAX.system : FACTION_VALUE_MAX.normal
  if (!Number.isInteger(value)) return '整数を入力してください'
  if (value < 0 || value > max) return `0〜${max} の範囲で入力してください`
  return null
}

/** 1マス（1バイト）だけを書く。🔶 要ゲーム内確認 */
export function writeFactionValue(bytes: Uint8Array, row: number, col: number, value: number, opts: { advanced: boolean }): void {
  const view = readFactions(bytes)
  if (view.problem) throw new RangeError(view.problem)
  const offset = factionOffset(row, col)
  const problem = validateFactionValue(value, opts)
  if (problem) throw new RangeError(problem)
  writeU8(bytes, offset, value)
}
