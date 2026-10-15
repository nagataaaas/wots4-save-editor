import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { pages } from './pages'
import { sections, type SectionId } from './sections'
import { SaveContext, type LoadedSave, type SaveContextValue } from '@/lib/save-context'
import { AdvancedModeContext } from '@/lib/advanced-mode-context'
import { NavigationContext } from '@/lib/navigation-context'
import { setCurrentLanguage } from '@/lib/i18n'
import { TS_SAVE_SIZE } from '@/save/layout'

// 英語の画面に日本語が残っていないことを確かめる（UI の言語の切り替え。ユーザー判断 2026-10-15）。
// 全画面を、未読み込み・すべて 0 の合成セーブ・短すぎる合成セーブで、通常モードと上級者モードの両方で描く

const JAPANESE = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]+/gu

function render(section: SectionId, save: LoadedSave | null, advanced: boolean): string {
  const context: SaveContextValue = {
    save, error: null, changedBytes: 0, unsavedBytes: 0, historyVersion: 0,
    load: async () => {}, restore: async () => {}, clearHistory: async () => {},
    saveEdited: async () => {}, openFile: async () => {}, update: () => {},
  }
  const wrap = (node: ReactNode) => createElement(NavigationContext.Provider, {
    value: { section, anchor: null, field: null, seq: 0, go: () => {} },
  }, createElement(SaveContext.Provider, { value: context },
    createElement(AdvancedModeContext.Provider, { value: { advanced, setAdvanced: () => {} } }, node),
  ))
  return renderToStaticMarkup(wrap(createElement(pages[section]!)))
}

const saveOf = (bytes: Uint8Array): LoadedSave => ({ name: 'S4-DATA_00', working: bytes, original: bytes, saved: bytes, loadId: 1, sessionId: null, handle: null })

/** 英語で描いた画面に残る日本語の語（重複なし） */
function japaneseIn(html: string): string[] {
  return [...new Set(html.match(JAPANESE) ?? [])]
}

describe('英語の画面', () => {
  beforeAll(() => setCurrentLanguage('en'))
  afterAll(() => setCurrentLanguage('ja'))

  for (const s of sections) {
    it(`${s.id}: 日本語を出さない`, () => {
      const found = new Set<string>()
      for (const save of [null, saveOf(new Uint8Array(TS_SAVE_SIZE)), saveOf(new Uint8Array(1))])
        for (const advanced of [false, true]) for (const word of japaneseIn(render(s.id, save, advanced))) found.add(word)
      expect([...found]).toEqual([])
    })
  }
})
