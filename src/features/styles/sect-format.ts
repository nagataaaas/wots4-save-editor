import type { ParseResult } from "@/components/field-row";
import { tr, type Localized } from "@/lib/i18n";
import { parseInteger } from "@/lib/parse";
import { SLOT_LABELS, STANCES, skillAttrLabel } from "@/save/master/sect-data";
import { SKILL_STATE, type SkillState } from "@/save/sects";

/** 技の状態の表示 🟢（chunks/skill-states）。上位技を覚えた元の技（learnedParent）は習得済と同じ表示にし、上位技との関係は技の並びで示す */
export const STATE_LABELS: Record<SkillState, Localized> = {
  [SKILL_STATE.notLearned]: { ja: "未習得", en: "Not learned" },
  [SKILL_STATE.learned]: { ja: "習得済", en: "Learned" },
  [SKILL_STATE.learnedParent]: { ja: "習得済", en: "Learned" },
  [SKILL_STATE.notInOreRyu]: { ja: "習得済（俺流には未組み込み）", en: "Learned (not yet usable in My Style)" },
};

/** 技の状態の表示（今の言語） */
export const stateLabel = (state: SkillState): string => tr(STATE_LABELS[state]);

/** 表にない状態の値か（STATE_LABELS を引く前の絞り込み） */
export const isKnownState = (state: number): state is SkillState => Object.hasOwn(STATE_LABELS, state);

/** 検証に落ちたセーブで、値の欄に出す理由（詳しい理由はページの上のバナーに出ている） */
export const readOnlyReason = (): string => tr({ ja: "このセーブでは変更できません", en: "This save cannot be changed" });

/** min〜max の整数を読む入力欄の parse */
export function parseIntegerInRange(min: number, max: number) {
  return (input: string): ParseResult<number> =>
    parseInteger(input, (v) =>
      v < min || v > max ? tr({ ja: `${min}〜${max} の範囲で入力してください`, en: `Enter a value from ${min} to ${max}` }) : null,
    );
}

/** 固有技の属性の名前 🟢（datatable/sect/skill.csv）。属性の値（日本語のキー）で、画面には skillAttrLabel で出す */
export const UNIQUE_WEAPON_ATTR = "特定の武器でしか使えない";

/** 属性の表示名（固有技は「固有技」、ほかは元の名前。今の言語） */
export const attrLabel = (a: string): string =>
  a === UNIQUE_WEAPON_ATTR ? tr({ ja: "固有技", en: "Unique move" }) : skillAttrLabel(a);

/** 構えのタブの見た目。押せる枠に見えるように、選んでいない構えも枠と背景を付け、選んだ構えは塗りつぶす */
export const STANCE_TAB_CLASS =
  "border-border bg-background text-foreground not-data-active:hover:border-foreground/40 not-data-active:hover:bg-accent data-active:border-primary data-active:bg-primary data-active:text-primary-foreground data-active:hover:text-primary-foreground dark:data-active:border-primary dark:data-active:bg-primary dark:data-active:text-primary-foreground h-8 cursor-pointer px-2.5 shadow-xs";

/** 技の一覧の並べ方の説明（流派・技・俺流の画面で共通） */
export const skillTreeDescription = (): string =>
  tr({
    ja: "続けて出す技は字下げして並べます（前の技が複数ある技は、それぞれの下に出します）。上位技（⇧）は元の技と左の帯でまとめます。",
    en: "Follow-up moves are indented (a move with several preceding moves appears under each of them). Upgraded moves (⇧) are grouped with their base move by the bar on the left.",
  });

/** 構えを並べる段：刀の構え（構えの組 0）と、それ以外（構えの組の順 🟢：槍・無手・拳銃・ライフル・二刀）。key は段の識別子 */
export const STANCE_ROWS: { key: string; label: Localized; stances: typeof STANCES }[] = [
  { key: "sword", label: SLOT_LABELS[0], stances: STANCES.filter((s) => s.slot === 0) },
  {
    key: "other",
    label: { ja: `${SLOT_LABELS[0].ja}以外`, en: "Other" },
    stances: STANCES.filter((s) => s.slot !== 0).toSorted((a, b) => a.slot - b.slot || a.id - b.id),
  },
];
