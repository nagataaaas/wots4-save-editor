// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 値は [U] 2026-10-06 の比較（docs/save_format/chunks/best-route）で見たもの。
// 0x378E＝真ルート（✅ [U] 2026-10-06 書き換えで確認。三姉妹見参＝添字70 が成功のときだけ効く）。2＝真ルートを外れた（🟢）。
// 🟢 0x378D は序章のあとの道筋（1＝通常、2＝真ルートに入った）。0x378D・0x3799・0x379F・0x37AA はルートの切り替えに効かなかった（[U]）。
// ❓ 0x37A2・0x379B は場面だけ分かっていて意味は未確認。🔶 0x37A3（会談の手紙）・0x37A4（黒船の状態）は意味が推定。
// 🔶 好感度・ポイント（0x3792〜0x3797）の通常モードの上限 20 はゲームの上限ではない（yobai-points.ts と同じ）。
import { describe, expect, it } from 'vitest'
import { writeU8 } from './binary'
import { TS_SAVE_SIZE } from './hero'
import {
  BEST_ROUTE_EVENT_INDEX,
  BEST_ROUTE_OFFSET,
  BEST_ROUTE_VALUES,
  RAW_ROUTE_OFFSETS,
  ROUTE_CANDIDATE_NOTES,
  ROUTE_CANDIDATE_END,
  ROUTE_CANDIDATE_LENGTH,
  ROUTE_CANDIDATE_START,
  readRouteCandidates,
  routeCandidateNormalMax,
  validateRouteCandidate,
  writeBestRoute,
  writeRouteCandidate,
} from './route-candidates'

/** sample/S4-DATA_00（真ルートに入った直後）の 0x378D〜0x37AA */
const BEST = [2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2]

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

