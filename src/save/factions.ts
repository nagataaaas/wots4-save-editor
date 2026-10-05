// 勢力ごとの記録（3×3 表）。出典：解析ノート §3.5「勢力の 3×3 表の候補」、§9.4（[U] 2026-10-05 のシナリオ差分）。
//
// 差分からの推定。行0・行1 は、書き換えると大寄せの結果が変わることを確認した（✅ [U] 2026-10-05、下の「大寄せの判定」）。
// 行2 の意味は 🔶。0x3780〜0x3788 の u8 × 9 を
// 3列（勢力）× 3行 に並べる。列の並び（幕府・外国・攘夷）は、3勢力のイベントの成功で各列の行0 が立ったことによる。
// Wiki の「イベントに参加・成功で友好度 +1、不利益を与えたり敵対行為を働いた勢力は −1」に合わせ、友好度＝行0 − 行1 と読む（[U] 2026-10-05）。
//   行0（0x3780〜）友好度 +1 の回数（参加・成功）  志士との出会い・海兵隊の横暴・代官所潜入で攘夷が 1→2→3、阿片密売で幕府、辻斬りで外国。
//                                                   阿片密売は、密売人を斬っても（大成功 1500文）見逃しても（成功 500文）+1（02・02 copy 2）
//   行1（0x3783〜）友好度 −1 の回数（不利益・敵対行為）  海兵隊の横暴で赤城と戦う→攘夷、阿片密売で密売人を斬る→外国、
//                                                   阿片密売の導入で幕府勢力を斬る→幕府（イベントは失敗 05、02 copy）、剣術大会の準備で赤城・小暮と戦う→攘夷 1→2
//   行2（0x3786〜）敵対の記録（用途 ❓）  行1 と一緒に増えることが多いが、剣術大会の準備では増えず、代官所潜入では行2（幕府）だけが増えた。
//                                          大寄せの判定には使われない
// 行2 で見たのは 0 と 1 だけ。
//
// 大寄せの判定（0x3789〜0x378C）：大寄せ（添字41）のときに書かれる。🔶 3回の観察（03 copy 9・04 copy 11・04 copy 12）
//   0x3789〜0x378B 勢力ごと（幕府・外国・攘夷）。00 大寄せ前、01 ルートに入れる、02 入れない
//   0x378C         00 どれかの勢力に入れる、01 無所属（根無し草）
//   04 copy 12：幕府の行0 が 3（剣術大会の準備に参加）で 01 02 02 00、チャートに公儀の剣が出た（[U] 2026-10-05）。
//   04 copy 11：幕府の行0 が 2 で 02 02 02 01、公儀の剣は出なかった。
//   ✅ [U] 2026-10-05：大寄せの直前に表を書き換えて試した結果（行0, 行1, 行2 → ルート）
//     3,0,0 → 入れる ／ 3,1,0 → 入れない ／ 4,1,0 → 入れる ／ 3,0,1 → 入れる ／ 3,0,5 → 入れる
//   → **行0 − 行1 ≥ 3 でルートに入れる**。行2（敵対イベント）は判定に使われない（ROUTE_THRESHOLD・routeEligible）
//
// ❓ U-1 判定待ちのため [TS] の固定オフセット（案A）の位置で読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU8, writeU8 } from './binary'
import { checkLayout } from './hero'

export const FACTION_TABLE_OFFSET = 0x3780 // 🔶 §3.5

export const FACTIONS = ['幕府', '外国', '攘夷'] as const
export const FACTION_ROWS = [
  { label: '友好度 +（協力・成功）', note: 'その勢力のイベントに参加・成功するたびに +1。友好度＝この値 − 下の「友好度 −」' },
  { label: '友好度 −（不利益・敵対行為）', note: 'その勢力の人物と戦う・斬るなど、不利益を与えるたびに +1。大寄せの判定では上の値から引かれる' },
  { label: '敵対の記録（用途不明）', note: '友好度 − と一緒に増えることが多いが、そうでないときもある。大寄せの判定には使われない' },
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

/** 大寄せでルートに入れる友好度（行0 − 行1）の下限。✅ [U] 書き換えで5通り試した */
export const ROUTE_THRESHOLD = 3

/** 勢力 col（0〜2）が大寄せでルートに入れるか。values は readFactions の values（行0−行1 ≥ 3） */
export function routeEligible(values: readonly (readonly number[])[], col: number): boolean {
  return values[0][col] - values[1][col] >= ROUTE_THRESHOLD
}

export const ROUTE_JUDGE_OFFSET = 0x3789 // 🔶 §3.5 大寄せの判定（勢力ごと 3 B）
export const ROUTE_NONE_OFFSET = 0x378c // 🔶 §3.5 無所属
export const ROUTE_JUDGE_VALUES = [
  { value: 0x00, label: '大寄せ前' },
  { value: 0x01, label: 'ルートに入れる' },
  { value: 0x02, label: '入れない' },
] as const
export const ROUTE_NONE_VALUES = [
  { value: 0x00, label: '勢力あり／大寄せ前' },
  { value: 0x01, label: '根無し草' },
] as const

export type RouteJudgeView = {
  /** 幕府・外国・攘夷の順 */
  judges: number[]
  none: number
  problem: string | null
}

export function readRouteJudge(bytes: Uint8Array): RouteJudgeView {
  if (bytes.byteLength < ROUTE_NONE_OFFSET + 1) throw new RangeError('ファイルが小さすぎて大寄せの判定を読めません')
  const layoutProblem = checkLayout(bytes)
  const judges = FACTIONS.map((_, c) => readU8(bytes, ROUTE_JUDGE_OFFSET + c))
  const none = readU8(bytes, ROUTE_NONE_OFFSET)
  const known = (list: readonly { value: number }[], v: number) => list.some((x) => x.value === v)
  let problem: string | null = null
  if (!judges.every((v) => known(ROUTE_JUDGE_VALUES, v)) || !known(ROUTE_NONE_VALUES, none))
    problem = `大寄せの判定の値が想定外です（${[...judges, none].map((v) => v.toString(16).padStart(2, '0')).join(' ')}）`
  return { judges, none, problem: layoutProblem ?? problem }
}

/**
 * 大寄せの判定の1バイトを書く。col は 0〜2（勢力）、3 は無所属の 0x378C。🔶 書き込みは要ゲーム内確認。
 * 通常モードでは見た値（判定 00〜02、無所属 00・01）だけ。上級者モードでは任意の u8
 */
export function writeRouteJudge(bytes: Uint8Array, col: number, value: number, opts: { advanced: boolean }): void {
  const view = readRouteJudge(bytes)
  if (view.problem) throw new RangeError(view.problem)
  if (!Number.isInteger(col) || col < 0 || col > FACTIONS.length) throw new RangeError(`列が範囲外です: ${col}`)
  if (!Number.isInteger(value) || value < 0 || value > 0xff) throw new RangeError(`u8 の範囲外です: ${value}`)
  const list = col === FACTIONS.length ? ROUTE_NONE_VALUES : ROUTE_JUDGE_VALUES
  if (!opts.advanced && !list.some((x) => x.value === value)) throw new RangeError(`見たことのある値ではありません（${value}）`)
  writeU8(bytes, col === FACTIONS.length ? ROUTE_NONE_OFFSET : ROUTE_JUDGE_OFFSET + col, value)
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
