// アイテムの枠（箪笥・手持ち・貴重品で共通）。出典：docs/save_format/chunks/items（[TS] の `RawRareItem`、✅ [TS][I-3]）。
//
// 1枠は 8 B：+0x00 ID（u16）、+0x02 個数（u16）、+0x04 用途不明（4 B ❓）。
// 書き込むのは ID と個数の 4 B だけで、+0x04 の 4 B は変えない。
import { readU16, readU32, writeU16 } from './binary'

export const ITEM_SLOT_BYTES = 8

/** 空き枠の ID（chunks/items ✅） */
export const EMPTY_ID = 0xffff

/**
 * 個数の上限。🔶 推測：chunks/items のアンカー探索の目安（個数≤999）。ゲーム内の上限は未確認。
 * 入力の上限と、読み込み時の妥当性の上限を兼ねる。
 */
export const ITEM_COUNT_MAX = 999

/** 選択肢に出すアイテム */
export type ItemOption = {
  id: number
  label: string
  /** 確定していない点。あれば、この ID が入った枠に警告として出す */
  caution?: string
  /** 検索で label のほかに部分一致させる語（英語名・16進の ID など） */
  keywords?: readonly string[]
  /** 選択肢の下に小さく出す説明文 */
  description?: string
}

/** 選択肢の見出しつきのまとまり。label がなければ見出しを出さない */
export type ItemOptionGroup = {
  label?: string
  items: readonly ItemOption[]
}

export type ItemSlot = {
  index: number
  offset: number
  id: number
  count: number
  /** +0x04〜+0x07（❓ 用途不明）。表示のみ */
  unknown: number
  /** 既知の ID なら名前、未知の ID は null */
  label: string | null
  /** 妥当性検証に落ちた理由。null なら編集可能 */
  problem: string | null
  /**
   * 現在の ID をそのまま書き戻せるか。false（書けない ID や未知の ID）の枠も、
   * 書ける ID に変えることはできる（不正な値から抜け出せるようにするため。ユーザー判断、2026-10-04）。
   * ただし、個数だけの変更はできない
   */
  idWritable: boolean
  /** 編集はできるが注意が必要な理由 */
  warning: string | null
}

export function validateItemCount(count: number, max: number = ITEM_COUNT_MAX): string | null {
  if (!Number.isInteger(count)) return '整数を入力してください'
  if (count < 1 || count > max) return `1〜${max} の範囲で入力してください`
  return null
}

export type RawItemSlot = { offset: number; id: number; count: number; unknown: number }

export function readItemSlotRaw(bytes: Uint8Array, offset: number): RawItemSlot {
  return { offset, id: readU16(bytes, offset), count: readU16(bytes, offset + 2), unknown: readU32(bytes, offset + 4) }
}

/**
 * 枠の ID と個数（+0x00〜+0x03）を書く。+0x04〜+0x07 は変えない。
 * ID の妥当性は呼び出し側で検証する。個数は「なし」なら 0、それ以外は 1〜max（既定は ITEM_COUNT_MAX）。
 * 「なし」（0xFFFF）の個数を 0 にするのは 🔶 推測（空き枠の個数は 0 と推定。実セーブで未確認）。
 */
export function writeItemSlotRaw(
  bytes: Uint8Array,
  offset: number,
  id: number,
  count: number,
  max: number = ITEM_COUNT_MAX,
): void {
  if (id === EMPTY_ID) {
    if (count !== 0) throw new RangeError('「なし」の個数は 0 です')
  } else {
    const countProblem = validateItemCount(count, max)
    if (countProblem) throw new RangeError(countProblem)
  }
  writeU16(bytes, offset, id)
  writeU16(bytes, offset + 2, count)
}
