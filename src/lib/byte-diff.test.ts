import { describe, expect, it } from 'vitest'
import { changedByteOffsets, countChangedBytes, sameBytes } from './byte-diff'
import { diffRanges } from '@/save/raw'

describe('バイト列の比較', () => {
  it('配列の範囲だけを比較し、違う位置・件数・一致判定を揃える', () => {
    const a = new Uint8Array([9, 1, 2, 3, 9]).subarray(1, 4)
    const b = new Uint8Array([8, 1, 0, 4, 8]).subarray(1, 4)
    expect([...changedByteOffsets(a, b)]).toEqual([1, 2])
    expect(countChangedBytes(a, b)).toBe(2)
    expect(sameBytes(a, b)).toBe(false)
    expect(sameBytes(a, a.slice())).toBe(true)
    expect(countChangedBytes(new Uint8Array(), new Uint8Array())).toBe(0)
    expect(sameBytes(new Uint8Array(), new Uint8Array())).toBe(true)
  })

  it('長さの差も件数・一致判定に含め、生データの範囲比較は短い方までにする', () => {
    const a = new Uint8Array([1, 2])
    const b = new Uint8Array([1, 3, 0])
    expect(countChangedBytes(a, b)).toBe(2)
    expect(countChangedBytes(b, a)).toBe(2)
    expect(sameBytes(a, b)).toBe(false)
    expect(diffRanges(a, b)).toEqual({ ranges: [{ start: 1, end: 1 }], total: 1, truncated: false })
  })

  it('範囲を打ち切っても全体の件数を数える', () => {
    const a = new Uint8Array(6)
    const b = new Uint8Array([1, 1, 0, 2, 0, 3])
    expect(diffRanges(a, b, 1)).toEqual({ ranges: [{ start: 0, end: 1 }], total: 4, truncated: true })
    expect(diffRanges(a, b, 0)).toEqual({ ranges: [], total: 4, truncated: true })
  })
})
