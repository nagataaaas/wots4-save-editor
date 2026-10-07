// [TS] のレイアウトに沿って合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
import { describe, expect, it } from 'vitest'
import { writeU16, writeU32 } from './binary'
import { TS_SAVE_SIZE } from './hero'
import {
  CHEST_AREA,
  ITEM_COUNT_SYSTEM_MAX,
  TOOLS_AREA,
  itemBoxSlotOffset,
  itemCountMax,
  itemNormalCountMax,
  itemOptionGroups,
  readItemBox,
  repairItemMarks,
  slotsMissingMark,
  writeItemBoxSlot,
  type ItemBoxArea,
} from './item-box'
import { EMPTY_ID } from './item-slot'
import { VALUABLES_OFFSET, readValuables } from './valuables'

const ADV = { advanced: true }

function makeSave(size = TS_SAVE_SIZE): Uint8Array {
  const b = new Uint8Array(size)
  for (const area of [CHEST_AREA, TOOLS_AREA]) {
    for (let i = 0; i < area.slotCount; i++) writeU16(b, itemBoxSlotOffset(area, i), EMPTY_ID)
  }
  const t0 = itemBoxSlotOffset(TOOLS_AREA, 0)
  writeU16(b, t0, 0x09)
  writeU16(b, t0 + 2, 1)
  // 普通に手に入れた道具の +0x04〜+0x07（S4-DATA_03-1 の砥石）
  writeU32(b, t0 + 4, 0x50e8ee06)
  const t1 = itemBoxSlotOffset(TOOLS_AREA, 1)
  writeU16(b, t1, 0x10)
  writeU16(b, t1 + 2, 1)
  writeU32(b, t1 + 4, 0x28741606)
  // 箪笥：刀油×13（箪笥は最大数を超えて入る [U] sample）
  const c0 = itemBoxSlotOffset(CHEST_AREA, 0)
  writeU16(b, c0, 0x13)
  writeU16(b, c0 + 2, 13)
  writeU32(b, c0 + 4, 0x50e8ee06)
  return b
}

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i)
  return out
}

const slotBytes = (b: Uint8Array, area: ItemBoxArea, i: number) =>
  [...b.slice(itemBoxSlotOffset(area, i), itemBoxSlotOffset(area, i) + 8)]

describe('位置', () => {
  it('✅ 箪笥 0x58C0 から 8 B × 80件、直後が手持ち 0x5B40 から 8 B × 10件、その直後が重要品（D-11）', () => {
    expect(itemBoxSlotOffset(CHEST_AREA, 0)).toBe(0x58c0)
    expect(itemBoxSlotOffset(CHEST_AREA, 79) + 8).toBe(0x5b40)
    expect(itemBoxSlotOffset(TOOLS_AREA, 0)).toBe(0x5b40)
    expect(itemBoxSlotOffset(TOOLS_AREA, 9) + 8).toBe(VALUABLES_OFFSET)
    expect(() => itemBoxSlotOffset(TOOLS_AREA, 10)).toThrow()
    expect(() => itemBoxSlotOffset(CHEST_AREA, -1)).toThrow()
  })
})

