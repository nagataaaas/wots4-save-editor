import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SearchSelectControl } from './search-select-control'
import { substringFilter } from '@/lib/search'

describe('検索つき選択欄', () => {
  const options = [{ value: '1', label: '刀', selectedLabel: '武器：刀' }]
  const render = (value: string | null, disabled = false) => renderToStaticMarkup(createElement(SearchSelectControl, {
    options, value, disabled, onChange: () => {}, currentLabel: '不明',
  }))
  it('選択後の名前と候補外の名前を表示する', () => {
    expect(render('1')).toContain('武器：刀')
    expect(render('2')).toContain('不明（現在の値）')
  })
  it('未読み込みと読み取り専用の操作を無効にする', () => {
    expect(render(null)).toContain('未読み込み')
    expect(render(null)).toContain('disabled=""')
    expect(render('1', true)).toContain('disabled=""')
  })
  it('名前・読み・説明の部分一致を、表記ゆれを無視して探す', () => {
    expect(substringFilter('1', 'かたな', ['カタナ', '刀の説明'])).toBe(1)
    expect(substringFilter('1', '説明', ['カタナ', '刀の説明'])).toBe(1)
    expect(substringFilter('1', 'かたな', ['道具'])).toBe(0)
  })
})
