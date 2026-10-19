// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 剣術大会直前：✅ [U] 2026-10-16 同じ書き方のセーブで、会場で剣術大会が始まった。
// 書く値の根拠は 🟢（大寄せ・4日目のイベント・剣術大会開催の開始条件と書く値）。
import { describe, expect, it } from 'vitest'
import { readU16 } from './binary'
import { TS_SAVE_SIZE } from './layout'
import { NEW_CYCLE_KEEP_FLAGS } from './new-cycle'
import {
  SCENE_TEMPLATE_GROUPS,
  applyKillableEve,
  applyMissionEve,
  applyTournamentEve,
  applyTrueRouteEve,
  type KillableScene,
  type MissionScene,
  type TournamentSide,
  type TrueRouteScene,
} from './scene-templates'

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

})

// なりわい：✅ [U] 2026-10-19 3つとも、同じ書き方のセーブで戦いが始まった（208 の最終戦は変数 21・40・2 で指揮官に話しかけて一騎打ち）。
// 書く値の根拠は 🟢（四天王の話・最終なりわいの値、受注中の表の並び、戦いに出る人）
describe('applyMissionEve', () => {
  const TABLE = { start: 0x45f4e, end: 0x4626e }
  const PEOPLE = [0x0618, 0x0630, 0x063c, 0x0648, 0x0654, 0x0660, 0x066c, 0x0678, 0x0684, 0x0690]

  /** 4日目（経過日数 3）の夕、受注中の表に別のなりわいが2件、207・208 の状態の表は FFFF、戦いに出る人は死亡 */
  function makeMissionSave(): Uint8Array {
    const b = makeSave()
    b.set([0x90, 0x01, 0x00, 0x06, 0x01], 0x0010)
    b.set([0x03, 0x00], 0x0bd8)
    b.fill(0, TABLE.start, TABLE.end)
    b.set([0x0d, 0x00, 0, 0, 0x01, 0x00, 0x00, 0x03], TABLE.start)
    b.set([0x2d, 0x00, 0, 0, 0x02, 0x00, 0x02, 0x05], TABLE.start + 16)
    b.set([0xff, 0xff, 0xff, 0xff], 0x3542)
    for (const at of PEOPLE) b[at] = 1
    return b
  }

  it.each<[MissionScene, number[], number, number[]]>([
    // 場面、受注中の表の1件目、四天王の話・最終なりわい、現在地
    ['lords-vs-quartet', [0xcf, 0, 0, 0, 3, 0, 1, 0xff, 0, 0, 0, 0, 0, 0, 0, 0], 0x15, [14, 2]],
    ['amihama-eight', [0xd0, 0, 0, 0, 3, 0, 1, 0xff, 0, 0, 0, 0, 0, 0, 0, 0], 0x10, [60, 20]],
    ['amihama-eight-commander', [0xd0, 0, 0, 0, 3, 0, 1, 0xff, 21, 40, 2, 0, 0, 0, 0, 0], 0x10, [60, 20]],
  ])('%s：受注中の表をこの1件だけにし、なりわいのフラグ・人物・現在地を書く', (scene, entry, location, lords) => {
    const b = makeMissionSave()
    applyMissionEve(b, scene)
    expect([...b.subarray(TABLE.start, TABLE.start + 16)]).toEqual(entry)
    expect(b.subarray(TABLE.start + 16, TABLE.end).every((v) => v === 0)).toBe(true)
    expect([...b.subarray(0x0120, 0x0124)]).toEqual([101, 100, 101, 100])
    expect([b[0x0135], b[0x0136]]).toEqual(lords)
    for (const at of PEOPLE) expect(b[at]).toBe(0)
    expect(b[0x0013]).toBe(location)
  })

  it('状態の表は FFFF のときだけ 0 にし、クリア回数は残す', () => {
    const b = makeMissionSave()
    applyMissionEve(b, 'lords-vs-quartet')
    expect(readU16(b, 0x3542)).toBe(0)
    b.set([0x05, 0x00], 0x3544)
    applyMissionEve(b, 'amihama-eight')
    expect(readU16(b, 0x3544)).toBe(5)
  })

  it('物語の進み具合・日付など、ほかの位置は変えない', () => {
    const before = makeMissionSave()
    const b = before.slice()
    applyMissionEve(b, 'amihama-eight-commander')
    const allowed = (at: number) =>
      (at >= TABLE.start && at < TABLE.end) ||
      [0x0013, 0x0120, 0x0121, 0x0122, 0x0123, 0x0135, 0x0136, 0x3544, 0x3545, ...PEOPLE].includes(at)
    for (let at = 0; at < b.length; at++) if (!allowed(at)) expect(b[at]).toBe(before[at])
  })

  it('サイズの違うファイルには書かない', () => {
    expect(() => applyMissionEve(new Uint8Array(0x100), 'amihama-eight')).toThrow()
  })
})

