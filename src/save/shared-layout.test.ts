// 固定位置の定義を共有するモジュール間の対応。合成したバイト列だけを使う。
import { describe, expect, it } from 'vitest'
import { TS_SAVE_SIZE } from './hero'
import { CHARACTER_FLAGS, CHARACTER_STATUS, characterStatusForPromise, characterStatusForTown } from './flags/characters'
import { MORO_OFFSET, MORO_DEAD, readFactions, routeEligible } from './factions'
import { partnerDeathWarning } from './yobai-create'
import { reviveNote } from './townsfolk'

describe('共有する固定位置とレコード', () => {
  it('🟢 茂呂の状態は勢力の判定・夜の約束・人物の欄で同じバイトを読む', () => {
    const bytes = new Uint8Array(TS_SAVE_SIZE)
    expect(MORO_OFFSET).toBe(0x3752)
    expect(MORO_DEAD).toBe(1)
    bytes[0x3752] = 1
    expect(readFactions(bytes).moro).toBe(1)
    expect(routeEligible([[3, 3, 3], [0, 0, 0]], 0, readFactions(bytes).moro)).toBe(false)
    expect(partnerDeathWarning(bytes, 65)).toMatch(/死亡/)
    expect(CHARACTER_FLAGS.find(f => f.offset === MORO_OFFSET)?.label).toBe('茂呂')
    bytes[0x3752] = 3
    expect(partnerDeathWarning(bytes, 65)).toBeNull()
    expect(routeEligible([[3, 3, 3], [0, 0, 0]], 0, readFactions(bytes).moro)).toBe(true)
  })

  it('🟢 重要人物の対応は連続15バイトと寿司屋。別の姿も同じ状態に対応する', () => {
    expect(Object.values(CHARACTER_STATUS).map(s => s.offset)).toEqual([
      ...Array.from({ length: 15 }, (_, i) => 0x374e + i), 0x37f9,
    ])
    for (let p = 10; p <= 23; p++) {
      expect(characterStatusForTown(p)?.offset).toBe(0x3744 + p)
      expect(reviveNote(p)).toMatch(/町に出てこない/)
    }
    expect(characterStatusForPromise(425)).toBe(CHARACTER_STATUS.akagi)
    expect(characterStatusForPromise(456)).toBe(CHARACTER_STATUS.jj)
    expect(characterStatusForPromise(9999)).toBeUndefined()
    expect(reviveNote(30)).toMatch(/寿司屋/)
    expect(reviveNote(55)).toMatch(/同じ人物/)
    expect(reviveNote(9)).toBeNull()
    expect(reviveNote(24)).toBeNull()
  })
})
