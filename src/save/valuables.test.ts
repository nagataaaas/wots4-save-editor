// [TS] のレイアウトに沿って合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
import { describe, expect, it } from 'vitest'
import { writeU16, writeU32 } from './binary'
import { TS_SAVE_SIZE } from './layout'
import {
  EMPTY_ID,
  U12_VALUABLE_IDS,
  VALUABLES,
  VALUABLE_COUNT_MAX,
  VALUABLE_COUNT_SYSTEM_MAX,
  VALUABLE_IDS,
  PROBE_CANDIDATES,
  VALUABLE_SLOT_COUNT,
  valuableCountMax,
  fillEmptySlotsWithProbes,
  readValuables,
  slotOffset,
  writeValuable,
} from './valuables'

function makeSave(size = TS_SAVE_SIZE): Uint8Array {
  const b = new Uint8Array(size)
  for (let i = 0; i < VALUABLE_SLOT_COUNT; i++) {
    writeU16(b, slotOffset(i), EMPTY_ID)
    writeU16(b, slotOffset(i) + 2, 0)
  }
  writeU16(b, slotOffset(0), 0x29)
  writeU16(b, slotOffset(0) + 2, 5)
  writeU32(b, slotOffset(0) + 4, 0xdeadbeef)
  writeU16(b, slotOffset(1), 0x2b)
  writeU16(b, slotOffset(1) + 2, 2)
  return b
}

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i)
  return out
}

