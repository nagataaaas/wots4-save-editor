import { describe, expect, it } from 'vitest'
import { findSkillSheet, sheetSkillRows, type SkillSheet } from './sect-data'

const summary = (sheet: SkillSheet) =>
  sheetSkillRows(sheet).map((r) => `${'  '.repeat(r.depth)}${r.skill.skillNo}`)

describe('sheetSkillRows 🟢', () => {
  it('技の表 0：派生元（前に出す技・parent）の下に派生先を並べ、派生元が複数ある技は繰り返す', () => {
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
      '36',
      // 昇雷閃（37）は昇雲閃（36）の派生
      '  37',
      // 追昇閃（54）は 36・37 の次なので、どちらの下にも出す（続く斬馬一閃 58 も）
      '    54',
      '      58',
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
    const rows = sheetSkillRows(sheet)
    expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length)
    expect(new Set(rows.map((r) => r.skill.skillNo))).toEqual(new Set(sheet.skills.map((s) => s.skillNo)))
  })

  it('派生元が輪になっても全部の技を出し、輪はたどらない', () => {
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
