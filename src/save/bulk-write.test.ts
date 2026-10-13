import { describe, expect, it } from 'vitest'
import { TS_SAVE_SIZE } from './layout'
import { EVENT_COUNT, writeEventStates, writeEventRecords } from './scenario-events'
import { OCCUPATION_STATE_COUNT, writeOccupationStates } from './occupation'
import { ACCESSORY_COUNT, APPEARANCE_BIT_COUNT, UNLOCK_COUNT, writeAccessoryFlags, writeAppearanceBits, writeUnlockStates } from './unlocks'

describe('一括書き込みの事前検証', () => {
  // イベント記録は 🔶、なりわいの状態は 🔶 上限999、特典の並びは 🔶 U-17。
  const writes = [
    (bytes: Uint8Array) => writeEventStates(bytes, [0, EVENT_COUNT], 1, { advanced: false }),
    (bytes: Uint8Array) => writeEventRecords(bytes, [0, EVENT_COUNT], 4, { advanced: false }),
    (bytes: Uint8Array) => writeOccupationStates(bytes, [171, OCCUPATION_STATE_COUNT], 1),
    (bytes: Uint8Array) => writeAccessoryFlags(bytes, [0, ACCESSORY_COUNT], 1),
    (bytes: Uint8Array) => writeAppearanceBits(bytes, [0, APPEARANCE_BIT_COUNT], true),
    (bytes: Uint8Array) => writeUnlockStates(bytes, [0, UNLOCK_COUNT], 2),
  ]
  it.each(writes)('後ろの対象が範囲外なら、先頭の対象も書き換えない (%#)', write => {
    const bytes = new Uint8Array(TS_SAVE_SIZE)
    const before = bytes.slice()
    expect(() => write(bytes)).toThrow(RangeError)
    expect(bytes.every((value, index) => value === before[index])).toBe(true)
  })

  it('🔶 上限999：後ろに通常モードで書けないなりわいがあっても、一部だけ書かれない', () => {
    const bytes = new Uint8Array(TS_SAVE_SIZE)
    const before = bytes.slice()
    expect(() => writeOccupationStates(bytes, [171, 0], 1)).toThrow(RangeError)
    expect(bytes.every((value, index) => value === before[index])).toBe(true)
  })

  it('空の一覧でも、不正なファイルサイズを拒否する', () => {
    const bytes = new Uint8Array(16)
    expect(() => writeAccessoryFlags(bytes, [], 1)).toThrow(/ファイルサイズ/)
    expect(() => writeAppearanceBits(bytes, [], true)).toThrow(/ファイルサイズ/)
    expect(() => writeUnlockStates(bytes, [], 2)).toThrow(/ファイルサイズ/)
    expect(() => writeOccupationStates(bytes, [], 1)).toThrow(/ファイルサイズ/)
    expect(() => writeEventStates(bytes, [], 1, { advanced: false })).toThrow(/ファイルサイズ/)
  })
})