describe('readValuables', () => {
  it('重複と個数0の警告を両方残す', () => {
    const bytes = makeSave()
    writeU16(bytes, slotOffset(1), 0x29)
    writeU16(bytes, slotOffset(1) + 2, 0)
    expect(readValuables(bytes).slots[1].warnings).toEqual(['1件目と同じ重要品です', '個数が 0 です'])
  })

  it('🔶 個数の通常上限999：上級者モードでu16の上限を書き、元の値へ戻すとバイトが一致する', () => {
    const bytes = makeSave()
    const before = bytes.slice()
    const original = readValuables(bytes).slots[0]
    expect(() => writeValuable(bytes, 0, original.id, 0xffff)).toThrow(RangeError)
    expect(bytes.every((value, index) => value === before[index])).toBe(true)
    writeValuable(bytes, 0, original.id, 0xffff, { advanced: true })
    expect(readValuables(bytes).slots[0]).toMatchObject({ count: 0xffff, problem: null })
    expect(readValuables(bytes).slots[0].warnings).toContainEqual(expect.stringContaining('上限'))
    writeValuable(bytes, 0, original.id, original.count)
    expect(bytes.every((value, index) => value === before[index])).toBe(true)
  })
  it('✅ [TS][I-3] 0x5B90 から 8 B × 10件を ID・個数として読む', () => {
    const v = readValuables(makeSave())
    expect(v.problem).toBeNull()
    expect(v.slots).toHaveLength(10)
    expect(v.slots[0]).toMatchObject({ offset: 0x5b90, id: 0x29, count: 5, label: 'くず鉄', problem: null })
    expect(v.slots[1]).toMatchObject({ offset: 0x5b98, id: 0x2b, count: 2, label: '堂島鋼(どうじまはがね)', problem: null })
    expect(v.slots[2]).toMatchObject({ id: EMPTY_ID, label: 'なし', problem: null })
  })

  it('🔶 [TS] が扱う先頭4件の後ろも同じ形式で読む', () => {
    const v = readValuables(makeSave())
    expect(v.slots.slice(4).every((s) => s.id === EMPTY_ID && s.count === 0)).toBe(true)
  })

  it('サイズが 0x48BB0 でなければ全枠を読み取り専用にする', () => {
    const v = readValuables(makeSave(TS_SAVE_SIZE + 8))
    expect(v.problem).not.toBeNull()
    expect(v.slots[0].count).toBe(5)
    expect(v.slots.every((s) => s.problem !== null)).toBe(true)
  })

  it('❓ U-12：チップ（0x2D）・木札（0x2E）の枠は名前に「？」を付け、ほかの ID への変更だけを許す', () => {
    const b = makeSave()
    writeU16(b, slotOffset(2), 0x2d)
    writeU16(b, slotOffset(2) + 2, 1)
    writeU16(b, slotOffset(3), 0x2e)
    const v = readValuables(b)
    expect(v.slots[2]).toMatchObject({ label: 'チップ？', problem: null, idWritable: false })
    expect((v.slots[2].warnings.join('。') || null)).not.toBeNull()
    expect(v.slots[3]).toMatchObject({ label: '木札？', problem: null, idWritable: false })
    // 個数だけの変更（ID 0x2D のまま）はできず、書ける ID には変えられる
    expect(() => writeValuable(b, 2, 0x2d, 2)).toThrow()
    writeValuable(b, 2, 0x29, 1)
    writeValuable(b, 3, EMPTY_ID, 0)
    const after = readValuables(b)
    expect(after.slots[2]).toMatchObject({ id: 0x29, idWritable: true })
    expect(after.slots[3]).toMatchObject({ id: EMPTY_ID, idWritable: true })
  })

  it('未知の ID の枠は、通常モードでもほかの ID への変更だけを許す', () => {
    const b = makeSave()
    writeU16(b, slotOffset(3), 0x1234)
    const v = readValuables(b)
    expect(v.slots[3]).toMatchObject({ label: null, problem: null, idWritable: false })
    expect((v.slots[3].warnings.join('。') || null)).not.toBeNull()
  })

  it('🔶 個数が通常の上限（999、推測）を超える枠は警告し、モードを問わず読み取る', () => {
    const b = makeSave()
    writeU16(b, slotOffset(0) + 2, VALUABLE_COUNT_MAX + 1)
    expect(readValuables(b).slots[0].problem).toBeNull()
    expect(readValuables(b).slots[0].warnings).toContainEqual(expect.stringContaining('上限'))
    expect(readValuables(b, { advanced: true }).slots[0].problem).toBeNull()
  })

  it('同じ重要品が複数の枠にあれば警告する', () => {
    const b = makeSave()
    writeU16(b, slotOffset(4), 0x29)
    writeU16(b, slotOffset(4) + 2, 1)
    const v = readValuables(b)
    expect(v.slots[4].problem).toBeNull()
    expect((v.slots[4].warnings.join('。') || null)).not.toBeNull()
  })
})

describe('writeValuable', () => {
  it('ID と個数の 4 B だけを変え、+0x04〜+0x07（❓）は保持する', () => {
    const before = makeSave()
    const after = before.slice()
    writeValuable(after, 0, 0x2c, 99)
    const o = slotOffset(0)
    expect(diffOffsets(before, after).every((i) => i >= o && i < o + 4)).toBe(true)
    expect(readValuables(after).slots[0]).toMatchObject({ id: 0x2c, count: 99, label: '緋緋色金(ひひいろかね)' })
    expect(after.subarray(o + 4, o + 8)).toEqual(before.subarray(o + 4, o + 8))
  })

  it('🔶 「なし」にするときは個数 0 を書く', () => {
    const b = makeSave()
    writeValuable(b, 0, EMPTY_ID, 0)
    expect(readValuables(b).slots[0]).toMatchObject({ id: EMPTY_ID, count: 0 })
    expect(() => writeValuable(b, 0, EMPTY_ID, 1)).toThrow()
  })

  it('❓ U-12 の ID（Steam版でセーブできなくなった [U]）・未知の ID・範囲外の個数・範囲外の枠は拒否し、バイト列を変えない', () => {
    const before = makeSave()
    const b = before.slice()
    expect(() => writeValuable(b, 0, 0x2d, 1)).toThrow()
    expect(() => writeValuable(b, 0, 0x2e, 1)).toThrow()
    expect(() => writeValuable(b, 0, 0x1234, 1)).toThrow()
    expect(() => writeValuable(b, 0, 0x29, 0)).toThrow()
    expect(() => writeValuable(b, 0, 0x29, VALUABLE_COUNT_MAX + 1)).toThrow()
    expect(() => writeValuable(b, VALUABLE_SLOT_COUNT, 0x29, 1)).toThrow()
    expect(diffOffsets(before, b)).toEqual([])
  })

  it('読み出した値をそのまま書き戻すとバイト一致する', () => {
    const before = makeSave()
    const after = before.slice()
    for (const s of readValuables(before).slots) writeValuable(after, s.index, s.id, s.count)
    expect(diffOffsets(before, after)).toEqual([])
  })
})

