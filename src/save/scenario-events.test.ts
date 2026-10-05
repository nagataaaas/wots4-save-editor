// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 値は解析ノート §3.5 のシナリオ差分（[U] 2026-10-05）で見たもの。周回中の状態の FF・05 はゲーム内で表示を確認（✅ [U]）、ほかは 🔶（要ゲーム内確認）
import { describe, expect, it } from 'vitest'
import { writeU8 } from './binary'
import { TS_SAVE_SIZE } from './hero'
import {
  EVENT_COUNT,
  EVENT_RECORD_OFFSET,
  EVENT_STATE_OFFSET,
  EVENT_USED_COUNT,
  bulkIndices,
  readEvents,
  writeEventRecord,
  writeEventRecords,
  writeEventState,
  writeEventStates,
} from './scenario-events'

/** 周回中の状態（A）の先頭16件。03 copy（阿弥浜港争乱をスキップした直後） */
const A_START = [0x04, 0x00, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0x00, 0x00, 0x00, 0xff, 0x00]
/** 同じ時点の 03 copy 6（嵐の後・志士との出会い・海兵隊の横暴・代官所潜入のあと） */
const A_DAY2 = [0x04, 0x00, 0xff, 0x04, 0x00, 0x00, 0x04, 0x00, 0x00, 0x04, 0xff, 0x00, 0x04, 0x00, 0xff, 0x00]
/** 周回をまたぐ記録（B）の先頭16件。名無し侍のセーブで共通 */
const B_START = [0x04, 0x04, 0xff, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0xff, 0x04, 0x04, 0x00, 0xff, 0x04]

function makeSave(a: number[], b = B_START, size = TS_SAVE_SIZE): Uint8Array {
  const bytes = new Uint8Array(size)
  // 添字16以降は欠番扱いの FF で埋める（実データの添字99〜と同じ）
  bytes.fill(0xff, EVENT_STATE_OFFSET, EVENT_STATE_OFFSET + EVENT_COUNT)
  bytes.fill(0xff, EVENT_RECORD_OFFSET, EVENT_RECORD_OFFSET + EVENT_COUNT)
  bytes.set(a, EVENT_STATE_OFFSET)
  bytes.set(b, EVENT_RECORD_OFFSET)
  return bytes
}

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i)
  return out
}

describe('readEvents 🔶 §3.5', () => {
  it('周回中の状態と周回をまたぐ記録を添字ごとに読む', () => {
    const v = readEvents(makeSave(A_DAY2))
    expect(v.problem).toBeNull()
    expect(v.entries).toHaveLength(EVENT_COUNT)
    expect(v.entries[9]).toEqual({ index: 9, state: 0x04, record: 0x04 })
    expect(v.entries[10]).toEqual({ index: 10, state: 0xff, record: 0xff })
    expect(v.entries[13]).toEqual({ index: 13, state: 0x00, record: 0x00 })
  })

  it('想定外の値があれば読み取り専用にする', () => {
    const b = makeSave(A_START)
    writeU8(b, EVENT_STATE_OFFSET + 20, 0x40)
    expect(readEvents(b).problem).toMatch(/添字20/)
  })

  it('❓ U-1：サイズが 0x48BB0 でなければ読み取り専用にする', () => {
    expect(readEvents(makeSave(A_START, B_START, TS_SAVE_SIZE + 4)).problem).not.toBeNull()
  })
})

describe('書き込み 🔶 要ゲーム内確認', () => {
  it('1件の書き込みは 0x36A8＋添字 の1バイトだけを変える', () => {
    const before = makeSave(A_START)
    const after = before.slice()
    writeEventState(after, 9, 0x05, { advanced: false })
    expect(diffOffsets(before, after)).toEqual([EVENT_STATE_OFFSET + 9])
  })

  it('読み出し→書き戻しでバイト列が一致する', () => {
    const before = makeSave(A_DAY2)
    const after = before.slice()
    for (const e of readEvents(after).entries) writeEventState(after, e.index, e.state, { advanced: true })
    expect(diffOffsets(before, after)).toEqual([])
  })

  it('03 copy の状態から 03 copy 6 と同じ並びを書ける', () => {
    const b = makeSave(A_START)
    for (const i of [3, 6, 9, 12]) writeEventState(b, i, 0x04, { advanced: false })
    expect(Array.from(b.slice(EVENT_STATE_OFFSET, EVENT_STATE_OFFSET + 16))).toEqual(A_DAY2)
  })

  it('通常モードは確認済みの5つの値だけ。上級者モードでは任意の u8', () => {
    const b = makeSave(A_START)
    expect(() => writeEventState(b, 9, 0x02, { advanced: false })).toThrow(RangeError)
    expect(() => writeEventState(b, 9, 0x100, { advanced: true })).toThrow(RangeError)
    expect(() => writeEventState(b, EVENT_COUNT, 0x04, { advanced: false })).toThrow(RangeError)
    writeEventState(b, 9, 0x02, { advanced: true })
    expect(readEvents(b).entries[9].state).toBe(0x02)
  })

  it('周回中の状態の書き込みは、記録（0x3838〜）を変えない', () => {
    const before = makeSave(A_START)
    const after = before.slice()
    for (let i = 0; i < 16; i++) writeEventState(after, i, 0x04, { advanced: false })
    for (const off of diffOffsets(before, after)) expect(off).toBeLessThan(EVENT_RECORD_OFFSET)
  })

  it('✅ [U] FF（未到達）と 05（失敗）を書ける（ゲーム内で表示を確認した値）', () => {
    const b = makeSave(A_DAY2)
    writeEventState(b, 12, 0xff, { advanced: false })
    writeEventState(b, 10, 0x05, { advanced: false })
    expect(readEvents(b).entries[12].state).toBe(0xff)
    expect(readEvents(b).entries[10].state).toBe(0x05)
  })
})

