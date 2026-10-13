import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FilterSelect } from './filter-select'

describe('絞り込みの選択欄', () => {
  const options = [{ value: 'all', label: 'すべて' }, { value: 'owned', label: '所持', disabled: true }] as const
  it('名前を選択肢の表から描き、無効なフィルタを実際に無効にする', () => {
    const html = renderToStaticMarkup(createElement(FilterSelect, { options, value: 'all', onChange: () => {}, disabled: true, 'aria-label': '所持状態' }))
    expect(html).toContain('すべて')
    expect(html).toContain('disabled=""')
    expect(html).toContain('aria-label="所持状態"')
  })
  it('候補外・選べない候補を通知せず、選べる候補だけ通知する', () => {
    const changes: string[] = []
    const select = FilterSelect({ options, value: 'all', onChange: value => changes.push(value) })
    select.props.onValueChange('missing')
    select.props.onValueChange('owned')
    select.props.onValueChange('all')
    expect(changes).toEqual(['all'])
  })
})
