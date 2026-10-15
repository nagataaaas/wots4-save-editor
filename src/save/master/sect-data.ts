// 流派・構え・技の表・技のマスターデータ。docs/save_format/datatable/sect/*.csv から生成した dataset/*.ts を使う。
// 全行 🟢（技の表の名前と番号の対応だけ 🔶。datatable/README.md）。
import { tr, type Localized } from '@/lib/i18n'
import { SECT_TABLE } from './dataset/sect'
import { SHEET_SKILL_TABLE } from './dataset/sheet-skill'
import { SKILL_TABLE } from './dataset/skill'
import { SKILL_SHEET_TABLE } from './dataset/skill-sheet'
import { STANCE_TABLE } from './dataset/stance'
import { STANCE_SKILL_TABLE } from './dataset/stance-skill'

/** 構えの数（0〜12）と、1つの構え・技の表が持てる技の番号の数（状態の表の 1 枠の大きさ） */
export const STANCE_COUNT = 13
export const SKILL_NO_COUNT = 128

/** 構えの組の数（装備の枠）と呼び名 🟢 */
export const SLOT_COUNT = 6
export const SLOT_LABELS: readonly Localized[] = [
  { ja: '刀', en: 'Sword' },
  { ja: '槍', en: 'Spear' },
  { ja: '無手', en: 'Hand-to-Hand' },
  { ja: '拳銃', en: 'Pistol' },
  { ja: 'ライフル', en: 'Rifle' },
  { ja: '二刀', en: 'Dual Arms' },
]

/** 構えの組の呼び名（今の言語）。表にない組は「不明」 */
export const slotLabel = (slot: number): string => tr(SLOT_LABELS[slot] ?? { ja: '不明', en: 'Unknown' })

export type Stance = { id: number; nameJa: string; nameEn: string; slot: number }

export type Sect = {
  id: number
  nameJa: string
  nameEn: string
  stance: number
  slot: number
  /** 技の表 ID（1〜3 個） */
  sheets: number[]
  /** 弐段〜伍段になる修練度 */
  thresholds: [number, number, number, number]
  /** 流派の書の番号。null は書がない（主人公が手に入れられない流派など） */
  scrollNo: number | null
  /** 名前が「……」の流派（主人公は手に入れられない） */
  hidden: boolean
}

export type SheetSkill = {
  sheet: number
  skillNo: number
  skillId: number
  nameJa: string
  nameEn: string
  /** 習得条件の番号。0＝流派を装備したときに覚える基本の技 */
  cond: number
  condJa: string
  condEn: string
  /** 必要な段（0＝初段 … 4＝伍段、−1＝なし） */
  rank: number
  points: number
  /** 派生元の技の番号 */
  parent: number | null
}

export type SkillSheet = { id: number; stance: number; nameJa: string; skills: SheetSkill[] }

export type StanceSkill = {
  stance: number
  skillNo: number
  skillId: number
  nameJa: string
  nameEn: string
  /** 初段の技（構えから最初に出せる技） */
  first: boolean
  /** 続けて出せる技の番号 */
  next: number[]
  /** この技の前に出す技の番号 */
  prev: number[]
}

export const STANCES: readonly Stance[] = Object.values(STANCE_TABLE).map((r) => ({
  id: r.id_dec,
  nameJa: r.name_ja,
  nameEn: r.name_en,
  slot: r.slot,
}))

export const SECTS: readonly Sect[] = Object.values(SECT_TABLE).map((r) => ({
  id: r.id_dec,
  nameJa: r.name_ja,
  nameEn: r.name_en ?? '',
  stance: r.stance,
  slot: r.slot,
  sheets: ([r.sheet1, r.sheet2, r.sheet3] as (number | null)[]).filter((v): v is number => v !== null),
  thresholds: [r.thr1, r.thr2, r.thr3, r.thr4],
  scrollNo: r.scroll_no,
  hidden: r.name_ja === '……',
}))

