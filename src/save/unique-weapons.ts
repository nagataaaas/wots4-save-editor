// 「特定の武器でしか使えない」技を使える固有武器。
// 固有武器の6バイトの +0（chunks/weapon-record「固有武器の6バイト」）は、その武器の秘伝の技の ID（datatable/sect/skill.csv）と
// 同じ値になっている（例：大黒生 0x58 ＝ 秘伝黒生 88、虎爪 0x241 ＝ 面剥がし 577）。この一致から対象の武器を引き、
// 同じ名前の技（続きの ID の技）も同じ武器とする。引いた武器はユーザーが正しいと確認した（✅ [U] 2026-10-09）。
import { findSkillInfo } from './master/sect-data'
import { WEAPON_IDS, weaponIdName } from './weapon-ids'

// 名前は使うときに今の言語で引く（画面の言語を切り替えられるので、読み込み時に名前で持たない）
const WEAPONS_BY_SKILL_NAME = new Map<string, (typeof WEAPON_IDS)[number][]>()
// 固有武器の6バイトの +4 は流派 ID 🟢（chunks/weapon-record）。その流派で戦ったときだけ武器の斬殺数が増えるので、固有技を覚えられるのはこの流派だけ
const SECTS_BY_SKILL_NAME = new Map<string, number[]>()
for (const option of WEAPON_IDS) {
  const unique = option.build?.unique
  if (!unique) continue
  const name = findSkillInfo(unique[0])?.nameJa
  if (!name) continue
  WEAPONS_BY_SKILL_NAME.set(name, [...(WEAPONS_BY_SKILL_NAME.get(name) ?? []), option])
  const sects = SECTS_BY_SKILL_NAME.get(name) ?? []
  if (!sects.includes(unique[2])) SECTS_BY_SKILL_NAME.set(name, [...sects, unique[2]])
}

/** その固有技を覚えられる流派の ID 🟢。固有技でなければ空 */
export function uniqueSkillSects(skillId: number): number[] {
  const name = findSkillInfo(skillId)?.nameJa
  return name ? (SECTS_BY_SKILL_NAME.get(name) ?? []) : []
}

/** その技を使える固有武器の名前（✅ [U]）。見つからなければ空 */
export function uniqueWeaponsForSkill(skillId: number): string[] {
  const name = findSkillInfo(skillId)?.nameJa
  return name ? (WEAPONS_BY_SKILL_NAME.get(name) ?? []).map((option) => weaponIdName(option)) : []
}
