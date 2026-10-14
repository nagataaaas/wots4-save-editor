import { describe, expect, it } from 'vitest'
import { integerValue, parseDecimal, parseInteger } from './parse'

describe('整数の入力', () => {
  it('10進を既定にし、符号と16進は明示した欄だけで受け付ける', () => {
    expect(integerValue(' 42 ')).toBe(42)
    expect(integerValue('-2')).toBeNull()
    expect(integerValue('-2', { signed: true })).toBe(-2)
    expect(integerValue('0xFF')).toBeNull()
    expect(integerValue('0xFF', { hex: true })).toBe(255)
    expect(integerValue('2F', { radix: 16 })).toBe(47)
    expect(integerValue('0X2F', { radix: 16 })).toBe(47)
  })
  it.each(['', ' ', '1.5', '1e3', '12abc', 'Infinity', '9007199254740993'])('丸めや部分的な読み取りを起こす入力 %s を拒否する', input => {
    expect(integerValue(input)).toBeNull()
  })
  it('欄の範囲検証と入力形式のエラーを保つ', () => {
    const validate = (v: number) => v > 10 ? '最大10' : null
    expect(parseInteger('10', validate)).toEqual({ ok: true, value: 10 })
    expect(parseInteger('11', validate)).toEqual({ ok: false, error: '最大10' })
    expect(parseInteger('x', validate, { error: '整数のみ' })).toEqual({ ok: false, error: '整数のみ' })
  })
})

describe('小数の入力', () => {
  it('0以上の10進の小数だけを受け付け、欄の範囲検証を保つ', () => {
    const validate = (v: number) => v > 10 ? '最大10' : null
    expect(parseDecimal(' 1.5 ', validate)).toEqual({ ok: true, value: 1.5 })
    expect(parseDecimal('10', validate)).toEqual({ ok: true, value: 10 })
    expect(parseDecimal('10.5', validate)).toEqual({ ok: false, error: '最大10' })
    for (const input of ['', '-1', '1e3', '.5', '1.', '0x1', 'Infinity'])
      expect(parseDecimal(input, validate)).toEqual({ ok: false, error: '数値を入力してください' })
    expect(parseDecimal('x', validate, { error: '0以上の数値' })).toEqual({ ok: false, error: '0以上の数値' })
  })
})