const SHEET_SKILLS: readonly SheetSkill[] = Object.values(SHEET_SKILL_TABLE).map((r) => ({
  sheet: r.sheet,
  skillNo: r.skill_no,
  skillId: r.skill_id,
  nameJa: r.name_ja,
  nameEn: r.name_en,
  cond: r.cond,
  condJa: r.cond_ja,
  condEn: r.cond_en,
  rank: r.rank,
  points: r.points,
  parent: r.parent,
}))

export const SKILL_SHEETS: readonly SkillSheet[] = Object.values(SKILL_SHEET_TABLE).map((r) => ({
  id: r.id_dec,
  stance: r.stance,
  nameJa: r.name_ja,
  skills: SHEET_SKILLS.filter((s) => s.sheet === r.id_dec),
}))

export const STANCE_SKILLS: readonly StanceSkill[] = Object.values(STANCE_SKILL_TABLE).map((r) => ({
  stance: r.stance,
  skillNo: r.skill_no,
  skillId: r.skill_id,
  nameJa: r.name_ja,
  nameEn: r.name_en,
  first: r.first === 1,
  next: [...r.next],
  prev: [...r.prev],
}))

const STANCE_BY_ID = new Map(STANCES.map((s) => [s.id, s]))
const SECT_BY_ID = new Map(SECTS.map((s) => [s.id, s]))
const SECT_BY_SCROLL = new Map(SECTS.filter((s) => s.scrollNo !== null).map((s) => [s.scrollNo as number, s]))
const SHEET_BY_ID = new Map(SKILL_SHEETS.map((s) => [s.id, s]))
const STANCE_SKILL_BY_KEY = new Map(STANCE_SKILLS.map((s) => [s.stance * SKILL_NO_COUNT + s.skillNo, s]))

export const findSect = (id: number): Sect | undefined => SECT_BY_ID.get(id)
export const findSectByScroll = (scrollNo: number): Sect | undefined => SECT_BY_SCROLL.get(scrollNo)
export const findSkillSheet = (id: number): SkillSheet | undefined => SHEET_BY_ID.get(id)
export const findStance = (id: number): Stance | undefined => STANCE_BY_ID.get(id)
export const findStanceSkill = (stance: number, skillNo: number): StanceSkill | undefined =>
  STANCE_SKILL_BY_KEY.get(stance * SKILL_NO_COUNT + skillNo)
export const stanceSkills = (stance: number): StanceSkill[] => STANCE_SKILLS.filter((s) => s.stance === stance)

/** 構え・流派の名前（今の言語。英語の名前がなければ日本語） */
export const stanceName = (s: Pick<Stance, 'nameJa' | 'nameEn'>): string => tr({ ja: s.nameJa, en: s.nameEn })
export const sectName = (s: Pick<Sect, 'nameJa' | 'nameEn'>): string => tr({ ja: s.nameJa, en: s.nameEn })
/** 構え ID の名前。表にない構えは空文字 */
export const stanceNameById = (id: number): string => {
  const s = findStance(id)
  return s ? stanceName(s) : ''
}

/** 技ごとの値 🟢（datatable/sect/skill.csv） */
export type SkillInfo = {
  id: number
  nameJa: string
  /** 英語の名前（なければ空） */
  nameEn: string
  /** コマンドの値（0＝なし）。同じ値なら同じコマンド */
  command: number
  /** コマンドの表記（弱・強・ガード・方向） */
  commandJa: string
  /** 防御技の組。null は攻撃技 */
  defenseGroup: number | null
  /** 技の詳細に出る攻撃力 */
  attack: number
  points: number
  attrs: string[]
}

const SKILL_BY_ID = new Map<number, SkillInfo>(
  Object.values(SKILL_TABLE).map((r) => [
    r.id_dec,
    {
      id: r.id_dec,
      nameJa: r.name_ja,
      nameEn: r.name_en,
      command: r.command,
      commandJa: r.command_ja,
      defenseGroup: r.defense_group,
      attack: r.attack,
      points: r.points,
      attrs: [...r.attrs],
    },
  ]),
)

