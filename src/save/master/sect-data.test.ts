import { describe, expect, it } from 'vitest'
import { findSkillSheet, sheetSkillRows, type SkillSheet } from './sect-data'

const summary = (sheet: SkillSheet) =>
  sheetSkillRows(sheet).map((r) => `${'  '.repeat(r.depth)}${r.skill.skillNo}`)

describe('sheetSkillRows 🟢', () => {
  it('技の表 0：前に出す技・派生元の下に派生先を並べる', () => {
    const rows = sheetSkillRows(findSkillSheet(0)!)
    expect(rows.map((r) => r.skill.skillNo).sort((a, b) => a - b)).toEqual(
      findSkillSheet(0)!.skills.map((s) => s.skillNo),
    )
    expect(summary(findSkillSheet(0)!)).toEqual([
      '0',
      '  1',
      '    2',
      '7',
      '8',
      '9',
      '16',
      '  19',
      '25',
      '36',
      // 昇雷閃（37）は昇雲閃（36）の派生。追昇閃（54）は 36・37 の次で、木の親は最初の 36
      '  37',
      '  54',
      '    58',
      '38',
      '52',
      '  53',
      '85',
      '88',
      // 丸食い（89）は早食い（88）の派生
      '  89',
    ])
    const row = (no: number) => rows.find((r) => r.skill.skillNo === no)!
    expect(row(37)).toMatchObject({ parent: 36, prev: [] })
    expect(row(54)).toMatchObject({ parent: null, prev: [36, 37] })
    expect(row(19)).toMatchObject({ parent: null, prev: [16] })
  })

  it('派生元・前に出す技が輪になっても全部の技を 1 回ずつ並べる', () => {
    const base = findSkillSheet(0)!
    const sheet: SkillSheet = {
      ...base,
      skills: [
        { ...base.skills[0], skillNo: 100, parent: 101 },
        { ...base.skills[0], skillNo: 101, parent: 100 },
      ],
    }
    expect(summary(sheet)).toEqual(['100', '  101'])
  })
})
