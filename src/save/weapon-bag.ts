// 武器袋（10本）。
// 出典：docs/save_format/chunks/weapon-record（武器袋 10件 ✅ [TS][I-2][I-3]）。
//
// 固定オフセットを使い、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
//
//   0xA6B0 + n * 0xA0（n = 0〜9）  武器袋のレコード（🟢 本当の先頭。[TS] の 0xA6AA + 0x06）。
//   直前の 0xA6A8〜0xA6AF は帯刀の状態、直後の 0xACF0〜0xACF3 は隙間（どちらも書かない）。
// 武器袋には本数の値がない（武器を作る・消す機能はないので、空き枠は編集しない）。
import { tr } from '@/lib/i18n'
import { type ViewStatus } from './field'
import { checkLayout } from './layout'
import { WEAPON_RECORD_BYTES, readWeapon, type WeaponView } from './weapon'

export const WEAPON_BAG_OFFSET = 0xa6b0 // ✅ [TS][I-2][I-3] の 0xA6AA ＋ 🟢 0x06
export const WEAPON_BAG_COUNT = 10

export function weaponBagOffset(index: number): number {
  if (!Number.isInteger(index) || index < 0 || index >= WEAPON_BAG_COUNT) throw new RangeError(tr({ ja: "武器袋の番号が範囲外です", en: "Weapon sack slot out of range" }))
  return WEAPON_BAG_OFFSET + index * WEAPON_RECORD_BYTES
}

export type WeaponBagView = ViewStatus & {
  weapons: WeaponView[]
}

export function readWeaponBag(bytes: Uint8Array): WeaponBagView {
  if (bytes.byteLength < WEAPON_BAG_OFFSET + WEAPON_BAG_COUNT * WEAPON_RECORD_BYTES) throw new RangeError(tr({ ja: 'ファイルが小さすぎて武器袋を読めません', en: 'The file is too small to read the weapon sack.' }))
  const layoutProblem = checkLayout(bytes)
  const weapons = Array.from({ length: WEAPON_BAG_COUNT }, (_, i) => readWeapon(bytes, weaponBagOffset(i), layoutProblem))
  return { warnings: [], problem: layoutProblem, weapons }
}
