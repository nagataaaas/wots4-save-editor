// [TS] のレイアウトに沿って合成したバイト列と、実セーブ（sample/S4-DATA_03-*、S4-DATA_04）でテストする。
// 実セーブは sample/ にあるときだけ使う（ないときは該当テストを飛ばす）。
/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { writeU16, writeU32 } from './binary'
import { TS_SAVE_SIZE } from './hero'
import { EMPTY_ID, ITEM_COUNT_MAX } from './item-slot'
import {
  PROBED_TOOLS,
  TOOL_COUNT,
  TOOL_SLOT_COUNT,
  TS_TOOLS,
  readTools,
  repairToolMarks,
  slotsMissingMark,
  toolSlotOffset,
  writeTool,
} from './tools'
import { VALUABLES_OFFSET, readValuables } from './valuables'

function makeSave(size = TS_SAVE_SIZE): Uint8Array {
  const b = new Uint8Array(size)
  for (let i = 0; i < TOOL_SLOT_COUNT; i++) {
    writeU16(b, toolSlotOffset(i), EMPTY_ID)
    writeU16(b, toolSlotOffset(i) + 2, 0)
  }
  writeU16(b, toolSlotOffset(0), 0x09)
  writeU16(b, toolSlotOffset(0) + 2, 1)
  // 普通に手に入れた道具の +0x04〜+0x07（S4-DATA_03-1 の砥石）
  writeU32(b, toolSlotOffset(0) + 4, 0x50e8ee06)
  writeU16(b, toolSlotOffset(1), 0x10)
  writeU16(b, toolSlotOffset(1) + 2, 1)
  writeU32(b, toolSlotOffset(1) + 4, 0x28741606)
  return b
}

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i)
  return out
}

describe('readTools', () => {
  it('✅ [TS][I-3] 0x5B40 から 8 B × 10件を ID・個数として読む（D-11）', () => {
    const v = readTools(makeSave())
    expect(v.layoutProblem).toBeNull()
    expect(v.slots).toHaveLength(10)
    expect(v.slots[0]).toMatchObject({ offset: 0x5b40, id: 0x09, count: 1, label: '秘薬', problem: null, warning: null })
    expect(v.slots[1]).toMatchObject({ offset: 0x5b48, id: 0x10, count: 1, label: '砥石', problem: null })
    expect(v.slots[2]).toMatchObject({ id: EMPTY_ID, label: 'なし', problem: null })
    expect(v.slots[0].unknown).toBe(0x50e8ee06)
    // 最後の枠の直後が重要品の先頭
    expect(toolSlotOffset(TOOL_SLOT_COUNT - 1) + 8).toBe(VALUABLES_OFFSET)
  })

  it('❓ U-1：サイズが 0x48BB0 でなければ全枠を読み取り専用にする', () => {
    const v = readTools(makeSave(TS_SAVE_SIZE + 8))
    expect(v.layoutProblem).not.toBeNull()
    expect(v.slots[0].count).toBe(1)
    expect(v.slots.every((s) => s.problem !== null)).toBe(true)
  })

  it('🔶 個数が妥当性の上限（999、推測）を超える枠は読み取り専用にする', () => {
    const b = makeSave()
    writeU16(b, toolSlotOffset(0) + 2, ITEM_COUNT_MAX + 1)
    expect(readTools(b).slots[0].problem).not.toBeNull()
  })

  it('一覧にない ID（重要品の地金を含む）の枠は、ほかの ID への変更だけを許す', () => {
    const b = makeSave()
    writeU16(b, toolSlotOffset(3), 0x29)
    writeU16(b, toolSlotOffset(3) + 2, 1)
    writeU16(b, toolSlotOffset(4), 0x1234)
    const v = readTools(b)
    expect(v.slots[3]).toMatchObject({ label: null, problem: null, idWritable: false })
    expect(v.slots[3].warning).not.toBeNull()
    expect(v.slots[4]).toMatchObject({ label: null, problem: null, idWritable: false })
    expect(() => writeTool(b, 3, 0x29)).toThrow()
    writeTool(b, 3, 0x02)
    expect(readTools(b).slots[3]).toMatchObject({ id: 0x02, idWritable: true })
  })

  it('🔶 U-14：重要品の枠でだけ名前を確認した ID は書けるが、要ゲーム内確認の警告を出す', () => {
    const b = makeSave()
    writeTool(b, 2, 0x30)
    const v = readTools(b)
    expect(v.slots[2]).toMatchObject({ label: 'うなぎ丼', problem: null, idWritable: true })
    expect(v.slots[2].warning).toContain('U-14')
  })

  it('[U] 2026-10-05：道具の枠で表示を確認した ID（7回目の訂正後の対応）', () => {
    const b = makeSave()
    const expected: [number, string][] = [
      [0x01, '伯爵の寿司'],
      [0x0d, '部品箱（刃？）'],
      [0x0f, '部品箱（柄？）'],
      [0x14, 'お金袋（小）'],
      [0x17, 'お金袋（特大）'],
      [0x18, 'がらくた'],
      [0x19, 'お宝'],
    ]
    for (const [id, label] of expected) {
      writeTool(b, 2, id)
      const slot = readTools(b).slots[2]
      expect(slot.label).toBe(label)
      expect(slot.warning).toContain('道具の一覧に出ることは確認済み')
    }
  })
})

