// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 値は解析ノート §3.5 のシナリオ差分（[U] 2026-10-05）で見たもの。
// 代官所（0x37FA）・居留地（0x3764）の門と神社入口の柵（0x37C3）は、書き換えで開くことを確認（✅ [U] 2026-10-06）。
import { describe, expect, it } from 'vitest'
import { writeU8 } from './binary'
import { TS_SAVE_SIZE } from './hero'
import { WORLD_FLAGS, readWorldFlags, writeWorldFlag } from './world-flags'

/** 04 copy 11（根無し草、大寄せのあと。3つの門がすべて閉じている）。WORLD_FLAGS の順 */
const NO_ROUTE = [1, 1, 1]

function makeSave(values: number[], size = TS_SAVE_SIZE): Uint8Array {
  const b = new Uint8Array(size)
  WORLD_FLAGS.forEach((f, i) => writeU8(b, f.offset, values[i]))
  // 意味の分からないバイト（UI に出さない）も実データどおりに置き、書き込みで変わらないことを見る
  writeU8(b, 0x37fb, 1)
  writeU8(b, 0x37a2, 2)
  return b
}

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i)
  return out
}

describe('門・柵のフラグ §3.5', () => {
  it('代官所・居留地の門と神社入口の柵を読む', () => {
    expect(WORLD_FLAGS.map((f) => f.offset)).toEqual([0x37fa, 0x3764, 0x37c3])
    expect(readWorldFlags(makeSave(NO_ROUTE))).toEqual({ values: [1, 1, 1], problem: null })
  })

  it('0・1 以外なら読み取り専用にする', () => {
    expect(readWorldFlags(makeSave([2, 1, 1])).problem).not.toBeNull()
  })

  it('❓ U-1：サイズが 0x48BB0 でなければ読み取り専用にする', () => {
    expect(readWorldFlags(makeSave(NO_ROUTE, TS_SAVE_SIZE + 4)).problem).not.toBeNull()
  })

  it('✅ [U] 開ける書き込みは、その門の1バイトだけを変える', () => {
    WORLD_FLAGS.forEach((f, i) => {
      const before = makeSave(NO_ROUTE)
      const after = before.slice()
      writeWorldFlag(after, i, 0, { advanced: false })
      expect(diffOffsets(before, after)).toEqual([f.offset])
    })
  })

  it('通常モードは 0・1 だけ。上級者モードでは任意の u8', () => {
    const b = makeSave(NO_ROUTE)
    expect(() => writeWorldFlag(b, 0, 2, { advanced: false })).toThrow(RangeError)
    expect(() => writeWorldFlag(b, WORLD_FLAGS.length, 0, { advanced: false })).toThrow(RangeError)
    writeWorldFlag(b, 0, 2, { advanced: true })
    expect(b[0x37fa]).toBe(2)
  })

  it('読み出し→書き戻しでバイト列が一致する', () => {
    const before = makeSave(NO_ROUTE)
    const after = before.slice()
    readWorldFlags(after).values.forEach((v, i) => writeWorldFlag(after, i, v, { advanced: false }))
    expect(diffOffsets(before, after)).toEqual([])
  })
})
