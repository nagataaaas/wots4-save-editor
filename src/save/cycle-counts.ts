// 周回数と、周回の終わり方ごとの回数。出典：docs/save_format/chunks/stats（0x0B8C）、chunks/date-location（クリア回数・立ち去った回数）。
//
//   0x0B8C  u32       周回数（終えた周回の数）🟢。周回の終わりに +1、99,999 まで。周回の終わりの初期化では 0 にならない。
//                     実セーブ1件でクリア回数の合計＋立ち去った回数と一致した（死亡で増えるかは ❓）。
//                     3 以上でイベントチャートに真ルートの枠と線が全部出る（🟢 要ゲーム内確認。event-chart-view.ts）
//   0x43398 u16 × 4  難易度ごとのクリア回数 🟢（1000 まで）。合計が 1 以上でイベントチャートを左右にスクロール・縮小できる（🟢 要ゲーム内確認）
//   0x46340 u32       立ち去った回数 🟢（99,999 まで）
//
// クリア回数・立ち去った回数はここでは読むだけ（新しい周回の書き込みが増やす。new-cycle.ts）。
// 固定オフセットで読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU16, readU32, writeU32 } from './binary'
import { checkLayout } from './hero'

/** 🟢 周回数（u32） */
export const PLAY_COUNT_OFFSET = 0x0b8c
/** 🟢 ゲームが周回数を増やすときの上限。通常モードの入力の上限 */
export const PLAY_COUNT_MAX = 99_999
/** 🟢 周回数がこの値以上なら、イベントチャートに真ルートの枠と線が全部出る */
export const PLAY_COUNT_REVEALS_BEST_ROUTE = 3

/** 🟢 難易度ごとのクリア回数（u16 × 4） */
export const CLEAR_COUNTS_OFFSET = 0x43398
/** 🟢 立ち去った回数（u32） */
export const GONE_COUNT_OFFSET = 0x46340

export type CycleCountsView = {
  playCount: number
  /** 難易度 0〜3 のクリア回数 */
  clears: readonly number[]
  clearTotal: number
  goneCount: number
  /** 周回数が通常の上限を超えているなど、編集はできるが注意が必要な理由 */
  warning: string | null
  /** 妥当性検証に落ちた理由。null なら編集可能 */
  problem: string | null
}

export function readCycleCounts(bytes: Uint8Array): CycleCountsView {
  if (bytes.byteLength < GONE_COUNT_OFFSET + 4) throw new RangeError('ファイルが小さすぎて周回数を読めません')
  const playCount = readU32(bytes, PLAY_COUNT_OFFSET)
  const clears = [0, 1, 2, 3].map((d) => readU16(bytes, CLEAR_COUNTS_OFFSET + d * 2))
  return {
    playCount,
    clears,
    clearTotal: clears.reduce((a, b) => a + b, 0),
    goneCount: readU32(bytes, GONE_COUNT_OFFSET),
    warning:
      playCount > PLAY_COUNT_MAX
        ? `周回数がゲームの上限（${PLAY_COUNT_MAX.toLocaleString()}）を超えています`
        : null,
    problem: checkLayout(bytes),
  }
}

/** 通常モードは 0〜99,999、上級者モードは任意の u32。問題がなければ null */
export function validatePlayCount(value: number, opts: { advanced: boolean }): string | null {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff_ffff) return `値が範囲外です: ${value}`
  if (!opts.advanced && value > PLAY_COUNT_MAX)
    return `通常モードでは 0〜${PLAY_COUNT_MAX.toLocaleString()} を指定してください: ${value}`
  return null
}

/** 0x0B8C の4バイトだけを書く（🟢。ゲーム内での反映は要確認） */
export function writePlayCount(bytes: Uint8Array, value: number, opts: { advanced: boolean }): void {
  const problem = checkLayout(bytes)
  if (problem) throw new RangeError(problem)
  const error = validatePlayCount(value, opts)
  if (error) throw new RangeError(error)
  writeU32(bytes, PLAY_COUNT_OFFSET, value)
}

/** 🟢 周回を終えたときにゲームが行う +1（99,999 で止まる）。新しい周回の書き込みと一緒に使う */
export function countFinishedCycle(bytes: Uint8Array): void {
  const problem = checkLayout(bytes)
  if (problem) throw new RangeError(problem)
  const n = readU32(bytes, PLAY_COUNT_OFFSET)
  if (n < PLAY_COUNT_MAX) writeU32(bytes, PLAY_COUNT_OFFSET, n + 1)
}