describe('readItemBox', () => {
  it('ID・個数・名前を読む', () => {
    const v = readItemBox(makeSave(), TOOLS_AREA)
    expect(v.layoutProblem).toBeNull()
    expect(v.slots).toHaveLength(10)
    expect(v.slots[0]).toMatchObject({ offset: 0x5b40, id: 0x09, count: 1, label: '秘薬', problem: null, warning: null })
    expect(v.slots[1]).toMatchObject({ id: 0x10, label: '砥石' })
    expect(v.slots[2]).toMatchObject({ id: EMPTY_ID, label: 'なし', problem: null })
    expect(v.slots[0].unknown).toBe(0x50e8ee06)
    const c = readItemBox(makeSave(), CHEST_AREA)
    expect(c.slots).toHaveLength(80)
    expect(c.slots[0]).toMatchObject({ id: 0x13, count: 13, label: '刀油', problem: null, warning: null })
  })

  it('❓ U-1：サイズが 0x48BB0 でなければ全枠を読み取り専用にする', () => {
    const v = readItemBox(makeSave(TS_SAVE_SIZE + 8), TOOLS_AREA)
    expect(v.layoutProblem).not.toBeNull()
    expect(v.slots.every((s) => s.problem !== null)).toBe(true)
  })

  it('🟢 手持ちで最大数を超える個数は警告する。🔶 max(999, 最大数) を超えると読み取り専用（上級者モードでは u16 まで読む）', () => {
    const b = makeSave()
    const o = itemBoxSlotOffset(TOOLS_AREA, 0)
    writeU16(b, o + 2, 5)
    expect(readItemBox(b, TOOLS_AREA).slots[0].warning).toContain('最大数 1')
    writeU16(b, o + 2, 1000)
    expect(readItemBox(b, TOOLS_AREA).slots[0].problem).not.toBeNull()
    expect(readItemBox(b, TOOLS_AREA, ADV).slots[0].problem).toBeNull()
    // コインは最大数 9999 なので 1000 は正常
    writeU16(b, o, 0x74)
    expect(readItemBox(b, TOOLS_AREA).slots[0]).toMatchObject({ problem: null, warning: null })
  })

  it('一覧にない ID・重要品の ID・チップの枠は、ほかの ID への変更だけを許す', () => {
    const b = makeSave()
    for (const [i, id] of [[3, 0x29], [4, 0x1234], [5, 0x2d]] as const) {
      writeU16(b, itemBoxSlotOffset(TOOLS_AREA, i), id)
      writeU16(b, itemBoxSlotOffset(TOOLS_AREA, i) + 2, 1)
    }
    const v = readItemBox(b, TOOLS_AREA, ADV)
    for (const i of [3, 4, 5]) {
      expect(v.slots[i]).toMatchObject({ problem: null, idWritable: false })
      expect(v.slots[i].warning).not.toBeNull()
    }
    expect(v.slots[3].label).toBe('くず鉄')
    expect(v.slots[4].label).toBeNull()
  })

  it('🟢 その場で使う物・手に入る経路がない ID は、通常モードでは書けず、上級者モードでは警告つきで書ける', () => {
    const b = makeSave()
    expect(() => writeItemBoxSlot(b, TOOLS_AREA, 2, 0x30, 1)).toThrow(/上級者モード/)
    writeItemBoxSlot(b, TOOLS_AREA, 2, 0x30, 1, ADV)
    writeItemBoxSlot(b, TOOLS_AREA, 3, 0x73, 1, ADV)
    expect(readItemBox(b, TOOLS_AREA).slots[2]).toMatchObject({ label: 'うなぎ丼', idWritable: false })
    const v = readItemBox(b, TOOLS_AREA, ADV)
    expect(v.slots[2]).toMatchObject({ label: 'うなぎ丼', idWritable: true })
    expect(v.slots[2].warning).toContain('その場で使う')
    expect(v.slots[3].warning).toContain('手に入る経路がない')
  })
})

describe('選択肢', () => {
  it('通常モードは道具だけ。上級者モードは「道具」「その場で使う」「手に入る経路がない」の見出しつき', () => {
    const normal = itemOptionGroups()
    expect(normal).toHaveLength(1)
    const ids = new Set(normal[0].items.map((o) => o.id))
    expect(ids.has(0x02)).toBe(true)
    expect(ids.has(0x30)).toBe(false)
    const adv = itemOptionGroups(ADV)
    expect(adv.map((g) => g.label)).toEqual(['道具', 'その場で使う', '手に入る経路がない'])
    expect(adv[1].items.some((o) => o.id === 0x30)).toBe(true)
    expect(adv[2].items.some((o) => o.id === 0xcd)).toBe(true)
  })

  it('❓ U-12 のチップ・木札と、重要品の画面で扱う ID は、どのモードでも出さない', () => {
    const all = new Set(itemOptionGroups(ADV).flatMap((g) => g.items.map((o) => o.id)))
    for (const id of [0x2d, 0x2e, 0x00, 0x29, 0x2a, 0x2b, 0x2c, 0xed, 0xee]) expect(all.has(id)).toBe(false)
  })

  it('検索用に英語名と16進の ID を持ち、選択肢に説明文を出す', () => {
    const o = itemOptionGroups()[0].items.find((x) => x.id === 0x10)
    expect(o?.keywords).toEqual(expect.arrayContaining(['Whetting Stone', '10', '0x10']))
    expect(o?.description).toBe('非常に質の高い砥石。武器の耐久度400回復。')
  })
})

describe('個数の上限', () => {
  it('🟢 手持ちは最大数、🔶 箪笥は 999、上級者モードは u16 の上限', () => {
    expect(itemCountMax(TOOLS_AREA, 0x10)).toBe(1)
    expect(itemCountMax(TOOLS_AREA, 0x18)).toBe(10)
    expect(itemCountMax(TOOLS_AREA, 0x74)).toBe(9999)
    expect(itemCountMax(CHEST_AREA, 0x10)).toBe(999)
    expect(itemCountMax(TOOLS_AREA, 0x10, ADV)).toBe(ITEM_COUNT_SYSTEM_MAX)
    // 画面に出す通常モードの上限は、上級者モードでも変わらない
    expect(itemNormalCountMax(TOOLS_AREA, 0x18)).toBe(10)
    expect(itemNormalCountMax(CHEST_AREA, 0x18)).toBe(999)
  })

  it('最大数を超える個数は、通常モードでは拒否し、上級者モードでは書ける', () => {
    const b = makeSave()
    const before = b.slice()
    expect(() => writeItemBoxSlot(b, TOOLS_AREA, 0, 0x09, 2)).toThrow()
    expect(() => writeItemBoxSlot(b, CHEST_AREA, 0, 0x13, 1000)).toThrow()
    expect(diffOffsets(before, b)).toEqual([])
    writeItemBoxSlot(b, TOOLS_AREA, 0, 0x09, 2, ADV)
    writeItemBoxSlot(b, CHEST_AREA, 0, 0x13, 0xffff, ADV)
    expect(readItemBox(b, TOOLS_AREA, ADV).slots[0].count).toBe(2)
    expect(readItemBox(b, CHEST_AREA, ADV).slots[0].count).toBe(0xffff)
    expect(() => writeItemBoxSlot(b, TOOLS_AREA, 0, 0x09, 0x10000, ADV)).toThrow()
    writeItemBoxSlot(b, TOOLS_AREA, 1, 0x18, 10)
    expect(readItemBox(b, TOOLS_AREA).slots[1]).toMatchObject({ id: 0x18, count: 10, warning: null })
  })
})

