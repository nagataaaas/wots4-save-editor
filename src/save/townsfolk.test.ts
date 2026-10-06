// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 値は解析ノート §9.6（[U] 2026-10-06）で見たもの。
// 🔶 0x02C4＝寿司屋の店主、0x0444＝鍛冶屋のおやじ（どちらも 1＝死亡、差分1回）。❓ 0x0127 は踏み倒しで 0x6E。要ゲーム内確認。
import { describe, expect, it } from 'vitest'
import { writeU8 } from './binary'
import { TS_SAVE_SIZE } from './hero'
import {
  TOWNSFOLK_END,
  TOWNSFOLK_LENGTH,
  TOWNSFOLK_NOTES,
  TOWNSFOLK_START,
  readTownsfolk,
  validateTownsfolk,
  writeTownsfolk,
} from './townsfolk'

/** 🔶 sample/S4-DATA_02 copy 5（踏み倒し・鍛冶屋のおやじと寿司屋の店主の殺害のあと）で 0 以外だったバイト */
const COPY5: Record<number, number> = { 0x0127: 0x6e, 0x012c: 1, 0x0258: 1, 0x02c4: 1, 0x0444: 1 }

function makeSave(size = TS_SAVE_SIZE): Uint8Array {
  const b = new Uint8Array(size)
  for (const [offset, value] of Object.entries(COPY5)) writeU8(b, Number(offset), value)
  // 前後のバイト（0x00FF・0x04C0）も置き、書き込みで変わらないことを見る
  writeU8(b, 0x00ff, 7)
  writeU8(b, 0x04c0, 7)
  return b
}

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i)
  return out
}

describe('🔶 町の人の状態の候補 0x0100〜0x04BF §9.6', () => {
  it('0x0100〜0x04BF の960バイトを読む', () => {
    expect(TOWNSFOLK_LENGTH).toBe(960)
    const view = readTownsfolk(makeSave())
    expect(view.problem).toBeNull()
    expect(view.values).toHaveLength(960)
    expect(view.values[0x02c4 - TOWNSFOLK_START]).toBe(1)
    expect(view.values[0x0127 - TOWNSFOLK_START]).toBe(0x6e)
  })

  it('🔶 0x02C4 は寿司屋の店主、0x0444 は鍛冶屋のおやじと推定している', () => {
    expect(TOWNSFOLK_NOTES[0x02c4].name).toBe('寿司屋の店主？')
    expect(TOWNSFOLK_NOTES[0x0444].name).toBe('鍛冶屋のおやじ？')
  })

  it('❓ U-1：サイズが 0x48BB0 でなければ読み取り専用にする', () => {
    const b = makeSave(TS_SAVE_SIZE + 4)
    expect(readTownsfolk(b).problem).not.toBeNull()
    expect(() => writeTownsfolk(b, 0x0444, 0, { advanced: true })).toThrow(RangeError)
  })

  it('書き込みは、そのオフセットの1バイトだけを変える', () => {
    for (const offset of [TOWNSFOLK_START, 0x02c4, 0x0444, TOWNSFOLK_END]) {
      const before = makeSave()
      const after = before.slice()
      writeTownsfolk(after, offset, before[offset] === 1 ? 0 : 1, { advanced: false })
      expect(diffOffsets(before, after)).toEqual([offset])
    }
  })

  it('範囲の外には書かない', () => {
    const b = makeSave()
    expect(() => writeTownsfolk(b, TOWNSFOLK_START - 1, 0, { advanced: true })).toThrow(RangeError)
    expect(() => writeTownsfolk(b, TOWNSFOLK_END + 1, 0, { advanced: true })).toThrow(RangeError)
  })

  it('通常モードは 0・1 と今の値の書き戻しだけ。上級者モードでは任意の u8', () => {
    expect(validateTownsfolk(1, 0, { advanced: false })).toBeNull()
    expect(validateTownsfolk(2, 0, { advanced: false })).not.toBeNull()
    expect(validateTownsfolk(0x6e, 0x6e, { advanced: false })).toBeNull()
    expect(validateTownsfolk(255, 0, { advanced: true })).toBeNull()
    expect(validateTownsfolk(256, 0, { advanced: true })).not.toBeNull()
  })

  it('読み出し→書き戻しでバイト列が一致する', () => {
    const before = makeSave()
    const after = before.slice()
    readTownsfolk(after).values.forEach((v, i) => writeTownsfolk(after, TOWNSFOLK_START + i, v, { advanced: false }))
    expect(diffOffsets(before, after)).toEqual([])
  })
})
