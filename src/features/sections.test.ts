import { describe, expect, it } from 'vitest'
import { isFolder, sectionGroups, sections } from './sections'
import { pages } from './pages'
import { HeroPage } from './hero/hero-page'
import { HeroAppearancePage } from './hero/hero-appearance-page'

describe('主人公の画面構成', () => {
  it('主人公グループに基本情報・容姿・侍評価と記録を並べ、独立した装着画面を置かない', () => {
    const items = sectionGroups[0].items
    const hero = items[0]
    expect(isFolder(hero)).toBe(true)
    if (!isFolder(hero)) throw new Error('主人公はグループである必要があります')
    expect(hero.label).toBe('主人公')
    expect(hero.sections.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: 'hero', label: '基本情報' },
      { id: 'hero-appearance', label: '容姿' },
      { id: 'records', label: '侍評価・記録' },
    ])
    expect(sections.some((section) => String(section.id) === 'accessory-equipment')).toBe(false)
    expect(sections.find((section) => section.id === 'hero-appearance')?.folder).toBe('主人公')
    expect(pages.hero).toBe(HeroPage)
    expect(pages['hero-appearance']).toBe(HeroAppearancePage)
  })

  it('世界グループに阿弥浜・NPC・イベント・道場を並べ、シナリオの画面を置かない（ユーザー判断 2026-10-11、道場は 2026-10-12）', () => {
    expect(sections.filter((section) => section.folder === '世界').map(({ id, label }) => ({ id, label }))).toEqual([
      { id: 'world', label: '阿弥浜' },
      { id: 'npc', label: 'NPC' },
      { id: 'event-chart', label: 'イベント' },
      { id: 'dojo', label: '道場' },
    ])
    expect(sections.some((section) => String(section.id) === 'scenario')).toBe(false)
    for (const id of ['world', 'npc', 'event-chart', 'dojo'] as const) expect(pages[id]).toBeDefined()
  })

  it('容姿・特典の解放・所持画面は変更しない', () => {
    expect(sections.filter((section) => section.folder === '容姿・特典').map((section) => section.id))
      .toEqual(['accessories', 'appearance', 'unlocks'])
  })
})
