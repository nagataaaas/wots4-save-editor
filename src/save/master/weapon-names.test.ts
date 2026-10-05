// 武器名のマスター（weapon-names.ts）と、それを参照する ID 表（weapon-ids.ts）の表示名
import { describe, expect, it } from 'vitest'
import { SHEATHS, WEAPON_IDS, sheathName, weaponIdName } from '../weapon-ids'
import { WEAPON_NAMES, compareWeaponNames, weaponName, type WeaponKey } from './weapon-names'

describe('武器名のマスター', () => {
  it('ja・en を引ける。英語名がない（特殊武器）ときは ja で代用する', () => {
    expect(weaponName('中道刀')).toBe('中道刀')
    expect(weaponName('中道刀', 'en')).toBe('Basal Blade')
    expect(weaponName('虎爪')).toBe('虎爪（無手）')
    expect(weaponName('虎爪', 'en')).toBe('虎爪（無手）')
  })

  it('ja は読みの五十音順、en はアルファベット順に並ぶ', () => {
    const keys: WeaponKey[] = ['虎徹', '中道刀', '阿修羅', 'ハルユキ', '浅餓王']
    expect([...keys].sort((a, b) => compareWeaponNames(a, b))).toEqual(['浅餓王', '阿修羅', '虎徹', '中道刀', 'ハルユキ'])
    expect([...keys].sort((a, b) => compareWeaponNames(a, b, 'en'))).toEqual(['阿修羅', '中道刀', 'ハルユキ', '虎徹', '浅餓王'])
  })

  it('キーと ja の名前は1対1（同じ名前を二重に持たない）', () => {
    const ja = Object.values(WEAPON_NAMES).map((e) => e.ja)
    expect(new Set(ja).size).toBe(ja.length)
  })
})

describe('ID 表の表示名', () => {
  it('鞘は同じ鞘を使う刃の名前をつなぐ。鞘なしは「鞘なし」', () => {
    const sheath = (id: number) => SHEATHS.find((s) => s.id === id)!
    expect(sheathName(sheath(0x18))).toBe('中道刀・なまくら刀')
    expect(sheathName(sheath(0x18), 'en')).toBe('Basal Blade / Blunt Sword')
    expect(sheathName(sheath(0xffff))).toBe('鞘なし')
  })

  it('完成武器ID は [TS] の異字をパーツと同じ名前にまとめる。自作は「自作」', () => {
    const name = (id: number) => weaponIdName(WEAPON_IDS.find((w) => w.id === id)!)
    expect(name(0x0003)).toBe('数寄者')
    expect(name(0x0018)).toBe('ジョゼフィーヌ')
    expect(name(0x0036)).toBe('律儀')
    expect(name(0x0061)).toBe('蒼伯')
    expect(name(0xffff)).toBe('自作')
  })
})
