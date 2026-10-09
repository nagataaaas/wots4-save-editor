// 技の画面の絞り込みと並べ替え。技の値（コマンド・攻撃力・属性・防御技）は 🟢（datatable/sect/skill.csv）。
import { STANCE_SKILLS, findSkillInfo, skillName, type StanceSkill } from '@/save/master/sect-data'
import { matchesSearch } from '@/lib/search'

export type SkillSort = 'id-asc' | 'id-desc' | 'attack-desc' | 'attack-asc'

export const SKILL_SORT_LABELS: Record<SkillSort, string> = {
  'id-asc': 'ID（小さい順）',
  'id-desc': 'ID（大きい順）',
  'attack-desc': 'ダメージ（大きい順）',
  'attack-asc': 'ダメージ（小さい順）',
}

export type SkillKind = 'all' | 'attack' | 'defense'

export const SKILL_KIND_LABELS: Record<SkillKind, string> = {
  all: 'すべての技',
  attack: '攻撃技',
  defense: '防御技',
}

/** 「すべて」を表す選択肢の値 */
export const ANY = '*'

export type SkillFilter = {
  /** 技の名前（日本語・英語） */
  query: string
  /** コマンドの表記。ANY はすべて、'' はコマンドなし */
  command: string
  kind: SkillKind
  /** 攻撃力の下限。null は絞り込まない（防御技は外れる） */
  minAttack: number | null
  /** 属性（skill.csv の attrs の 1 つ）。ANY はすべて */
  attr: string
}

export const EMPTY_FILTER: SkillFilter = { query: '', command: ANY, kind: 'all', minAttack: null, attr: ANY }

const infos = STANCE_SKILLS.map((s) => findSkillInfo(s.skillId)).filter((i) => i !== undefined)

/** コマンドの選択肢（コマンドの値の順）。'' はコマンドなし */
export const COMMAND_OPTIONS: string[] = [...new Map(infos.toSorted((a, b) => a.command - b.command).map((i) => [i.commandJa, i])).keys()]

/** 属性の選択肢（多い順） */
export const ATTR_OPTIONS: string[] = (() => {
  const count = new Map<string, number>()
  for (const i of infos) for (const a of i.attrs) count.set(a, (count.get(a) ?? 0) + 1)
  return [...count.entries()].toSorted((a, b) => b[1] - a[1]).map(([a]) => a)
})()

export function matchesSkillFilter(s: StanceSkill, f: SkillFilter): boolean {
  const info = findSkillInfo(s.skillId)
  if (!matchesSearch(f.query, [skillName(s), s.nameEn])) return false
  if (f.command !== ANY && (info?.commandJa ?? '') !== f.command) return false
  const defense = info?.defenseGroup != null
  if (f.kind === 'attack' && (!info || defense)) return false
  if (f.kind === 'defense' && !defense) return false
  if (f.minAttack !== null && (!info || defense || info.attack < f.minAttack)) return false
  if (f.attr !== ANY && !info?.attrs.includes(f.attr)) return false
  return true
}

/** 並べ替えの攻撃力。防御技と値のない技は、どちらの向きでも後ろに回す */
const attackOf = (s: StanceSkill): number | null => {
  const info = findSkillInfo(s.skillId)
  return info && info.defenseGroup === null ? info.attack : null
}

/** 並べ替える。get で並べ替えるものから技を取り出す（技そのものなら省く） */
export function sortSkills<T = StanceSkill>(
  items: readonly T[],
  sort: SkillSort,
  get: (t: T) => StanceSkill = (t) => t as StanceSkill,
): T[] {
  return items.toSorted((p, q) => {
    const a = get(p)
    const b = get(q)
    if (sort === 'attack-desc' || sort === 'attack-asc') {
      const x = attackOf(a)
      const y = attackOf(b)
      if (x !== y) {
        if (x === null) return 1
        if (y === null) return -1
        return sort === 'attack-desc' ? y - x : x - y
      }
    }
    const byId = a.skillId - b.skillId || a.skillNo - b.skillNo
    return sort === 'id-desc' ? -byId : byId
  })
}
