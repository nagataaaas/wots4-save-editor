import { describe, expect, it } from 'vitest'
import { SKILL_SHEETS, findSkillInfo } from './master/sect-data'
import { uniqueWeaponsForSkill } from './unique-weapons'

// 🔶 固有武器の6バイトの +0 を技の ID とみなした対応（unique-weapons.ts）
describe('uniqueWeaponsForSkill 🔶', () => {
  it('固有武器の秘伝の技から武器を引く（chunks/weapon-record の表と同じ）', () => {
    expect(uniqueWeaponsForSkill(88)).toEqual(['大黒生', '大樽生']) // 秘伝黒生
    expect(uniqueWeaponsForSkill(89)).toEqual(['大黒生', '大樽生']) // 秘伝黒生の続きの ID
    expect(uniqueWeaponsForSkill(577)).toEqual(['虎爪（無手）']) // 面剥がし
    expect(uniqueWeaponsForSkill(576)).toEqual(['クズリ爪']) // 光矢突
    expect(uniqueWeaponsForSkill(62)).toEqual([]) // 一刀
  })

  it('「特定の武器でしか使えない」技は、技の表にあるものすべてに武器が見つかる', () => {
    const ids = new Set(SKILL_SHEETS.flatMap((sh) => sh.skills.map((s) => s.skillId)))
    const missing = [...ids].filter(
      (id) => findSkillInfo(id)?.attrs.includes('特定の武器でしか使えない') && uniqueWeaponsForSkill(id).length === 0,
    )
    expect(missing).toEqual([])
  })
})
