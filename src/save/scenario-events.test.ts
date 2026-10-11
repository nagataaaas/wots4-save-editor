// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 値は docs/save_format/chunks/event-chart の調査記録のシナリオ差分（[U] 2026-10-05）で見たもの。周回中の状態の FF・05 はゲーム内で表示を確認（✅ [U]）、ほかは 🔶（要ゲーム内確認）
import { describe, expect, it } from 'vitest'
import { writeU8 } from './binary'
import { TS_SAVE_SIZE } from './hero'
import {
  EVENT_COUNT,
  EVENT_RECORD_OFFSET,
  EVENT_RECORDS_SEEN,
  EVENT_STATE_OFFSET,
  EVENT_GAP_INDICES,
  EVENT_GAP_NOTES,
  eventNameOf,
  namedIndices,
  readEvents,
  recordLabel,
  stateLabel,
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

describe('readEvents 🔶 chunks/event-chart', () => {
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
    expect(readEvents(b).problem).toMatch(/想定外/)
  })

  it('サイズが 0x48BB0 でなければ読み取り専用にする', () => {
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

  it('通常モードは 00〜05・FF（01〜04 の意味は 🟢）。上級者モードでは任意の u8', () => {
    writeEventState(makeSave(A_START), 36, 0x01, { advanced: false })
    // 🟢 02＝導入を見て断った・保留した、03＝引き受けた・進行中（chunks/event-chart）。02 は実データでは未確認
    writeEventState(makeSave(A_START), 9, 0x02, { advanced: false })
    expect(stateLabel(0x02)).toBe('断った・保留した')
    expect(stateLabel(0x03)).toBe('引き受けた・進行中')
    const b = makeSave(A_START)
    expect(() => writeEventState(b, 9, 0x06, { advanced: false })).toThrow(RangeError)
    expect(() => writeEventState(b, 9, 0x100, { advanced: true })).toThrow(RangeError)
    expect(() => writeEventState(b, EVENT_COUNT, 0x04, { advanced: false })).toThrow(RangeError)
    writeEventState(b, 9, 0x06, { advanced: true })
    expect(readEvents(b).entries[9].state).toBe(0x06)
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

describe('記録の書き込み（✅ [U] FF・04 がチャート表示に効く。FF でも状態が 04 なら出る、2026-10-06）', () => {
  it('記録を FF にしても状態（0x36A8〜）は変えない（成功のイベントはチャートに残る）', () => {
    const before = makeSave(A_DAY2)
    const after = before.slice()
    writeEventRecord(after, 9, 0xff, { advanced: false })
    expect(diffOffsets(before, after)).toEqual([EVENT_RECORD_OFFSET + 9])
    expect(readEvents(after).entries[9]).toEqual({ index: 9, state: 0x04, record: 0xff })
  })

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

  it('🔶 記録で見た未確認の値（05：02 copy の再起の望み、03：00 の志士との出会い、00）は、上級者モードの選択肢に出す', () => {
    expect(EVENT_RECORDS_SEEN.map((r) => r.value)).toEqual([0x05, 0x03, 0x00])
    expect(recordLabel(0x05)).toBe('不明（書いてもチャートに出ない）')
    // 選択肢を出す値は、上級者モードで書けて、読み込みで想定外にならない
    for (const { value } of EVENT_RECORDS_SEEN) {
      const b = makeSave(A_START)
      writeEventRecord(b, 72, value, { advanced: true })
      expect(readEvents(b).problem).toBeNull()
      expect(readEvents(b).entries[72].record).toBe(value)
    }
  })
})

describe('一括設定（デバッグ用）', () => {
  it('名前の分かる添字だけ、状態の範囲だけを変える', () => {
    const before = makeSave(A_START)
    const after = before.slice()
    writeEventStates(after, namedIndices(), 0x05, { advanced: false })
    // 名前の分かる添字は 0〜46（✅ [U] 2026-10-05）と、51〜99 のうち 67・84 を除いたもの、116（✅ [U] 2026-10-06、ゲーム内のチャートで確認）。
    // 47〜50・67・84 はチャートに出ない・起きない（一覧に出さない）。もとが 05 の添字はないので、すべて変わる
    const unknown = [47, 48, 49, 50, 67, 84]
    const named = [...Array.from({ length: 100 }, (_, i) => i).filter((i) => !unknown.includes(i)), 116]
    expect(namedIndices()).toEqual(named)
    expect(diffOffsets(before, after)).toEqual(named.map((i) => EVENT_STATE_OFFSET + i))
  })

  it('一覧の添字は、どれもイベントの表（event.csv）に名前がある', () => {
    expect(namedIndices().filter((i) => eventNameOf(i) === null)).toEqual([])
    expect(eventNameOf(6)).toBe('志士との出会い')
    expect(eventNameOf(28)).toBe('大老 鬼怒川怨仙')
    expect(eventNameOf(84)).toBeNull()
  })

  it('欠番（47〜50・67・84）は名前の付いた 0〜99 の残りで、一括設定の対象に入らない', () => {
    const named = new Set(namedIndices())
    const gaps = Array.from({ length: 100 }, (_, i) => i).filter((i) => !named.has(i))
    expect(EVENT_GAP_INDICES).toEqual(gaps)
    // 🟢 47〜50 は剣術大会（チャートに出ない。出場した勢力だけ 03、優勝 04、負け・降参 05）。67 は未実装（[U] 2026-10-06）。
    // 🟢 84 は名前不明のローラの決意の導入（始まると 04、85 の開始条件が「84 = 04」）
    expect(EVENT_GAP_NOTES[47].name).toBe('剣術大会（幕府）')
    expect(EVENT_GAP_NOTES[50].name).toBe('剣術大会（無所属）')
    expect(EVENT_GAP_NOTES[50].note).toMatch(/優勝で成功/)
    expect(EVENT_GAP_NOTES[67].name).toBe('悲しみのローラ')
    expect(EVENT_GAP_NOTES[84].name).toBe('（名前不明。ローラの決意の導入）')
    expect(EVENT_GAP_INDICES.some((i) => named.has(i))).toBe(false)
    // フラグ確認用に、1件ずつは書ける
    const b = makeSave(A_START)
    writeEventRecord(b, 47, 0x04, { advanced: false })
    expect(readEvents(b).entries[47].record).toBe(0x04)
  })

  it('記録の一括書き込みは、名前の分かる添字の記録だけを変える', () => {
    const before = makeSave(A_START)
    const after = before.slice()
    writeEventRecords(after, namedIndices(), 0x04, { advanced: false })
    const named = new Set(namedIndices())
    for (const off of diffOffsets(before, after)) {
      expect(off).toBeGreaterThanOrEqual(EVENT_RECORD_OFFSET)
      expect(named.has(off - EVENT_RECORD_OFFSET)).toBe(true)
    }
    const entries = readEvents(after).entries
    expect(entries.filter((e) => named.has(e.index)).every((e) => e.record === 0x04)).toBe(true)
    // 対応のない添字（❓ 47、120 など）はそのまま
    expect(entries[47].record).toBe(0xff)
    expect(entries[120].record).toBe(0xff)
  })

  it('値が通常モードで許されなければ、1バイトも書かない', () => {
    const before = makeSave(A_START)
    const after = before.slice()
    expect(() => writeEventStates(after, namedIndices(), 0x06, { advanced: false })).toThrow(RangeError)
    expect(() => writeEventRecords(after, namedIndices(), 0x00, { advanced: false })).toThrow(RangeError)
    expect(() => writeEventStates(after, [0, EVENT_COUNT], 0x04, { advanced: false })).toThrow(RangeError)
    expect(diffOffsets(before, after)).toEqual([])
  })

  it('妥当性検証に落ちている状態では書かない', () => {
    const b = makeSave(A_START)
    writeU8(b, EVENT_STATE_OFFSET + 20, 0x40)
    const before = b.slice()
    expect(() => writeEventStates(b, namedIndices(), 0x04, { advanced: false })).toThrow(RangeError)
    expect(diffOffsets(before, b)).toEqual([])
  })
})