describe('真ルート 0x378E と周りの生の値 0x378D〜0x37AA chunks/best-route', () => {
  it('0x378D〜0x37AA の30バイトと、真ルートのフラグを読む', () => {
    expect(ROUTE_CANDIDATE_LENGTH).toBe(30)
    expect(BEST).toHaveLength(30)
    expect(readRouteCandidates(makeSave(BEST))).toEqual({
      values: BEST,
      best: 1,
      bestProblem: null,
      warning: null,
      problem: null,
    })
  })

  it('✅ [U] 真ルートは 0x378E。三姉妹見参（添字70）と組で効く。生の値の欄には出さない', () => {
    expect(BEST_ROUTE_OFFSET).toBe(0x378e)
    expect(BEST_ROUTE_EVENT_INDEX).toBe(70)
    expect(RAW_ROUTE_OFFSETS).toHaveLength(20)
    expect(RAW_ROUTE_OFFSETS).not.toContain(0x378e)
  })

  it('勢力の退場（0x378F〜0x3791）と好感度・ポイント（0x3792〜0x3797）はほかの画面で編集するので、生の値の欄に出さない', () => {
    for (let o = 0x378f; o <= 0x3797; o++) expect(RAW_ROUTE_OFFSETS).not.toContain(o)
    expect(RAW_ROUTE_OFFSETS).toContain(0x378d)
    expect(RAW_ROUTE_OFFSETS).toContain(0x3798)
  })

  it('真ルートのフラグは 1バイトだけ書く。通常モードは 0〜2 だけ', () => {
    const before = makeSave(BEST)
    const after = before.slice()
    writeBestRoute(after, 0, { advanced: false })
    expect(diffOffsets(before, after)).toEqual([0x378e])
    expect(() => writeBestRoute(after, 3, { advanced: false })).toThrow(RangeError)
    writeBestRoute(after, 3, { advanced: true })
    expect(after[0x378e]).toBe(3)
    expect(readRouteCandidates(after).bestProblem).not.toBeNull()
  })

  it('🟢 0x378E＝2（真ルートを外れた）も読み取り専用にしない', () => {
    expect(BEST_ROUTE_VALUES.map((v) => v.value)).toEqual([0, 1, 2])
    expect(BEST_ROUTE_VALUES[2].label).toContain('外れた')
    const values = BEST.slice()
    values[1] = 2
    const view = readRouteCandidates(makeSave(values))
    expect(view.best).toBe(2)
    expect(view.bestProblem).toBeNull()
  })

  it('🟢 生の値の欄に出すバイトは、どれも名前と説明がある', () => {
    for (const o of RAW_ROUTE_OFFSETS) {
      expect(ROUTE_CANDIDATE_NOTES[o]?.name, `0x${o.toString(16)}`).toBeTruthy()
      expect(ROUTE_CANDIDATE_NOTES[o]?.note, `0x${o.toString(16)}`).toBeTruthy()
    }
    expect(ROUTE_CANDIDATE_NOTES[0x378d].name).toBe('序章のあとの道筋')
    expect(ROUTE_CANDIDATE_NOTES[0x379f].name).toBe('序章の大砲')
    expect(ROUTE_CANDIDATE_NOTES[0x37a1].name).toBe('小公女の薬')
    expect(ROUTE_CANDIDATE_NOTES[0x37aa].name).toBe('チュートリアルの進み方')
  })

  it('🟢 堂島・先生のなりわい、般若党の本拠（1 と 2 は効果が同じ）、会談の手紙、黒船、最後通告', () => {
    expect(ROUTE_CANDIDATE_NOTES[0x3799].name).toBe('堂島が鍛冶屋に戻った')
    expect(ROUTE_CANDIDATE_NOTES[0x379a].name).toBe('先生が道場の師範代')
    expect(ROUTE_CANDIDATE_NOTES[0x37a2].name).toBe('般若党の本拠')
    expect(ROUTE_CANDIDATE_NOTES[0x37a2].note).toContain('1 と 2 の効果は同じ')
    expect(ROUTE_CANDIDATE_NOTES[0x37a3].name).toBe('会談の手紙')
    expect(ROUTE_CANDIDATE_NOTES[0x37a4].name).toBe('黒船')
    expect(ROUTE_CANDIDATE_NOTES[0x37a8].name).toBe('最後通告に逆らった')
  })

  it('🟢 0x37A9 は周回数ではなく未使用。0x3798・0x379C〜0x379E・0x37A5〜0x37A7 も未使用', () => {
    for (const o of [0x3798, 0x379c, 0x379d, 0x379e, 0x37a5, 0x37a6, 0x37a7, 0x37a9])
      expect(ROUTE_CANDIDATE_NOTES[o].name).toBe('未使用')
    expect(ROUTE_CANDIDATE_NOTES[0x37a9].note).toContain('周回数ではない')
  })

  it('🔶 好感度・ポイント（0x3792〜0x3797）は通常モードで 0〜20。ほかは 0〜2', () => {
    for (let o = 0x3792; o <= 0x3797; o++) expect(routeCandidateNormalMax(o)).toBe(20)
    expect(routeCandidateNormalMax(0x378d)).toBe(2)
    expect(routeCandidateNormalMax(0x37aa)).toBe(2)
    expect(validateRouteCandidate(12, { advanced: false, offset: 0x3792 })).toBeNull()
    expect(validateRouteCandidate(21, { advanced: false, offset: 0x3792 })).not.toBeNull()
    expect(validateRouteCandidate(3, { advanced: false, offset: 0x37a2 })).not.toBeNull()
    const values = BEST.slice()
    values[0x3792 - ROUTE_CANDIDATE_START] = 12 // ローラの好感度を全部成功させた値
    const b = makeSave(values)
    expect(readRouteCandidates(b).warning).toBeNull()
    writeRouteCandidate(b, 0x3793, 10, { advanced: false })
    expect(b[0x3793]).toBe(10)
    expect(() => writeRouteCandidate(b, 0x37a2, 10, { advanced: false })).toThrow(RangeError)
  })

  it('通常の進行では見ない値（好感度・ポイント以外で 3 以上）は警告だけ出す', () => {
    const values = BEST.slice()
    values[0x378f - ROUTE_CANDIDATE_START] = 3
    const view = readRouteCandidates(makeSave(values))
    expect(view.warning).not.toBeNull()
    expect(view.problem).toBeNull()
  })

  it('サイズが 0x48BB0 でなければ読み取り専用にする', () => {
    expect(readRouteCandidates(makeSave(BEST, TS_SAVE_SIZE + 4)).problem).not.toBeNull()
  })

  it('書き込みは、そのオフセットの1バイトだけを変える', () => {
    for (let offset = ROUTE_CANDIDATE_START; offset <= ROUTE_CANDIDATE_END; offset++) {
      const before = makeSave(BEST)
      const after = before.slice()
      writeRouteCandidate(after, offset, before[offset] === 1 ? 2 : 1, { advanced: false })
      expect(diffOffsets(before, after)).toEqual([offset])
    }
  })

  it('範囲の外には書かない', () => {
    const b = makeSave(BEST)
    expect(() => writeRouteCandidate(b, ROUTE_CANDIDATE_START - 1, 0, { advanced: true })).toThrow(RangeError)
    expect(() => writeRouteCandidate(b, ROUTE_CANDIDATE_END + 1, 0, { advanced: true })).toThrow(RangeError)
  })

  it('通常モードは 0〜2 だけ。上級者モードでは任意の u8', () => {
    expect(validateRouteCandidate(2, { advanced: false })).toBeNull()
    expect(validateRouteCandidate(3, { advanced: false })).not.toBeNull()
    expect(validateRouteCandidate(255, { advanced: true })).toBeNull()
    expect(validateRouteCandidate(256, { advanced: true })).not.toBeNull()
    const b = makeSave(BEST)
    writeRouteCandidate(b, 0x378d, 0xff, { advanced: true })
    expect(b[0x378d]).toBe(0xff)
  })

  it('読み出し→書き戻しでバイト列が一致する', () => {
    const before = makeSave(BEST)
    const after = before.slice()
    readRouteCandidates(after).values.forEach((v, i) =>
      writeRouteCandidate(after, ROUTE_CANDIDATE_START + i, v, { advanced: false }),
    )
    expect(diffOffsets(before, after)).toEqual([])
  })
})
