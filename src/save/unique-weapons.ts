// 「特定の武器でしか使えない」技を使える固有武器。
// 🔶 固有武器の6バイトの +0（chunks/weapon-record「固有武器の6バイト」。意味は 🔶）は、どの固有武器でも
// その武器の秘伝の技の ID（datatable/sect/skill.csv）と同じ値になっている（例：大黒生 0x58 ＝ 秘伝黒生 88、虎爪 0x241 ＝ 面剥がし 577）。
// この一致から対象の武器を引く。同じ名前の技（続きの ID の技）は同じ武器で使えるとみなす（🔶）。
import { findSkillInfo } from './master/sect-data'
import { WEAPON_IDS, weaponIdName } from './weapon-ids'

const WEAPONS_BY_SKILL_NAME = new Map<string, string[]>()
for (const option of WEAPON_IDS) {
  const unique = option.build?.unique
  if (!unique) continue
  const name = findSkillInfo(unique[0])?.nameJa
  if (!name) continue
  WEAPONS_BY_SKILL_NAME.set(name, [...(WEAPONS_BY_SKILL_NAME.get(name) ?? []), weaponIdName(option)])
}

/** その技を使える固有武器の名前（🔶 推定）。見つからなければ空 */
export function uniqueWeaponsForSkill(skillId: number): string[] {
  const name = findSkillInfo(skillId)?.nameJa
  return name ? (WEAPONS_BY_SKILL_NAME.get(name) ?? []) : []
}
