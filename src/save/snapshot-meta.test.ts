import { describe, expect, it } from 'vitest'
import { writeU16, writeU8, writeUtf16Fixed } from './binary'
import { TS_SAVE_SIZE } from './layout'
import { HERO_OFFSETS, NAME_BYTES } from './hero'
import { CHART_FRAMES } from './master/event-chart-layout'
import { DATE_OFFSETS } from './scenario-date'
import { EVENT_STATE_OFFSET, eventNameOf } from './scenario-events'
import { OTHER_REGION, changedRegions, lastClearedEvent, snapshotMeta } from './snapshot-meta'

function makeSave(): Uint8Array {
  const b = new Uint8Array(TS_SAVE_SIZE)
  writeUtf16Fixed(b, HERO_OFFSETS.name, NAME_BYTES, '名無し')
  writeU16(b, DATE_OFFSETS.dayIndex, 4) // 5日目
  writeU8(b, DATE_OFFSETS.slot, 1) // 夕
  return b
}

// チャートの左端と右端の枠（名前のあるもの）
const named = CHART_FRAMES.filter((f) => eventNameOf(f.eventId))
const leftmost = named.reduce((a, f) => (f.col < a.col ? f : a))
const rightmost = named.reduce((a, f) => (f.col > a.col ? f : a))

describe('snapshotMeta', () => {
  it('主人公名・日数・時間帯を読む。読み込みの版（prev なし）は変わった領域が空', () => {
    expect(snapshotMeta(makeSave(), null)).toEqual({
      playerName: '名無し',
      day: 5,
      slot: '夕',
      lastClearedEvent: null,
      changedRegions: [],
    })
  })

  it('サイズの違うバイト列でも例外にせず、読めない値は null', () => {
    const meta = snapshotMeta(new Uint8Array(0x100), null)
    expect(meta).toEqual({ playerName: null, day: null, slot: null, lastClearedEvent: null, changedRegions: [] })
  })
})

describe('lastClearedEvent', () => {
  it('成功（04）の枠のうち、チャートでいちばん右の列のイベント', () => {
    expect(leftmost.col).toBeLessThan(rightmost.col)
    const b = makeSave()
    writeU8(b, EVENT_STATE_OFFSET + leftmost.eventId, 0x04)
    expect(lastClearedEvent(b)).toBe(eventNameOf(leftmost.eventId))
    writeU8(b, EVENT_STATE_OFFSET + rightmost.eventId, 0x04)
    expect(lastClearedEvent(b)).toBe(eventNameOf(rightmost.eventId))
  })

  it('失敗（05）や進行中（03）は数えない。成功がなければ null', () => {
    const b = makeSave()
    writeU8(b, EVENT_STATE_OFFSET + rightmost.eventId, 0x05)
    writeU8(b, EVENT_STATE_OFFSET + leftmost.eventId, 0x03)
    expect(lastClearedEvent(b)).toBeNull()
  })
})

describe('changedRegions', () => {
  it('変わったバイトの領域の名前を、重複なく位置の順に出す', () => {
    const prev = makeSave()
    const next = prev.slice()
    writeUtf16Fixed(next, HERO_OFFSETS.name, NAME_BYTES, '別の名前')
    writeU8(next, HERO_OFFSETS.money, 1)
    expect(changedRegions(prev, next)).toEqual(['所持金・金庫', '主人公名'])
  })

  it('どの領域にも入らない位置と、ゲームの状態ではない領域は「その他」にまとめて最後に置く', () => {
    const prev = makeSave()
    const next = prev.slice()
    next[0x0001] = 1 // どの領域にも入らない
    next[0x5c40] = 1 // ゲームの状態ではない値
    next[0x0000] = 1 // 難易度
    expect(changedRegions(prev, next)).toEqual(['難易度', OTHER_REGION])
  })

  it('同じなら空', () => {
    expect(changedRegions(makeSave(), makeSave())).toEqual([])
  })
})
