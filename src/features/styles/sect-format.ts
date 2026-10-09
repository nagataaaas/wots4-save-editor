import type { ParseResult } from "@/components/field-row";

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** 技の状態の表示 🟢（chunks/skill-states）。2（上位技を覚えた元の技）は 1 と同じ表示にし、上位技との関係は技の並びで示す */
export const STATE_LABELS: Record<number, string> = {
  0: "未習得",
  1: "習得済",
  2: "習得済",
  3: "習得済（俺流には未組み込み）",
};

export function parseInteger(min: number, max: number) {
  return (input: string): ParseResult<number> => {
    const t = input.trim();
    if (!/^\d+$/.test(t)) return { ok: false, error: "整数を入力してください" };
    const v = Number(t);
    if (v < min || v > max) return { ok: false, error: `${min}〜${max} の範囲で入力してください` };
    return { ok: true, value: v };
  };
}