describe('選択肢', () => {
  it('✅ [TS] の名前付き58件。PS3版の一覧（0x08・0x09・0x0C・0x22・0x74）を含む', () => {
    expect(TS_TOOLS).toHaveLength(58)
    for (const id of [0x08, 0x09, 0x0c, 0x22, 0x74]) expect(TS_TOOLS.some((t) => t.id === id)).toBe(true)
  })

  it('重要品・宿泊設備・仮データの茶器・丼・開発用は選択肢に出さない', () => {
    const ids = new Set([...TS_TOOLS, ...PROBED_TOOLS].map((t) => t.id))
    expect(ids.size).toBe(TS_TOOLS.length + PROBED_TOOLS.length)
    for (const id of [0x00, 0x29, 0x2a, 0x2b, 0x2c, 0x2d, 0x2e, 0x49, 0x6f, 0x70, 0x71, 0x72, 0x73, 0x99, 0xc0, 0xcd, 0xd6]) {
      expect(ids.has(id)).toBe(false)
    }
  })
})

describe('writeTool', () => {
  it('道具が入っている枠では ID と個数の 4 B だけを変え、+0x04〜+0x07 と重要品の領域は保持する', () => {
    const before = makeSave()
    const after = before.slice()
    writeTool(after, 0, 0x0c)
    const o = toolSlotOffset(0)
    expect(diffOffsets(before, after).every((i) => i >= o && i < o + 4)).toBe(true)
    expect(readTools(after).slots[0]).toMatchObject({ id: 0x0c, count: 1, unknown: 0x50e8ee06, label: '秘奥義ノ書' })
    expect(readValuables(after).slots).toEqual(readValuables(before).slots)
  })

  it('[U] 空き枠に入れるときは +0x04〜+0x07 に 06 00 00 00 を書く（売却一覧で落ちないため）', () => {
    const b = makeSave()
    writeTool(b, 2, 0x02)
    expect([...b.slice(toolSlotOffset(2), toolSlotOffset(2) + 8)]).toEqual([0x02, 0, 1, 0, 0x06, 0, 0, 0])
    expect(readTools(b).slots[2].warning).toBeNull()
  })

  it('🔶 「なし」にするときは個数 0 と、+0x04〜+0x07 に 00 00 00 00 を書く（普通の空き枠と同じ [U]）', () => {
    const b = makeSave()
    writeTool(b, 0, EMPTY_ID)
    expect(readTools(b).slots[0]).toMatchObject({ id: EMPTY_ID, count: 0, unknown: 0 })
  })

  it('🔶 個数は常に 1 を書く（ゲームは1枠1個 [U] S4-DATA_04）。1 以外の枠は警告し、別の道具にすると 1 に戻る', () => {
    const b = makeSave()
    writeU16(b, toolSlotOffset(0) + 2, 5)
    expect(readTools(b).slots[0].warning).toContain('1枠1個')
    writeTool(b, 0, 0x02)
    expect(readTools(b).slots[0]).toMatchObject({ id: 0x02, count: TOOL_COUNT, warning: null })
  })

  it('一覧にない ID・範囲外の枠は拒否し、バイト列を変えない', () => {
    const before = makeSave()
    const b = before.slice()
    expect(() => writeTool(b, 0, 0x29)).toThrow()
    expect(() => writeTool(b, 0, 0x1234)).toThrow()
    expect(() => writeTool(b, TOOL_SLOT_COUNT, 0x09)).toThrow()
    expect(() => writeTool(b, -1, 0x09)).toThrow()
    expect(diffOffsets(before, b)).toEqual([])
  })

  it('読み出した値をそのまま書き戻すとバイト一致する', () => {
    const before = makeSave()
    const after = before.slice()
    for (const s of readTools(before).slots) writeTool(after, s.index, s.id)
    expect(diffOffsets(before, after)).toEqual([])
  })
})

