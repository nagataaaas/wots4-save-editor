// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 値は解析ノート §3.5 のシナリオ差分（[U] 2026-10-05）で見たもの。
// 代官所（0x37FA）・居留地（0x3764）の門と神社入口の柵（0x37C3）は、書き換えで開くことを確認（✅ [U] 2026-10-06）。
// 0x377F は柵と推定していたが、柵の開閉には関係なかった（❓）
import { describe, expect, it } from 'vitest'
import { writeU8 } from './binary'
import { TS_SAVE_SIZE } from './hero'
import { WORLD_FLAGS, readWorldFlags, writeWorldFlag } from './world-flags'

const offsets = WORLD_FLAGS.map((f) => f.offset)

/** 04 copy 11（根無し草、大寄せのあと。3つの門がすべて閉じている）のフラグ。WORLD_FLAGS の順 */
const NO_ROUTE = [1, 1, 1, 0, 1, 1, 1, 2]

function makeSave(values: number[], size = TS_SAVE_SIZE): Uint8Array {
  const b = new Uint8Array(size)
  offsets.forEach((off, i) => writeU8(b, off, values[i]))
  return b
}

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i)
  return out
}

describe('門・柵のフラグ §3.5', () => {
  it('並びのとおりに読む', () => {
    expect(readWorldFlags(makeSave(NO_ROUTE))).toEqual({ values: NO_ROUTE, problem: null })
  })

  it('見た値より大きければ読み取り専用にする（0x37A2 だけは 2 まで）', () => {
    expect(readWorldFlags(makeSave([2, 1, 1, 0, 1, 1, 1, 2])).problem).not.toBeNull()
    expect(readWorldFlags(makeSave([1, 1, 1, 0, 1, 1, 1, 3])).problem).not.toBeNull()
  })

  it('❓ U-1：サイズが 0x48BB0 でなければ読み取り専用にする', () => {
    expect(readWorldFlags(makeSave(NO_ROUTE, TS_SAVE_SIZE + 4)).problem).not.toBeNull()
  })

  it('✅ [U] 門を開ける書き込みは、その門の1バイトだけを変える（代官所 0x37FA・居留地 0x3764・神社入口の柵 0x37C3）', () => {
    for (const [index, offset] of [
      [0, 0x37fa],
      [1, 0x3764],
      [2, 0x37c3],
    ]) {
      const before = makeSave(NO_ROUTE)
      const after = before.slice()
      writeWorldFlag(after, index, 0, { advanced: false })
      expect(diffOffsets(before, after)).toEqual([offset])
    }
  })

  it('通常モードは見た値の範囲だけ。上級者モードでは任意の u8', () => {
    const b = makeSave(NO_ROUTE)
    expect(() => writeWorldFlag(b, 3, 2, { advanced: false })).toThrow(RangeError)
    expect(() => writeWorldFlag(b, WORLD_FLAGS.length, 0, { advanced: false })).toThrow(RangeError)
    writeWorldFlag(b, 7, 2, { advanced: false })
    writeWorldFlag(b, 3, 2, { advanced: true })
    expect(b[0x377f]).toBe(2)
  })

  it('読み出し→書き戻しでバイト列が一致する', () => {
    const before = makeSave(NO_ROUTE)
    const after = before.slice()
    readWorldFlags(after).values.forEach((v, i) => writeWorldFlag(after, i, v, { advanced: false }))
    expect(diffOffsets(before, after)).toEqual([])
  })
})
