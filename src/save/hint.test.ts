// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 値は解析ノート「次のイベントのヒント」（sample/S4-DATA_01 copy 3〜6、[U] 2026-10-06）で見たもの。
// ✅ [U] 0x3900 の書き換えでヒントの文が変わる（2026-10-06）。値と文の対応は ❓。
import { describe, expect, it } from 'vitest'
import { writeU16, writeU8 } from './binary'
import { TS_SAVE_SIZE } from './hero'
import { HINT_NONE, HINT_OFFSET, readHint, validateHint, writeHint } from './hint'

/** 01 copy 6（2日目朝、ヒント：西洋医学お断り）の 0x3900 */
const COPY6_HINT = 9

function makeSave(value: number, size = TS_SAVE_SIZE): Uint8Array {
  const b = new Uint8Array(size)
  writeU16(b, HINT_OFFSET, value)
  // 隣のバイトが書き込みで変わらないことを見る
  writeU8(b, HINT_OFFSET - 1, 0xff)
  writeU8(b, HINT_OFFSET + 2, 0x5a)
  return b
}

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i)
  return out
}

describe('次のイベントのヒント 0x3900（値と文の対応は ❓）', () => {
  it('u16 で読む', () => {
    expect(readHint(makeSave(COPY6_HINT))).toEqual({ value: 9, warning: null, problem: null })
    expect(readHint(makeSave(HINT_NONE)).value).toBe(0xffff)
  })

  it('見たことのない値は警告する（編集はできる）', () => {
    const view = readHint(makeSave(4))
    expect(view.warning).not.toBeNull()
    expect(view.problem).toBeNull()
  })

  it('❓ U-1：サイズが 0x48BB0 でなければ読み取り専用にする', () => {
    const b = makeSave(COPY6_HINT, TS_SAVE_SIZE + 4)
    expect(readHint(b).problem).not.toBeNull()
    expect(() => writeHint(b, 3, { advanced: false })).toThrow(RangeError)
  })

  it('通常モードは 0〜255 と 0xFFFF、上級者モードは任意の u16', () => {
    expect(validateHint(255, { advanced: false })).toBeNull()
    expect(validateHint(HINT_NONE, { advanced: false })).toBeNull()
    expect(validateHint(256, { advanced: false })).not.toBeNull()
    expect(validateHint(256, { advanced: true })).toBeNull()
    expect(validateHint(0x10000, { advanced: true })).not.toBeNull()
  })

  it('書き込みは 0x3900〜0x3901 の2バイトだけを変える', () => {
    const before = makeSave(COPY6_HINT)
    const after = before.slice()
    writeHint(after, 3, { advanced: false })
    expect(diffOffsets(before, after)).toEqual([HINT_OFFSET])
    writeHint(after, HINT_NONE, { advanced: false })
    expect(diffOffsets(before, after)).toEqual([HINT_OFFSET, HINT_OFFSET + 1])
  })

  it('読み出し→書き戻しでバイト列が一致する', () => {
    const before = makeSave(COPY6_HINT)
    const after = before.slice()
    writeHint(after, readHint(after).value, { advanced: false })
    expect(diffOffsets(before, after)).toEqual([])
  })
})
