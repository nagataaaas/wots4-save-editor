// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 書く値はエンディング後のセーブで見た値（[U] 2026-10-08）。
// enableCharacterSetup：0x0010＝0 だけ（✅ [U] 難易度と主人公の設定に進む）。
// startNewCycle：0x0010＝0・船上の侍＝00 は ✅ [U]。全体を書いて新しい周回として遊べることも ✅ [U]。
// ほかの初期化の範囲と値は 🔶（1件のセーブで見た値。差分で確かめていない）。
// 現在地 0x27 は 🔶 必要かは未確認。0x0BC0・0x0BD0 は ❓ 意味不明。
import { describe, expect, it } from 'vitest'
import { TS_SAVE_SIZE } from './hero'
import { NEW_CYCLE_EVENT_FF, NEW_CYCLE_KEEP_FLAGS, enableCharacterSetup, startNewCycle } from './new-cycle'
import { readDate } from './scenario-date'

/** 周回の途中を模したセーブ：書き換え対象の範囲にも、対象外の範囲にも 0 以外を入れる */
function makeMidCycleSave(size = TS_SAVE_SIZE): Uint8Array {
  const b = new Uint8Array(size)
  for (let i = 0; i < b.length; i++) b[i] = (i * 7 + 3) & 0xff
  // 日付まわりは読める値にしておく（5日目夕、段階 400）
  b.set([0x90, 0x01, 0x00, 0x0d, 0x01], 0x10)
  return b
}

/** startNewCycle が書く位置（u8 単位） */
function writtenOffsets(): Set<number> {
  const s = new Set<number>()
  const range = (a: number, z: number) => {
    for (let i = a; i <= z; i++) s.add(i)
  }
  // 段階 u16・保留量・現在地・時間帯
  range(0x10, 0x14)
  range(0x0b90, 0x0b93)
  range(0x0bc0, 0x0bc3)
  range(0x0bc8, 0x0bcb)
  range(0x0bd0, 0x0bd3)
  range(0x0bd8, 0x0bdb)
  range(0x0c84, 0x1c23)
  range(0x36a8, 0x3837)
  for (const k of NEW_CYCLE_KEEP_FLAGS) s.delete(k)
  range(0x3900, 0x3901)
  return s
}

describe('enableCharacterSetup：難易度と主人公設定を行えるようにする', () => {
  it('✅ [U] 0x0010（u16）だけを 0 にする', () => {
    const before = makeMidCycleSave()
    const after = before.slice()
    enableCharacterSetup(after)
    const diff: number[] = []
    for (let i = 0; i < before.length; i++) if (before[i] !== after[i]) diff.push(i)
    expect(diff).toEqual([0x10, 0x11])
    expect(readDate(after).stage).toBe(0)
  })

  it('❓ U-1：サイズが 0x48BB0 でなければ書かない', () => {
    expect(() => enableCharacterSetup(makeMidCycleSave(TS_SAVE_SIZE + 4))).toThrow(RangeError)
  })
})

describe('startNewCycle：新しい周回を始める', () => {
  const before = makeMidCycleSave()
  const after = before.slice()
  startNewCycle(after)

  it('🔶 書く範囲の外は1バイトも変えない（難易度・記録 B・累計の斬殺数・施設・堂島の職など）', () => {
    const written = writtenOffsets()
    const outside: number[] = []
    for (let i = 0; i < before.length; i++) if (!written.has(i) && before[i] !== after[i]) outside.push(i)
    expect(outside).toEqual([])
    for (const k of [0x0000, 0x3838, 0x1c24, 0x375d, 0x375e, 0x375f, 0x3799]) expect(after[k]).toBe(before[k])
  })

  it('✅ [U] 段階は 0、船上の侍は 00。🔶 現在地は 0x27、時間帯・保留量は 0、日数は 1日目', () => {
    expect(Array.from(after.slice(0x10, 0x15))).toEqual([0x00, 0x00, 0x00, 0x27, 0x00])
    expect(after[0x36a8]).toBe(0x00)
    expect(readDate(after)).toMatchObject({ stage: 0, day: 1, slot: 0, pending: 0, problem: null })
  })

  it('🔶 イベントの状態 A はエンディング後のセーブの並び（FF 95件、00 71件）', () => {
    const a = Array.from(after.slice(0x36a8, 0x36a8 + 166))
    expect(a.filter((v) => v === 0xff)).toHaveLength(95)
    expect(a.filter((v) => v === 0x00)).toHaveLength(71)
    expect(NEW_CYCLE_EVENT_FF.slice(0, 8)).toEqual([2, 10, 14, 16, 19, 25, 32, 53])
    for (const n of NEW_CYCLE_EVENT_FF) expect(a[n]).toBe(0xff)
  })

  it('🔶 シナリオのフラグ・周回中の記録・周回中の斬殺数は 0、ヒントは FFFF', () => {
    for (let p = 0x374e; p <= 0x3837; p++) if (!NEW_CYCLE_KEEP_FLAGS.includes(p)) expect(after[p]).toBe(0)
    for (const o of [0x0b90, 0x0bc0, 0x0bc8, 0x0bd0, 0x0bd8]) expect(Array.from(after.slice(o, o + 4))).toEqual([0, 0, 0, 0])
    expect(after.slice(0x0c84, 0x1c24).every((v) => v === 0)).toBe(true)
    expect(Array.from(after.slice(0x3900, 0x3902))).toEqual([0xff, 0xff])
  })

  it('2回続けて書いても同じになる', () => {
    const again = after.slice()
    startNewCycle(again)
    expect(again).toEqual(after)
  })

  it('❓ U-1：サイズが 0x48BB0 でなければ書かない', () => {
    const b = makeMidCycleSave(TS_SAVE_SIZE + 4)
    const copy = b.slice()
    expect(() => startNewCycle(b)).toThrow(RangeError)
    expect(b).toEqual(copy)
  })
})
