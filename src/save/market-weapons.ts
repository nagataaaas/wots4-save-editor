// 流通中の武器・道具・部品（読み取り専用）。
// 出典：docs/save_format/chunks/market-weapons（位置・並び・意味はすべて 🟢）。
//
// ❓ U-1 判定待ちのため、固定オフセット（案A）を使う。ファイルサイズが 0x48BB0 でなければ表示だけにとどめ、問題として示す。
//
//   0x440D8 + n * 0xA4（n = 0〜14）  🟢 武器。+0x00〜+0x9F は武器レコード、+0x94 i16 流通の経過の数、+0xA0 i32 持っている町の人の番号（−1 ＝ なし）
//   0x44A74 + n * 0x0C（n = 0〜9）   🟢 道具。+0x00 アイテム ID（負なら空き）、+0x08 i16 経過の数
//   0x44AEC + n * 0x14（n = 0〜99）  🟢 刃。+0x00 部品 ID（負なら空き）、+0x12 i16 経過の数
//   0x452BC + n * 0x10（n = 0〜99）  🟢 鍔。+0x0C i16 経過の数
//   0x458FC + n * 0x10（n = 0〜99）  🟢 柄。+0x0C i16 経過の数
//
// 周回の終わりの処理（🟢。ゲーム内では未確認）：経過の数 +1 → 武器が消える → 精錬 → 銘。
// 確率は「+1 したあとの経過の数」で決まる。
import { readI16, readU32 } from './binary'
import { checkLayout } from './hero'
import { WEAPON_RECORD_BYTES, isEmptyWeapon, readWeapon, type WeaponView } from './weapon'

export const MARKET_WEAPON_OFFSET = 0x440d8
export const MARKET_WEAPON_SLOTS = 15
export const MARKET_WEAPON_BYTES = 0xa4
/** 🟢 武器レコードの +0x94：流通の経過の数（i16。流通に入ったことのない武器は −1） */
export const MARKET_ELAPSED = 0x94
/** 🟢 武器レコードの後ろ 4 B：持っている町の人の番号（i32。−1 ＝ だれも持っていない） */
export const MARKET_HOLDER = WEAPON_RECORD_BYTES

/** 🟢 道具・刃・鍔・柄の記録。elapsed は経過の数の位置 */
export const MARKET_OTHERS = [
  { key: 'item', label: '道具', offset: 0x44a74, slots: 10, bytes: 0x0c, elapsed: 0x08 },
  { key: 'blade', label: '刃', offset: 0x44aec, slots: 100, bytes: 0x14, elapsed: 0x12 },
  { key: 'guard', label: '鍔', offset: 0x452bc, slots: 100, bytes: 0x10, elapsed: 0x0c },
  { key: 'grip', label: '柄', offset: 0x458fc, slots: 100, bytes: 0x10, elapsed: 0x0c },
] as const

/** 🟢 記録全体の終わり（含む） */
export const MARKET_END = 0x45f3b

export function marketWeaponOffset(index: number): number {
  if (!Number.isInteger(index) || index < 0 || index >= MARKET_WEAPON_SLOTS) throw new RangeError(`流通の武器の番号が範囲外です: ${index}`)
  return MARKET_WEAPON_OFFSET + index * MARKET_WEAPON_BYTES
}

/** 経過の数 e（+1 したあと）ごとの確率（%）。🟢 ゲーム内では未確認 */
const VANISH = [0, 0, 20, 33, 51]
const REFINE = [15, 20, 30, 60, 100]
const pick = (table: readonly number[], e: number) => (e <= 0 ? 0 : table[Math.min(e, table.length) - 1])

/** 🟢 次の周回の終わりに消える確率（%） */
export const vanishChance = (elapsed: number) => pick(VANISH, elapsed + 1)
/** 🟢 次の周回の終わりに（消えなければ）精錬される確率（%） */
export const refineChance = (elapsed: number) => pick(REFINE, elapsed + 1)

export type MarketWeaponEntry = {
  index: number
  offset: number
  /** 🟢 流通の経過の数（周回の終わりの数） */
  elapsed: number
  /** 🟢 持っている町の人の番号。null はだれも持っていない */
  holder: number | null
  weapon: WeaponView
}

export type MarketOtherSummary = { key: (typeof MARKET_OTHERS)[number]['key']; label: string; offset: number; slots: number; filled: number }

export type MarketView = {
  /** ファイルサイズが想定と違う（U-1）。値は表示するが位置がずれている可能性がある */
  layoutProblem: string | null
  /** 空きでない武器 */
  weapons: MarketWeaponEntry[]
  others: MarketOtherSummary[]
}

export function readMarket(bytes: Uint8Array): MarketView {
  if (bytes.byteLength <= MARKET_END) throw new RangeError('ファイルが小さすぎて流通の記録を読めません')
  const layoutProblem = checkLayout(bytes)
  const weapons: MarketWeaponEntry[] = []
  for (let i = 0; i < MARKET_WEAPON_SLOTS; i++) {
    const offset = marketWeaponOffset(i)
    if (isEmptyWeapon(bytes, offset)) continue
    const holder = readU32(bytes, offset + MARKET_HOLDER) | 0
    weapons.push({
      index: i,
      offset,
      elapsed: readI16(bytes, offset + MARKET_ELAPSED),
      holder: holder < 0 ? null : holder,
      // 編集はしないので、妥当性の問題は表示にだけ使う
      weapon: readWeapon(bytes, offset, layoutProblem),
    })
  }
  const others = MARKET_OTHERS.map((o) => {
    let filled = 0
    for (let i = 0; i < o.slots; i++) if (readI16(bytes, o.offset + i * o.bytes) >= 0) filled++
    return { key: o.key, label: o.label, offset: o.offset, slots: o.slots, filled }
  })
  return { layoutProblem, weapons, others }
}
