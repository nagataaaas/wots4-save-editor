// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 位置は docs/save_format/chunks/kill-counts・item-uses（🟢）。技の斬殺数の上限は ❓（エディタの目安）。
import { describe, expect, it } from 'vitest'
import { writeU32 } from './binary'
import { TS_SAVE_SIZE } from './layout'
import { SCORE_SYSTEM_MAX, SCORE_TYPE, readScoreTable, scoreEntries, scoreEntryName, scoreOffset, validateScore, writeScore } from './score-tables'

function makeSave(size = TS_SAVE_SIZE): Uint8Array {
  const b = new Uint8Array(size)
  // 辻斬りを辻斬るで見た並び（技 193 が周回中・累計とも 10）
  writeU32(b, 0x0f68, 10)
  writeU32(b, 0x1f08, 10)
  // 範囲の両隣（stats の最後 0x0C60、occupation の先頭 0x33A4）
  writeU32(b, 0x0c60, 5)
  writeU32(b, 0x33a4, 5)
  return b
}

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i)
  return out
}

describe('🟢 技ごとの斬殺数・道具の使用回数', () => {
  it('🟢 位置：技は 0x0C64／0x1C04 から 1000 件、道具は 0x2BA4／0x2FA4 から 256 件で、occupation の手前で終わる', () => {
    expect(scoreOffset('arts', 'cycle', 193)).toBe(0x0f68)
    expect(scoreOffset('arts', 'total', 193)).toBe(0x1f08)
    expect(scoreOffset('arts', 'total', 999) + 3).toBe(0x2ba3)
    expect(scoreOffset('items', 'cycle', 0)).toBe(0x2ba4)
    expect(scoreOffset('items', 'total', 255) + 3).toBe(0x33a3)
  })

  it('🟢 技の添字は技の ID（193＝野麦越え）。表にない添字は名前なし', () => {
    expect(scoreEntryName('arts', 193)).toBe('野麦越え')
    expect(scoreEntryName('arts', 999)).toBeNull()
    expect(scoreEntries('arts').length).toBeGreaterThan(900)
    expect(scoreEntries('items').every((e) => e.index < 256)).toBe(true)
  })

  it('読む', () => {
    const v = readScoreTable(makeSave(), 'arts')
    expect(v.cycle[193]).toBe(10)
    expect(v.total[193]).toBe(10)
    expect(v.problem).toBeNull()
  })

  it('1件の4バイトだけを書く', () => {
    const before = makeSave()
    const after = before.slice()
    writeScore(after, 'items', 'total', 3, 0x0102, { advanced: false })
    expect(diffOffsets(before, after)).toEqual([0x2fa4 + 12, 0x2fa4 + 13])
  })

  it('通常モードは表にある技・道具だけ、9,999,999 まで。上級者モードは任意', () => {
    expect(validateScore('arts', 193, 9_999_999, { advanced: false })).toBeNull()
    expect(validateScore('arts', 193, 10_000_000, { advanced: false })).not.toBeNull()
    expect(validateScore('arts', 999, 1, { advanced: false })).not.toBeNull()
    expect(validateScore('arts', 999, 1, { advanced: true })).toBeNull()
    expect(validateScore('arts', 1000, 1, { advanced: true })).not.toBeNull()
  })

  it('🟢 回数は u32。上級者モードの上限は u32 の最大値', () => {
    expect(SCORE_TYPE).toBe('u32')
    expect(SCORE_SYSTEM_MAX).toBe(0xffff_ffff)
    expect(validateScore('arts', 193, 0xffff_ffff, { advanced: true })).toBeNull()
    expect(validateScore('arts', 193, 0x1_0000_0000, { advanced: true })).not.toBeNull()
  })

  it('読み出し→書き戻しでバイト列が一致する', () => {
    const before = makeSave()
    const after = before.slice()
    for (const table of ['arts', 'items'] as const) {
      const v = readScoreTable(after, table)
      v.cycle.forEach((n, i) => writeScore(after, table, 'cycle', i, n, { advanced: true }))
      v.total.forEach((n, i) => writeScore(after, table, 'total', i, n, { advanced: true }))
    }
    expect(diffOffsets(before, after)).toEqual([])
  })

  it('サイズが 0x48BB0 でなければ読み取り専用にする', () => {
    const b = makeSave(TS_SAVE_SIZE + 4)
    expect(readScoreTable(b, 'items').problem).not.toBeNull()
    expect(() => writeScore(b, 'arts', 'cycle', 193, 1, { advanced: true })).toThrow(RangeError)
  })
})
