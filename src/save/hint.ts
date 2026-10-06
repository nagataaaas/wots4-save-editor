// 次のイベントのヒント。出典：docs/save_format/chunks/hint（sample/S4-DATA_01 copy 3〜6、[U] 2026-10-06）。
//
//   0x3900 u16  🔶 ヒントの番号。ヒントの出ている3件で、3件とも違う値になった（ほかに3件とも違ったのは時間・所持金などだけ）
//               01 copy 4＝3（ヒント：琴吹光探検隊、添字7）、copy 5＝6（阿片密売を阻止せよ、添字10）、copy 6＝9（西洋医学お断り、添字13）。
//               この3件は「値＋4＝添字」だが、前の差分には合わない値がある（阿弥浜港争乱の直後 83、嵐の後のあと 89、
//               1日目夜のイベントのあと 8・9・10 など）。イベントの添字とは別の、ヒントの番号の表と考えている ❓
//               03 copy 7（寝て5日目にした）だけ 0xFFFF（🔶 ヒントなし）
//   ✅ [U] 2026-10-06：2日目昼のセーブで書き換えるとヒントの文が変わった。6＝「港の様子でも見てみるか」、
//               7・13・18＝「さて どうしたものか」（ヒントなし）。「値＋4＝添字」では説明しにくく、値と文の対応は ❓
//   値と文の対応が分かるまで、生の値の欄として出す（[U] 2026-10-06 の要望）。
//
// ❓ U-1 判定待ちのため [TS] の固定オフセット（案A）の位置で読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU16, writeU16 } from "./binary";
import { checkLayout } from "./hero";

export const HINT_OFFSET = 0x3900;

/** 🔶 ヒントなしと推定している値（03 copy 7） */
export const HINT_NONE = 0xffff;

/** 実セーブで見た値（chunks/hint の調査記録の差分）。これ以外の値は警告する */
export const HINT_SEEN_VALUES: readonly number[] = [2, 3, 5, 6, 8, 9, 10, 78, 83, 86, 88, 89, HINT_NONE];

/** 通常モードで書ける上限。見た値（0xFFFF を除く）は 89 まで。0〜255 と 0xFFFF を許す */
export const HINT_NORMAL_MAX = 0xff;

export type HintView = {
  value: number;
  /** 見たことのない値なら理由。編集はできる */
  warning: string | null;
  /** 妥当性検証に落ちた理由。null なら編集可能 */
  problem: string | null;
};

function warningFor(value: number): string | null {
  return HINT_SEEN_VALUES.includes(value) ? null : `実セーブで見たことのない値です（${value}）`;
}

export function readHint(bytes: Uint8Array): HintView {
  if (bytes.byteLength < HINT_OFFSET + 2) throw new RangeError("ファイルが小さすぎてヒントを読めません");
  const value = readU16(bytes, HINT_OFFSET);
  return { value, warning: warningFor(value), problem: checkLayout(bytes) };
}

/** 通常モードは 0〜255 と 0xFFFF、上級者モードは任意の u16。問題がなければ null */
export function validateHint(value: number, opts: { advanced: boolean }): string | null {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) return `u16 の範囲外です: ${value}`;
  if (!opts.advanced && value > HINT_NORMAL_MAX && value !== HINT_NONE)
    return `通常モードでは 0〜${HINT_NORMAL_MAX} か 65535（0xFFFF）を指定してください: ${value}`;
  return null;
}

/** 0x3900 の2バイトだけを書く */
export function writeHint(bytes: Uint8Array, value: number, opts: { advanced: boolean }): void {
  const view = readHint(bytes);
  if (view.problem) throw new RangeError(view.problem);
  const error = validateHint(value, opts);
  if (error) throw new RangeError(error);
  writeU16(bytes, HINT_OFFSET, value);
}
