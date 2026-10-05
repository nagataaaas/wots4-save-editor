// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 値は解析ノート §3.5 のシナリオ差分（[U] 2026-10-05）で見たもの。どれも 🔶（門かどうかは要ゲーム内確認）
import { describe, expect, it } from 'vitest'
import { writeU8 } from './binary'
import { TS_SAVE_SIZE } from './hero'
import { WORLD_FLAGS, readWorldFlags, writeWorldFlag } from './world-flags'

function makeSave(values: number[], size = TS_SAVE_SIZE): Uint8Array {
  const b = new Uint8Array(size)
  WORLD_FLAGS.forEach((f, i) => writeU8(b, f.offset, values[i]))
  return b
}

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i)
  return out
}

/** 04 copy 11（根無し草、大寄せのあと）：柵 0、0x37FA・0x37FB とも 01 */
const NO_ROUTE = [0, 1, 1]

describe('門・柵のフラグ候補 🔶 §3.5', () => {
  it('0x377F・0x37FA・0x37FB を読む', () => {
    expect(readWorldFlags(makeSave(NO_ROUTE))).toEqual({ values: [0, 1, 1], problem: null })
  })

  it('0・1 以外なら読み取り専用にする', () => {
    expect(readWorldFlags(makeSave([0, 2, 1])).problem).not.toBeNull()
  })

  it('❓ U-1：サイズが 0x48BB0 でなければ読み取り専用にする', () => {
    expect(readWorldFlags(makeSave(NO_ROUTE, TS_SAVE_SIZE + 4)).problem).not.toBeNull()
  })

  it('1つの書き込みはそのフラグの1バイトだけを変える（要ゲーム内確認）', () => {
    const before = makeSave(NO_ROUTE)
    const after = before.slice()
    writeWorldFlag(after, 1, 0, { advanced: false })
    expect(diffOffsets(before, after)).toEqual([0x37fa])
  })

  it('通常モードは 0・1 だけ。上級者モードでは任意の u8', () => {
    const b = makeSave(NO_ROUTE)
    expect(() => writeWorldFlag(b, 0, 2, { advanced: false })).toThrow(RangeError)
    expect(() => writeWorldFlag(b, 3, 0, { advanced: false })).toThrow(RangeError)
    writeWorldFlag(b, 0, 2, { advanced: true })
    expect(b[0x377f]).toBe(2)
  })

  it('読み出し→書き戻しでバイト列が一致する', () => {
    const before = makeSave(NO_ROUTE)
    const after = before.slice()
    readWorldFlags(after).values.forEach((v, i) => writeWorldFlag(after, i, v, { advanced: false }))
    expect(diffOffsets(before, after)).toEqual([])
  })
})
