// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 値は解析ノート §9.6（[U] 2026-10-06）で見たもの。
// 🔶 0x374E＝赤城（00 生存・01 死亡・03 病院）、0x374F＝小暮（01 死亡、差分1回）。❓ 0x3756 は誰か不明。書き換えの効果は要ゲーム内確認。
import { describe, expect, it } from 'vitest'
import { writeU8 } from './binary'
import { TS_SAVE_SIZE } from './hero'
import {
  CHARACTER_END,
  CHARACTER_LENGTH,
  CHARACTER_NOTES,
  CHARACTER_START,
  readCharacters,
  validateCharacter,
  writeCharacter,
} from './characters'

/** 🔶 sample/S4-DATA_01 copy 12（赤城・小暮が死んだあと）の 0x374E〜0x375C */
const BOTH_DEAD = [1, 1, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0]

function makeSave(values: number[], size = TS_SAVE_SIZE): Uint8Array {
  const b = new Uint8Array(size)
  values.forEach((v, i) => writeU8(b, CHARACTER_START + i, v))
  // 前後のバイト（イベント状態 A の最後 0x374D、施設 0x375D）も置き、書き込みで変わらないことを見る
  writeU8(b, 0x374d, 0xff)
  writeU8(b, 0x375d, 1)
  return b
}

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i)
  return out
}

describe('🔶 重要人物の状態の候補 0x374E〜0x375C §9.6', () => {
  it('0x374E〜0x375C の15バイトを読む', () => {
    expect(CHARACTER_LENGTH).toBe(15)
    expect(BOTH_DEAD).toHaveLength(15)
    expect(readCharacters(makeSave(BOTH_DEAD))).toEqual({ values: BOTH_DEAD, warning: null, problem: null })
  })

  it('🔶 0x374E は赤城、0x374F は小暮と推定している', () => {
    expect(CHARACTER_NOTES[0x374e].name).toBe('赤城？')
    expect(CHARACTER_NOTES[0x374f].name).toBe('小暮？')
  })

  it('見たことのない値（4 以上）は警告だけ出す', () => {
    const values = BOTH_DEAD.slice()
    values[3] = 4
    const view = readCharacters(makeSave(values))
    expect(view.warning).not.toBeNull()
    expect(view.problem).toBeNull()
  })

  it('❓ U-1：サイズが 0x48BB0 でなければ読み取り専用にする', () => {
    expect(readCharacters(makeSave(BOTH_DEAD, TS_SAVE_SIZE + 4)).problem).not.toBeNull()
  })

  it('書き込みは、そのオフセットの1バイトだけを変える', () => {
    for (let offset = CHARACTER_START; offset <= CHARACTER_END; offset++) {
      const before = makeSave(BOTH_DEAD)
      const after = before.slice()
      writeCharacter(after, offset, before[offset] === 3 ? 0 : 3, { advanced: false })
      expect(diffOffsets(before, after)).toEqual([offset])
    }
  })

  it('範囲の外（イベント状態 A・施設）には書かない', () => {
    const b = makeSave(BOTH_DEAD)
    expect(() => writeCharacter(b, CHARACTER_START - 1, 0, { advanced: true })).toThrow(RangeError)
    expect(() => writeCharacter(b, CHARACTER_END + 1, 0, { advanced: true })).toThrow(RangeError)
  })

  it('通常モードは 0〜3 だけ。上級者モードでは任意の u8', () => {
    expect(validateCharacter(3, { advanced: false })).toBeNull()
    expect(validateCharacter(4, { advanced: false })).not.toBeNull()
    expect(validateCharacter(255, { advanced: true })).toBeNull()
    expect(validateCharacter(256, { advanced: true })).not.toBeNull()
  })

  it('読み出し→書き戻しでバイト列が一致する', () => {
    const before = makeSave(BOTH_DEAD)
    const after = before.slice()
    readCharacters(after).values.forEach((v, i) =>
      writeCharacter(after, CHARACTER_START + i, v, { advanced: false }),
    )
    expect(diffOffsets(before, after)).toEqual([])
  })
})
