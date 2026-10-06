// 隠しルートのフラグの候補を含む 0x378D〜0x37AA（30 B）を、生の値で編集する。出典：[U] 2026-10-06 の比較（解析ノート §9.5）。
//
// 比べたセーブ：
//   sample/S4-DATA_00                阿弥浜港争乱で大砲の般若党を倒し、三姉妹見参（イベント添字70＝04）で隠しルートに入った直後（1日目夕）
//   sample/S4-DATA_01・copy〜copy 6  阿弥浜港争乱のあと通常ルート
//   sample/S4-DATA_03                別の周回の4日目（通常ルート）
// フラグ列 0x374E〜0x3837 のうち、00 だけがほかのどのセーブとも違う値だったのは 0x378D・0x378E・0x379F・0x37AA の4バイト。
//
//   0x378D  🔶 00＝02、ほかはすべて 01。剣術大会以後のルート分岐 0x3789〜0x378C のすぐ後ろ。ルートの種類（01 通常／02 隠し）か
//   0x378E  ✅ [U] 2026-10-06 隠しルートのフラグ（1＝隠しルート）。00 で 0 にすると通常ルートに入った。
//              ただし 1 だけでは足りない：01 copy で 1 にしても通常ルートのまま。三姉妹見参（A 添字70）を 04 にしたうえで 1 にすると
//              隠しルートに入り、お早い到着が起きた。お早い到着より後のイベントは起きなかった（足りない条件は ❓）。
//              三姉妹見参を 04 にしただけ（0x378E＝0）では通常ルートのまま
//   0x3793  ❓ 海兵隊の横暴に成功したときだけ 0 → 1（2回再現。§3.5）
//   0x3799  ❓ 03 だけ 1
//   0x379F  ❓ 00 だけ 1
//   0x37A2  ❓ 大寄せで 0 → 2。0 にしても門は変わらなかった（§3.5）
//   0x37AA  🔶 00＝02、01 系＝01、03＝00。阿弥浜港争乱の進み方（スキップ／通常／三姉妹見参）か
// [U] 2026-10-06：01 copy で 0x378D＝2・0x379F＝1・0x37AA＝2（0x3799＝1 の組み合わせも）を 0x378E と一緒に書いても、
// 0x378E だけのときと結果は変わらなかった。この3つ（と 0x3799）は、隠しルートに入ることにもお早い到着の後にも効いていない。
// 0x378E 以外の意味は未確認（要ゲーム内確認）。確定するまで生の値の欄として出す（AGENTS.md「未確認データの扱い」）。
//
// ❓ U-1 判定待ちのため [TS] の固定オフセット（案A）の位置で読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU8, writeU8 } from "./binary";
import { checkLayout } from "./hero";

export const ROUTE_CANDIDATE_START = 0x378d;
export const ROUTE_CANDIDATE_END = 0x37aa;
export const ROUTE_CANDIDATE_LENGTH = ROUTE_CANDIDATE_END - ROUTE_CANDIDATE_START + 1;

/** 通常モードで書ける上限。実セーブで見た値は 0〜2 */
export const ROUTE_CANDIDATE_NORMAL_MAX = 2;

/** 差分で何か分かっているバイトの説明。ないバイトは全セーブで 0 */
export const ROUTE_CANDIDATE_NOTES: Readonly<Record<number, string>> = {
  0x378d:
    "❓ 隠しルート直後のセーブだけ 02、ほかはすべて 01。02 にしても隠しルートには入らなかった",
  0x378e:
    "✅ 隠しルートのフラグ（1＝隠しルート）。0 にすると通常ルートに戻る。入るには三姉妹見参（添字70）の成功（04）も要る。それでもお早い到着より後のイベントは起きなかった",
  0x3793: "❓ 海兵隊の横暴に成功したときだけ 0 → 1（2回再現）",
  0x3799: "❓ 施設が変わった別周回（4日目）のセーブだけ 1",
  0x379f: "❓ 隠しルート直後のセーブだけ 1。1 にしても隠しルートには効かなかった",
  0x37a2: "❓ 大寄せで 0 → 2。0 にしても門は変わらなかった",
  0x37aa:
    "❓ 隠しルート直後＝02、阿弥浜港争乱のあと通常ルート＝01、別周回の4日目＝00。02 にしても隠しルートには効かなかった",
};

export type RouteCandidatesView = {
  values: number[];
  /** 見たことのない値があれば理由。編集はできる */
  warning: string | null;
  problem: string | null;
};

export function readRouteCandidates(bytes: Uint8Array): RouteCandidatesView {
  if (bytes.byteLength <= ROUTE_CANDIDATE_END) throw new RangeError("ファイルが小さすぎてフラグを読めません");
  const values = Array.from({ length: ROUTE_CANDIDATE_LENGTH }, (_, i) =>
    readU8(bytes, ROUTE_CANDIDATE_START + i),
  );
  const bad = values.findIndex((v) => v > ROUTE_CANDIDATE_NORMAL_MAX);
  const warning =
    bad >= 0
      ? `0x${(ROUTE_CANDIDATE_START + bad).toString(16).toUpperCase()} に実セーブで見たことのない値があります（${values[bad]}）`
      : null;
  return { values, warning, problem: checkLayout(bytes) };
}

/** 通常モードは 0〜2、上級者モードは任意の u8。問題がなければ null */
export function validateRouteCandidate(value: number, opts: { advanced: boolean }): string | null {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) return `u8 の範囲外です: ${value}`;
  if (!opts.advanced && value > ROUTE_CANDIDATE_NORMAL_MAX)
    return `通常モードでは 0〜${ROUTE_CANDIDATE_NORMAL_MAX} を指定してください: ${value}`;
  return null;
}

/** offset の1バイトだけを書く */
export function writeRouteCandidate(
  bytes: Uint8Array,
  offset: number,
  value: number,
  opts: { advanced: boolean },
): void {
  const view = readRouteCandidates(bytes);
  if (view.problem) throw new RangeError(view.problem);
  if (offset < ROUTE_CANDIDATE_START || offset > ROUTE_CANDIDATE_END)
    throw new RangeError(`範囲外のオフセットです: 0x${offset.toString(16)}`);
  const error = validateRouteCandidate(value, opts);
  if (error) throw new RangeError(error);
  writeU8(bytes, offset, value);
}
