// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 0x378F（幕府）・0x3790（外国）・0x3791（攘夷）は 1 にすると、その勢力の人物が町から消えた（✅ [U] 2026-10-09）。
import { describe, expect, it } from 'vitest'
import { writeU8 } from './binary'
import { TS_SAVE_SIZE } from './hero'
import { FACTION_EXIT_FLAGS, readFactionExit, writeFactionExit } from './faction-exit'

function makeSave(values = [0, 1, 0], size = TS_SAVE_SIZE): Uint8Array {
  const b = new Uint8Array(size)
  FACTION_EXIT_FLAGS.forEach((f, i) => writeU8(b, f.offset, values[i]))
  // 前後のバイト（真ルート 0x378E・ローラの好感度 0x3792）も置き、書き込みで変わらないことを見る
  writeU8(b, 0x378e, 1)
  writeU8(b, 0x3792, 5)
  return b
}

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i)
  return out
}

describe('勢力の退場 chunks/best-route', () => {
  it('幕府・外国・攘夷の順に 0x378F〜0x3791 を読む', () => {
    expect(FACTION_EXIT_FLAGS.map((f) => [f.offset, f.label])).toEqual([
      [0x378f, '幕府'],
      [0x3790, '外国'],
      [0x3791, '攘夷'],
    ])
    expect(readFactionExit(makeSave())).toEqual({ values: [0, 1, 0], problem: null })
  })

  it('✅ [U] 幕府・外国・攘夷とも書き換えで確認済み', () => {
    expect(FACTION_EXIT_FLAGS.map((f) => f.confirmed)).toEqual([true, true, true])
  })

  it('0・1 以外の値も生の値として読む', () => {
    expect(readFactionExit(makeSave([7, 0, 0])).values).toEqual([7, 0, 0])
  })

  it('サイズが 0x48BB0 でなければ読み取り専用にする', () => {
    const b = makeSave(undefined, TS_SAVE_SIZE + 4)
    expect(readFactionExit(b).problem).not.toBeNull()
    expect(() => writeFactionExit(b, 0, 1, { advanced: false })).toThrow(RangeError)
  })

  it('書き込みは、そのフラグの1バイトだけを変える', () => {
    FACTION_EXIT_FLAGS.forEach((f, i) => {
      const before = makeSave()
      const after = before.slice()
      writeFactionExit(after, i, before[f.offset] ^ 1, { advanced: false })
      expect(diffOffsets(before, after)).toEqual([f.offset])
    })
  })

  it('通常モードは 0・1 だけ。上級者モードでは任意の u8', () => {
    const b = makeSave()
    expect(() => writeFactionExit(b, 0, 2, { advanced: false })).toThrow(RangeError)
    expect(() => writeFactionExit(b, FACTION_EXIT_FLAGS.length, 0, { advanced: false })).toThrow(RangeError)
    expect(() => writeFactionExit(b, 0, 256, { advanced: true })).toThrow(RangeError)
    writeFactionExit(b, 0, 2, { advanced: true })
    expect(b[0x378f]).toBe(2)
  })

  it('読み出し→書き戻しでバイト列が一致する', () => {
    const before = makeSave([1, 1, 1])
    const after = before.slice()
    readFactionExit(after).values.forEach((v, i) => writeFactionExit(after, i, v, { advanced: false }))
    expect(diffOffsets(before, after)).toEqual([])
  })
})
