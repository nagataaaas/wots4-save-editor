// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 剣術大会直前：✅ [U] 2026-10-16 同じ書き方のセーブで、会場で剣術大会が始まった。
// 書く値の根拠は 🟢（大寄せ・4日目のイベント・剣術大会開催の開始条件と書く値）。
import { describe, expect, it } from 'vitest'
import { readU16 } from './binary'
import { TS_SAVE_SIZE } from './layout'
import { NEW_CYCLE_KEEP_FLAGS } from './new-cycle'
import { SCENE_TEMPLATE_GROUPS, applyTournamentEve, type TournamentSide } from './scene-templates'

const A = 0x36a8
const FLAGS = { start: 0x374e, end: 0x3837 }

/** 周回の途中を模したセーブ。イベント状態 A とフラグに 0 以外を入れ、A の一部は FF（未到達） */
function makeSave(): Uint8Array {
  const b = new Uint8Array(TS_SAVE_SIZE)
  for (let i = 0; i < b.length; i++) b[i] = (i * 7 + 3) & 0xff
  for (let n = 0; n < 166; n++) b[A + n] = n % 10 === 9 ? 0xff : 3
  return b
}

/** 書き込みで変わってよい位置 */
function writable(at: number): boolean {
  if (at >= A && at <= FLAGS.end) return true
  return [0x0010, 0x0011, 0x0012, 0x0013, 0x0014, 0x0bd8, 0x0bd9].includes(at)
}

/** ゲームで確かめた書き込み（剣術大会直前・幕府）のうち、0 以外の値 */
const SHOGUNATE_NONZERO: Record<number, number> = {
  [A + 0]: 4, [A + 1]: 4, [A + 28]: 4, [A + 41]: 4, [A + 42]: 4,
  0x3761: 1, 0x3762: 1, 0x3763: 1, 0x3764: 1,
  0x3780: 3, 0x3789: 1, 0x378a: 2, 0x378b: 2, 0x378d: 1,
  0x37a2: 2, 0x37aa: 2, 0x37c3: 1, 0x37c6: 1,
}

describe('applyTournamentEve', () => {
  it('幕府：ゲームで確かめた書き込みと同じ値になる（残すフラグを除く。A の FF も 00 にする）', () => {
    const before = makeSave()
    const b = before.slice()
    applyTournamentEve(b, 'shogunate')
    const keep = new Set(NEW_CYCLE_KEEP_FLAGS)
    for (let at = A; at <= FLAGS.end; at++) {
      if (keep.has(at)) expect(b[at]).toBe(before[at])
      else expect(b[at], `0x${at.toString(16)}`).toBe(SHOGUNATE_NONZERO[at] ?? 0)
    }
    expect(readU16(b, 0x0010)).toBe(400)
    expect([b[0x0012], b[0x0013], b[0x0014]]).toEqual([0, 0x0d, 0])
    expect(readU16(b, 0x0bd8)).toBe(3)
  })

  it.each<[TournamentSide, number, number[], number[]]>([
    // 勢力、4日目のイベント、ルート分岐（幕府・外国・攘夷・無所属）、[代官所の門, 居留地の門, 神社の柵]
    ['shogunate', 42, [1, 2, 2, 0], [0, 1, 1]],
    ['foreigners', 43, [2, 1, 2, 0], [1, 0, 1]],
    ['prajnas', 44, [2, 2, 1, 0], [1, 1, 0]],
    ['independent', 45, [2, 2, 2, 1], [1, 1, 1]],
  ])('%s：4日目のイベント・ルート分岐・門と柵', (side, event, routes, gates) => {
    const b = makeSave()
    applyTournamentEve(b, side)
    for (const n of [42, 43, 44, 45]) expect(b[A + n]).toBe(n === event ? 4 : 0)
    for (const n of [46, 47, 48, 49, 50]) expect(b[A + n]).toBe(0)
    expect([b[0x3789], b[0x378a], b[0x378b], b[0x378c]]).toEqual(routes)
    expect([b[0x37fa], b[0x37fb]]).toEqual([gates[0], gates[0]])
    expect([b[0x3764], b[0x37c6]]).toEqual([gates[1], gates[1]])
    expect([b[0x37c3], b[0x3761], b[0x37a2]]).toEqual([gates[2], gates[2], gates[2] * 2])
    const friendship = [0x3780, 0x3781, 0x3782].map((at) => b[at])
    expect(friendship).toEqual([0, 1, 2].map((c) => (routes[c] === 1 ? 3 : 0)))
  })

  it('ほかの位置は変えず、ファイルサイズも変えない', () => {
    const before = makeSave()
    const b = before.slice()
    applyTournamentEve(b, 'prajnas')
    expect(b.length).toBe(TS_SAVE_SIZE)
    for (let at = 0; at < b.length; at++) if (!writable(at)) expect(b[at]).toBe(before[at])
  })

  it('同じテンプレを2回当てても同じ結果になる', () => {
    const once = makeSave()
    applyTournamentEve(once, 'foreigners')
    const twice = once.slice()
    applyTournamentEve(twice, 'foreigners')
    expect(twice).toEqual(once)
  })

  it('サイズの違うファイルには書かない', () => {
    expect(() => applyTournamentEve(new Uint8Array(0x100), 'shogunate')).toThrow()
  })

  it('画面に出すテンプレの id は重ならない', () => {
    const ids = SCENE_TEMPLATE_GROUPS.flatMap((g) => g.templates.map((t) => t.id))
    expect(new Set(ids).size).toBe(ids.length)
  })
})
