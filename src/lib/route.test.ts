import { describe, expect, it } from 'vitest'
import { formatHash, matchFieldKey, parseHash } from './route'

describe('URL のハッシュ', () => {
  it('画面だけ', () => {
    expect(parseHash('#/npc')).toEqual({ section: 'npc', anchor: null, field: null })
    expect(parseHash('#npc')).toEqual({ section: 'npc', anchor: null, field: null })
    expect(parseHash('#/npc/')).toEqual({ section: 'npc', anchor: null, field: null })
  })

  it('画面と箱の anchor', () => {
    expect(parseHash('#/npc/npc-flags/dojo')).toEqual({ section: 'npc', anchor: 'npc-flags/dojo', field: null })
  })

  it('箱の中の欄', () => {
    expect(parseHash('#/hero/vitals/~/HP/%E7%8F%BE%E5%9C%A8')).toEqual({ section: 'hero', anchor: 'vitals', field: ['HP', '現在'] })
    // 箱の外の欄
    expect(parseHash('#/hero/~/%E5%90%8D%E5%89%8D')).toEqual({ section: 'hero', anchor: null, field: ['名前'] })
    // 欄の名前がないときは箱だけ
    expect(parseHash('#/hero/vitals/~/')).toEqual({ section: 'hero', anchor: 'vitals', field: null })
  })

  it('知らない画面・空のハッシュは null', () => {
    expect(parseHash('')).toBeNull()
    expect(parseHash('#/')).toBeNull()
    expect(parseHash('#/nothing/a')).toBeNull()
  })

  it('書いたものを読むと元に戻る', () => {
    for (const route of [
      { section: 'hero', anchor: null, field: null },
      { section: 'belt', anchor: 'weapon-1/numbers', field: null },
      { section: 'world', anchor: 'gates/recruit', field: null },
      { section: 'hero', anchor: 'vitals', field: ['HP', '現在'] },
      { section: 'hero', anchor: null, field: ['A/B', '~'] },
    ] as const) {
      expect(parseHash(formatHash(route))).toEqual(route)
    }
    expect(formatHash({ section: 'npc', anchor: 'npc-flags/dojo' })).toBe('#/npc/npc-flags/dojo')
  })
})

describe('URL の欄から要素を選ぶ', () => {
  const key = (...parts: string[]) => parts.join('')

  it('anchor が同じで名前の並びが欄で終わるもの', () => {
    const keys = [key('vitals', 'HP・活力・つま斬り', 'HP', '現在'), key('vitals', 'HP・活力・つま斬り', '活力', '現在')]
    expect(matchFieldKey(keys, 'vitals', ['HP', '現在'])).toBe(keys[0])
    expect(matchFieldKey(keys, 'vitals', ['活力', '現在'])).toBe(keys[1])
    expect(matchFieldKey(keys, 'money', ['HP', '現在'])).toBeUndefined()
  })

  it('箱の外の欄は anchor が空', () => {
    expect(matchFieldKey([key('', '名前')], null, ['名前'])).toBe(key('', '名前'))
  })

  it('合うものが複数あれば、いちばん短いもの', () => {
    const keys = [key('a', '箱', '外', '小見出し', '欄'), key('a', '箱', '小見出し', '欄')]
    expect(matchFieldKey(keys, 'a', ['小見出し', '欄'])).toBe(keys[1])
  })
})
