import { describe, expect, it } from 'vitest'
import { SKILL_SHEETS, findSkillSheet, sheetSkillTree, stanceSkillSheet, stanceSkills, type SkillSheet, type SkillTreeGroup } from './sect-data'

/** 木を 1 行ずつにする。字下げは続けて出す技、[ ] は上位技のまとまり、^n は n の上位技 */
const summary = (sheet: SkillSheet) => {
  const lines: string[] = []
  const walk = (groups: SkillTreeGroup[], depth: number) => {
    for (const g of groups) {
      const grouped = g.members.length > 1
      for (const m of g.members) {
        const up = m.upgradeOf === null ? '' : `^${m.upgradeOf}`
        lines.push(`${'  '.repeat(depth)}${grouped ? '[' : ''}${m.skill.skillNo}${up}`)
        walk(m.next, depth + 1)
      }
    }
  }
  walk(sheetSkillTree(sheet), 0)
  return lines
}

const keys = (groups: SkillTreeGroup[]): string[] =>
  groups.flatMap((g) => g.members.flatMap((m) => [m.key, ...keys(m.next)]))
const skillNos = (groups: SkillTreeGroup[]): number[] =>
  groups.flatMap((g) => g.members.flatMap((m) => [m.skill.skillNo, ...skillNos(m.next)]))

describe('sheetSkillTree 🟢', () => {
  it('技の表 0：続けて出す技を字下げし、上位技は元の技のまとまりに入れる', () => {
    const sheet = findSkillSheet(0)!
    expect(summary(sheet)).toEqual([
      '0',
      '  1',
      '    2',
      '7',
      '8',
      '9',
      '16',
      '  19',
      '25',
      // 昇雷閃（37）は昇雲閃（36）の上位技。追昇閃（54）は 36・37 の次なので、どちらの下にも出す（続く斬馬一閃 58 も）
      '[36',
      '  54',
      '    58',
      '[37^36',
      '  54',
      '    58',
      '38',
      '52',
      '  53',
      '85',
      // 丸食い（89）は早食い（88）の上位技
      '[88',
      '[89^88',
    ])
    const tree = sheetSkillTree(sheet)
    expect(new Set(keys(tree)).size).toBe(keys(tree).length)
    expect(new Set(skillNos(tree))).toEqual(new Set(sheet.skills.map((s) => s.skillNo)))
  })

  it('上位技の上位技も同じまとまりに続ける', () => {
    const base = findSkillSheet(0)!
    const skill = base.skills[0]
    const sheet: SkillSheet = {
      ...base,
      skills: [
        { ...skill, skillNo: 85, parent: null },
        { ...skill, skillNo: 86, parent: 85 },
        { ...skill, skillNo: 87, parent: 86 },
      ],
    }
    expect(summary(sheet)).toEqual(['[85', '[86^85', '[87^86'])
  })

  it('つながりが輪になっても全部の技を出し、輪はたどらない', () => {
    const base = findSkillSheet(0)!
    const sheet: SkillSheet = {
      ...base,
      skills: [
        { ...base.skills[0], skillNo: 100, parent: 101 },
        { ...base.skills[0], skillNo: 101, parent: 100 },
      ],
    }
    expect(summary(sheet)).toEqual(['[100', '[101^100'])
  })
})

describe('stanceSkillSheet 🟢', () => {
  it('構えのすべての技を持ち、上位技の元は技の表と同じ', () => {
    const sheet = stanceSkillSheet(3)
    expect(sheet.skills.map((s) => s.skillNo)).toEqual(stanceSkills(3).map((s) => s.skillNo))
    for (const sh of SKILL_SHEETS.filter((x) => x.stance === 3)) {
      for (const s of sh.skills) {
        if (s.parent !== null) expect(sheet.skills.find((x) => x.skillNo === s.skillNo)!.parent).toBe(s.parent)
      }
    }
  })

  it('木にすべての技が 1 回以上出る', () => {
    for (let c = 0; c < 13; c++) {
      const sheet = stanceSkillSheet(c)
      expect(new Set(skillNos(sheetSkillTree(sheet)))).toEqual(new Set(sheet.skills.map((s) => s.skillNo)))
      const k = keys(sheetSkillTree(sheet))
      expect(new Set(k).size).toBe(k.length)
    }
  })
})
