import { describe, expect, it } from 'vitest'
import { readF32, readI16, readU32, readUtf16Fixed, writeF32, writeI16, writeU32, writeU8, writeUtf16Fixed } from './binary'

describe('i16（リトルエンディアン ✅ save_format/README.md §2）', () => {
  it('負の値を 2 の補数の LE で読み書きする', () => {
    const b = new Uint8Array(2)
    writeI16(b, 0, -2)
    expect([...b]).toEqual([0xfe, 0xff])
    expect(readI16(b, 0)).toBe(-2)
    writeI16(b, 0, 0x7fff)
    expect(readI16(b, 0)).toBe(32767)
  })

  it('i16 の範囲外は拒否する', () => {
    const b = new Uint8Array(2)
    expect(() => writeI16(b, 0, 32768)).toThrow(RangeError)
    expect(() => writeI16(b, 0, -32769)).toThrow(RangeError)
    expect([...b]).toEqual([0, 0])
  })
})

describe('u32 / f32（リトルエンディアン ✅ save_format/README.md §2）', () => {
  it('u32 を LE で読み書きする', () => {
    const b = new Uint8Array(8)
    writeU32(b, 2, 0x12345678)
    expect([...b.slice(2, 6)]).toEqual([0x78, 0x56, 0x34, 0x12])
    expect(readU32(b, 2)).toBe(0x12345678)
  })

  it('f32 を LE で読み書きする', () => {
    const b = new Uint8Array(4)
    writeF32(b, 0, 100)
    expect([...b]).toEqual([0x00, 0x00, 0xc8, 0x42])
    expect(readF32(b, 0)).toBe(100)
  })

  it('範囲外・型の範囲外の書き込みは拒否する', () => {
    const b = new Uint8Array(4)
    expect(() => writeU32(b, 1, 0)).toThrow(RangeError)
    expect(() => writeU32(b, 0, -1)).toThrow(RangeError)
    expect(() => writeU32(b, 0, 2 ** 32)).toThrow(RangeError)
    expect(() => writeU8(b, 0, 256)).toThrow(RangeError)
    expect([...b]).toEqual([0, 0, 0, 0])
  })
})

describe('固定長 UTF-16LE', () => {
  it('書いた文字列を読み戻せ、残りは 0 で埋まる', () => {
    const b = new Uint8Array(16).fill(0xaa)
    writeUtf16Fixed(b, 0, 16, '侍A')
    expect([...b.slice(0, 6)]).toEqual([0x8d, 0x4f, 0x41, 0x00, 0x00, 0x00])
    expect(b.slice(6).every((x) => x === 0)).toBe(true)
    expect(readUtf16Fixed(b, 0, 16)).toEqual({ text: '侍A', terminated: true, paddingClean: true })
  })

  it('終端を含めて収まらない文字列は拒否する', () => {
    const b = new Uint8Array(8)
    expect(() => writeUtf16Fixed(b, 0, 8, 'abcd')).toThrow(RangeError)
    expect(() => writeUtf16Fixed(b, 0, 8, 'abc')).not.toThrow()
  })

  it('終端がない・終端以降にゴミがあることを検出する', () => {
    const noTerm = new Uint8Array([0x41, 0, 0x42, 0])
    expect(readUtf16Fixed(noTerm, 0, 4).terminated).toBe(false)
    const dirty = new Uint8Array([0x41, 0, 0, 0, 0x01, 0])
    expect(readUtf16Fixed(dirty, 0, 6)).toMatchObject({ text: 'A', terminated: true, paddingClean: false })
  })
})
