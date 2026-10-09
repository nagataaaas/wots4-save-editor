import { describe, expect, it } from 'vitest'
import { isFolder, sectionGroups, sections } from './sections'
import { pages } from './pages'
import { HeroPage } from './hero/hero-page'
import { HeroAppearancePage } from './hero/hero-appearance-page'

describe('主人公の画面構成', () => {
  it('主人公グループに基本情報・容姿を並べ、独立した装着画面を置かない', () => {
    const items = sectionGroups[0].items
    const hero = items[0]
    expect(isFolder(hero)).toBe(true)
    if (!isFolder(hero)) throw new Error('主人公はグループである必要があります')
    expect(hero.label).toBe('主人公')
    expect(hero.sections.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: 'hero', label: '基本情報' },
      { id: 'hero-appearance', label: '容姿' },
    ])
    expect(sections.some((section) => String(section.id) === 'accessory-equipment')).toBe(false)
    expect(sections.find((section) => section.id === 'hero-appearance')?.folder).toBe('主人公')
    expect(pages.hero).toBe(HeroPage)
    expect(pages['hero-appearance']).toBe(HeroAppearancePage)
  })

  it('容姿・特典の解放・所持画面は変更しない', () => {
    expect(sections.filter((section) => section.folder === '容姿・特典').map((section) => section.id))
      .toEqual(['accessories', 'appearance', 'unlocks'])
  })
})