describe('❓ U-14：ID調査モード', () => {
  it('通常モードでは未知の ID を拒否し、調査モードでは書ける', () => {
    const b = makeSave()
    expect(() => writeValuable(b, 2, 0x35, 1)).toThrow()
    writeValuable(b, 2, 0xd7, 1, { advanced: true })
    expect(readValuables(b).slots[2].idWritable).toBe(false)
    const v = readValuables(b, { advanced: true })
    expect(v.slots[2]).toMatchObject({ id: 0xd7, count: 1, label: null, problem: null, idWritable: true })
    expect((v.slots[2].warnings.join('。') || null)).not.toBeNull()
  })

  it('U-12 の ID（0x2D／0x2E）は調査モードでも拒否する', () => {
    const b = makeSave()
    expect(() => writeValuable(b, 2, 0x2d, 1, { advanced: true })).toThrow()
    expect(() => writeValuable(b, 2, 0x2e, 1, { advanced: true })).toThrow()
  })

  it('🔶 候補は 0xD7〜0xFF（🟢 の鍵 0xED・0xEE を除く）、続いて未調査の 0x9F〜0xBF', () => {
    expect(PROBE_CANDIDATES.slice(0, 2)).toEqual([0xd7, 0xd8])
    expect(PROBE_CANDIDATES).toContain(0xff)
    expect(PROBE_CANDIDATES).not.toContain(0xed)
    expect(PROBE_CANDIDATES).not.toContain(0xee)
    expect(PROBE_CANDIDATES[0xff - 0xd7 + 1 - 2]).toBe(0xa9)
    expect(PROBE_CANDIDATES.at(-1)).toBe(0xbe)
    for (const id of [0x51, 0x6f, 0x9f, 0xa7, 0xc0, 0xc3, 0xc4, 0xcc, 0xcd, 0xd6]) expect(PROBE_CANDIDATES).not.toContain(id)
    for (const id of [0x00, 0x01, 0x19, 0x21, 0x22, 0x28, 0x2d, 0x2e, 0x2f, 0x40, 0x50, 0x74, 0x7c, 0x9e, 0xa0, 0xbf, 0xc4]) {
      expect(PROBE_CANDIDATES).not.toContain(id)
    }
  })

  it('[U] 2026-10-04／05：0x2F〜0x3E は調査で分かった名前を表示し、通常モードでは書けない', () => {
    const b = makeSave()
    writeValuable(b, 2, 0x2f, 1, { advanced: true })
    writeValuable(b, 3, 0x34, 1, { advanced: true })
    const v = readValuables(b)
    expect(v.slots[2]).toMatchObject({ label: 'チラシ', idWritable: false })
    expect(v.slots[3]).toMatchObject({ label: 'ししゃも', idWritable: false })
    writeValuable(b, 4, 0x3e, 1, { advanced: true })
    expect(readValuables(b).slots[4].label).toBe('ビッグステーキ')
    writeValuable(b, 4, 0x49, 1, { advanced: true })
    expect(readValuables(b).slots[4].label).toBe('丼')
    writeValuable(b, 4, 0x70, 1, { advanced: true })
    expect(readValuables(b).slots[4].label).toBe('竹の間')
    writeValuable(b, 4, 0x7b, 1, { advanced: true })
    expect(readValuables(b).slots[4].label).toBe('茶器')
    writeValuable(b, 4, 0x99, 1, { advanced: true })
    expect(readValuables(b).slots[4].label).toBe('茶器')
    writeValuable(b, 4, 0x18, 1, { advanced: true })
    expect(readValuables(b).slots[4].label).toBe('がらくた')
    // 7回目の訂正（[U] 2026-10-05）：対応づけが1つずれていた
    writeValuable(b, 4, 0x01, 1, { advanced: true })
    expect(readValuables(b).slots[4].label).toBe('伯爵の寿司')
    writeValuable(b, 4, 0x0f, 1, { advanced: true })
    expect(readValuables(b).slots[4].label).toBe('部品箱（柄？）')
    writeValuable(b, 4, 0x14, 1, { advanced: true })
    expect(readValuables(b).slots[4].label).toBe('お金袋小')
    writeValuable(b, 4, 0x17, 1, { advanced: true })
    expect(readValuables(b).slots[4].label).toBe('お金袋特大')
    writeValuable(b, 4, 0x21, 1, { advanced: true })
    expect(readValuables(b).slots[4].label).toBe('オレ流目録')
    writeValuable(b, 4, 0x9e, 1, { advanced: true })
    expect(readValuables(b).slots[4].label).toBe('茶器')
    writeValuable(b, 4, 0xbf, 1, { advanced: true })
    expect(readValuables(b).slots[4].label).toBe('茶器')
    writeValuable(b, 4, 0x6f, 1, { advanced: true })
    expect(readValuables(b).slots[4].label).toBe('梅の間')
    writeValuable(b, 4, 0xd6, 1, { advanced: true })
    expect(readValuables(b).slots[4].label).toBe('あんころもち（セット）（開発用？）')
    expect(() => writeValuable(b, 5, 0x30, 1)).toThrow()
    const inv = readValuables(b, { advanced: true })
    expect(inv.slots[2]).toMatchObject({ label: 'チラシ', idWritable: true })
    expect((inv.slots[2].warnings.join('。') || null)).toContain('重要品ではありません')
  })

  it('空き枠だけに候補 ID を個数 1 で入れ、既存の枠は変えない', () => {
    const before = makeSave()
    const b = before.slice()
    const filled = fillEmptySlotsWithProbes(b, 0xd7)
    expect(filled).toEqual([0xd7, 0xd8, 0xd9, 0xda, 0xdb, 0xdc, 0xdd, 0xde])
    const v = readValuables(b, { advanced: true })
    expect(v.slots[0]).toMatchObject({ id: 0x29, count: 5 })
    expect(v.slots[1]).toMatchObject({ id: 0x2b, count: 2 })
    expect(v.slots.slice(2).map((s) => [s.id, s.count])).toEqual(filled.map((id) => [id, 1]))
    // +0x04〜+0x07 は変えない
    for (const i of diffOffsets(before, b)) expect((i - 0x5b90) % 8).toBeLessThan(4)
  })

  it('開始 ID は候補の並び順で進み、候補を使い切ったらそこで止める', () => {
    expect(fillEmptySlotsWithProbes(makeSave(), 0xfe)).toEqual([0xfe, 0xff, 0xa9, 0xaa, 0xab, 0xad, 0xae, 0xb0])
    expect(fillEmptySlotsWithProbes(makeSave(), 0xba)).toEqual([0xba, 0xbb, 0xbd, 0xbe])
  })

  it('候補にない開始 ID は拒否する', () => {
    expect(() => fillEmptySlotsWithProbes(makeSave(), 0x02)).toThrow()
  })

  it('サイズが違うファイルには書かない', () => {
    const b = makeSave(TS_SAVE_SIZE + 8)
    expect(() => fillEmptySlotsWithProbes(b, 0xd7)).toThrow()
  })
})

