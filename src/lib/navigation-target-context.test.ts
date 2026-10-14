import { describe, expect, it } from 'vitest'
import { findNavigationTarget, type FieldTarget } from './navigation-target-context'

const field = (anchor: string, path: string[], label: string): FieldTarget<string> =>
  ({ anchor, path, label, element: `欄:${[anchor, ...path, label].join('>')}` })

describe('移動先の要素を探す（findNavigationTarget）', () => {
  const boxes = new Map([['npc-flags', '箱:npc-flags'], ['npc-flags/dojo', '箱:dojo'], ['vitals', '箱:vitals']])
  const fields = [field('vitals', ['HP・活力・つま斬り', 'HP'], '現在')]

  it('箱へ移動するときはその箱', () => {
    expect(findNavigationTarget({ boxes, fields }, 'npc-flags/dojo', null)).toEqual({ element: '箱:dojo', kind: 'box' })
  })

  it('箱がないときは、anchor を外側へたどって登録されているいちばん内側の箱', () => {
    expect(findNavigationTarget({ boxes, fields }, 'npc-flags/none/deeper', null)).toEqual({ element: '箱:npc-flags', kind: 'box' })
    expect(findNavigationTarget({ boxes, fields }, 'none/dojo', null)).toBeNull()
  })

  it('欄があれば欄、まだなければ箱', () => {
    expect(findNavigationTarget({ boxes, fields }, 'vitals', ['HP', '現在'])).toEqual({ element: fields[0].element, kind: 'field' })
    expect(findNavigationTarget({ boxes, fields }, 'vitals', ['活力', '現在'])).toEqual({ element: '箱:vitals', kind: 'box' })
  })

  it('箱の外の欄', () => {
    const outside = [field('', [], '名前')]
    expect(findNavigationTarget({ boxes, fields: outside }, null, ['名前'])).toEqual({ element: outside[0].element, kind: 'field' })
    expect(findNavigationTarget({ boxes, fields: [] }, null, ['名前'])).toBeNull()
  })

  it('移動先がなければ null', () => {
    expect(findNavigationTarget({ boxes, fields }, null, null)).toBeNull()
  })
})