export const findSkillInfo = (skillId: number): SkillInfo | undefined => SKILL_BY_ID.get(skillId)

/** 技の名前（今の言語。英語の名前がなければ日本語）。名前のない技は「（名前なし）」 */
export const skillName = (s: { nameJa: string; nameEn?: string }): string =>
  tr({ ja: s.nameJa, en: s.nameEn ?? '' }) || tr({ ja: '（名前なし）', en: '(No name)' })

/** 段の呼び名（0 初段 … 4 伍段、5 極）。値と呼び名の対応はユーザー指定（2026-10-09） */
export const RANK_LABELS: readonly Localized[] = [
  { ja: '初段', en: 'First' },
  { ja: '弐段', en: 'Second' },
  { ja: '参段', en: 'Third' },
  { ja: '四段', en: 'Fourth' },
  { ja: '伍段', en: 'Fifth' },
  { ja: '極', en: 'Master' },
]

/** 段の呼び名（今の言語）。表にない段は null */
export const rankLabel = (rank: number): string | null => {
  const label = RANK_LABELS[rank]
  return label ? tr(label) : null
}

/** コマンドの日本語の表記から英語の表記（skill.csv の command_ja → command_en） */
const COMMAND_EN = new Map<string, string>(Object.values(SKILL_TABLE).map((r) => [r.command_ja, r.command_en]))

/** 技のコマンドの表記（今の言語）。日本語の表記（弱・強・ガード・方向を「＋」でつないだもの）で引く */
export function commandLabel(commandJa: string): string {
  if (!commandJa) return ''
  return tr({ ja: commandJa, en: COMMAND_EN.get(commandJa) ?? '' })
}

/** 技の性質の英語（skill.csv の attrs の日本語ごと） */
const ATTR_EN: Record<string, string> = {
  吹き飛ばす: 'Blow Away',
  当て身投げ: 'Strike Throw',
  打撃投げ: 'Grapple Throw',
  投げ: 'Throw',
  攻撃を受けてものけぞらない: 'No Knockback When Attacked',
  特定の武器でしか使えない: 'Only Usable With Specific Weapon(s)',
  浮かせる: 'Lift',
  防御不可能: 'Unblockable',
  防御崩し: 'Defense Break',
}

/** 技の性質（今の言語） */
export const skillAttrLabel = (attrJa: string): string => tr({ ja: attrJa, en: ATTR_EN[attrJa] ?? '' })

/** 習得条件（今の言語） */
export const condLabel = (s: Pick<SheetSkill, 'condJa' | 'condEn'>): string => tr({ ja: s.condJa, en: s.condEn })

/** 技の表の技 1 つ。next はこの技に続けて出す技 */
export type SkillTreeNode = {
  /** 識別子（根からの技の番号の並び）。同じ技が複数の技の下に出るので技の番号だけでは重なる */
  key: string
  skill: SheetSkill
  /** 上位技のとき、元の技（parent）の番号 */
  upgradeOf: number | null
  next: SkillTreeGroup[]
}

/** 元の技と、その上位技（parent でつながる技。覚えると元の技の状態が 2 になる）のまとまり。上位技がなければ 1 つだけ */
export type SkillTreeGroup = { key: string; members: SkillTreeNode[] }

/**
 * 技の表の技を、続けて出す技（同じ技の表にある stance-skill.csv の prev）の木に並べる 🟢（datatable/sect）。
 * 上位技（parent）は元の技と同じまとまりに、元の技のすぐ後ろに入れる（上位技の上位技も続ける）。
 * 前に出す技が複数ある技は、それぞれの技の下に出す（続く技も一緒に繰り返す）。同じ技に続く技の上位技は、元の技のまとまりにだけ出す。
 * 前に出す技も元の技もない技は、技の番号順に根として並べる。
 */
