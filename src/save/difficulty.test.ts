// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 値は docs/save_format/chunks/difficulty の調査記録（[U] 2026-10-08）で見たもの。
// 難易度 0x0000：易しい＝0・超難しい＝3 は ✅ [U]。普通＝1・難しい＝2 は 🔶 推測。書き換えの反映は ✅ [U]。
import { describe, expect, it } from 'vitest'
import { writeU8 } from './binary'
import { DIFFICULTIES, DIFFICULTY_OFFSET, readDifficulty, writeDifficulty } from './difficulty'
import { TS_SAVE_SIZE } from './hero'

/** 0x0000〜0x0003（実セーブで見た並び） */
const SEEN = {
  easy: [0x00, 0x00, 0x00, 0x00],
  harakiri: [0x03, 0x00, 0x00, 0x00],
}

function makeSave(head: number[], size = TS_SAVE_SIZE): Uint8Array {
  const b = new Uint8Array(size)
  b.set(head, 0)
  // 隣の金庫（0x000C）が書き込みで変わらないことを見る
  b.set([0xb4, 0xd5], 0x0c)
  return b
}

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i)
  return out
}

describe('難易度 0x0000', () => {
  it('✅ [U] 易しい＝0・超難しい＝3 を読む', () => {
    expect(readDifficulty(makeSave(SEEN.easy))).toEqual({ value: 0, label: '易しい', warning: null, problem: null })
    expect(readDifficulty(makeSave(SEEN.harakiri))).toEqual({ value: 3, label: '超難しい', warning: null, problem: null })
  })

  it('🔶 普通＝1・難しい＝2 は推測（確度を残す）', () => {
    expect(DIFFICULTIES.map((d) => [d.value, d.label, d.certainty])).toEqual([
      [0, '易しい', '✅'],
      [1, '普通', '🔶'],
      [2, '難しい', '🔶'],
      [3, '超難しい', '✅'],
    ])
  })

  it('0〜3 の外の値や、0x0001〜0x0003 が 0 でないときは警告する（🔶 幅は u8 と推定）', () => {
    const b = makeSave(SEEN.easy)
    writeU8(b, DIFFICULTY_OFFSET, 4)
    expect(readDifficulty(b)).toMatchObject({ label: null, problem: null })
    expect(readDifficulty(b).warning).toMatch(/0〜3/)
    const c = makeSave(SEEN.easy)
    writeU8(c, 2, 1)
    expect(readDifficulty(c).warning).toMatch(/0x0001〜0x0003/)
  })

  it('✅ [U] 書き換えはゲームに反映される：0x0000 の1バイトだけを変える', () => {
    const before = makeSave(SEEN.easy)
    const after = before.slice()
    writeDifficulty(after, 3)
    expect(diffOffsets(before, after)).toEqual([0])
    expect(diffOffsets(makeSave(SEEN.harakiri), after)).toEqual([])
  })

  it('0〜3 の外は書かない', () => {
    const b = makeSave(SEEN.easy)
    for (const v of [-1, 4, 255, 1.5]) expect(() => writeDifficulty(b, v)).toThrow(RangeError)
  })

  it('読み出し→書き戻しでバイト列が一致する', () => {
    for (const head of Object.values(SEEN)) {
      const before = makeSave(head)
      const after = before.slice()
      writeDifficulty(after, readDifficulty(after).value)
      expect(diffOffsets(before, after)).toEqual([])
    }
  })

  it('サイズが 0x48BB0 でなければ読み取り専用にする', () => {
    const b = makeSave(SEEN.easy, TS_SAVE_SIZE + 4)
    expect(readDifficulty(b).problem).not.toBeNull()
    expect(() => writeDifficulty(b, 3)).toThrow(RangeError)
  })
})
