import { describe, expect, it } from 'vitest'
import { formatHash, parseHash } from './route'

describe('URL のハッシュ', () => {
  it('画面だけ', () => {
    expect(parseHash('#/npc')).toEqual({ section: 'npc', anchor: null })
    expect(parseHash('#npc')).toEqual({ section: 'npc', anchor: null })
    expect(parseHash('#/npc/')).toEqual({ section: 'npc', anchor: null })
  })

  it('画面と箱の anchor', () => {
    expect(parseHash('#/npc/npc-flags/dojo')).toEqual({ section: 'npc', anchor: 'npc-flags/dojo' })
  })

  it('知らない画面・空のハッシュは null', () => {
    expect(parseHash('')).toBeNull()
    expect(parseHash('#/')).toBeNull()
    expect(parseHash('#/nothing/a')).toBeNull()
  })

  it('書いたものを読むと元に戻る', () => {
    for (const route of [
      { section: 'hero', anchor: null },
      { section: 'belt', anchor: 'weapon-1/numbers' },
      { section: 'world', anchor: 'gates/recruit' },
    ] as const) {
      expect(parseHash(formatHash(route))).toEqual(route)
    }
    expect(formatHash({ section: 'npc', anchor: 'npc-flags/dojo' })).toBe('#/npc/npc-flags/dojo')
  })
})
