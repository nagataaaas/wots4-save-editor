import { describe, expect, it } from 'vitest'
import { SKILL_SHEETS, findSect, findSkillInfo, findSkillSheet } from './master/sect-data'
import { uniqueSkillSects, uniqueWeaponsForSkill } from './unique-weapons'

// 固有武器の6バイトの +0 を技の ID とした対応（unique-weapons.ts。✅ [U] 2026-10-09）
describe('uniqueWeaponsForSkill ✅', () => {
  it('固有武器の秘伝の技から武器を引く（chunks/weapon-record の表と同じ）', () => {
    expect(uniqueWeaponsForSkill(88)).toEqual(['大黒生', '大樽生']) // 秘伝黒生
    expect(uniqueWeaponsForSkill(89)).toEqual(['大黒生', '大樽生']) // 秘伝黒生の続きの ID
    expect(uniqueWeaponsForSkill(577)).toEqual(['虎爪（無手）']) // 面剥がし
    expect(uniqueWeaponsForSkill(576)).toEqual(['クズリ爪']) // 光矢突
    expect(uniqueWeaponsForSkill(62)).toEqual([]) // 一刀
  })

  it('🟢 固有技を覚えられる流派（固有武器の6バイトの +4）。その流派の技の表に固有技が入っている', () => {
    const owners: [number, number][] = [
      [88, 23], // 秘伝黒生：浅比黒生流剣術
      [40, 34], // 鬼神滅裂：玩流剣術
      [158, 43], // 処刑荒野：天神御影流剣術
      [600, 49], // 乾坤一擲：武業流剣術
      [308, 55], // 心帰一神法：佐村一刀流居合術
      [238, 67], // 血霧：凶慈流剣術
      [367, 74], // くるひかぶき：東邦流剣術
      [577, 97], // 面剥がし：松寺流体術
      [576, 111], // 光矢突：阿佐翔流体術
    ]
    for (const [skill, sect] of owners) {
      expect(uniqueSkillSects(skill)).toEqual([sect])
      const sheets = findSect(sect)!.sheets.map((id) => findSkillSheet(id)!)
      expect(sheets.some((sh) => sh.skills.some((s) => s.skillId === skill))).toBe(true)
    }
    expect(uniqueSkillSects(62)).toEqual([]) // 一刀
  })

  it('「特定の武器でしか使えない」技は、技の表にあるものすべてに武器が見つかる', () => {
    const ids = new Set(SKILL_SHEETS.flatMap((sh) => sh.skills.map((s) => s.skillId)))
    const missing = [...ids].filter(
      (id) => findSkillInfo(id)?.attrs.includes('特定の武器でしか使えない') && uniqueWeaponsForSkill(id).length === 0,
    )
    expect(missing).toEqual([])
  })
})
