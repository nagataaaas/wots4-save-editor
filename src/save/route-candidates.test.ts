// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 値は [U] 2026-10-06 の比較（解析ノート §9.5）で見たもの。
// 🔶 0x378D（ルートの種類か）・0x378E・0x37AA が隠しルートのフラグの候補。❓ 0x3793・0x3799・0x379F・0x37A2 は意味不明。要ゲーム内確認。
import { describe, expect, it } from 'vitest'
import { writeU8 } from './binary'
import { TS_SAVE_SIZE } from './hero'
import {
  ROUTE_CANDIDATE_END,
  ROUTE_CANDIDATE_LENGTH,
  ROUTE_CANDIDATE_START,
  readRouteCandidates,
  validateRouteCandidate,
  writeRouteCandidate,
} from './route-candidates'

/** 🔶 sample/S4-DATA_00（隠しルートに入った直後）の 0x378D〜0x37AA */
const HIDDEN = [2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2]

function makeSave(values: number[], size = TS_SAVE_SIZE): Uint8Array {
  const b = new Uint8Array(size)
  values.forEach((v, i) => writeU8(b, ROUTE_CANDIDATE_START + i, v))
  // 前後のバイト（ルート分岐 0x378C、0x37AB）も置き、書き込みで変わらないことを見る
  writeU8(b, 0x378c, 1)
  writeU8(b, 0x37ab, 1)
  return b
}

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i)
  return out
}

describe('🔶 隠しルートの候補 0x378D〜0x37AA §9.5', () => {
  it('0x378D〜0x37AA の30バイトを読む', () => {
    expect(ROUTE_CANDIDATE_LENGTH).toBe(30)
    expect(HIDDEN).toHaveLength(30)
    expect(readRouteCandidates(makeSave(HIDDEN))).toEqual({ values: HIDDEN, warning: null, problem: null })
  })

  it('見たことのない値（3 以上）は警告だけ出す', () => {
    const values = HIDDEN.slice()
    values[5] = 3
    const view = readRouteCandidates(makeSave(values))
    expect(view.warning).not.toBeNull()
    expect(view.problem).toBeNull()
  })

  it('❓ U-1：サイズが 0x48BB0 でなければ読み取り専用にする', () => {
    expect(readRouteCandidates(makeSave(HIDDEN, TS_SAVE_SIZE + 4)).problem).not.toBeNull()
  })

  it('書き込みは、そのオフセットの1バイトだけを変える', () => {
    for (let offset = ROUTE_CANDIDATE_START; offset <= ROUTE_CANDIDATE_END; offset++) {
      const before = makeSave(HIDDEN)
      const after = before.slice()
      writeRouteCandidate(after, offset, before[offset] === 1 ? 2 : 1, { advanced: false })
      expect(diffOffsets(before, after)).toEqual([offset])
    }
  })

  it('範囲の外には書かない', () => {
    const b = makeSave(HIDDEN)
    expect(() => writeRouteCandidate(b, ROUTE_CANDIDATE_START - 1, 0, { advanced: true })).toThrow(RangeError)
    expect(() => writeRouteCandidate(b, ROUTE_CANDIDATE_END + 1, 0, { advanced: true })).toThrow(RangeError)
  })

  it('通常モードは 0〜2 だけ。上級者モードでは任意の u8', () => {
    expect(validateRouteCandidate(2, { advanced: false })).toBeNull()
    expect(validateRouteCandidate(3, { advanced: false })).not.toBeNull()
    expect(validateRouteCandidate(255, { advanced: true })).toBeNull()
    expect(validateRouteCandidate(256, { advanced: true })).not.toBeNull()
    const b = makeSave(HIDDEN)
    writeRouteCandidate(b, 0x378d, 0xff, { advanced: true })
    expect(b[0x378d]).toBe(0xff)
  })

  it('読み出し→書き戻しでバイト列が一致する', () => {
    const before = makeSave(HIDDEN)
    const after = before.slice()
    readRouteCandidates(after).values.forEach((v, i) =>
      writeRouteCandidate(after, ROUTE_CANDIDATE_START + i, v, { advanced: false }),
    )
    expect(diffOffsets(before, after)).toEqual([])
  })
})
