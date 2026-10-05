// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 値は解析ノート §3.5 のシナリオ差分（[U] 2026-10-05）で見たもの。どれも 🔶（意味も書き込みも要ゲーム内確認）
import { describe, expect, it } from 'vitest'
import { writeU8 } from './binary'
import {
  FACTION_TABLE_OFFSET,
  ROUTE_JUDGE_OFFSET,
  ROUTE_NONE_OFFSET,
  readFactions,
  readRouteJudge,
  routeEligible,
  writeFactionValue,
  writeRouteJudge,
} from './factions'
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

/** 0x3780〜0x378C。04 copy 12（幕府に3回参加、剣術大会の準備で攘夷と戦う、大寄せのあと。公儀の剣が出た） */
const BAKUFU_ROUTE = [0x03, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x01, 0x01, 0x02, 0x02, 0x00]
/** 04 copy 11・03 copy 9 の 0x3789〜0x378C（どの勢力にも入れない） */
const NO_ROUTE = [0x02, 0x02, 0x02, 0x01]

describe('大寄せの判定 🔶 §3.5（0x3789〜0x378C）', () => {
  it('勢力ごとの判定と無所属を読む', () => {
    expect(readRouteJudge(makeSave(BAKUFU_ROUTE))).toEqual({ judges: [1, 2, 2], none: 0, problem: null })
    const b = makeSave(BAKUFU_ROUTE)
    b.set(NO_ROUTE, ROUTE_JUDGE_OFFSET)
    expect(readRouteJudge(b)).toEqual({ judges: [2, 2, 2], none: 1, problem: null })
    // 大寄せ前はすべて 00
    expect(readRouteJudge(makeSave(AFTER_SNEAK))).toEqual({ judges: [0, 0, 0], none: 0, problem: null })
  })

  it('剣術大会の準備で攘夷と戦った回数は 2 として読む（行1）', () => {
    expect(readFactions(makeSave(BAKUFU_ROUTE)).values).toEqual([
      [3, 0, 0],
      [0, 0, 2],
      [0, 0, 1],
    ])
  })

  it('見たことのない値なら読み取り専用にする', () => {
    const b = makeSave(BAKUFU_ROUTE)
    writeU8(b, ROUTE_NONE_OFFSET, 0x02)
    expect(readRouteJudge(b).problem).not.toBeNull()
  })

  it('要ゲーム内確認：1バイトだけを書き、通常モードでは見た値だけ', () => {
    const before = makeSave(BAKUFU_ROUTE)
    const after = before.slice()
    writeRouteJudge(after, 2, 0x01, { advanced: false })
    writeRouteJudge(after, 3, 0x01, { advanced: false })
    expect(diffOffsets(before, after)).toEqual([ROUTE_JUDGE_OFFSET + 2, ROUTE_NONE_OFFSET])
    expect(() => writeRouteJudge(after, 0, 0x03, { advanced: false })).toThrow(RangeError)
    expect(() => writeRouteJudge(after, 3, 0x02, { advanced: false })).toThrow(RangeError)
    expect(() => writeRouteJudge(after, 4, 0x00, { advanced: true })).toThrow(RangeError)
  })

  it('✅ [U] 行0 − 行1 ≥ 3 でルートに入れる。行2 は使わない（書き換えで5通り試した結果）', () => {
    const cases: [number, number, number, boolean][] = [
      [3, 0, 0, true],
      [3, 1, 0, false],
      [4, 1, 0, true],
      [3, 0, 1, true],
      [3, 0, 5, true],
    ]
    for (const [cooperate, fought, hostile, expected] of cases) {
      const values = [
        [0, 0, cooperate],
        [0, 0, fought],
        [0, 0, hostile],
      ]
      expect(routeEligible(values, 2)).toBe(expected)
    }
    // 04 copy 12：幕府だけが入れる
    const values = readFactions(makeSave(BAKUFU_ROUTE)).values
    expect([0, 1, 2].map((c) => routeEligible(values, c))).toEqual([true, false, false])
  })

  it('読み出し→書き戻しでバイト列が一致する', () => {
    const before = makeSave(BAKUFU_ROUTE)
    const after = before.slice()
    const v = readRouteJudge(after)
    v.judges.forEach((j, c) => writeRouteJudge(after, c, j, { advanced: false }))
    writeRouteJudge(after, 3, v.none, { advanced: false })
    expect(diffOffsets(before, after)).toEqual([])
  })
})