describe('🟢 U-14：拷問部屋の鍵（0xED）・謎の鍵（0xEE）', () => {
  it('選択肢にあり、通常モードで書ける。ゲーム内で未確認なので警告を出す', () => {
    const b = makeSave()
    writeValuable(b, 2, 0xed, 1)
    writeValuable(b, 3, 0xee, 1)
    const v = readValuables(b)
    expect(v.slots[2]).toMatchObject({ id: 0xed, count: 1, label: '拷問部屋の鍵', problem: null, idWritable: true })
    expect(v.slots[3]).toMatchObject({ id: 0xee, count: 1, label: '謎の鍵', problem: null, idWritable: true })
    expect((v.slots[2].warnings.join('。') || null)).toContain('イベントで使えない')
    expect((v.slots[3].warnings.join('。') || null)).toContain('ローラの部屋の扉')
  })

  it('読み出し→書き戻しでバイト一致する', () => {
    const before = makeSave()
    writeValuable(before, 2, 0xee, 1)
    const after = before.slice()
    for (const s of readValuables(before).slots) writeValuable(after, s.index, s.id, s.count)
    expect(diffOffsets(before, after)).toEqual([])
    expect(Array.from(before.subarray(slotOffset(2), slotOffset(2) + 4))).toEqual([0xee, 0x00, 0x01, 0x00])
  })

  it('両隣の 0xEC・0xEF は選択肢にない', () => {
    const b = makeSave()
    expect(() => writeValuable(b, 2, 0xec, 1)).toThrow()
    expect(() => writeValuable(b, 2, 0xef, 1)).toThrow()
  })
})

