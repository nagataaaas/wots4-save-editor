// 町の人（店主など）の状態の候補 0x0100〜0x04BF（960 B）を、生の値で編集する。出典：解析ノート §9.6（[U] 2026-10-06）。
//
// ほとんど 0 の u8 の並びで、ところどころに 0 以外がある。🔶 町の人ごとの状態の表と考えている
// （「店主の生死や好感度は周回ごとにリセットされる」§9.6）。1人あたりのバイト数・並び順は ❓。
//
//   0x02C4  🔶 寿司屋の店主。0 → 1 で死亡（sample/S4-DATA_02 copy 4 → copy 5。差分1回）
//   0x0444  🔶 鍛冶屋のおやじ（堂島ではない）。0 → 1 で死亡（S4-DATA_02 copy 3 → copy 4。差分1回）。S4-DATA_03 も 1
//   0x0127  ❓ 鍛冶屋のおやじから踏み倒すと 0 → 0x6E（110）（copy 2 → copy 3）。S4-DATA_03 は 1
//   0x0133  ❓ 海兵隊の横暴（居酒屋）で成否によらず 0 → 1（§3.5）
//   ほかに 0x012C・0x0130〜0x0132・0x01E0・0x0258 で 1 を見た（意味は ❓）
// 書き換えの効果はどれも未確認（要ゲーム内確認）。意味が分かるまで生の値の欄として出す（AGENTS.md「未確認データの扱い」）。
//
// ❓ U-1 判定待ちのため [TS] の固定オフセット（案A）の位置で読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU8, writeU8 } from "./binary";
import { checkLayout } from "./hero";

export const TOWNSFOLK_START = 0x0100;
export const TOWNSFOLK_END = 0x04bf;
export const TOWNSFOLK_LENGTH = TOWNSFOLK_END - TOWNSFOLK_START + 1;

/** 通常モードで新しく書ける上限。0／1 のフラグとして扱う（今の値と同じ値の書き戻しは許す） */
export const TOWNSFOLK_NORMAL_MAX = 1;

/** 差分で何か分かっているバイトの説明 */
export const TOWNSFOLK_NOTES: Readonly<Record<number, { name?: string; note: string }>> = {
  0x0127: {
    name: "鍛冶屋の踏み倒し？",
    note: "❓ 鍛冶屋のおやじから踏み倒すと 0 → 110（0x6E）。別の周回では 1。踏み倒しの回数は 0x0B58（u32、この範囲の外）も +1 になった",
  },
  0x012c: { note: "❓ 多くのセーブで 1" },
  0x0133: { note: "❓ 海兵隊の横暴（居酒屋）で成否によらず 0 → 1" },
  0x02c4: { name: "寿司屋の店主？", note: "🔶 殺すと 0 → 1（1回だけ確認）。書き換えの効果は未確認" },
  0x0444: {
    name: "鍛冶屋のおやじ？",
    note: "🔶 殺すと 0 → 1（1回だけ確認。堂島ではない）。書き換えの効果は未確認",
  },
};

export type TownsfolkView = {
  values: number[];
  problem: string | null;
};

export function readTownsfolk(bytes: Uint8Array): TownsfolkView {
  if (bytes.byteLength <= TOWNSFOLK_END) throw new RangeError("ファイルが小さすぎて町の人の状態を読めません");
  const values = Array.from({ length: TOWNSFOLK_LENGTH }, (_, i) => readU8(bytes, TOWNSFOLK_START + i));
  return { values, problem: checkLayout(bytes) };
}

/**
 * 通常モードは 0・1 と、今の値と同じ値（書き戻し）だけ。上級者モードは任意の u8。問題がなければ null
 */
export function validateTownsfolk(
  value: number,
  current: number,
  opts: { advanced: boolean },
): string | null {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) return `u8 の範囲外です: ${value}`;
  if (!opts.advanced && value > TOWNSFOLK_NORMAL_MAX && value !== current)
    return `通常モードでは 0 か 1 を指定してください: ${value}`;
  return null;
}

/** offset の1バイトだけを書く */
export function writeTownsfolk(
  bytes: Uint8Array,
  offset: number,
  value: number,
  opts: { advanced: boolean },
): void {
  const view = readTownsfolk(bytes);
  if (view.problem) throw new RangeError(view.problem);
  if (!Number.isInteger(offset) || offset < TOWNSFOLK_START || offset > TOWNSFOLK_END)
    throw new RangeError(`範囲外のオフセットです: 0x${offset.toString(16)}`);
  const error = validateTownsfolk(value, readU8(bytes, offset), opts);
  if (error) throw new RangeError(error);
  writeU8(bytes, offset, value);
}
