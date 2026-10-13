import type { ParseResult } from "@/components/field-row";
import { parseInteger } from "@/lib/parse";

/** 技の状態の表示 🟢（chunks/skill-states）。2（上位技を覚えた元の技）は 1 と同じ表示にし、上位技との関係は技の並びで示す */
export const STATE_LABELS: Record<number, string> = {
  0: "未習得",
  1: "習得済",
  2: "習得済",
  3: "習得済（俺流には未組み込み）",
};

/** min〜max の整数を読む入力欄の parse */
export function parseIntegerInRange(min: number, max: number) {
  return (input: string): ParseResult<number> =>
    parseInteger(input, (v) => (v < min || v > max ? `${min}〜${max} の範囲で入力してください` : null));
}

/** 固有技の属性の名前 🟢（datatable/sect/skill.csv） */
export const UNIQUE_WEAPON_ATTR = "特定の武器でしか使えない";

/** 属性の表示名（固有技は「固有技」、ほかは元の名前） */
export const attrLabel = (a: string): string => (a === UNIQUE_WEAPON_ATTR ? "固有技" : a);

/** 構えのタブの見た目。押せる枠に見えるように、選んでいない構えも枠と背景を付け、選んだ構えは塗りつぶす */
export const STANCE_TAB_CLASS =
  "border-border bg-background text-foreground not-data-active:hover:border-foreground/40 not-data-active:hover:bg-accent data-active:border-primary data-active:bg-primary data-active:text-primary-foreground data-active:hover:text-primary-foreground dark:data-active:border-primary dark:data-active:bg-primary dark:data-active:text-primary-foreground h-8 cursor-pointer px-2.5 shadow-xs";

/** 技の一覧の並べ方の説明（流派・技・俺流の画面で共通） */
export const SKILL_TREE_DESCRIPTION =
  "続けて出す技は字下げして並べます（前の技が複数ある技は、それぞれの下に出します）。上位技（⇧）は元の技と左の帯でまとめます。";
