import { describe, expect, it } from 'vitest'
import { anchoredOpen } from './navigation-context'

describe('開閉できる箱の開閉（anchoredOpen）', () => {
  const closed = { seq: 0, open: false }

  it('箱かその中が移動先になると開く。ほかの箱が移動先でも開かない', () => {
    expect(anchoredOpen(new Map([['npc-flags', 1]]), 'npc-flags', closed)).toBe(true)
    expect(anchoredOpen(new Map([['npc-flags/dojo', 1]]), 'npc-flags', closed)).toBe(true)
    expect(anchoredOpen(new Map([['npc-flags-other', 1]]), 'npc-flags', closed)).toBe(false)
    expect(anchoredOpen(undefined, 'npc-flags', { seq: 0, open: true })).toBe(true)
  })

  it('次の移動先が別の箱でも、移動で開いた箱は閉じない', () => {
    const seqs = new Map([['a', 1], ['b', 2]])
    expect(anchoredOpen(seqs, 'a', closed)).toBe(true)
  })

  it('移動で開いたあと手で閉じたら閉じたまま。同じ箱へもう一度移動すると開き直す', () => {
    const afterClose = { seq: 1, open: false }
    expect(anchoredOpen(new Map([['a', 1]]), 'a', afterClose)).toBe(false)
    expect(anchoredOpen(new Map([['a', 2]]), 'a', afterClose)).toBe(true)
  })

  it('移動のあとにマウントした箱（manual.seq がその時点）は、前の移動では開かない', () => {
    expect(anchoredOpen(new Map([['a', 1]]), 'a', { seq: 3, open: false })).toBe(false)
    // マウント時に移動先だった箱は seq -1 で始まるので開く
    expect(anchoredOpen(new Map([['a', 0]]), 'a', { seq: -1, open: false })).toBe(true)
  })
})
