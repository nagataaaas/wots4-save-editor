// 銘・魅力のゲーム内の効果（表示用）。
// ✅ 出典は [W] 侍道4攻略@wiki「鍛冶屋」（https://w.atwiki.jp/samuraidou4/pages/20.html、2026-10-04 更新版）の
// 「銘一覧」と「魅力」の表。Steam版のゲーム内では未確認だが、確定として扱う（ユーザー判断 2026-10-05）。
// 文言は日本語と英語を並べて持ち、返すときに tr() で今の言語にする（モジュールの読み込み時に言語を決めない）
import { tr, type Localized } from '@/lib/i18n'
import { CHARMS, countCharms } from './weapon'

export type TitleEffect = { effect: string; note?: string }

const attack = (n: number): Localized => ({ ja: `攻撃力 +${n}`, en: `Strength +${n}` })
const durability = (pct: number): Localized => ({ ja: `耐久度の減少量 −${pct}%`, en: `Durability loss −${pct}%` })
const iron = (n: number): Localized => ({ ja: `抽出時の鉄ポイント +${n}`, en: `Iron pts. +${n} when extracting` })
const tsuma = (pct: number): Localized => ({
  ja: `つま斬り時の攻撃力 +${pct}%`,
  en: `Strength during Spring Harvest +${pct}%`,
})

/** 銘の番号 → 効果。番号は WEAPON_TITLES（datatable/weapon/title.csv）と同じ */
const TITLE_EFFECTS: Record<number, Localized> = {
  0x00: attack(25),
  0x01: attack(50),
  0x02: attack(75),
  0x03: attack(120),
  0x04: attack(250),
  0x05: durability(10),
  0x06: durability(25),
  0x07: durability(50),
  0x08: durability(75),
  0x09: {
    ja: '耐久度の減少量 −100%（壊れない。常に刀油を使っている状態）',
    en: 'Durability loss −100% (never breaks, as if Blade Oil were always in effect)',
  },
  0x0a: iron(1),
  0x0b: iron(2),
  0x0c: iron(3),
  0x0d: iron(6),
  0x0e: iron(10),
  0x0f: tsuma(20),
  0x10: tsuma(50),
  0x11: tsuma(100),
  0x12: tsuma(150),
  0x13: tsuma(250),
}

/**
 * 斬殺数の銘（人斬り〜猟奇守）の注意。銘を付けた時点で攻撃力の値に加算され、外すと減る。
 * 🔶 エディタで銘だけを書き換えても、攻撃力の値（+0x16）は変わらない。ゲーム内でどう扱われるかは要ゲーム内確認
 */
const ATTACK_TITLE_NOTE: Localized = {
  ja: '付けたときに攻撃力の値へ加算され、外すと減る。ここで銘だけ書き換えても攻撃力の値は変わらない',
  en: 'Added to Strength when the signature is applied and taken off when it is removed. Changing only the signature here does not change Strength.',
}
/** つま斬りの銘（剃刀〜散華）は、二刀流では両方の武器に効く */
const TSUMA_TITLE_NOTE: Localized = { ja: '二刀流では両方の武器に効く', en: 'With Dual Arms, it works on both weapons.' }

export function titleEffect(no: number | null): TitleEffect | null {
  if (no === null) return null
  const e = TITLE_EFFECTS[no]
  if (!e) return null
  const effect = tr(e)
  if (no <= 0x04) return { effect, note: tr(ATTACK_TITLE_NOTE) }
  if (no >= 0x0f) return { effect, note: tr(TSUMA_TITLE_NOTE) }
  return { effect }
}

type CharmDef = { summary: Localized; amounts: readonly [Localized, Localized, Localized] | null }

/** 日本語と英語で同じ効果量 */
const same = (s: string): Localized => ({ ja: s, en: s })
const chance = (pct: number): Localized => ({ ja: `確率 ${pct}%`, en: `${pct}% chance` })

/** 魅力ID → 効果。amounts は 1個・2個・3個のときの効果量（数値がない魅力は null） */
const CHARM_EFFECTS: Record<number, CharmDef> = {
  0: {
    summary: {
      ja: '命が0になっても耐えることがある（復活時の命は250）',
      en: 'May survive when HP drops to 0 (revives with 250 HP)',
    },
    amounts: [chance(40), chance(55), chance(70)],
  },
  1: {
    summary: { ja: '夜の時間帯に攻撃力が上がる', en: 'Raises Strength at night' },
    amounts: [same('+100'), same('+250'), same('+400')],
  },
  2: {
    summary: { ja: '昼の時間帯に攻撃力が上がる', en: 'Raises Strength in the daytime' },
    amounts: [same('+100'), same('+250'), same('+400')],
  },
  3: {
    summary: { ja: 'お金袋の獲得金額が増える', en: 'Increases the money from Money Bags' },
    amounts: [
      { ja: '2.5倍', en: '×2.5' },
      { ja: '4倍', en: '×4' },
      { ja: '6倍', en: '×6' },
    ],
  },
  4: {
    summary: { ja: '静止していると活力が回復する', en: 'Restores Vitality while standing still' },
    amounts: [
      { ja: '1秒に 30', en: '30 per second' },
      { ja: '1秒に 60', en: '60 per second' },
      { ja: '1秒に 180', en: '180 per second' },
    ],
  },
  // 個数が多いほどステップの受付が早くなるが、数値はない
  5: {
    summary: {
      ja: '防御を崩されたときの隙をステップでキャンセルできる',
      en: 'Lets you cancel the opening after your guard is broken with a step',
    },
    amounts: null,
  },
  // Wiki は「1個:250、2個:350、3個:500」とだけ書いている。上げ幅と下げ幅は同じとする（ユーザー判断 2026-10-05）
  6: {
    summary: {
      ja: '命30%以下で攻撃力が上がり、命70%以上で下がる',
      en: 'Raises Strength at 30% HP or less and lowers it at 70% HP or more',
    },
    amounts: [same('±250'), same('±350'), same('±500')],
  },
  7: {
    summary: { ja: '相手の投げ属性の技を無効にする', en: "Nullifies the opponent's throw moves" },
    amounts: [chance(55), chance(65), chance(85)],
  },
  8: {
    summary: { ja: '武器の耐久度の減少量が下がる', en: 'Reduces weapon durability loss' },
    amounts: [
      { ja: '35%減', en: '−35%' },
      { ja: '55%減', en: '−55%' },
      { ja: '75%減', en: '−75%' },
    ],
  },
  9: {
    summary: {
      ja: '特定の技（主に打撃・崩し属性）の威力が上がる',
      en: 'Raises the power of certain moves (mainly strikes and guard breaks)',
    },
    amounts: [same('+270'), same('+360'), same('+450')],
  },
}

export type CharmEffect = { id: number; label: string; count: number; summary: string; amount: string | null }

/**
 * 個数分に展開した魅力（readWeapon の charms.value）を魅力ごとにまとめ、効果を返す。並びは最初に出てきた順。
 * 個数が 4 以上・未知の ID は、効果が分からないので amount を null にする
 */
export function charmEffects(charms: readonly (number | null)[]): CharmEffect[] {
  return countCharms(charms).map(({ id, count }) => {
    const label = CHARMS.find((c) => c.id === id)?.label ?? tr({ ja: '未知', en: 'Unknown' })
    const def = CHARM_EFFECTS[id]
    if (!def) return { id, label, count, summary: tr({ ja: '効果は不明', en: 'Effect unknown' }), amount: null }
    const amount = def.amounts && count >= 1 && count <= 3 ? tr(def.amounts[count - 1]) : null
    return { id, label, count, summary: tr(def.summary), amount }
  })
}
