// 銘・魅力のゲーム内の効果（表示用）。
// ✅ 出典は [W] 侍道4攻略@wiki「鍛冶屋」（https://w.atwiki.jp/samuraidou4/pages/20.html、2026-10-04 更新版）の
// 「銘一覧」と「魅力」の表。Steam版のゲーム内では未確認だが、確定として扱う（ユーザー判断 2026-10-05）。
import { CHARMS } from './weapon'

export type TitleEffect = { effect: string; note?: string }

/** 銘の番号 → 効果。番号は TITLES（datatable/weapon/title.csv）と同じ */
const TITLE_EFFECTS: Record<number, TitleEffect> = {
  0x00: { effect: '攻撃力 +25' },
  0x01: { effect: '攻撃力 +50' },
  0x02: { effect: '攻撃力 +75' },
  0x03: { effect: '攻撃力 +120' },
  0x04: { effect: '攻撃力 +250' },
  0x05: { effect: '耐久度の減少量 −10%' },
  0x06: { effect: '耐久度の減少量 −25%' },
  0x07: { effect: '耐久度の減少量 −50%' },
  0x08: { effect: '耐久度の減少量 −75%' },
  0x09: { effect: '耐久度の減少量 −100%（壊れない。常に刀油を使っている状態）' },
  0x0a: { effect: '抽出時の鉄ポイント +1' },
  0x0b: { effect: '抽出時の鉄ポイント +2' },
  0x0c: { effect: '抽出時の鉄ポイント +3' },
  0x0d: { effect: '抽出時の鉄ポイント +6' },
  0x0e: { effect: '抽出時の鉄ポイント +10' },
  0x0f: { effect: 'つま斬り時の攻撃力 +20%' },
  0x10: { effect: 'つま斬り時の攻撃力 +50%' },
  0x11: { effect: 'つま斬り時の攻撃力 +100%' },
  0x12: { effect: 'つま斬り時の攻撃力 +150%' },
  0x13: { effect: 'つま斬り時の攻撃力 +250%' },
}

/**
 * 斬殺数の銘（人斬り〜猟奇守）の注意。銘を付けた時点で攻撃力の値に加算され、外すと減る。
 * 🔶 エディタで銘だけを書き換えても、攻撃力の値（+0x16）は変わらない。ゲーム内でどう扱われるかは要ゲーム内確認
 */
const ATTACK_TITLE_NOTE = '付けたときに攻撃力の値へ加算され、外すと減る。ここで銘だけ書き換えても攻撃力の値は変わらない（要ゲーム内確認）'
/** つま斬りの銘（剃刀〜散華）は、二刀流では両方の武器に効く */
const TSUMA_TITLE_NOTE = '二刀流では両方の武器に効く'

export function titleEffect(no: number | null): TitleEffect | null {
  if (no === null) return null
  const e = TITLE_EFFECTS[no]
  if (!e) return null
  if (no <= 0x04) return { ...e, note: ATTACK_TITLE_NOTE }
  if (no >= 0x0f) return { ...e, note: TSUMA_TITLE_NOTE }
  return e
}

type CharmDef = { summary: string; amounts: readonly [string, string, string] | null }

/** 魅力ID → 効果。amounts は 1個・2個・3個のときの効果量（数値がない魅力は null） */
const CHARM_EFFECTS: Record<number, CharmDef> = {
  0: { summary: '命が0になっても耐えることがある（復活時の命は250）', amounts: ['確率 40%', '確率 55%', '確率 70%'] },
  1: { summary: '夜の時間帯に攻撃力が上がる', amounts: ['+100', '+250', '+400'] },
  2: { summary: '昼の時間帯に攻撃力が上がる', amounts: ['+100', '+250', '+400'] },
  3: { summary: 'お金袋の獲得金額が増える', amounts: ['2.5倍', '4倍', '6倍'] },
  4: { summary: '静止していると活力が回復する', amounts: ['1秒に 30', '1秒に 60', '1秒に 180'] },
  // 個数が多いほどステップの受付が早くなるが、数値はない
  5: { summary: '防御を崩されたときの隙をステップでキャンセルできる', amounts: null },
  // Wiki は「1個:250、2個:350、3個:500」とだけ書いている。上げ幅と下げ幅は同じとする（ユーザー判断 2026-10-05）
  6: { summary: '命30%以下で攻撃力が上がり、命70%以上で下がる', amounts: ['±250', '±350', '±500'] },
  7: { summary: '相手の投げ属性の技を無効にする', amounts: ['確率 55%', '確率 65%', '確率 85%'] },
  8: { summary: '武器の耐久度の減少量が下がる', amounts: ['35%減', '55%減', '75%減'] },
  9: { summary: '特定の技（主に打撃・崩し属性）の威力が上がる', amounts: ['+270', '+360', '+450'] },
}

export type CharmEffect = { id: number; label: string; count: number; summary: string; amount: string | null }

/**
 * 個数分に展開した魅力（readWeapon の charms.value）を魅力ごとにまとめ、効果を返す。並びは最初に出てきた順。
 * 個数が 4 以上・未知の ID は、効果が分からないので amount を null にする
 */
export function charmEffects(charms: readonly (number | null)[]): CharmEffect[] {
  const counts = new Map<number, number>()
  for (const c of charms) if (c !== null) counts.set(c, (counts.get(c) ?? 0) + 1)
  return [...counts].map(([id, count]) => {
    const label = CHARMS.find((c) => c.id === id)?.label ?? `未知（${id}）`
    const def = CHARM_EFFECTS[id]
    if (!def) return { id, label, count, summary: '効果は不明', amount: null }
    const amount = def.amounts && count >= 1 && count <= 3 ? def.amounts[count - 1] : null
    return { id, label, count, summary: def.summary, amount }
  })
}

