// 流通中の武器・道具・部品（読み取り専用）。
// 出典：docs/save_format/chunks/market-weapons（位置・並び・意味はすべて 🟢）。
//
// 固定オフセットを使う。ファイルサイズが 0x48BB0 でなければ表示だけにとどめ、問題として示す。
//
//   0x440D8 + n * 0xA4（n = 0〜14）  🟢 武器。+0x00〜+0x9F は武器レコード、+0x94 i16 流通の経過の数、+0xA0 i32 持っている町の人の番号（−1 ＝ なし）
//   0x44A74 + n * 0x0C（n = 0〜9）   🟢 道具。+0x00〜+0x07 は手持ちの道具の枠の写し（+0x00 アイテム ID、負なら空き。+0x02 個数 ✅ items）、+0x08 i16 経過の数
//   0x44AEC + n * 0x14（n = 0〜99）  🟢 刃。+0x00 部品 ID（負なら空き）、+0x12 i16 経過の数。+0x02〜+0x11 は 🔶 持っている部品の1件の残り（意味は ❓）
//   0x452BC + n * 0x10（n = 0〜99）  🟢 鍔。+0x0C i16 経過の数。+0x02〜+0x0B は同上（❓）
//   0x458FC + n * 0x10（n = 0〜99）  🟢 柄。+0x0C i16 経過の数。+0x02〜+0x0B は同上（❓）
//
// 周回の終わりの処理（🟢。ゲーム内では未確認）：経過の数 +1 → 武器が消える → 精錬 → 銘。
// 確率は「+1 したあとの経過の数」で決まる。道具・部品は経過では消えない。
import { readI16, readU16, readU32 } from './binary'
import { checkLayout } from './hero'
import { itemLabel } from './item-box'
import { WEAPON_RECORD_BYTES, isEmptyWeapon, partId, readWeapon, type WeaponView } from './weapon'
import { BLADES, GRIPS, GUARDS, partName, type PartOption } from './weapon-ids'

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

export type MarketOtherKey = (typeof MARKET_OTHERS)[number]['key']

/** 道具・刃・鍔・柄の1件（空きでないもの） */
export type MarketOtherEntry = {
  index: number
  offset: number
  /** アイテム ID・部品 ID */
  id: number
  /** 表にあれば名前。未知の ID は null */
  label: string | null
  /** 道具だけ：✅ 個数（手持ちの枠の +0x02）。部品は null */
  count: number | null
  /** 🟢 流通の経過の数 */
  elapsed: number
  /** ❓ 意味の分かっていない残りのバイト（ID・個数・経過の数を除く）。16進で表示する */
  rest: Uint8Array
}

export type MarketOtherSummary = {
  key: MarketOtherKey
  label: string
  offset: number
  slots: number
  filled: number
  entries: MarketOtherEntry[]
}

const PART_TABLES: Record<Exclude<MarketOtherKey, 'item'>, readonly PartOption[]> = { blade: BLADES, guard: GUARDS, grip: GRIPS }

/** 部品 ID（u16）から名前。表の値は 3 B のこともあるので、partId で ID に直して引く */
function partLabel(key: Exclude<MarketOtherKey, 'item'>, id: number): string | null {
  const hit = PART_TABLES[key].find((p) => partId(key, p.value, p.source) === id)
  return hit ? partName(hit) : null
}

function readOther(bytes: Uint8Array, o: (typeof MARKET_OTHERS)[number], index: number): MarketOtherEntry {
  const offset = o.offset + index * o.bytes
  const id = readU16(bytes, offset)
  const isItem = o.key === 'item'
  // 道具は +0x02 の個数を別に出す。残りは ID・個数・経過の数を除いた範囲
  const restStart = isItem ? 0x04 : 0x02
  const rest = new Uint8Array([...bytes.subarray(offset + restStart, offset + o.elapsed), ...bytes.subarray(offset + o.elapsed + 2, offset + o.bytes)])
  return {
    index,
    offset,
    id,
    label: isItem ? itemLabel(id) : partLabel(o.key, id),
    count: isItem ? readU16(bytes, offset + 0x02) : null,
    elapsed: readI16(bytes, offset + o.elapsed),
    rest,
  }
}

export type MarketView = {
  /** ファイルサイズが想定と違う。値は表示するが位置がずれている可能性がある */
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
  const others = MARKET_OTHERS.map((o): MarketOtherSummary => {
    const entries: MarketOtherEntry[] = []
    // 🟢 先頭の i16 が負なら空き
    for (let i = 0; i < o.slots; i++) if (readI16(bytes, o.offset + i * o.bytes) >= 0) entries.push(readOther(bytes, o, i))
    return { key: o.key, label: o.label, offset: o.offset, slots: o.slots, filled: entries.length, entries }
  })
  return { layoutProblem, weapons, others }
}
