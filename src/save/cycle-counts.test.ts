// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 0x0B8C が周回数で、周回の終わりに +1（99,999 まで）なのは 🟢。実セーブ1件でクリア回数の合計 6＋立ち去った回数 32 ＝ 38 と一致した。
// ゲーム内での反映（3 以上で真ルートの枠が全部出る）は要ゲーム内確認。
import { describe, expect, it } from 'vitest'
import { writeU16, writeU32 } from './binary'
import {
  CLEAR_COUNTS_OFFSET,
  GONE_COUNT_OFFSET,
  PLAY_COUNT_MAX,
  PLAY_COUNT_OFFSET,
  readCycleCounts,
  validatePlayCount,
  writePlayCount,
} from './cycle-counts'
import { TS_SAVE_SIZE } from './layout'

/** 実セーブ1件の値：クリア回数（難易度ごと）・立ち去った回数・周回数 */
const CLEARS = [3, 1, 2, 0]
const GONE = 32
const PLAY_COUNT = 38

function makeSave(size = TS_SAVE_SIZE): Uint8Array {
  const b = new Uint8Array(size)
  CLEARS.forEach((n, d) => writeU16(b, CLEAR_COUNTS_OFFSET + d * 2, n))
  writeU32(b, GONE_COUNT_OFFSET, GONE)
  writeU32(b, PLAY_COUNT_OFFSET, PLAY_COUNT)
  // 前後のバイト（0x0B6C〜0x0B8B は周回中の記録、0x0B90 はプレイ時間）が書き込みで変わらないことを見る
  b[PLAY_COUNT_OFFSET - 1] = 0x5a
  b[PLAY_COUNT_OFFSET + 4] = 0xa5
  return b
}

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i)
  return out
}

describe('🟢 周回数 0x0B8C', () => {
  it('周回数・クリア回数・立ち去った回数を読む', () => {
    expect(readCycleCounts(makeSave())).toEqual({
      playCount: 38,
      clears: [3, 1, 2, 0],
      clearTotal: 6,
      goneCount: 32,
      warnings: [],
      problem: null,
    })
  })

  it('実セーブでは周回数がクリア回数の合計＋立ち去った回数と一致した', () => {
    const v = readCycleCounts(makeSave())
    expect(v.playCount).toBe(v.clearTotal + v.goneCount)
  })

  it('読み出し→書き戻しでバイトが一致する', () => {
    const b = makeSave()
    const before = b.slice()
    writePlayCount(b, readCycleCounts(b).playCount, { advanced: false })
    expect(b).toEqual(before)
  })

  it('書くのは 0x0B8C の4バイトだけ（u32 LE）', () => {
    const b = makeSave()
    const before = b.slice()
    writePlayCount(b, 0x1_2345, { advanced: false })
    expect(diffOffsets(before, b)).toEqual([0x0b8c, 0x0b8d, 0x0b8e])
    expect([...b.slice(0x0b8c, 0x0b90)]).toEqual([0x45, 0x23, 0x01, 0x00])
  })

  it('通常モードは 0〜99,999、上級者モードは u32 全体', () => {
    expect(validatePlayCount(PLAY_COUNT_MAX, { advanced: false })).toBeNull()
    expect(validatePlayCount(PLAY_COUNT_MAX + 1, { advanced: false })).not.toBeNull()
    expect(validatePlayCount(PLAY_COUNT_MAX + 1, { advanced: true })).toBeNull()
    expect(validatePlayCount(-1, { advanced: true })).not.toBeNull()
    expect(validatePlayCount(1.5, { advanced: true })).not.toBeNull()
    expect(() => writePlayCount(makeSave(), PLAY_COUNT_MAX + 1, { advanced: false })).toThrow()
  })

  it('上限を超えた値は警告する（編集はできる）', () => {
    const b = makeSave()
    writeU32(b, PLAY_COUNT_OFFSET, PLAY_COUNT_MAX + 1)
    const v = readCycleCounts(b)
    expect((v.warnings.join('。') || null)).not.toBeNull()
    expect(v.problem).toBeNull()
  })

  it('ファイルサイズが違えば読み取り専用', () => {
    const b = makeSave(TS_SAVE_SIZE + 2)
    expect(readCycleCounts(b).problem).not.toBeNull()
    expect(() => writePlayCount(b, 1, { advanced: true })).toThrow()
  })
})
