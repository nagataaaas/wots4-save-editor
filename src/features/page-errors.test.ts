import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { pages } from './pages'
import type { SectionId } from './sections'
import { SaveContext, type LoadedSave, type SaveContextValue } from '@/lib/save-context'
import { AdvancedModeContext } from '@/lib/advanced-mode-context'
import { NavigationContext } from '@/lib/navigation-context'
import { SearchCollectorContext, type SearchCollector } from '@/lib/search-collector'
import { PageBanner } from '@/components/page-banner'

const affected: SectionId[] = [
  'hero', 'hero-appearance', 'records', 'belt', 'weapon-bag', 'weapon-chest',
  'tools', 'chest', 'valuables', 'accessories', 'appearance', 'unlocks',
  'world', 'npc', 'event-chart', 'dojo', 'occupation', 'yobai', 'styles', 'ore-ryu', 'skills', 'circulating', 'templates',
]

function render(section: SectionId, save: LoadedSave | null) {
  const context: SaveContextValue = {
    save, error: null, changedBytes: 0, unsavedBytes: 0, historyVersion: 0,
    load: async () => {}, restore: async () => {}, clearHistory: async () => {},
    saveEdited: async () => {}, openFile: async () => {}, update: vi.fn(),
  }
  const page = pages[section]!
  const collector: SearchCollector = { section, entries: [], seen: new Set() }
  const wrap = (node: ReactNode) => createElement(NavigationContext.Provider, {
    value: { section, anchor: null, field: null, seq: 0, go: () => {} },
  }, createElement(SaveContext.Provider, { value: context },
    createElement(AdvancedModeContext.Provider, { value: { advanced: false, setAdvanced: () => {} } },
      createElement(SearchCollectorContext.Provider, { value: collector }, node),
    ),
  ))
  const html = renderToStaticMarkup(wrap(createElement(page)))
  return { html, update: context.update, boxes: collector.entries.filter(entry => entry.box) }
}

describe('読み込みエラーでも画面の枠を残す', () => {
  for (const section of affected) {
    it(`${section}: 未読み込みでは共通案内を増やさず、短いセーブは読取エラーを表示する`, () => {
      const unloaded = render(section, null)
      expect(unloaded.html).not.toContain('読み込めません')
      expect(unloaded.html).not.toContain('セーブファイルが読み込まれていません')
      const bytes = new Uint8Array(1)
      const invalid = render(section, { name: '合成セーブ', working: bytes, original: bytes, saved: bytes, loadId: 1, sessionId: null, handle: null })
      expect(invalid.html).toContain('読み込めません')
      // セーブの読取失敗で、画面内のカードや検索対象の欄を消さない。
      expect(invalid.boxes).toEqual(unloaded.boxes)
      expect(invalid.update).not.toHaveBeenCalled()
    })
  }
  it('容姿の特典は読取エラーを一度だけ出す', () => {
    const bytes = new Uint8Array(1)
    const { html } = render('appearance', { name: '合成セーブ', working: bytes, original: bytes, saved: bytes, loadId: 1, sessionId: null, handle: null })
    expect(html.match(/読み込めません/g)).toHaveLength(1)
    expect(html).toContain('顔・髪型などの特典')
    expect(html).toContain('服')
  })
  it('PageBanner は読取エラーを読み取り専用の理由より優先する', () => {
    const html = renderToStaticMarkup(createElement(PageBanner, { error: '読取失敗', problem: 'サイズ不一致' }))
    expect(html).toContain('読取失敗')
    expect(html).not.toContain('サイズ不一致')
    expect(renderToStaticMarkup(createElement(PageBanner, { problem: 'サイズ不一致' }))).toContain('読み取り専用')
  })
})