describe('writeItemBoxSlot', () => {
  it('アイテムが入っている枠では ID と個数の 4 B だけを変え、+0x04〜+0x07 と重要品の領域は保持する', () => {
    const before = makeSave()
    const after = before.slice()
    writeItemBoxSlot(after, TOOLS_AREA, 0, 0x0c, 1)
    const o = itemBoxSlotOffset(TOOLS_AREA, 0)
    expect(diffOffsets(before, after).every((i) => i >= o && i < o + 4)).toBe(true)
    expect(readItemBox(after, TOOLS_AREA).slots[0]).toMatchObject({ id: 0x0c, count: 1, unknown: 0x50e8ee06 })
    expect(readValuables(after).slots).toEqual(readValuables(before).slots)
  })

  it('🟢 空き枠に入れるときは +0x04〜+0x07 に 06 00 00 00 を書く（手持ち [U]・箪笥とも）', () => {
    const b = makeSave()
    writeItemBoxSlot(b, TOOLS_AREA, 2, 0x02, 1)
    expect(slotBytes(b, TOOLS_AREA, 2)).toEqual([0x02, 0, 1, 0, 0x06, 0, 0, 0])
    writeItemBoxSlot(b, CHEST_AREA, 5, 0x13, 20)
    expect(slotBytes(b, CHEST_AREA, 5)).toEqual([0x13, 0, 20, 0, 0x06, 0, 0, 0])
    expect(readItemBox(b, CHEST_AREA).slots[5].warning).toBeNull()
  })

  it('🔶 「なし」にするときは個数 0 と、+0x04〜+0x07 に 00 00 00 00 を書く（普通の空き枠と同じ [U]）', () => {
    const b = makeSave()
    writeItemBoxSlot(b, CHEST_AREA, 0, EMPTY_ID, 0)
    expect(slotBytes(b, CHEST_AREA, 0)).toEqual([0xff, 0xff, 0, 0, 0, 0, 0, 0])
  })

  it('一覧にない ID・チップ・範囲外の枠は拒否し、バイト列を変えない', () => {
    const before = makeSave()
    const b = before.slice()
    expect(() => writeItemBoxSlot(b, TOOLS_AREA, 0, 0x29, 1, ADV)).toThrow()
    expect(() => writeItemBoxSlot(b, TOOLS_AREA, 0, 0x2d, 1, ADV)).toThrow(/U-12/)
    expect(() => writeItemBoxSlot(b, TOOLS_AREA, 0, 0x1234, 1, ADV)).toThrow()
    expect(() => writeItemBoxSlot(b, TOOLS_AREA, 10, 0x09, 1)).toThrow()
    expect(() => writeItemBoxSlot(b, CHEST_AREA, 80, 0x09, 1)).toThrow()
    expect(diffOffsets(before, b)).toEqual([])
  })

  it('読み出した値をそのまま書き戻すとバイト一致する', () => {
    const before = makeSave()
    const after = before.slice()
    for (const area of [TOOLS_AREA, CHEST_AREA]) {
      for (const s of readItemBox(before, area).slots) writeItemBoxSlot(after, area, s.index, s.id, s.count)
    }
    expect(diffOffsets(before, after)).toEqual([])
  })
})

describe('[U] 2026-10-05：+0x04 が 0x06 でない枠', () => {
  it('警告を出し、修復で 06 00 00 00 を書く。ほかの枠は変えない', () => {
    const before = makeSave()
    const o = itemBoxSlotOffset(TOOLS_AREA, 3)
    writeU16(before, o, 0x02)
    writeU16(before, o + 2, 1)
    expect(readItemBox(before, TOOLS_AREA).slots[3].warning).toContain('売却一覧')
    expect(slotsMissingMark(before, TOOLS_AREA)).toEqual([3])
    const after = before.slice()
    expect(repairItemMarks(after, TOOLS_AREA)).toEqual([3])
    expect(diffOffsets(before, after)).toEqual([o + 4])
    expect(slotsMissingMark(after, TOOLS_AREA)).toEqual([])
  })

  it('U-1：サイズが違うファイルは修復しない', () => {
    expect(() => repairItemMarks(makeSave(TS_SAVE_SIZE + 8), TOOLS_AREA)).toThrow()
  })
})
