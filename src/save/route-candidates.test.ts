// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 値は [U] 2026-10-06 の比較（解析ノート §9.5）で見たもの。
// 0x378E＝隠しルート（✅ [U] 2026-10-06 書き換えで確認。三姉妹見参＝添字70 が成功のときだけ効く）。
// ❓ 0x378D・0x3793・0x3799・0x379F・0x37A2・0x37AA は意味不明（0x378D・0x3799・0x379F・0x37AA はルートの切り替えに効かなかった）。
import { describe, expect, it } from 'vitest'
import { writeU8 } from './binary'
import { TS_SAVE_SIZE } from './hero'
import {
  HIDDEN_ROUTE_EVENT_INDEX,
  HIDDEN_ROUTE_OFFSET,
  RAW_ROUTE_OFFSETS,
  ROUTE_CANDIDATE_END,
  ROUTE_CANDIDATE_LENGTH,
  ROUTE_CANDIDATE_START,
  readRouteCandidates,
  validateRouteCandidate,
  writeHiddenRoute,
  writeRouteCandidate,
} from './route-candidates'

/** sample/S4-DATA_00（隠しルートに入った直後）の 0x378D〜0x37AA */
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

describe('隠しルート 0x378E と周りの生の値 0x378D〜0x37AA §9.5', () => {
  it('0x378D〜0x37AA の30バイトと、隠しルートのフラグを読む', () => {
    expect(ROUTE_CANDIDATE_LENGTH).toBe(30)
    expect(HIDDEN).toHaveLength(30)
    expect(readRouteCandidates(makeSave(HIDDEN))).toEqual({
      values: HIDDEN,
      hidden: 1,
      hiddenProblem: null,
      warning: null,
      problem: null,
    })
  })

  it('✅ [U] 隠しルートは 0x378E。三姉妹見参（添字70）と組で効く。生の値の欄には出さない', () => {
    expect(HIDDEN_ROUTE_OFFSET).toBe(0x378e)
    expect(HIDDEN_ROUTE_EVENT_INDEX).toBe(70)
    expect(RAW_ROUTE_OFFSETS).toHaveLength(29)
    expect(RAW_ROUTE_OFFSETS).not.toContain(0x378e)
  })

  it('隠しルートのフラグは 1バイトだけ書く。通常モードは 0〜2 だけ', () => {
    const before = makeSave(HIDDEN)
    const after = before.slice()
    writeHiddenRoute(after, 0, { advanced: false })
    expect(diffOffsets(before, after)).toEqual([0x378e])
    expect(() => writeHiddenRoute(after, 3, { advanced: false })).toThrow(RangeError)
    writeHiddenRoute(after, 3, { advanced: true })
    expect(after[0x378e]).toBe(3)
    expect(readRouteCandidates(after).hiddenProblem).not.toBeNull()
  })

  it('🔶 0x378E＝2（01 copy 12：怒りの矛先のあと。差分1回）も読み取り専用にしない', () => {
    const values = HIDDEN.slice()
    values[1] = 2
    const view = readRouteCandidates(makeSave(values))
    expect(view.hidden).toBe(2)
    expect(view.hiddenProblem).toBeNull()
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
