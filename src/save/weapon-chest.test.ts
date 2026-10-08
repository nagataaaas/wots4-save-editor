// 武器箪笥の本数と容量（🟢）。合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
import { describe, expect, it } from 'vitest'
import { TS_SAVE_SIZE } from './hero'
import {
  WEAPON_CHEST_CAPACITY,
  WEAPON_CHEST_COUNT,
  WEAPON_CHEST_SLOTS,
  readWeaponChest,
  weaponChestOffset,
  writeWeaponChestCapacity,
  writeWeaponChestCountToFilled,
} from './weapon-chest'

/** 武器箪笥の 200 枠を空きにし、filled の枠にだけ武器を入れる。本数 count、容量 capacity（÷10） */
function makeSave(filled: number[], count = filled.length, capacity = 2): Uint8Array {
  const b = new Uint8Array(TS_SAVE_SIZE)
  for (let i = 0; i < WEAPON_CHEST_SLOTS; i++) b.fill(0xff, weaponChestOffset(i) + 0x02, weaponChestOffset(i) + 0x0a)
  for (const i of filled) b.set([0x06, 0x00, 0x18, 0x00, 0x0d, 0x00, 0x0c, 0x00], weaponChestOffset(i) + 0x02)
  b.set([count & 0xff, count >> 8], WEAPON_CHEST_COUNT)
  b[WEAPON_CHEST_CAPACITY] = capacity
  return b
}

const diff = (a: Uint8Array, b: Uint8Array) => [...a.keys()].filter((i) => a[i] !== b[i])

describe('🟢 武器箪笥の本数と容量', () => {
  it('位置：箪笥は 0xACF4 から 0xA0 × 200 件、直後に本数（i16）と容量÷10（i8）', () => {
    expect(weaponChestOffset(0)).toBe(0xacf4)
    expect(weaponChestOffset(199) + 0xa0).toBe(WEAPON_CHEST_COUNT)
    expect(WEAPON_CHEST_CAPACITY).toBe(0x129f6)
  })

  it('本数・容量・武器が入っている枠を読む。本数が枠の数と合わなければ警告する', () => {
    const b = makeSave([0, 3, 7], 3, 14)
    expect(readWeaponChest(b)).toMatchObject({ count: 3, capacity: 14, filled: [0, 3, 7], problem: null, countWarning: null })
    b[WEAPON_CHEST_COUNT] = 5
    expect(readWeaponChest(b).countWarning).not.toBeNull()
  })

  it('容量を書く：20〜200本（値 2〜20）。武器が入っている枠と本数が収まらなければ拒否し、バイト列を変えない', () => {
    const before = makeSave([0, 25], 2, 3)
    const b = before.slice()
    expect(() => writeWeaponChestCapacity(b, 2)).toThrow() // 26枠目に武器がある
    expect(() => writeWeaponChestCapacity(b, 1)).toThrow()
    expect(() => writeWeaponChestCapacity(b, 21)).toThrow()
    expect(diff(before, b)).toEqual([])
    writeWeaponChestCapacity(b, 20)
    expect(diff(before, b)).toEqual([WEAPON_CHEST_CAPACITY])
    expect(readWeaponChest(b).capacity).toBe(20)
    // 読み出し→書き戻しで元に戻る
    writeWeaponChestCapacity(b, 3)
    expect(diff(before, b)).toEqual([])
  })

  it('容量の値が想定外（i8 として 2〜20 の外）なら読み取り専用', () => {
    const b = makeSave([], 0, 0xff)
    expect(readWeaponChest(b)).toMatchObject({ capacity: -1, problem: expect.any(String) })
    expect(() => writeWeaponChestCapacity(b, 2)).toThrow()
  })

  it('🔶 本数を武器が入っている枠の数に合わせる。そのバイトだけを変える', () => {
    const before = makeSave([1, 2], 9, 2)
    const b = before.slice()
    writeWeaponChestCountToFilled(b)
    expect(diff(before, b)).toEqual([WEAPON_CHEST_COUNT])
    expect(readWeaponChest(b)).toMatchObject({ count: 2, countWarning: null })
  })

  it('ファイルサイズが違えば読み取り専用（U-1）', () => {
    const b = new Uint8Array(TS_SAVE_SIZE + 4)
    b.set(makeSave([]))
    expect(readWeaponChest(b).problem).not.toBeNull()
    expect(() => writeWeaponChestCapacity(b, 3)).toThrow()
  })
})
