import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ItemSlotRow } from './item-slot-row'
import { EMPTY_ID, type ItemSlot } from '@/save/item-slot'

const slot: ItemSlot = {
  index: 0, offset: 0x58c0, id: 1, count: 2, unknown: 0,
  label: '道具', problem: null, idWritable: true, warning: null,
}

function render(overrides: Partial<Parameters<typeof ItemSlotRow>[0]> = {}) {
  return renderToStaticMarkup(createElement(ItemSlotRow, {
    index: 0, offset: slot.offset, slot,
    groups: [{ items: [{ id: 1, label: '道具' }] }],
    noun: '道具', countMaxFor: () => 10, onChange: () => {},
    ...overrides,
  }))
}

describe('ItemSlotRow のコンパクト表示', () => {
  it('個数入力の右側に最大値を表示し、入力の上限も維持する', () => {
    const html = render()
    expect(html).toContain('max="10"')
    expect(html).toContain('最大 10')
    expect(html.indexOf('最大 10')).toBeGreaterThan(html.indexOf('type="number"'))
    expect(html).toContain('aria-label="1件目の個数"')
  })

  it('上級者モードでは通常の最大値と超過可を表示する', () => {
    const html = render({ countMaxFor: () => 65535, normalCountMaxFor: () => 10 })
    expect(html).toContain('最大 10（超過可）')
    expect(html).not.toContain('max="')
  })

  it('🔶 重要品の推測上限 999 も入力の右側に表示する（chunks/items）', () => {
    expect(render({ noun: '重要品', countMaxFor: () => 999 })).toContain('最大 999')
  })

  it('🔶 CSV の分類候補を名前の左に表示する（datatable/item/README.md）', () => {
    const html = render({
      slot: { ...slot, id: 0x12, label: 'お酒' },
      groups: [{ items: [{ id: 0x12, label: 'お酒' }] }],
    })
    expect(html).toContain('data-item-category="drink"')
    expect(html).toContain('title="飲み物"')
    expect(html.indexOf('data-item-category="drink"')).toBeLessThan(html.indexOf('>お酒</span>'))
  })

  it('空き枠と未読み込みにはアイコンを付けない', () => {
    expect(render({ slot: { ...slot, id: EMPTY_ID, count: 0 } })).not.toContain('data-item-category=')
    expect(render({ slot: null })).not.toContain('data-item-category=')
  })

  it('未分類の品と未知の ID には汎用のアイテムアイコンを付ける', () => {
    for (const id of [0x20, 0xfffe]) {
      const html = render({ slot: { ...slot, id } })
      expect(html).toContain('data-item-category="item"')
      expect(html).toContain('title="アイテム"')
      expect(html).toContain('lucide-package')
    }
  })

  it('空き枠には最大値を表示しない', () => {
    const html = render({ slot: { ...slot, id: EMPTY_ID, count: 0 } })
    expect(html).not.toContain('最大')
  })

  it('ID調査欄と読み取り専用の理由を維持する', () => {
    const html = render({ investigate: true, slot: { ...slot, problem: '不正な個数' } })
    expect(html).toContain('aria-label="1件目の ID（16進）"')
    expect(html).toContain('読み取り専用：不正な個数')
  })
})