describe('[U] 2026-10-05：+0x04 が 0x06 でない道具の枠', () => {
  it('警告を出し、修復で 06 00 00 00 を書く。ほかの枠は変えない', () => {
    const before = makeSave()
    writeU16(before, toolSlotOffset(3), 0x02)
    writeU16(before, toolSlotOffset(3) + 2, 1)
    expect(readTools(before).slots[3].warning).toContain('売却一覧')
    expect(slotsMissingMark(before)).toEqual([3])
    const after = before.slice()
    expect(repairToolMarks(after)).toEqual([3])
    expect(diffOffsets(before, after)).toEqual([toolSlotOffset(3) + 4])
    expect(slotsMissingMark(after)).toEqual([])
  })

  it('U-1：サイズが違うファイルは修復しない', () => {
    expect(() => repairToolMarks(makeSave(TS_SAVE_SIZE + 8))).toThrow()
  })
})

// 実セーブ（sample/）。-1 無編集で砥石1つ、-2 砥石→おにぎり、-3 →伯爵の寿司、-4 -3 におにぎりを追加（売却一覧で落ちた）、
// -7 -4 の追加した枠の +0x04〜+0x07 を 06 00 00 00 にしたもの（売却一覧が開いた）。S4-DATA_04 は店で3つ買ったもの
const sample = (name: string) => new URL(`../../sample/${name}`, import.meta.url)
const hasSamples = ['S4-DATA_03-1', 'S4-DATA_03-3', 'S4-DATA_03-4', 'S4-DATA_03-7', 'S4-DATA_04'].every((n) =>
  existsSync(sample(n)),
)
const load = (name: string) => new Uint8Array(readFileSync(sample(name)))

describe.skipIf(!hasSamples)('実セーブ（sample/）', () => {
  it('読み出し→書き戻しでバイト一致する', () => {
    for (const name of ['S4-DATA_03-1', 'S4-DATA_03-7', 'S4-DATA_04']) {
      const before = load(name)
      const after = before.slice()
      for (const s of readTools(before).slots) writeTool(after, s.index, s.id)
      expect(diffOffsets(before, after)).toEqual([])
    }
  })

  it('普通に手に入れた道具はすべて +0x04＝0x06', () => {
    const v = readTools(load('S4-DATA_04'))
    expect(v.layoutProblem).toBeNull()
    expect(v.slots.slice(0, 4).map((s) => [s.id, s.count, s.unknown & 0xff])).toEqual([
      [0x10, 1, 0x06],
      [0x10, 1, 0x06],
      [0x11, 1, 0x06],
      [0x13, 1, 0x06],
    ])
    expect(slotsMissingMark(load('S4-DATA_03-1'))).toEqual([])
  })

  it('-3 におにぎりを追加すると、売却一覧が開いた -7 と同じバイト列になる', () => {
    const b = load('S4-DATA_03-3')
    writeTool(b, 1, 0x02)
    expect(diffOffsets(b, load('S4-DATA_03-7'))).toEqual([])
  })

  it('落ちた -4 は警告が出て、修復すると -7 と同じバイト列になる', () => {
    const b = load('S4-DATA_03-4')
    expect(slotsMissingMark(b)).toEqual([1])
    repairToolMarks(b)
    expect(diffOffsets(b, load('S4-DATA_03-7'))).toEqual([])
  })
})