// 真ルート：🔶 書き込んだセーブをゲームで確かめていない。書く値の根拠は 🟢（三姉妹見参〜84 の書く値、85・86 の開始条件）
describe('applyTrueRouteEve', () => {
  /** ローラの決意の前の、0 以外の値（残すフラグを除く） */
  const BEFORE_NONZERO: Record<number, number> = {
    [A + 0]: 4, [A + 1]: 4,
    ...Object.fromEntries([70, 71, 72, 73, 75, 77, 78, 79, 81, 82, 84].map((n) => [A + n, 4])),
    0x374e: 3, 0x3756: 2, 0x3757: 2, 0x3758: 3,
    0x37c1: 1, 0x37c2: 1,
    0x3762: 1, 0x3763: 1, 0x3769: 1, 0x376b: 1, 0x377d: 1, 0x377e: 1, 0x377f: 1,
    0x378d: 2, 0x378e: 1, 0x379f: 1, 0x37a2: 2, 0x37aa: 2, 0x37b2: 1, 0x37b3: 1, 0x37c7: 1,
  }
  const AFTER_NONZERO: Record<number, number> = { ...BEFORE_NONZERO, [A + 85]: 4, [A + 86]: 4, 0x37ae: 2 }

  it.each<[TrueRouteScene, Record<number, number>, number[]]>([
    // 場面、0 以外の値、[段階 u16 + 保留量・現在地・時間帯]
    ['laura-determination', BEFORE_NONZERO, [0x9a, 0x01, 0x00, 0x12, 0x01]],
    ['after-sisters', AFTER_NONZERO, [0xa4, 0x01, 0x00, 0x14, 0x02]],
  ])('%s：決まった道筋の値になる（まだらが味方の値は 0、ほかの残すフラグは残す）', (scene, nonzero, date) => {
    const before = makeSave()
    before[0x3760] = 1
    const b = before.slice()
    applyTrueRouteEve(b, scene)
    const keep = new Set(NEW_CYCLE_KEEP_FLAGS)
    for (let at = A; at <= FLAGS.end; at++) {
      if (at === 0x3760) expect(b[at]).toBe(0)
      else if (keep.has(at)) expect(b[at]).toBe(before[at])
      else expect(b[at], `0x${at.toString(16)}`).toBe(nonzero[at] ?? 0)
    }
    expect([...b.subarray(0x0010, 0x0015)]).toEqual(date)
    expect(readU16(b, 0x0bd8)).toBe(3)
  })

  it('ほかの位置は変えず、2回当てても同じ結果になる', () => {
    const before = makeSave()
    const b = before.slice()
    applyTrueRouteEve(b, 'after-sisters')
    for (let at = 0; at < b.length; at++) if (!writable(at)) expect(b[at]).toBe(before[at])
    const twice = b.slice()
    applyTrueRouteEve(twice, 'after-sisters')
    expect(twice).toEqual(b)
  })

  it('サイズの違うファイルには書かない', () => {
    expect(() => applyTrueRouteEve(new Uint8Array(0x100), 'laura-determination')).toThrow()
  })
})

