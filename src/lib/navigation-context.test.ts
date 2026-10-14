import { describe, expect, it } from 'vitest'
import { anchoredOpen, markOpened } from './navigation-context'

/** 移動を順に行ったあとの、箱ごとの最後に開いた seq（seq は 1 から） */
const after = (...anchors: (string | null)[]) =>
  anchors.reduce<ReadonlyMap<string, number>>((seqs, anchor, i) => markOpened(seqs, anchor, i + 1), new Map())

describe('移動で開く箱の表（markOpened）', () => {
  it('移動先の箱とその外側の箱の seq だけを更新する', () => {
    expect([...after('npc-flags/dojo')]).toEqual([['npc-flags', 1], ['npc-flags/dojo', 1]])
    expect([...after('npc-flags/dojo', 'npc-flags/other')]).toEqual([
      ['npc-flags', 2], ['npc-flags/dojo', 1], ['npc-flags/other', 2],
    ])
  })

  it('同じ箱へ何度移動しても増えない。anchor のない移動では変えない', () => {
    expect(after('a', 'a', 'a').size).toBe(1)
    const seqs = after('a')
    expect(markOpened(seqs, null, 2)).toBe(seqs)
  })
})

describe('開閉できる箱の開閉（anchoredOpen）', () => {
  const closed = { seq: 0, open: false }

  it('箱かその中が移動先になると開く。ほかの箱が移動先でも開かない', () => {
    expect(anchoredOpen(after('npc-flags'), 'npc-flags', closed)).toBe(true)
    expect(anchoredOpen(after('npc-flags/dojo'), 'npc-flags', closed)).toBe(true)
    expect(anchoredOpen(after('npc-flags-other'), 'npc-flags', closed)).toBe(false)
    expect(anchoredOpen(undefined, 'npc-flags', { seq: 0, open: true })).toBe(true)
  })

  it('次の移動先が別の箱でも、移動で開いた箱は閉じない', () => {
    expect(anchoredOpen(after('a', 'b'), 'a', closed)).toBe(true)
  })

  it('移動で開いたあと手で閉じたら閉じたまま。同じ箱へもう一度移動すると開き直す', () => {
    const afterClose = { seq: 1, open: false }
    expect(anchoredOpen(after('a'), 'a', afterClose)).toBe(false)
    expect(anchoredOpen(after('a', 'a'), 'a', afterClose)).toBe(true)
  })

  it('移動のあとにマウントした箱（manual.seq がその時点）は、前の移動では開かない', () => {
    expect(anchoredOpen(after('a'), 'a', { seq: 3, open: false })).toBe(false)
    // マウント時に移動先だった箱は seq -1 で始まるので開く（開いた時点の URL の移動は seq 0）
    expect(anchoredOpen(markOpened(new Map(), 'a', 0), 'a', { seq: -1, open: false })).toBe(true)
  })
})
