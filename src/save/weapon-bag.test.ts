// 武器袋。合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
import { describe, expect, it } from 'vitest'
import { BELT_STATE } from './belt'
import { TS_SAVE_SIZE } from './hero'
import { WEAPON_FIELDS, writeWeaponName, writeWeaponNumber } from './weapon'
import { WEAPON_BAG_COUNT, WEAPON_BAG_OFFSET, readWeaponBag, weaponBagOffset } from './weapon-bag'
import { WEAPON_CHEST_OFFSET } from './weapon-chest'

/** 武器袋の 10 枠を空きにし、filled の枠にだけ武器（中道刀の部品、自作の名前 "A"）を入れる */
function makeSave(filled: number[]): Uint8Array {
  const b = new Uint8Array(TS_SAVE_SIZE)
  for (let i = 0; i < WEAPON_BAG_COUNT; i++) b.fill(0xff, weaponBagOffset(i) + 0x02, weaponBagOffset(i) + 0x0a)
  for (const i of filled) {
    const o = weaponBagOffset(i)
    b.fill(0xff, o, o + 2)
    b.set([0x06, 0x00, 0x18, 0x00, 0x0d, 0x00, 0x0c, 0x00], o + 0x02)
    b.set([0x01, 0x00, 0xff, 0xff, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00], o + 0x1c)
    b.set([0x41, 0x00], o + WEAPON_FIELDS.name)
    b.fill(0xff, o + WEAPON_FIELDS.nameNo, o + WEAPON_FIELDS.nameNo + 4)
    b.fill(0xff, o + WEAPON_FIELDS.title, o + WEAPON_FIELDS.title + 3)
  }
  // 前後の領域（帯刀の状態・隙間）に目印を入れ、書き込みで変わらないことを確かめる
  b.set([0x01, 0x00, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00], BELT_STATE.count)
  b.set([0x12, 0x34, 0x56, 0x78], 0xacf0)
  return b
}

const diff = (a: Uint8Array, b: Uint8Array) => [...a.keys()].filter((i) => a[i] !== b[i])

describe('武器袋', () => {
  it('✅ 位置：帯刀の状態（〜0xA6AF）の直後の 0xA6B0 から 0xA0 × 10 件、隙間 4 B を挟んで武器箪笥', () => {
    expect(WEAPON_BAG_OFFSET).toBe(BELT_STATE.count + 8)
    expect(weaponBagOffset(9) + 0xa0).toBe(0xacf0)
    expect(weaponBagOffset(9) + 0xa0 + 4).toBe(WEAPON_CHEST_OFFSET)
    expect(() => weaponBagOffset(10)).toThrow()
  })

  it('10 枠を読み、空き枠を見分ける', () => {
    const v = readWeaponBag(makeSave([0, 9]))
    expect(v.layoutProblem).toBeNull()
    expect(v.weapons.map((w) => w.empty)).toEqual([false, true, true, true, true, true, true, true, true, false])
    expect(v.weapons[0]).toMatchObject({ offset: 0xa6b0, problem: null, name: { value: 'A' } })
  })

  it('1本目・10本目を書くと、そのレコードの中だけが変わる（帯刀の状態・隙間・ほかの枠は変わらない）。書き戻すと元に戻る', () => {
    const before = makeSave([0, 9])
    for (const i of [0, 9]) {
      const o = weaponBagOffset(i)
      const b = before.slice()
      writeWeaponNumber(b, o, 'attack', 321)
      writeWeaponName(b, o, '袋')
      const changed = diff(before, b)
      expect(changed.length).toBeGreaterThan(0)
      expect(changed.every((x) => x >= o && x < o + 0xa0)).toBe(true)
      expect(readWeaponBag(b).weapons[i]).toMatchObject({ name: { value: '袋' }, numbers: { attack: { value: 321 } } })
      writeWeaponNumber(b, o, 'attack', 0)
      writeWeaponName(b, o, 'A')
      expect(diff(before, b)).toEqual([])
    }
  })

  it('空き枠は編集しない', () => {
    const b = makeSave([0])
    expect(() => writeWeaponNumber(b, weaponBagOffset(1), 'attack', 1)).toThrow()
  })

  it('ファイルサイズが違えば読み取り専用', () => {
    const b = new Uint8Array(TS_SAVE_SIZE + 4)
    b.set(makeSave([0]))
    const v = readWeaponBag(b)
    expect(v.layoutProblem).not.toBeNull()
    expect(v.weapons[0].problem).not.toBeNull()
    expect(() => writeWeaponNumber(b, weaponBagOffset(0), 'attack', 1)).toThrow()
  })
})
