// 武器箪笥の本数と容量。
// 出典：docs/save_format/chunks/weapon-record（武器箪笥 200件 ✅ [TS][I-2][I-3]、本数と容量 🟢）。
//
// 固定オフセットを使い、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
//
//   0xACF4 + n * 0xA0（n = 0〜199）  武器箪笥のレコード（🟢 本当の先頭。[TS] の 0xACEE + 0x06）。200件分は常にある 🟢
//   0x129F4 i16  🟢 武器箪笥に入っている武器の本数
//   0x129F6 i8   🟢 武器箪笥の容量 ÷ 10。新しく始めたとき 2（20本）、上限 20（200本）。
//                ゲームは先頭から「容量」件の中だけで空きを探し、本数が容量以上なら入れない
// 書き込みの反映は要ゲーム内確認。
import { readI16, readI8, writeI16, writeU8 } from './binary'
import { warningsOf, type ViewStatus } from './field'
import { assertWritable, checkLayout } from './layout'
import { WEAPON_RECORD_BYTES, isEmptyWeapon, readWeapon, type WeaponView } from './weapon'

export const WEAPON_CHEST_OFFSET = 0xacf4
export const WEAPON_CHEST_SLOTS = 200
export const WEAPON_CHEST_COUNT = 0x129f4
export const WEAPON_CHEST_CAPACITY = 0x129f6
/** 🟢 容量の値（÷10）の範囲。2 は新しく始めたときの値、20 はゲームが足すときの上限 */
export const CAPACITY_MIN = 2
export const CAPACITY_MAX = 20
export const CAPACITY_UNIT = 10

export function weaponChestOffset(index: number): number {
  if (!Number.isInteger(index) || index < 0 || index >= WEAPON_CHEST_SLOTS) throw new RangeError("武器箪笥の番号が範囲外です")
  return WEAPON_CHEST_OFFSET + index * WEAPON_RECORD_BYTES
}

/** warnings は、本数が空きでないレコードの数と合わないとき */
export type WeaponChestView = ViewStatus & {
  /** 本数（0x129F4） */
  count: number
  /** 容量 ÷ 10（0x129F6、符号付き） */
  capacity: number
  /** 空きでないレコードの番号（200件すべてから） */
  filled: number[]
}

export function readWeaponChest(bytes: Uint8Array): WeaponChestView {
  if (bytes.byteLength < WEAPON_CHEST_CAPACITY + 1) throw new RangeError('ファイルが小さすぎて武器箪笥を読めません')
  const layoutProblem = checkLayout(bytes)
  const count = readI16(bytes, WEAPON_CHEST_COUNT)
  const capacity = readI8(bytes, WEAPON_CHEST_CAPACITY)
  const filled: number[] = []
  for (let i = 0; i < WEAPON_CHEST_SLOTS; i++) if (!isEmptyWeapon(bytes, weaponChestOffset(i))) filled.push(i)

  let problem: string | null = null
  if (capacity < CAPACITY_MIN || capacity > CAPACITY_MAX) problem = "容量が想定外です"
  else if (count < 0 || count > WEAPON_CHEST_SLOTS) problem = "本数が想定外です"
  const countWarning =
    count === filled.length ? null : `本数（${count}）が、武器が入っている枠の数（${filled.length}）と合いません`
  return { count, capacity, filled, problem: layoutProblem ?? problem, warnings: warningsOf(countWarning) }
}

/** 200枠すべての武器（容量の外の枠も含む）。各武器の書き込みは weapon.ts の関数に weaponChestOffset(i) を渡す */
export function readWeaponChestWeapons(bytes: Uint8Array): WeaponView[] {
  if (bytes.byteLength < WEAPON_CHEST_COUNT) throw new RangeError('ファイルが小さすぎて武器箪笥を読めません')
  const layoutProblem = checkLayout(bytes)
  return Array.from({ length: WEAPON_CHEST_SLOTS }, (_, i) => readWeapon(bytes, weaponChestOffset(i), layoutProblem))
}

/** 容量の値（÷10）を検証する。武器が入っている枠と本数が、新しい容量に収まること */
export function validateWeaponChestCapacity(view: WeaponChestView, capacity: number): string | null {
  if (!Number.isInteger(capacity) || capacity < CAPACITY_MIN || capacity > CAPACITY_MAX)
    return `容量は ${CAPACITY_MIN * CAPACITY_UNIT}〜${CAPACITY_MAX * CAPACITY_UNIT} 本（10本単位）です`
  const slots = capacity * CAPACITY_UNIT
  const outside = view.filled.find((i) => i >= slots)
  if (outside !== undefined) return `${outside + 1}枠目に武器が入っているので、容量を ${slots} 本にできません`
  if (view.count > slots) return `本数（${view.count}）が容量 ${slots} 本を超えます`
  return null
}

/** 🟢 容量（0x129F6 の i8。値は容量 ÷ 10）を書く。反映は要ゲーム内確認 */
export function writeWeaponChestCapacity(bytes: Uint8Array, capacity: number): void {
  assertWritable(bytes)
  const view = readWeaponChest(bytes)
  if (view.problem) throw new RangeError(view.problem)
  const error = validateWeaponChestCapacity(view, capacity)
  if (error) throw new RangeError(error)
  writeU8(bytes, WEAPON_CHEST_CAPACITY, capacity)
}

/** 🔶 本数（0x129F4）を、武器が入っている枠の数に合わせる。反映は要ゲーム内確認 */
export function writeWeaponChestCountToFilled(bytes: Uint8Array): void {
  assertWritable(bytes)
  const view = readWeaponChest(bytes)
  if (view.problem) throw new RangeError(view.problem)
  if (view.filled.length > view.capacity * CAPACITY_UNIT) throw new RangeError('武器が入っている枠の数が容量を超えています')
  writeI16(bytes, WEAPON_CHEST_COUNT, view.filled.length)
}
