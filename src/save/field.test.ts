import { describe, expect, it } from 'vitest'
import { validateRange } from './field'

const NORMAL = { advanced: false }
const ADVANCED = { advanced: true }

describe('validateRange（整数か・格納できる範囲・通常モードの上限）', () => {
  const spec = { systemMax: 0xff, normalMax: 99 }

  it('通常モードは 0〜normalMax、上級者モードは 0〜systemMax を通す', () => {
    for (const v of [0, 50, 99]) expect(validateRange(v, spec, NORMAL)).toBeNull()
    for (const v of [0, 100, 255]) expect(validateRange(v, spec, ADVANCED)).toBeNull()
  })

  it('通常モードで上限を超えると、上級者モードなら書けることも伝える', () => {
    expect(validateRange(100, spec, NORMAL)).toBe('0〜99 の整数を入力してください（上級者モードでは範囲を超えて書けます）')
    expect(validateRange(256, spec, NORMAL)).toBe('0〜99 の整数を入力してください')
    expect(validateRange(256, spec, ADVANCED)).toBe('0〜255 の整数を入力してください')
  })

  it('整数でない値・負の値は拒否する', () => {
    for (const v of [1.5, NaN, Infinity, -1]) {
      expect(validateRange(v, spec, NORMAL)).toBe('0〜99 の整数を入力してください')
      expect(validateRange(v, spec, ADVANCED)).toBe('0〜255 の整数を入力してください')
    }
  })

  it('下限・上級者モードの下限と、桁区切り', () => {
    const day = { min: 1, normalMax: 99, systemMin: 1, systemMax: 655 }
    expect(validateRange(0, day, ADVANCED)).toBe('1〜655 の整数を入力してください')
    expect(validateRange(1, day, NORMAL)).toBeNull()
    expect(validateRange(100_000, { systemMax: 0xffff_ffff, normalMax: 99_999 }, NORMAL))
      .toBe('0〜99,999 の整数を入力してください（上級者モードでは範囲を超えて書けます）')
  })

  it('integer: false は小数を通し、有限でない値は「数値を入力してください」', () => {
    const f = { systemMin: -1e38, systemMax: 1e38, normalMax: 10, integer: false }
    expect(validateRange(2.5, f, NORMAL)).toBeNull()
    expect(validateRange(-2.5, f, ADVANCED)).toBeNull()
    expect(validateRange(-2.5, f, NORMAL)).toBe('0〜10 の数値を入力してください（上級者モードでは範囲を超えて書けます）')
    expect(validateRange(NaN, f, ADVANCED)).toBe('数値を入力してください')
  })
})
