// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 値は [U] 2026-10-06 の比較（解析ノート §9.8）で見たもの。
// 🔶 0x375D〜0x375F が施設の状態の候補。どのバイトがどの施設か、1 の意味は ❓（要ゲーム内確認）。
import { describe, expect, it } from 'vitest'
import { writeU8 } from './binary'
import { TS_SAVE_SIZE } from './hero'
import { FACILITY_FLAGS, readFacilityFlags, writeFacilityFlag } from './facility-flags'

/** 🔶 sample/S4-DATA_03（病院＝開・語学所＝開・カジノ＝閉）の値 */
const CHANGED = [1, 1, 1]
/** 🔶 sample/S4-DATA_01 copy 6（3つとも初期状態）の値 */
const INITIAL = [0, 0, 0]

function makeSave(values: number[], size = TS_SAVE_SIZE): Uint8Array {
  const b = new Uint8Array(size)
  FACILITY_FLAGS.forEach((f, i) => writeU8(b, f.offset, values[i]))
  // 前後のバイト（03 で 0x3756＝2、0x3762〜0x3763＝1）も置き、書き込みで変わらないことを見る
  writeU8(b, 0x3756, 2)
  writeU8(b, 0x3762, 1)
  writeU8(b, 0x3763, 1)
  return b
}

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i)
  return out
}

describe('🔶 施設のフラグの候補 §9.8', () => {
  it('0x375D〜0x375F の3バイトを読む', () => {
    expect(FACILITY_FLAGS.map((f) => f.offset)).toEqual([0x375d, 0x375e, 0x375f])
    expect(readFacilityFlags(makeSave(CHANGED))).toEqual({ values: CHANGED, problem: null })
    expect(readFacilityFlags(makeSave(INITIAL))).toEqual({ values: INITIAL, problem: null })
  })

  it('0・1 以外なら読み取り専用にする', () => {
    expect(readFacilityFlags(makeSave([0, 2, 0])).problem).not.toBeNull()
  })

  it('❓ U-1：サイズが 0x48BB0 でなければ読み取り専用にする', () => {
    expect(readFacilityFlags(makeSave(INITIAL, TS_SAVE_SIZE + 4)).problem).not.toBeNull()
  })

  it('書き込みは、そのフラグの1バイトだけを変える', () => {
    FACILITY_FLAGS.forEach((f, i) => {
      const before = makeSave(INITIAL)
      const after = before.slice()
      writeFacilityFlag(after, i, 1, { advanced: false })
      expect(diffOffsets(before, after)).toEqual([f.offset])
    })
  })

  it('通常モードは 0・1 だけ。上級者モードでは任意の u8', () => {
    const b = makeSave(INITIAL)
    expect(() => writeFacilityFlag(b, 0, 2, { advanced: false })).toThrow(RangeError)
    expect(() => writeFacilityFlag(b, FACILITY_FLAGS.length, 0, { advanced: false })).toThrow(RangeError)
    writeFacilityFlag(b, 0, 2, { advanced: true })
    expect(b[0x375d]).toBe(2)
  })

  it('読み出し→書き戻しでバイト列が一致する', () => {
    const before = makeSave(CHANGED)
    const after = before.slice()
    readFacilityFlags(after).values.forEach((v, i) => writeFacilityFlag(after, i, v, { advanced: false }))
    expect(diffOffsets(before, after)).toEqual([])
  })
})