// 斬り殺せる戦い：✅ [U] 2026-10-19 7つとも、同じ書き方のセーブで確かめた。書く値の根拠は 🟢（各イベントの開始条件と、道筋で書かれる値）
describe('applyKillableEve', () => {
  /** 周回の始めに書かれる値（剣術大会直前のテンプレには入れていない） */
  const CYCLE_START = { 0x3756: 2, 0x37c1: 1, 0x37c2: 1 }

  /** 剣術大会直前（✅）の書き込みのうち、0x36A8〜0x3837 の 0 以外の値 */
  function tournamentNonzero(side: TournamentSide): Record<number, number> {
    const b = makeSave()
    applyTournamentEve(b, side)
    const keep = new Set(NEW_CYCLE_KEEP_FLAGS)
    const out: Record<number, number> = {}
    for (let at = A; at <= FLAGS.end; at++) if (!keep.has(at) && b[at] !== 0) out[at] = b[at]
    return out
  }

  const ev = (entries: Record<number, number>) => Object.fromEntries(Object.entries(entries).map(([n, v]) => [A + Number(n), v]))
  /** 三姉妹見参までの真ルートの値 */
  const TRUE_START = {
    ...ev({ 0: 4, 1: 4, 70: 4 }),
    0x3762: 1, 0x3763: 1, 0x376b: 1, 0x377d: 1, 0x377e: 1, 0x377f: 1, 0x378d: 2, 0x378e: 1, 0x379f: 1, 0x37aa: 2,
  }

  it.each<[KillableScene, () => Record<number, number>, number[], number, number[]]>([
    // 場面、0x36A8〜0x3837 の 0 以外の値、[段階 u16・保留量・現在地・時間帯]、経過日数、死亡のビットを消す人物番号
    [
      'consulate-raid',
      () => ({ ...tournamentNonzero('prajnas'), ...ev({ 35: 4, 38: 4, 46: 4, 49: 4, 51: 4, 57: 4, 58: 4, 62: 2 }), 0x3750: 1, 0x3778: 1, 0x37a2: 1, 0x37ab: 3, 0x37f8: 1 }),
      [0xfe, 0x01, 0, 0x0f, 1], 3, [21, 20, 13, 15, 16, 17],
    ],
    [
      'wasted-wish',
      () => ({ ...tournamentNonzero('foreigners'), ...ev({ 46: 4, 48: 4, 51: 4, 56: 3 }), 0x3758: 1, 0x37a3: 2, 0x37ab: 3 }),
      [0xf4, 0x01, 0, 0x0b, 0], 4, [10, 11, 19, 21],
    ],
    [
      'the-raid',
      () => ({ ...tournamentNonzero('foreigners'), ...ev({ 46: 4, 48: 4, 51: 4, 56: 4, 61: 4, 68: 5 }), 0x3758: 1, 0x3764: 1, 0x3790: 1, 0x37a3: 2, 0x37a4: 2, 0x37ab: 3 }),
      [0x58, 0x02, 0, 0x12, 1], 5, [13, 15, 16, 17],
    ],
    [
      'three-kataneers',
      () => ({ ...tournamentNonzero('shogunate'), ...ev({ 46: 4, 47: 4, 51: 4, 53: 4, 55: 4 }), 0x37ab: 3, 0x37f7: 1 }),
      [0xfe, 0x01, 0, 0x01, 1], 4, [10, 11, 13],
    ],
    [
      'prajna-annihilation',
      () => ({ ...tournamentNonzero('shogunate'), ...ev({ 46: 4, 47: 4, 51: 4, 53: 4, 54: 4 }), 0x37ab: 3, 0x37c0: 1, 0x37f7: 1 }),
      [0xfe, 0x01, 0, 0x01, 1], 4, [10, 11],
    ],
    [
      'praying-for-recovery',
      () => ({ ...TRUE_START, ...ev({ 71: 4, 72: 3 }) }),
      [0x78, 0x00, 0, 0x04, 2], 0, [10, 11],
    ],
    [
      'assassination-plot',
      () => ({
        ...TRUE_START, ...ev({ 71: 4, 72: 4, 73: 4, 77: 4, 78: 4, 80: 4 }),
        0x374e: 3, 0x3764: 1, 0x378e: 2, 0x3790: 1, 0x37a2: 2, 0x37a4: 2, 0x37b2: 1, 0x37b3: 1, 0x37c7: 1,
      }),
      [0x40, 0x01, 0, 0x0d, 2], 2, [18, 11, 14, 20, 21],
    ],
  ])('%s：決まった道筋の値・日付・現在地を書き、斬れる人の死亡のビットを消す', (scene, nonzero, date, day, people) => {
    const before = makeSave()
    const b = before.slice()
    applyKillableEve(b, scene)
    const expected: Record<number, number> = { ...nonzero(), ...CYCLE_START }
    const keep = new Set(NEW_CYCLE_KEEP_FLAGS)
    for (let at = A; at <= FLAGS.end; at++) {
      if (keep.has(at)) expect(b[at]).toBe(before[at])
      else expect(b[at], `0x${at.toString(16)}`).toBe(expected[at] ?? 0)
    }
    expect([...b.subarray(0x0010, 0x0015)]).toEqual(date)
    expect(readU16(b, 0x0bd8)).toBe(day)
    const personAt = (p: number) => 0x015c + 12 * p
    for (const p of people) expect(b[personAt(p)]).toBe(0)
    const allowed = new Set(people.map(personAt))
    for (let at = 0; at < b.length; at++) if (!writable(at) && !allowed.has(at)) expect(b[at]).toBe(before[at])
  })

  it('2回当てても同じ結果になる', () => {
    const once = makeSave()
    applyKillableEve(once, 'the-raid')
    const twice = once.slice()
    applyKillableEve(twice, 'the-raid')
    expect(twice).toEqual(once)
  })

  it('サイズの違うファイルには書かない', () => {
    expect(() => applyKillableEve(new Uint8Array(0x100), 'consulate-raid')).toThrow()
  })
})

describe('SCENE_TEMPLATE_GROUPS', () => {
  it('画面に出すテンプレの id は重ならない', () => {
    const ids = SCENE_TEMPLATE_GROUPS.flatMap((g) => g.templates.map((t) => t.id))
    expect(new Set(ids).size).toBe(ids.length)
  })
})
