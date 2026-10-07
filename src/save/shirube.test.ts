// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 🟢 なりわいのフラグ 27〜31（0x0137〜0x013B）。受注中のなりわい（0x45F4E・0x45F55）には触らない。
// ✅ 209 の受注の差分（2026-10-07）では 27 が 0 → 1 で、28〜31 は 0 のまま（受注中も「組んだ」と同じ値）。
// ❓ U-1：固定オフセットで読む。
import { describe, expect, it } from 'vitest'
import { writeU16, writeU8 } from './binary'
import { TS_SAVE_SIZE } from './hero'
import { SHIRUBE_FLAG_OFFSETS, SHIRUBE_STATES, readShirube, shirubeStateOf, writeShirubeState } from './shirube'

function makeSave(size = TS_SAVE_SIZE): Uint8Array {
  const b = new Uint8Array(size)
  // 前後のバイトと、受注中のなりわい（209 を受注中）も置き、書き込みで変わらないことを見る
  writeU8(b, 0x0136, 7)
  writeU8(b, 0x013c, 7)
  writeU16(b, 0x45f4e, 209)
  writeU8(b, 0x45f55, 0xff)
  return b
}

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i)
  return out
}

describe('🟢 汁部（DLC）の続き物 なりわいのフラグ 27〜31', () => {
  it('🟢 27〜31 は 0x0137〜0x013B。選択肢は組んでいない・組んだと、209〜212 × 成功／失敗を成功扱い（受注はない）', () => {
    expect(SHIRUBE_FLAG_OFFSETS).toEqual([0x0137, 0x0138, 0x0139, 0x013a, 0x013b])
    expect(SHIRUBE_STATES.map((s) => s.key)).toEqual([
      'none', 'partner', '209-1', '209-2', '210-1', '210-2', '211-1', '211-2', '212-1', '212-2',
    ])
    expect(SHIRUBE_STATES.find((s) => s.key === '209-2')?.fullLabel).toBe('「今宵の虎徹は」失敗を成功扱いにしてもらった')
  })

  it('27〜31 の値から組み合わせを決める', () => {
    expect(shirubeStateOf([0, 0, 0, 0, 0])?.key).toBe('none')
    // ✅ 受注中もこの値
    expect(shirubeStateOf([1, 0, 0, 0, 0])?.key).toBe('partner')
    expect(shirubeStateOf([1, 0, 0, 2, 0])?.key).toBe('211-2')
    // 2つ以上の結果が立っている組み合わせは表にない
    expect(shirubeStateOf([1, 1, 1, 0, 0])).toBeUndefined()
  })

  it('27〜31 の 5 B だけを書き、受注中のなりわい（0x45F4E・0x45F55）には触らない', () => {
    const before = makeSave()
    const after = before.slice()
    writeShirubeState(after, '210-1')
    expect(diffOffsets(before, after)).toEqual([0x0137, 0x0139])
    expect(Array.from(after.slice(0x0137, 0x013c))).toEqual([1, 0, 1, 0, 0])
    writeShirubeState(after, 'none')
    expect(diffOffsets(before, after)).toEqual([])
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
    for (const key of ['none', 'partner', '212-2']) {
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