describe('記録の書き込み（✅ [U] FF・04 がチャート表示に効く）', () => {
  it('1件の書き込みは 0x3838＋添字 の1バイトだけを変える', () => {
    const before = makeSave(A_START)
    const after = before.slice()
    writeEventRecord(after, 10, 0x04, { advanced: false })
    expect(diffOffsets(before, after)).toEqual([EVENT_RECORD_OFFSET + 10])
    expect(readEvents(after).entries[10]).toEqual({ index: 10, state: 0xff, record: 0x04 })
  })

  it('読み出し→書き戻しでバイト列が一致する', () => {
    const before = makeSave(A_DAY2)
    const after = before.slice()
    // 添字13 の 00 は通常モードの選択肢にないので、上級者モードで書き戻す
    for (const e of readEvents(after).entries) writeEventRecord(after, e.index, e.record, { advanced: true })
    expect(diffOffsets(before, after)).toEqual([])
  })

  it('通常モードは FF・04 だけ。00（❓ 名無し侍の一部で見た値）は読めるが書けない', () => {
    const b = makeSave(A_START)
    expect(readEvents(b).problem).toBeNull()
    expect(() => writeEventRecord(b, 10, 0x00, { advanced: false })).toThrow(RangeError)
    expect(() => writeEventRecord(b, 10, 0x05, { advanced: false })).toThrow(RangeError)
    expect(() => writeEventRecord(b, EVENT_COUNT, 0x04, { advanced: false })).toThrow(RangeError)
    writeEventRecord(b, 10, 0x05, { advanced: true })
    expect(readEvents(b).entries[10].record).toBe(0x05)
  })
})

describe('一括設定（デバッグ用）', () => {
  it('名前の分かる添字だけ、状態の範囲だけを変える', () => {
    const before = makeSave(A_START)
    const after = before.slice()
    writeEventStates(after, bulkIndices('named'), 0x05, { advanced: false })
    expect(diffOffsets(before, after)).toEqual([0, 1, 3, 6, 9, 10, 11, 12].map((i) => EVENT_STATE_OFFSET + i))
  })

  it('🔶 使われている添字（0〜98）だけを書き、99 以降は変えない', () => {
    const before = makeSave(A_START)
    const after = before.slice()
    writeEventRecords(after, bulkIndices('used'), 0x04, { advanced: false })
    const entries = readEvents(after).entries
    expect(entries.slice(0, EVENT_USED_COUNT).every((e) => e.record === 0x04)).toBe(true)
    expect(entries.slice(EVENT_USED_COUNT).every((e) => e.record === 0xff)).toBe(true)
  })

  it('すべての添字の記録を 04 にすると、記録の 166 B だけが 04 になる', () => {
    const before = makeSave(A_START)
    const after = before.slice()
    writeEventRecords(after, bulkIndices('all'), 0x04, { advanced: false })
    for (const off of diffOffsets(before, after)) {
      expect(off).toBeGreaterThanOrEqual(EVENT_RECORD_OFFSET)
      expect(off).toBeLessThan(EVENT_RECORD_OFFSET + EVENT_COUNT)
    }
    expect(readEvents(after).entries.every((e) => e.record === 0x04)).toBe(true)
  })

  it('値が通常モードで許されなければ、1バイトも書かない', () => {
    const before = makeSave(A_START)
    const after = before.slice()
    expect(() => writeEventStates(after, bulkIndices('all'), 0x02, { advanced: false })).toThrow(RangeError)
    expect(() => writeEventRecords(after, bulkIndices('all'), 0x00, { advanced: false })).toThrow(RangeError)
    expect(() => writeEventStates(after, [0, EVENT_COUNT], 0x04, { advanced: false })).toThrow(RangeError)
    expect(diffOffsets(before, after)).toEqual([])
  })

  it('妥当性検証に落ちている状態では書かない', () => {
    const b = makeSave(A_START)
    writeU8(b, EVENT_STATE_OFFSET + 20, 0x40)
    const before = b.slice()
    expect(() => writeEventStates(b, bulkIndices('named'), 0x04, { advanced: false })).toThrow(RangeError)
    expect(diffOffsets(before, b)).toEqual([])
  })
})
