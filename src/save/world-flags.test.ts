// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 値は docs/save_format/chunks/gates の調査記録のシナリオ差分（[U] 2026-10-05）で見たもの。
// 代官所の表門（0x37FA）・居留地（0x3764）の門と神社入口の柵（0x37C3）は、書き換えで開くことを確認（✅ [U] 2026-10-06）。
// 代官所の裏門（0x37FB）は 🟢 意味のみ。1＝閉じるは 🔶、書き換えで裏門が開くかは ❓ 要ゲーム内確認。
// 大寄せ前の門 0x377D（代官所）・0x377E（居留地）・0x377F（神社）は 1 で開き、書き換えで反映された（✅ [U] 2026-10-06）。
import { describe, expect, it } from 'vitest'
import { writeU8 } from './binary'
import { TS_SAVE_SIZE } from './hero'
import { WORLD_FLAGS, readWorldFlags, writeWorldFlag } from './world-flags'

/**
 * WORLD_FLAGS の順。大寄せ以降の4つは 04 copy 11（根無し草、大寄せのあと。3つの門がすべて閉じている）、
 * 大寄せ前の3つは S4-DATA_01（阿弥浜港争乱の直後、居留地だけが開いている）の値
 */
const NO_ROUTE = [1, 1, 1, 1, 0, 1, 0]

function makeSave(values: number[], size = TS_SAVE_SIZE): Uint8Array {
  const b = new Uint8Array(size)
  WORLD_FLAGS.forEach((f, i) => writeU8(b, f.offset, values[i]))
  // 意味の分からないバイト（UI に出さない）も置き、書き込みで変わらないことを見る
  writeU8(b, 0x37a2, 2)
  writeU8(b, 0x377c, 1)
  return b
}

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i)
  return out
}

describe('門・柵のフラグ chunks/gates', () => {
  it('大寄せ以降と大寄せ前の、代官所・居留地・神社の門を読む', () => {
    expect(WORLD_FLAGS.map((f) => f.offset)).toEqual([0x37fa, 0x37fb, 0x3764, 0x37c3, 0x377d, 0x377e, 0x377f])
    expect(readWorldFlags(makeSave(NO_ROUTE))).toEqual({ values: NO_ROUTE, problem: null })
  })

  it('✅ [U] 大寄せ以降の門は 1 で閉じ、大寄せ前の門は 1 で開く（0x37FB の 1＝閉じるは 🔶）', () => {
    expect(WORLD_FLAGS.map((f) => f.meaning)).toEqual(['close', 'close', 'close', 'close', 'open', 'open', 'open'])
  })

  it('0・1 以外なら読み取り専用にする', () => {
    expect(readWorldFlags(makeSave([2, 1, 1, 1, 0, 1, 0])).problem).not.toBeNull()
    expect(readWorldFlags(makeSave([1, 2, 1, 1, 0, 1, 0])).problem).not.toBeNull()
    expect(readWorldFlags(makeSave([1, 1, 1, 1, 0, 1, 2])).problem).not.toBeNull()
  })

  it('❓ U-1：サイズが 0x48BB0 でなければ読み取り専用にする', () => {
    expect(readWorldFlags(makeSave(NO_ROUTE, TS_SAVE_SIZE + 4)).problem).not.toBeNull()
  })

  it('書き込みは、そのフラグの1バイトだけを変える', () => {
    WORLD_FLAGS.forEach((f, i) => {
      const before = makeSave(NO_ROUTE)
      const after = before.slice()
      writeWorldFlag(after, i, NO_ROUTE[i] ^ 1, { advanced: false })
      expect(diffOffsets(before, after)).toEqual([f.offset])
    })
  })

  it('通常モードは 0・1 だけ。上級者モードでは任意の u8', () => {
    const b = makeSave(NO_ROUTE)
    expect(() => writeWorldFlag(b, 0, 2, { advanced: false })).toThrow(RangeError)
    expect(() => writeWorldFlag(b, WORLD_FLAGS.length, 0, { advanced: false })).toThrow(RangeError)
    writeWorldFlag(b, 0, 2, { advanced: true })
    expect(b[0x37fa]).toBe(2)
  })

  it('読み出し→書き戻しでバイト列が一致する', () => {
    const before = makeSave(NO_ROUTE)
    const after = before.slice()
    readWorldFlags(after).values.forEach((v, i) => writeWorldFlag(after, i, v, { advanced: false }))
    expect(diffOffsets(before, after)).toEqual([])
  })
})
