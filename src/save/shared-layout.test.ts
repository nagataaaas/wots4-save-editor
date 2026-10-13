// 固定位置の定義を共有するモジュール間の対応。合成したバイト列だけを使う。
import { describe, expect, it } from 'vitest'
import { TS_SAVE_SIZE } from './layout'
import { CHARACTER_FLAGS, CHARACTER_STATUS, characterStatusForPromise, characterStatusForTown } from './flags/characters'
import { MORO_OFFSET, MORO_DEAD, readFactions, routeEligible } from './factions'
import { partnerDeathWarning } from './yobai-create'
import { DAY_RANGE } from './scenario-date'
import { DAY_NORMAL_MAX, YOBAI_COUNTERS, PROMISE_CODEC, STAGE_OFFSET, validatePersonValue, validatePersonField } from './yobai'
import { OCCUPATION_SERIES, SHIRUBE_SERIES } from './master/occupation-series'
import { OCCUPATION_GROUPS, occupationById } from './master/occupation-names'
import { OCCUPATION_SERIES_FLAGS, OCCUPATION_DLC_FLAGS } from './flags/occupation'
import { acceptRuleOf, seriesAcceptOf } from './occupation-accept'
import { reviveNote } from './townsfolk'
import { PUPIL_CODEC } from './dojo'

describe('共有する固定位置とレコード', () => {
  it('🟢 茂呂の状態は勢力の判定・夜の約束・人物の欄で同じバイトを読む', () => {
    const bytes = new Uint8Array(TS_SAVE_SIZE)
    expect(MORO_OFFSET).toBe(0x3752)
    expect(MORO_DEAD).toBe(1)
    bytes[0x3752] = 1
    expect(readFactions(bytes).moro).toBe(1)
    expect(routeEligible([[3, 3, 3], [0, 0, 0]], 0, readFactions(bytes).moro)).toBe(false)
    expect(partnerDeathWarning(bytes, 65)).toMatch(/死亡/)
    expect(CHARACTER_FLAGS.find(f => f.offset === MORO_OFFSET)?.label).toBe('茂呂')
    bytes[0x3752] = 3
    expect(partnerDeathWarning(bytes, 65)).toBeNull()
    expect(routeEligible([[3, 3, 3], [0, 0, 0]], 0, readFactions(bytes).moro)).toBe(true)
  })

  it('🟢 重要人物の対応は連続15バイトと寿司屋。別の姿も同じ状態に対応する', () => {
    expect(Object.values(CHARACTER_STATUS).map(s => s.offset)).toEqual([
      ...Array.from({ length: 15 }, (_, i) => 0x374e + i), 0x37f9,
    ])
    for (let p = 10; p <= 23; p++) {
      expect(characterStatusForTown(p)?.offset).toBe(0x3744 + p)
      expect(reviveNote(p)).toMatch(/町に出てこない/)
    }
    expect(characterStatusForPromise(425)).toBe(CHARACTER_STATUS.akagi)
    expect(characterStatusForPromise(456)).toBe(CHARACTER_STATUS.jj)
    expect(characterStatusForPromise(9999)).toBeUndefined()
    expect(reviveNote(30)).toMatch(/寿司屋/)
    expect(reviveNote(55)).toMatch(/同じ人物/)
    expect(reviveNote(9)).toBeNull()
    expect(reviveNote(24)).toBeNull()
  })

  it('🟢 約束の作成と表示は経過日数・夜這いの段階・日数上限を共有する', () => {
    expect(STAGE_OFFSET).toBe(0x13e30)
    expect(YOBAI_COUNTERS.find(c => c.label === '段階')?.offset).toBe(STAGE_OFFSET)
    expect(DAY_NORMAL_MAX + 1).toBe(DAY_RANGE.normal.max)
    expect(validatePersonValue('day', DAY_NORMAL_MAX, { advanced: false })).toBeNull()
    expect(validatePersonValue('day', DAY_NORMAL_MAX + 1, { advanced: false })).not.toBeNull()
    // 編集では未知の現在値も書き戻せるが、新規の約束では新しい値として検証する。
    expect(validatePersonField('blood', 254, 254, { advanced: false })).toBeNull()
    expect(validatePersonValue('blood', 254, { advanced: false })).not.toBeNull()
    expect(validatePersonField('type', 0xffffffff, 0xffffffff, { advanced: false })).not.toBeNull()
  })

  it('🟢 約束と弟子の codec は既存の並びを読み書きし、隙間・前後を保つ', () => {
    const promise = new Uint8Array(0x2c + 2).fill(0xaa)
    const values = { type: 37, place: 12, layout: 6, name: 7077, look: 28, age: 24, blood: 3, reserved: 65535, day: 1 }
    for (const field of Object.keys(values) as (keyof typeof values)[]) PROMISE_CODEC.writeField(promise, 1, field, values[field])
    expect([...promise.slice(5, 13)]).toEqual([37, 0, 0, 0, 12, 0, 6, 0])
    expect([...promise.slice(0x25, 0x2b)]).toEqual([24, 3, 255, 255, 1, 0])
    expect([...promise.slice(13, 29)]).toEqual(new Array(16).fill(0xaa))
    const before = promise.slice()
    const record = PROMISE_CODEC.read(promise, 1)
    for (const field of Object.keys(record) as (keyof typeof record)[]) PROMISE_CODEC.writeField(promise, 1, field, record[field])
    expect(promise).toEqual(before)

    const pupil = Uint8Array.from([0xaa, 0x49, 0, 0, 0, 0x15, 0, 0, 0, 0xbc, 0, 4, 0, 0xbb])
    const original = pupil.slice()
    const entry = PUPIL_CODEC.read(pupil, 1)
    expect(entry).toEqual({ kind: 73, name: 21, look: 188, point: 4, shown: 0 })
    for (const field of Object.keys(entry) as (keyof typeof entry)[]) PUPIL_CODEC.writeField(pupil, 1, field, entry[field])
    expect(pupil).toEqual(original)
    expect(PUPIL_CODEC.offset(1, 'look')).toBe(9)
  })
})

describe('連続なりわいの共通表（🟢、受注解除の値は 🔶）', () => {
  it('まとまり・欄の仕事・受注の対応が揃い、最後の仕事と途中の追加の仕事を保つ', () => {
    for (const [key, s] of Object.entries(OCCUPATION_SERIES)) {
      const group = OCCUPATION_GROUPS.find(g => g.key === key)!
      const field = OCCUPATION_SERIES_FLAGS.find(f => f.number === s.flag)!
      const jobs = Array.from({ length: group.to - group.from + 1 }, (_, i) => group.from + i).filter(id => occupationById(id))
      expect(field.jobs).toEqual(jobs)
      s.ids.forEach((id, i) => {
        const n = (i + 1) * 10
        expect(acceptRuleOf(id).onAccept).toEqual([{ flag: s.flag, value: n + (i < s.writesUntil ? 1 : 0) }])
        expect(seriesAcceptOf(s.flag, n + 1)).toBe(i < s.writesUntil ? id : undefined)
      })
    }
    expect(acceptRuleOf(203).onAccept).toEqual([{ flag: 7, value: 61 }])
    expect(acceptRuleOf(206).onAccept).toEqual([{ flag: 7, value: 80 }])
    expect(acceptRuleOf(198).onAccept).toEqual([])
    expect(acceptRuleOf(200).onAccept).toEqual([])
    expect(OCCUPATION_DLC_FLAGS.map(f => f.number)).toEqual([27, 28, 29, 30, 31])
    expect(SHIRUBE_SERIES.ids).toEqual([209, 210, 211, 212])
  })
})
