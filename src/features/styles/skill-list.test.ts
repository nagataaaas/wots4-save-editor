// 技の画面の絞り込み・並べ替え。技の値は 🟢（datatable/sect/skill.csv）
import { describe, expect, it } from 'vitest'
import { findSkillInfo, stanceSkills } from '@/save/master/sect-data'
import { ANY, ATTR_OPTIONS, COMMAND_OPTIONS, EMPTY_FILTER, matchesSkillFilter, sortSkills } from './skill-list'

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
