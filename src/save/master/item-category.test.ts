import { describe, expect, it } from 'vitest'
import { ITEMS, findItem, itemCategory } from './item-names'

// 🔶 item/item.csv の use_action に基づく表示用分類候補（datatable/item/README.md）。
// 名前・説明から分類せず、使用可否の検証にも使わない。
describe('🔶 itemCategory（CSV の use_action）', () => {
  it.each([
    [0x02, 'food'], [0x07, 'food'], [0x09, 'food'], [0x26, 'food'],
    [0x12, 'drink'], [0x25, 'drink'], [0x28, 'drink'], [0x40, 'drink'],
    [0x0a, 'reading'], [0x0b, 'reading'], [0x0c, 'reading'],
    [0x10, 'usable'], [0x11, 'usable'], [0x13, 'usable'],
  ] as const)('ID %i を %s として表示する', (id, category) => {
    expect(itemCategory(id)).toBe(category)
  })

  it('目録・部品箱・お金袋を名前や説明文から独自分類しない', () => {
    for (const id of [0x0d, 0x0e, 0x0f, 0x14, 0x1c, 0x20, 0x21, 0x22, 0x2f]) {
      expect(findItem(id)?.useAction).toBe(0xffff)
      expect(itemCategory(id)).toBeNull()
    }
  })

  it('食べる分類の魚と、未分類の釣りエサを区別する', () => {
    expect(itemCategory(0x52)).toBe('food') // ボラ：CSV は食べる分類
    expect(itemCategory(0x51)).toBeNull() // アナゴ：CSV は未分類
    expect(itemCategory(0xc7)).toBeNull()
    expect(itemCategory(0xcb)).toBeNull()
  })

  it('料理・宿・手に入る経路のない品を道具と同じ値で分類しない', () => {
    for (const item of ITEMS.filter((item) => item.kind !== 0)) {
      expect(itemCategory(item.id)).toBeNull()
    }
  })

  it('未知の ID・空き枠・未分類の値にアイコンを付けない', () => {
    for (const id of [0x00, 0x18, 0x19, 0x1b, 0x29, 0x74, 0xed, 0xf2, 0xffff, 0xfffe]) {
      expect(itemCategory(id)).toBeNull()
    }
  })

  it('CSV の分類値をそのまま使い、アイテム ID の例外を持たない', () => {
    for (const item of ITEMS) {
      const expected = item.kind !== 0 ? null
        : item.useAction === 0xd5 ? 'food'
        : item.useAction === 0xd8 ? 'drink'
        : item.useAction === 0xd9 ? 'reading'
        : item.useAction === 0xf7 || item.useAction === 0xf8 ? 'usable'
        : null
      expect(itemCategory(item.id)).toBe(expected)
    }
  })
})
