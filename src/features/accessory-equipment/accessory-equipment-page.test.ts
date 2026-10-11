import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SaveContext, type SaveContextValue } from '@/lib/save-context'
import { AdvancedModeContext } from '@/lib/advanced-mode-context'
import { TS_SAVE_SIZE } from '@/save/hero'
import { ACCESSORY_EQUIPMENT_BASES } from '@/save/accessory-equipment'
import { pages } from '@/features/pages'
import { sectionGroups, sections } from '@/features/sections'
import { AccessoryEquipmentPage } from './accessory-equipment-page'
import { HeroAppearancePage } from '@/features/hero/hero-appearance-page'

function render(bytes: Uint8Array | null, advanced = false) {
  const ctx: SaveContextValue = {
    save: bytes ? { name: 'synthetic', original: bytes.slice(), working: bytes, saved: bytes.slice(), loadId: 1 } : null,
    error: null, changedBytes: 0, unsavedBytes: 0,
    load: async () => {}, update: () => {}, downloadBackup: () => {}, downloadEdited: () => {},
  }
  return renderToStaticMarkup(createElement(SaveContext.Provider, { value: ctx },
    createElement(AdvancedModeContext.Provider, { value: { advanced, setAdvanced: () => {} } }, createElement(AccessoryEquipmentPage))))
}

describe('装飾品の装着画面', () => {
  it('装着は主人公グループの容姿にまとめ、既存の所持画面は維持', () => {
    const items = sectionGroups[0].items
    expect(items[0]).toMatchObject({ label: '主人公', sections: [
      { id: 'hero', label: '基本情報' },
      { id: 'hero-appearance', label: '容姿' },
      { id: 'records', label: '侍評価・記録' },
    ] })
    expect(sections.filter(s => s.label === '装飾品')).toHaveLength(1)
    expect(new Set(sections.map(s => s.id)).size).toBe(sections.length)
    expect(pages['hero-appearance']).toBe(HeroAppearancePage)
    expect(pages.accessories).toBeDefined()
  })
  it('上級者モードでは拡張範囲を表示し、通常範囲外の値を編集可能にする', () => {
    const bytes = new Uint8Array(TS_SAVE_SIZE)
    const view = new DataView(bytes.buffer)
    view.setFloat32(0x39d0, 100, true)
    view.setFloat32(0x3a00, 99, true) // 表示サイズ100
    const normal = render(bytes)
    expect(normal).toContain('読み取り専用')
    const advanced = render(bytes, true)
    expect(advanced).toContain('-100〜100')
    expect(advanced).toContain('0〜100')
    expect(advanced).not.toContain('読み取り専用')
  })
  it('編集する枠は全10枠を常時表示し、選択中の枠を示す', () => {
    const html = render(null)
    const list = html.match(/<fieldset\b[^>]*>[\s\S]*?<\/fieldset>/)?.[0]
    expect(list).toBeDefined()
    expect(list).toContain('編集する枠')
    expect(list).not.toContain('<select')
    expect(list?.match(/<button\b/g)).toHaveLength(10)
    expect(list?.match(/aria-pressed="true"/g)).toHaveLength(1)
    // 未読み込みのときの文字の値は「—」（AGENTS.md「セーブ未読み込みのときの表示」）
    for (let i = 1; i <= 10; i++) expect(list).toContain(`${i}枠目：—`)
  })
  it('内側にBoxを作らず、選択と枠リストを5:2に並べ、調整は区切り線と小見出しで整理する', () => {
    const html = render(null)
    expect(html).not.toContain('data-slot="card"')
    expect(html).toContain('編集する枠')
    expect(html).toContain('装飾品を変更すると')
    expect(html).toContain('sm:grid-cols-[minmax(0,5fr)_minmax(0,2fr)]')
    expect(html).toContain('border-t')
    expect(html).toContain('sm:border-l')
    // 🟢 調整の値。見出しには確度を出さない（AGENTS.md「UI に確度を出さない」）
    expect(html).toMatch(/<h3[^>]*>納刀の調整<\/h3>/)
    expect(html.indexOf('標準設定に戻す')).toBeGreaterThan(html.indexOf('調整する構え'))
  })
  it('未読み込みでも入力欄と調整モードを表示', () => {
    const html = render(null)
    expect(html).toContain('納刀の調整')
    expect(html).toContain('調整する構え')
    expect(html).toContain('抜刀')
    expect(html).toContain('共通')
    expect(html).toContain('俺のおしゃれ1')
    expect(html).toContain('俺のおしゃれ5')
    expect(html).not.toContain('アンサンブル')
    expect(html).toContain('disabled')
    // 見出しの装飾品名は「—」
    expect(html).toMatch(/<h3[^>]*>1枠目：—<\/h3>/)
  })
  it('🟢 合成した装着とサイズ1.0を表示。サイズ不一致は読み取り専用', () => {
    const bytes = new Uint8Array(TS_SAVE_SIZE)
    const view = new DataView(bytes.buffer)
    for (const base of ACCESSORY_EQUIPMENT_BASES) for (let i = 0; i < 10; i++) view.setInt16(base + i * 64 + 62, -1, true)
    view.setInt16(0x3a0a, 157, true)
    bytes[0x3a08] = 1
    const html = render(bytes)
    expect(html).toContain('おんぶさよ人形')
    expect(html).toContain('標準の取り付け先：胸・背中')
    expect(html).toContain('標準位置：')
    expect(html).toContain('標準設定に戻す')
    expect(html).toContain('value="1"')
    const wrongSize = new Uint8Array(TS_SAVE_SIZE + 1)
    wrongSize.set(bytes)
    expect(render(wrongSize)).toContain('読み取り専用')
  })
})
