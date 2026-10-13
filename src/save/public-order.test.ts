// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 0x0015 が治安で、書き換えがゲームに反映されることは ✅ [U] 2026-10-08（鍛冶屋で踏み倒すと 44 → 34）。
// 段階の境目は [W] の仕様（docs/save_format/chunks/date-location「治安の段階」）。
import { describe, expect, it } from 'vitest'
import { writeU8 } from './binary'
import { TS_SAVE_SIZE } from './layout'
import {
  PUBLIC_ORDER_OFFSET,
  publicOrderLevel,
  readPublicOrder,
  validatePublicOrder,
  writePublicOrder,
} from './public-order'

/** 鍛冶屋で踏み倒す前の 0x0015 */
const BEFORE_RUNOFF = 44

function makeSave(value: number, size = TS_SAVE_SIZE): Uint8Array {
  const b = new Uint8Array(size)
  writeU8(b, PUBLIC_ORDER_OFFSET, value)
  // 隣のバイト（時間帯 0x0014、用途不明 0x0016）が書き込みで変わらないことを見る
  writeU8(b, PUBLIC_ORDER_OFFSET - 1, 1)
  writeU8(b, PUBLIC_ORDER_OFFSET + 1, 0x5a)
  return b
}

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i)
  return out
}

describe('✅ [U] 治安 0x0015', () => {
  it('u8 で読み、[W] の段階を付ける', () => {
    expect(readPublicOrder(makeSave(BEFORE_RUNOFF))).toEqual({ value: 44, level: '普通', warnings: [], problem: null })
  })

  it('[W] 段階の境目', () => {
    expect([0, 9, 10, 29, 30, 69, 70, 89, 90, 99].map(publicOrderLevel)).toEqual([
      'とても悪い', 'とても悪い', '悪い', '悪い', '普通', '普通', '良い', '良い', 'とても良い', 'とても良い',
    ])
    expect(publicOrderLevel(100)).toBeNull()
  })

  it('範囲外の値は警告する（編集はできる）', () => {
    const view = readPublicOrder(makeSave(150))
    expect((view.warnings.join('。') || null)).not.toBeNull()
    expect(view.level).toBeNull()
    expect(view.problem).toBeNull()
  })

  it('サイズが 0x48BB0 でなければ読み取り専用にする', () => {
    const b = makeSave(BEFORE_RUNOFF, TS_SAVE_SIZE + 4)
    expect(readPublicOrder(b).problem).not.toBeNull()
    expect(() => writePublicOrder(b, 50, { advanced: false })).toThrow(RangeError)
  })

  it('通常モードは 0〜99、上級者モードは任意の u8', () => {
    expect(validatePublicOrder(99, { advanced: false })).toBeNull()
    expect(validatePublicOrder(100, { advanced: false })).not.toBeNull()
    expect(validatePublicOrder(255, { advanced: true })).toBeNull()
    expect(validatePublicOrder(256, { advanced: true })).not.toBeNull()
    expect(validatePublicOrder(-1, { advanced: true })).not.toBeNull()
  })

  it('書き込みは 0x0015 の1バイトだけを変える', () => {
    const before = makeSave(BEFORE_RUNOFF)
    const after = before.slice()
    writePublicOrder(after, 34, { advanced: false })
    expect(diffOffsets(before, after)).toEqual([PUBLIC_ORDER_OFFSET])
    expect(after[PUBLIC_ORDER_OFFSET]).toBe(34)
  })

  it('読み出し→書き戻しでバイト列が一致する', () => {
    const before = makeSave(BEFORE_RUNOFF)
    const after = before.slice()
    writePublicOrder(after, readPublicOrder(after).value, { advanced: false })
    expect(diffOffsets(before, after)).toEqual([])
  })
})
