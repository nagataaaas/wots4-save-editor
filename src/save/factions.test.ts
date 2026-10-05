// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 値は解析ノート §3.5 のシナリオ差分（[U] 2026-10-05）で見たもの。どれも 🔶（意味も書き込みも要ゲーム内確認）
import { describe, expect, it } from 'vitest'
import { writeU8 } from './binary'
import { FACTION_TABLE_OFFSET, readFactions, writeFactionValue } from './factions'
import { TS_SAVE_SIZE } from './hero'

/** 0x3780〜0x3788。04 copy 3（志士との出会い完了、海兵隊の横暴で赤城と戦って失敗、阿片密売で密売人を斬る） */
const AFTER_OPIUM = [0x01, 0x00, 0x01, 0x00, 0x01, 0x01, 0x00, 0x01, 0x01]
/** 03 copy 6（志士との出会い、海兵隊の横暴の成功、代官所潜入） */
const AFTER_SNEAK = [0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00]

function makeSave(table: number[], size = TS_SAVE_SIZE): Uint8Array {
  const b = new Uint8Array(size)
  b.set(table, FACTION_TABLE_OFFSET)
  return b
}

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i)
  return out
}

describe('readFactions 🔶 §3.5', () => {
  it('3行 × 3列（幕府・外国・攘夷）に並べて読む', () => {
    expect(readFactions(makeSave(AFTER_SNEAK))).toMatchObject({
      values: [
        [0, 0, 3],
        [0, 0, 0],
        [1, 0, 0],
      ],
      problem: null,
    })
    expect(readFactions(makeSave(AFTER_OPIUM)).values).toEqual([
      [1, 0, 1],
      [0, 1, 1],
      [0, 1, 1],
    ])
  })

  it('値が大きすぎれば読み取り専用にする', () => {
    const b = makeSave(AFTER_SNEAK)
    writeU8(b, FACTION_TABLE_OFFSET + 4, 0xff)
    expect(readFactions(b).problem).not.toBeNull()
  })

  it('❓ U-1：サイズが 0x48BB0 でなければ読み取り専用にする', () => {
    expect(readFactions(makeSave(AFTER_SNEAK, TS_SAVE_SIZE + 4)).problem).not.toBeNull()
  })
})

describe('書き込み 🔶 要ゲーム内確認', () => {
  it('1マスの書き込みは 0x3780＋行×3＋列 の1バイトだけを変える', () => {
    const before = makeSave(AFTER_SNEAK)
    const after = before.slice()
    writeFactionValue(after, 2, 1, 1, { advanced: false })
    expect(diffOffsets(before, after)).toEqual([FACTION_TABLE_OFFSET + 7])
  })

  it('読み出し→書き戻しでバイト列が一致する', () => {
    const before = makeSave(AFTER_OPIUM)
    const after = before.slice()
    readFactions(after).values.forEach((row, r) => row.forEach((v, c) => writeFactionValue(after, r, c, v, { advanced: false })))
    expect(diffOffsets(before, after)).toEqual([])
  })

  it('通常モードは 9 まで。上級者モードでは 255 まで', () => {
    const b = makeSave(AFTER_SNEAK)
    expect(() => writeFactionValue(b, 0, 0, 10, { advanced: false })).toThrow(RangeError)
    expect(() => writeFactionValue(b, 0, 0, 256, { advanced: true })).toThrow(RangeError)
    expect(() => writeFactionValue(b, 3, 0, 1, { advanced: false })).toThrow(RangeError)
    writeFactionValue(b, 0, 0, 10, { advanced: true })
    expect(readFactions(b).values[0][0]).toBe(10)
  })
})
