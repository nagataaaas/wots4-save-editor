// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 値は解析ノート §9.6（[U] 2026-10-06）で見たもの。
// ✅ [U] 2026-10-06：0x02C4＝寿司屋の店主、0x0444＝鍛冶屋のおやじ（どちらも 1＝死亡。0 に戻すと生き返った）。
// ✅ [U] 2026-10-06：0x0127＝鍛冶屋の後継者イベント・鍛冶屋の状態（値の表は書き換えで確認）、0x0264＝堂島の死亡。
import { describe, expect, it } from 'vitest'
import { writeU8 } from './binary'
import { TS_SAVE_SIZE } from './hero'
import {
  SMITH_STATES,
  SMITH_STATE_OFFSET,
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

  it('✅ [U] 0x02C4 は寿司屋の店主、0x0444 は鍛冶屋のおやじ、0x0264 は堂島（1＝死亡）', () => {
    expect(TOWNSFOLK_NOTES[0x02c4].name).toBe('寿司屋の店主')
    expect(TOWNSFOLK_NOTES[0x0444].name).toBe('鍛冶屋のおやじ')
    expect(TOWNSFOLK_NOTES[0x0264].name).toBe('堂島')
  })

  it('✅ [U] 0x0127 は鍛冶屋の後継者イベント・鍛冶屋の状態。踏み倒しの差分で見た 110 も表にある', () => {
    expect(SMITH_STATE_OFFSET).toBe(0x0127)
    expect(SMITH_STATES.map((s) => s.value)).toEqual([0, 10, 20, 30, 40, 50, 60, 61, 69, 70, 81, 110, 119, 120])
    expect(SMITH_STATES.find((s) => s.value === 0x6e)?.label).toBe('鍛冶屋のおやじから踏み倒した')
  })

  it('通常モードでは、0x0127 に表の値を書ける。表にない値は上級者モードだけ', () => {
    const b = makeSave()
    writeTownsfolk(b, 0x0127, 81, { advanced: false })
    expect(b[0x0127]).toBe(81)
    expect(() => writeTownsfolk(b, 0x0127, 1, { advanced: false })).toThrow(RangeError)
    // 0x0127 以外では表の値は使えない
    expect(() => writeTownsfolk(b, 0x0264, 81, { advanced: false })).toThrow(RangeError)
    writeTownsfolk(b, 0x0127, 1, { advanced: true })
    expect(b[0x0127]).toBe(1)
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
    expect(validateTownsfolk(0x02c4, 1, 0, { advanced: false })).toBeNull()
    expect(validateTownsfolk(0x02c4, 2, 0, { advanced: false })).not.toBeNull()
    expect(validateTownsfolk(0x02c4, 0x6e, 0x6e, { advanced: false })).toBeNull()
    expect(validateTownsfolk(0x02c4, 255, 0, { advanced: true })).toBeNull()
    expect(validateTownsfolk(0x02c4, 256, 0, { advanced: true })).not.toBeNull()
  })

  it('読み出し→書き戻しでバイト列が一致する', () => {
    const before = makeSave()
    const after = before.slice()
    readTownsfolk(after).values.forEach((v, i) => writeTownsfolk(after, TOWNSFOLK_START + i, v, { advanced: false }))
    expect(diffOffsets(before, after)).toEqual([])
  })
})
