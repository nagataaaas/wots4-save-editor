// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 🟢 なりわいのフラグ 27〜31（0x0137〜0x013B）。
// ✅ 209 の受注の差分（2026-10-07）：27 が 0 → 1、0x45F4E が 0 → 209、0x45F55 が 0 → FF、28〜31 は 0 のまま。
// 受注の書き込みは occupation-accept.ts と同じ。❓ U-1：固定オフセットで読む。
import { describe, expect, it } from 'vitest'
import { writeU16, writeU32, writeU8 } from './binary'
import { TS_SAVE_SIZE } from './hero'
import { SHIRUBE_FLAG_OFFSETS, SHIRUBE_STATES, readShirube, shirubeStateOf, writeShirubeState } from './shirube'

/** 実セーブで見た「組んでいない」状態に近いもの（1日目昼。記録の 209 が 5、210 が 3） */
function makeSave(size = TS_SAVE_SIZE): Uint8Array {
  const b = new Uint8Array(size)
  writeU16(b, 0x0010, 100)
  for (let id = 0; id < 256; id++) writeU16(b, 0x33a4 + id * 2, 0xffff)
  writeU16(b, 0x33a4 + 209 * 2, 5)
  writeU16(b, 0x33a4 + 210 * 2, 3)
  writeU16(b, 0x33a4 + 211 * 2, 1)
  writeU16(b, 0x33a4 + 212 * 2, 1)
  // 前後のバイトも置き、書き込みで変わらないことを見る
  writeU8(b, 0x0136, 7)
  writeU8(b, 0x013c, 7)
  writeU32(b, 0x0bd8, 0)
  return b
}

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i)
  return out
}

describe('🟢 汁部（DLC）のなりわい なりわいのフラグ 27〜31 ＋ 受注', () => {
  it('🟢 27〜31 は 0x0137〜0x013B。選択肢は組んでいない・組んだと、209〜212 × 受注／成功／失敗を成功扱い', () => {
    expect(SHIRUBE_FLAG_OFFSETS).toEqual([0x0137, 0x0138, 0x0139, 0x013a, 0x013b])
    expect(SHIRUBE_STATES.map((s) => s.key)).toEqual([
      'none', 'partner',
      '209-accepted', '209-1', '209-2',
      '210-accepted', '210-1', '210-2',
      '211-accepted', '211-1', '211-2',
      '212-accepted', '212-1', '212-2',
    ])
    expect(SHIRUBE_STATES.find((s) => s.key === '209-accepted')?.fullLabel).toBe('「今宵の虎徹は」受注')
  })

  it('27〜31 と受注中の ID から組み合わせを決める。汁部以外の受注は受注していないものとして見る', () => {
    expect(shirubeStateOf([0, 0, 0, 0, 0], 0)?.key).toBe('none')
    expect(shirubeStateOf([1, 0, 0, 0, 0], 0)?.key).toBe('partner')
    expect(shirubeStateOf([1, 0, 0, 0, 0], 209)?.key).toBe('209-accepted')
    expect(shirubeStateOf([1, 0, 0, 0, 0], 171)?.key).toBe('partner')
    expect(shirubeStateOf([1, 0, 0, 2, 0], 0)?.key).toBe('211-2')
    expect(shirubeStateOf([1, 1, 1, 0, 0], 0)).toBeUndefined()
    expect(shirubeStateOf([1, 1, 0, 0, 0], 210)).toBeUndefined()
  })

  it('✅ 1日目昼に「今宵の虎徹は」受注を選ぶと、実セーブの受注の差分と同じ 0x0137・0x45F4E・0x45F55 だけを書く', () => {
    const before = makeSave()
    const after = before.slice()
    writeShirubeState(after, '209-accepted')
    expect(diffOffsets(before, after)).toEqual([0x0137, 0x45f4e, 0x45f55])
    expect(Array.from(after.slice(0x45f4e, 0x45f56))).toEqual([0xd1, 0, 0, 0, 0, 0, 0, 0xff])
    expect(readShirube(after).state?.key).toBe('209-accepted')
  })

  it('受注以外を選ぶと汁部の仕事の受注を外す。汁部以外の受注には触らない', () => {
    const before = makeSave()
    const after = before.slice()
    writeShirubeState(after, '210-accepted')
    writeShirubeState(after, 'partner')
    expect(diffOffsets(before, after)).toEqual([0x0137])
    writeShirubeState(after, '210-accepted')
    writeShirubeState(after, '210-1')
    expect(diffOffsets(before, after)).toEqual([0x0137, 0x0139])
    writeShirubeState(after, 'none')
    expect(diffOffsets(before, after)).toEqual([])

    const other = makeSave()
    writeU16(other, 0x45f4e, 171)
    writeU8(other, 0x45f55, 0xff)
    const otherAfter = other.slice()
    writeShirubeState(otherAfter, 'partner')
    expect(diffOffsets(other, otherAfter)).toEqual([0x0137])
  })

  it('知らない key は拒否する', () => {
    expect(() => writeShirubeState(makeSave(), 'x')).toThrow(RangeError)
  })

  it('❓ U-1：サイズが 0x48BB0 でなければ読み取り専用にする', () => {
    const b = makeSave(TS_SAVE_SIZE + 4)
    expect(readShirube(b).problem).not.toBeNull()
    expect(() => writeShirubeState(b, 'none')).toThrow(RangeError)
  })

  it('読み出し→書き戻しでバイト列が一致する', () => {
    for (const key of ['none', 'partner', '209-accepted', '212-2']) {
      const before = makeSave()
      writeShirubeState(before, key)
      const after = before.slice()
      const state = readShirube(after).state
      expect(state?.key).toBe(key)
      writeShirubeState(after, state!.key)
      expect(diffOffsets(before, after)).toEqual([])
    }
  })
})