export function sheetSkillTree(sheet: SkillSheet): SkillTreeGroup[] {
  const nos = new Set(sheet.skills.map((s) => s.skillNo))
  const prevOf = new Map(
    sheet.skills.map((s) => [
      s.skillNo,
      (findStanceSkill(sheet.stance, s.skillNo)?.prev ?? []).filter((p) => nos.has(p) && p !== s.skillNo),
    ]),
  )
  const parentOf = (s: SheetSkill) => (s.parent !== null && s.parent !== s.skillNo && nos.has(s.parent) ? s.parent : null)
  const upgrades = (no: number) => sheet.skills.filter((s) => parentOf(s) === no)
  // 続けて出す技のうち、ほかの続けて出す技の上位技は、その技のまとまりに入るので別に並べない
  const followers = (no: number) => {
    const all = sheet.skills.filter((s) => prevOf.get(s.skillNo)!.includes(no))
    const nosOf = new Set(all.map((s) => s.skillNo))
    const underSibling = (s: SheetSkill) => {
      const seen = new Set<number>()
      for (let p = parentOf(s); p !== null && !seen.has(p); p = parentOf(sheet.skills.find((x) => x.skillNo === p)!)) {
        if (nosOf.has(p)) return true
        seen.add(p)
      }
      return false
    }
    return all.filter((s) => !underSibling(s))
  }

  const shown = new Set<number>()
  // path は根からの技の番号。輪になるつながり（データにはないが念のため）はたどらない
  const node = (s: SheetSkill, path: number[], upgradeOf: number | null): SkillTreeNode => {
    shown.add(s.skillNo)
    const p = [...path, s.skillNo]
    return {
      key: p.join('-'),
      skill: s,
      upgradeOf,
      next: followers(s.skillNo)
        .filter((c) => !p.includes(c.skillNo))
        .map((c) => group(c, p)),
    }
  }
  const group = (s: SheetSkill, path: number[]): SkillTreeGroup => {
    const members: SkillTreeNode[] = []
    const add = (m: SheetSkill, upgradeOf: number | null, seen: number[]) => {
      members.push(node(m, path, upgradeOf))
      for (const u of upgrades(m.skillNo)) if (!seen.includes(u.skillNo)) add(u, m.skillNo, [...seen, u.skillNo])
    }
    add(s, null, [...path, s.skillNo])
    return { key: [...path, s.skillNo].join('-'), members }
  }

  const roots: SkillTreeGroup[] = []
  for (const s of sheet.skills) {
    if (parentOf(s) === null && prevOf.get(s.skillNo)!.length === 0) roots.push(group(s, []))
  }
  // つながりをたどると輪になって根に届かない技は根として足す
  for (const s of sheet.skills) if (!shown.has(s.skillNo)) roots.push(group(s, []))
  return roots
}

/**
 * 構えのすべての技を 1 つの技の表の形にしたもの（技の画面で sheetSkillTree に渡す。id は −1 − 構え）。
 * 上位技の元（parent）は、その構えの技の表のどれかにある値を使う 🟢（datatable/sect）。習得条件・段は技の表ごとに違うので持たない
 */
export function stanceSkillSheet(stance: number): SkillSheet {
  const sheets = SKILL_SHEETS.filter((s) => s.stance === stance)
  const parentOf = (no: number): number | null =>
    sheets.flatMap((sh) => sh.skills).find((s) => s.skillNo === no && s.parent !== null)?.parent ?? null
  return {
    id: -1 - stance,
    stance,
    nameJa: findStance(stance)?.nameJa ?? '',
    skills: stanceSkills(stance).map((s) => ({
      sheet: -1 - stance,
      skillNo: s.skillNo,
      skillId: s.skillId,
      nameJa: s.nameJa,
      nameEn: s.nameEn,
      cond: 0,
      condJa: '',
      condEn: '',
      rank: -1,
      points: findSkillInfo(s.skillId)?.points ?? 0,
      parent: parentOf(s.skillNo),
    })),
  }
}
