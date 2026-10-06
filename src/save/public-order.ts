// 治安。出典：docs/save_format/chunks/date-location（0x0015）と docs/save_format/README.md §5（治安の仕様）。
//
//   0x0015 u8  🔶 治安の候補。位置は差分から推定しただけで、ゲーム内の表示との照合はしていない（❓ 要ゲーム内確認）。
//              根拠：鍛冶屋のおやじから踏み倒すと 44 → 34（−10）になった（chunks/townsfolk の調査記録 2026-10-06_blacksmith-sushi.md）。
//              sample/ の S4-DATA_01・01 copy・01 copy 2・01 copy 3・02 で 61・59・90・20・72 と、治安の範囲 0〜99 に収まる。
//              1日目のセーブでは 0 の例がある（chunks/date-location の調査記録 2026-10-05_time-of-day.md）。初期値 50 とは合わない ❓
//   治安の仕様（[W]）：0〜99、初期値 50。とても良い 90〜99／良い 70〜89／普通 30〜69／悪い 10〜29／とても悪い 0〜9
//
// 未確認データなので「生の値＋候補の段階」の形で出す（AGENTS.md「未確認データの扱い」）。
// ❓ U-1 判定待ちのため [TS] の固定オフセット（案A）の位置で読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU8, writeU8 } from "./binary";
import { checkLayout } from "./hero";

/** 🔶 治安の候補の位置 */
export const PUBLIC_ORDER_OFFSET = 0x15;

/** [W] 治安の範囲。通常モードはこの範囲だけ、上級者モードは任意の u8 */
export const PUBLIC_ORDER_MAX = 99;

/** [W] 治安の段階（下限の大きい順） */
export const PUBLIC_ORDER_LEVELS: readonly { min: number; label: string }[] = [
  { min: 90, label: "とても良い" },
  { min: 70, label: "良い" },
  { min: 30, label: "普通" },
  { min: 10, label: "悪い" },
  { min: 0, label: "とても悪い" },
];

export type PublicOrderView = {
  value: number;
  /** 🔶 段階の候補。範囲外なら null */
  level: string | null;
  /** 範囲外の値なら理由。編集はできる */
  warning: string | null;
  /** 妥当性検証に落ちた理由。null なら編集可能 */
  problem: string | null;
};

export function publicOrderLevel(value: number): string | null {
  if (value > PUBLIC_ORDER_MAX) return null;
  return PUBLIC_ORDER_LEVELS.find((l) => value >= l.min)?.label ?? null;
}

export function readPublicOrder(bytes: Uint8Array): PublicOrderView {
  if (bytes.byteLength < PUBLIC_ORDER_OFFSET + 1) throw new RangeError("ファイルが小さすぎて治安を読めません");
  const value = readU8(bytes, PUBLIC_ORDER_OFFSET);
  return {
    value,
    level: publicOrderLevel(value),
    warning: value > PUBLIC_ORDER_MAX ? `治安の範囲（0〜${PUBLIC_ORDER_MAX}）を超えています（${value}）` : null,
    problem: checkLayout(bytes),
  };
}

/** 通常モードは 0〜99、上級者モードは任意の u8。問題がなければ null */
export function validatePublicOrder(value: number, opts: { advanced: boolean }): string | null {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) return `u8 の範囲外です: ${value}`;
  if (!opts.advanced && value > PUBLIC_ORDER_MAX)
    return `通常モードでは 0〜${PUBLIC_ORDER_MAX} を指定してください: ${value}`;
  return null;
}

/** 0x0015 の1バイトだけを書く（🔶 位置は推定。❓ 要ゲーム内確認） */
export function writePublicOrder(bytes: Uint8Array, value: number, opts: { advanced: boolean }): void {
  const view = readPublicOrder(bytes);
  if (view.problem) throw new RangeError(view.problem);
  const error = validatePublicOrder(value, opts);
  if (error) throw new RangeError(error);
  writeU8(bytes, PUBLIC_ORDER_OFFSET, value);
}
