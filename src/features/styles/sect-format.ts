import type { ParseResult } from "@/components/field-row";

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** 技の状態の表示 🟢（chunks/skill-states） */
export const STATE_LABELS: Record<number, string> = {
  0: "未習得",
  1: "習得",
  2: "習得（派生先あり）",
  3: "習得（俺流には未組み込み）",
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
