// 技の画面の絞り込み・並べ替え。技の値は 🟢（datatable/sect/skill.csv）
import { describe, expect, it } from 'vitest'
import { findSkillInfo, sheetSkillTree, stanceSkillSheet, stanceSkills, type SkillTreeGroup } from '@/save/master/sect-data'
import { ANY, ATTR_OPTIONS, COMMAND_OPTIONS, EMPTY_FILTER, filterSortTree, matchesSkillFilter, sortSkills } from './skill-list'

const skills = stanceSkills(3)
const info = (id: number) => findSkillInfo(id)!

describe('matchesSkillFilter', () => {
  it('条件なしならすべて残す', () => {
    expect(skills.filter((s) => matchesSkillFilter(s, EMPTY_FILTER))).toHaveLength(skills.length)
  })

  it('攻撃技・防御技で分ける', () => {
    const attack = skills.filter((s) => matchesSkillFilter(s, { ...EMPTY_FILTER, kind: 'attack' }))
    const defense = skills.filter((s) => matchesSkillFilter(s, { ...EMPTY_FILTER, kind: 'defense' }))
    expect(defense.length).toBeGreaterThan(0)
    expect(attack.every((s) => info(s.skillId).defenseGroup === null)).toBe(true)
    expect(defense.every((s) => info(s.skillId).defenseGroup !== null)).toBe(true)
  })

  it('攻撃力の下限・入力・効果で絞り込む', () => {
    const strong = skills.filter((s) => matchesSkillFilter(s, { ...EMPTY_FILTER, minAttack: 100 }))
    expect(strong.every((s) => info(s.skillId).attack >= 100 && info(s.skillId).defenseGroup === null)).toBe(true)
    expect(COMMAND_OPTIONS).toContain('強')
    const heavy = skills.filter((s) => matchesSkillFilter(s, { ...EMPTY_FILTER, command: '強' }))
    expect(heavy.length).toBeGreaterThan(0)
    expect(heavy.every((s) => info(s.skillId).commandJa === '強')).toBe(true)
    expect(ATTR_OPTIONS).toContain('防御崩し')
    const breakers = skills.filter((s) => matchesSkillFilter(s, { ...EMPTY_FILTER, attr: '防御崩し' }))
    expect(breakers.every((s) => info(s.skillId).attrs.includes('防御崩し'))).toBe(true)
    expect(skills.filter((s) => matchesSkillFilter(s, { ...EMPTY_FILTER, attr: ANY }))).toHaveLength(skills.length)
  })
})

describe('sortSkills', () => {
  it('ID 順に並べる', () => {
    const ids = sortSkills(skills, 'id-asc').map((s) => s.skillId)
    expect(ids).toEqual(ids.toSorted((a, b) => a - b))
    expect(sortSkills(skills, 'id-desc').map((s) => s.skillId)).toEqual(ids.toReversed())
  })

  it('ダメージ順は防御技をどちらの向きでも後ろにする', () => {
    for (const sort of ['attack-desc', 'attack-asc'] as const) {
      const sorted = sortSkills(skills, sort)
      const firstDefense = sorted.findIndex((s) => info(s.skillId).defenseGroup !== null)
      expect(sorted.slice(firstDefense).every((s) => info(s.skillId).defenseGroup !== null)).toBe(true)
      const attacks = sorted.slice(0, firstDefense).map((s) => info(s.skillId).attack)
      expect(attacks).toEqual(attacks.toSorted((a, b) => (sort === 'attack-desc' ? b - a : a - b)))
    }
  })
})

describe('filterSortTree', () => {
  const tree = sheetSkillTree(stanceSkillSheet(3))
  const nodes = (gs: SkillTreeGroup[]): SkillTreeGroup['members'] => gs.flatMap((g) => g.members.flatMap((m) => [m, ...nodes(m.next)]))

  it('条件なしなら木の形を変えない', () => {
    const shown = filterSortTree(tree, EMPTY_FILTER, 'id-asc')
    expect(nodes(shown.groups).map((m) => m.key).toSorted()).toEqual(nodes(tree).map((m) => m.key).toSorted())
    expect(shown.skillNos.size).toBe(stanceSkills(3).length)
  })

  it('条件に合う技と、そこへ続く前の技を残す。前の技は matched に入れない', () => {
    const f = { ...EMPTY_FILTER, minAttack: 150 }
    const shown = filterSortTree(tree, f, 'id-asc')
    const all = nodes(shown.groups)
    expect(all.some((m) => !shown.matched.has(m.key))).toBe(true)
    for (const m of all) {
      if (shown.matched.has(m.key)) expect(matchesSkillFilter(m.skill, f)).toBe(true)
    }
    // 残った行は、自分が合うか、まとまり・続く技のどこかに合う技がある
    const hasMatch = (gs: SkillTreeGroup[]): boolean => gs.some((g) => g.members.some((m) => shown.matched.has(m.key) || hasMatch(m.next)))
    for (const g of shown.groups) expect(hasMatch([g])).toBe(true)
  })

  it('同じ段のまとまりを、先頭の技で並べ替える', () => {
    const roots = filterSortTree(tree, EMPTY_FILTER, 'id-desc').groups.map((g) => g.members[0].skill.skillId)
    expect(roots).toEqual(roots.toSorted((a, b) => b - a))
  })
})
