import { createElement, type ComponentType, type ReactNode } from 'react'
import { pages } from '@/features/pages'
import { sections, type SectionId } from '@/features/sections'
import { AdvancedModeContext } from '@/lib/advanced-mode-context'
import { NavigationContext, type NavigationValue } from '@/lib/navigation-context'
import { SaveContext, type SaveContextValue } from '@/lib/save-context'
import { SearchCollectorContext, type SearchCollector, type SearchEntry } from '@/lib/search-collector'
import { getLanguage, setCurrentLanguage, type Language } from '@/lib/i18n'

// 検索の索引（search-index.{ja,en}.generated.json）を言語ごとに作る。画面で使うと遅いので、テスト（search-index.test.ts）で作ってファイルに書き、画面はそれを読む

/** 索引を作るときの、セーブ未読み込みの状態。未読み込みでも画面は読み込み後と同じ構成で描く（AGENTS.md）ので、箱・欄はすべて出る */
const NO_SAVE: SaveContextValue = {
  save: null,
  error: null,
  changedBytes: 0,
  unsavedBytes: 0,
  load: async () => {},
  update: () => {},
  openFile: async () => {},
  saveEdited: async () => {},
  restore: async () => {},
  clearHistory: async () => {},
  historyVersion: 0,
}

function wrap(section: SectionId, collector: SearchCollector, page: ComponentType, advanced: boolean): ReactNode {
  const navigation: NavigationValue = { go: () => {}, section, anchor: null, field: null, seq: 0 }
  return createElement(
    NavigationContext.Provider,
    { value: navigation },
    createElement(
      SaveContext.Provider,
      { value: NO_SAVE },
      createElement(
        AdvancedModeContext.Provider,
        { value: { advanced, setAdvanced: () => {} } },
        createElement(SearchCollectorContext.Provider, { value: collector }, createElement(page)),
      ),
    ),
  )
}

/**
 * 全画面を索引モードで、lang の言語で描き、箱・小見出し・欄の名前を集める（画面そのものは入れない）。
 * renderToStaticMarkup は effect を走らせないので、描いてもスクロールや保存などは起きない。
 * 言語ごとの索引は同じ順に並ぶ（同じ画面を同じ構成で描くため）。欄のリンクを別の言語で開いたときの読み替えに使う（search-index.ts）
 */
export function collectSearchEntries(renderToStaticMarkup: (node: ReactNode) => string, lang: Language): SearchEntry[] {
  const previous = getLanguage()
  setCurrentLanguage(lang)
  try {
    return collect(renderToStaticMarkup)
  } finally {
    setCurrentLanguage(previous)
  }
}

function collect(renderToStaticMarkup: (node: ReactNode) => string): SearchEntry[] {
  const entries: SearchEntry[] = []
  for (const s of sections) {
    const page = pages[s.id]
    if (!page) continue
    const collector: SearchCollector = { section: s.id, entries: [], seen: new Set() }
    // 上級者モードだけの欄も拾う。同じ collector の seen で重複を除き、上級者モードで初めて出たものに印を付ける
    // （通常モードでは描かれないので、検索結果に出さない。search-dialog.tsx）
    renderToStaticMarkup(wrap(s.id, collector, page, false))
    const normalCount = collector.entries.length
    renderToStaticMarkup(wrap(s.id, collector, page, true))
    entries.push(...collector.entries.map((e, i) => (i < normalCount ? e : { ...e, advanced: true as const })))
  }
  return entries
}