describe('[U] 2026-10-05 U-14：会談の手紙（0x00。7回目の訂正で 0x01 から変更）', () => {
  it('選択肢にあり、通常モードで書ける。セーブ可否が未確認なので警告を出す', () => {
    const b = makeSave()
    writeValuable(b, 2, 0x00, 1)
    expect(() => writeValuable(b, 3, 0x01, 1)).toThrow()
    const v = readValuables(b)
    expect(v.slots[2]).toMatchObject({ id: 0x00, count: 1, label: '会談の手紙', problem: null, idWritable: true })
    expect((v.slots[2].warnings.join('。') || null)).toContain('セーブできなくなる')
  })
})

describe('選択肢と個数の上限', () => {
  it('✅ 選択肢は貴重品の表から作り、❓ U-12 のチップ・木札を除く。名前はアイテムの表の名前', () => {
    expect(VALUABLES.map((v) => v.id)).toEqual([0x00, 0x29, 0x2a, 0x2b, 0x2c, 0xed, 0xee])
    expect(VALUABLES.map((v) => v.label)).toEqual([
      '会談の手紙', 'くず鉄', '卸し鉄(おろしがね)', '堂島鋼(どうじまはがね)', '緋緋色金(ひひいろかね)', '拷問部屋の鍵', '謎の鍵',
    ])
    expect([...VALUABLE_IDS]).toEqual(VALUABLES.map((v) => v.id))
    expect([...U12_VALUABLE_IDS]).toEqual([0x2d, 0x2e])
    // 注意を付けるのは会談の手紙と鍵2本（U-14）だけ
    expect(VALUABLES.filter((v) => v.caution).map((v) => v.id)).toEqual([0x00, 0xed, 0xee])
  })

  it('🔶 通常モードの個数の上限は 999、上級者モードは u16 の上限', () => {
    expect(valuableCountMax()).toBe(VALUABLE_COUNT_MAX)
    expect(valuableCountMax({ advanced: true })).toBe(VALUABLE_COUNT_SYSTEM_MAX)
    expect(VALUABLE_COUNT_SYSTEM_MAX).toBe(0xffff)
  })
})
