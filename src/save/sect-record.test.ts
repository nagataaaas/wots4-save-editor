import { describe, expect, it } from 'vitest'
import { readI16, writeI16 } from './binary'
import { sectRecordCodec, scrollSlotCodec, SCROLL_SLOT_BYTES } from './sect-record'

describe('🟢 流派・俺流と書の共通レコード（chunks/styles・custom-style・sect-scrolls）', () => {
  it('先頭8 Bを読み書きし、ID・後続の名前や技の表を維持する', () => {
    const bytes = new Uint8Array(80).fill(0xa5)
    for (const [offset, value] of [[0, 108], [2, 300], [4, 1], [6, 7]]) writeI16(bytes, offset, value)
    const before = bytes.slice()
    const values = sectRecordCodec.read(bytes, 0)
    expect(values).toEqual({ id: 108, mastery: 300, rank: 1, kills: 7 })
    sectRecordCodec.writeValues(bytes, 0, values)
    expect(bytes).toEqual(before)
    sectRecordCodec.writeValues(bytes, 0, { mastery: 1000, rank: 2, kills: 8 })
    expect(readI16(bytes, 0)).toBe(108)
    expect(bytes.subarray(8)).toEqual(before.subarray(8))
  })
  it('不正な数値が含まれると、先に検証して何も書かない', () => {
    const bytes = new Uint8Array(80).fill(0xa5)
    const before = bytes.slice()
    expect(() => sectRecordCodec.writeValues(bytes, 0, { mastery: 100, rank: 6, kills: 7 })).toThrow()
    expect(bytes).toEqual(before)
  })
  it('書の1枠だけを作成・読み出し・初期化する', () => {
    const bytes = new Uint8Array(SCROLL_SLOT_BYTES * 3).fill(0xa5)
    const before = bytes.slice()
    scrollSlotCodec.writeCustom(bytes, SCROLL_SLOT_BYTES, 1000)
    expect(scrollSlotCodec.read(bytes, SCROLL_SLOT_BYTES)).toEqual({ scrollNo: -1, customId: 1000 })
    scrollSlotCodec.clear(bytes, SCROLL_SLOT_BYTES)
    expect(scrollSlotCodec.read(bytes, SCROLL_SLOT_BYTES)).toEqual({ scrollNo: -1, customId: -1 })
    expect(bytes.subarray(0, SCROLL_SLOT_BYTES)).toEqual(before.subarray(0, SCROLL_SLOT_BYTES))
    expect(bytes.subarray(SCROLL_SLOT_BYTES * 2)).toEqual(before.subarray(SCROLL_SLOT_BYTES * 2))
  })
})
