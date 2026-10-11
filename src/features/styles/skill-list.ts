// 技の画面の絞り込みと並べ替え。技の値（コマンド・攻撃力・属性・防御技）は 🟢（datatable/sect/skill.csv）。
import { STANCE_SKILLS, findSkillInfo, skillName, type SkillTreeGroup } from '@/save/master/sect-data'
import { matchesSearch } from '@/lib/search'

export type SkillSort = 'id-asc' | 'id-desc' | 'attack-desc' | 'attack-asc'

export const SKILL_SORT_LABELS: Record<SkillSort, string> = {
  // 内部の並びはキー（id-asc / id-desc）のまま。画面には ID を出さない
  'id-asc': 'ゲームの並び順',
  'id-desc': 'ゲームの並びの逆順',
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

type SkillLike = { skillId: number; skillNo: number; nameJa: string; nameEn: string }

export function matchesSkillFilter(s: SkillLike, f: SkillFilter): boolean {
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
const attackOf = (s: SkillLike): number | null => {
  const info = findSkillInfo(s.skillId)
  return info && info.defenseGroup === null ? info.attack : null
}

/** 並べ替えの比べ方。同じ値は ID、技の番号の順 */
export function compareSkills(a: SkillLike, b: SkillLike, sort: SkillSort): number {
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
}

export function sortSkills<T extends SkillLike>(skills: readonly T[], sort: SkillSort): T[] {
  return skills.toSorted((a, b) => compareSkills(a, b, sort))
}

export type ShownTree = {
  groups: SkillTreeGroup[]
  /** 条件に合う行（技の木の key） */
  matched: ReadonlySet<string>
  /** 条件に合う技の番号 */
  skillNos: ReadonlySet<number>
}

/**
 * 技の木（sheetSkillTree）を絞り込んで並べ替える。条件に合う技と、そこへ続く前の技を残す（前の技は matched に入れない）。
 * 元の技と上位技のまとまりは、どれかが残れば全部残す。並べ替えは同じ段のまとまりどうしを、まとまりの先頭の技で比べる
 */
export function filterSortTree(groups: readonly SkillTreeGroup[], f: SkillFilter, sort: SkillSort): ShownTree {
  const matched = new Set<string>()
  const skillNos = new Set<number>()
  const walk = (gs: readonly SkillTreeGroup[]): SkillTreeGroup[] =>
    gs
      .map((g) => {
        let keep = false
        const members = g.members.map((m) => {
          const next = walk(m.next)
          if (matchesSkillFilter(m.skill, f)) {
            matched.add(m.key)
            skillNos.add(m.skill.skillNo)
            keep = true
          }
          if (next.length > 0) keep = true
          return { ...m, next }
        })
        return keep ? { ...g, members } : null
      })
      .filter((g) => g !== null)
      .toSorted((a, b) => compareSkills(a.members[0].skill, b.members[0].skill, sort))
  return { groups: walk(groups), matched, skillNos }
}
