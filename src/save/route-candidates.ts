// 隠しルートのフラグ 0x378E と、その周り 0x378D〜0x37AA（30 B）の生の値。出典：[U] 2026-10-06 の比較と書き換え（解析ノート §9.5）。
//
// 比べたセーブ：
//   sample/S4-DATA_00                阿弥浜港争乱で大砲の般若党を倒し、三姉妹見参（イベント添字70＝04）で隠しルートに入った直後（1日目夕）
//   sample/S4-DATA_01・copy〜copy 6  阿弥浜港争乱のあと通常ルート
//   sample/S4-DATA_03                別の周回の4日目（通常ルート）
// フラグ列 0x374E〜0x3837 のうち、00 だけがほかのどのセーブとも違う値だったのは 0x378D・0x378E・0x379F・0x37AA の4バイト。
//
// ✅ [U] 2026-10-06 の書き換え：
//   00 で 0x378E を 0 → 通常ルートに入った。
//   01 copy（通常ルート）で 0x378E を 1 にしただけ、0x378D・0x379F・0x37AA を 00 と同じ値にしても → 通常ルートのまま。
//   01 copy で三姉妹見参（添字70）を成功（04）にしただけ → 通常ルートのまま。
//   01 copy で三姉妹見参を成功にし、0x378E を 1 → 隠しルート（お早い到着）に入った。0x378D・0x37AA・0x3799 を足しても同じ。
//   → 0x378E＝隠しルート（1）。効くのは三姉妹見参が成功（04）のときだけ。
//   このとき病院が閉じていた（0x375D＝0）ため赤城が死に、再起の望みより後ろのイベントが起きなかった（[U]）。
//   再起の望み（添字72）はチャートに出なかった。正規に隠しルートへ入った 00 も、添字71〜90 は A・B とも FF なので、
//   書き換えのせいではなく、まだ起きていない初見のイベント（A・B とも FF）がチャートに出ないだけと考えられる（🔶 §3.5）。
//   00 は A 添字70＝04 なのに B 添字70＝FF。記録 B は周回中には書かれない（🔶 周回の終わりか生きた証の保存で書かれる）。
//
//   書き換えた周回では、チャートに隠しルートの枠そのものが出なかった（[U] 2026-10-06。B の FF は「枠は出るが名前が隠れる」で別物）。
//   0x379F＝1、さらに 0x378D＝02 を足しても枠は出なかった（[U] 2026-10-06）。
//   ただし、新しい主人公の2周目に正規で隠しルートへ入った 01 copy 10〜12 でも、失敗した再起の望みやその先の枠は出なかった。
//   同じ周回の 01 copy 10（隠しルートに入った直後）と 01 copy 13（入らずに阿弥浜港争乱を終えた）の差は、
//   0x377F・0x378D・0x378E・0x379F・A 添字70・戦闘の記録・時間だけで、ほかに隠しルートで書かれるものはなかった。
//   🔶 枠が出ないのは書き換えのせいではなく、過去の周回で隠しルートを記録していない（B が FF）ときのゲームの振る舞いと考えられる
//   0x378D  ❓ 正規の隠しルートの4件（00・02・02 copy・01 copy 8）＝02、ほかはすべて 01。ルートの切り替えにも枠にも効かなかった
//   0x3793  ❓ 海兵隊の横暴に成功したときだけ 0 → 1（2回再現。§3.5）
//   0x3799  ❓ 03 だけ 1。ルートの切り替えには効かなかった
//   0x379F  ❓ 正規の隠しルートの4件＝1、ほかは 0。ルートの切り替えにも枠にも効かなかった
//   0x37A2  ❓ 大寄せで 0 → 2。0 にしても門は変わらなかった（§3.5）
//   0x37AA  ❓ 00＝02、01 系＝01、03＝00。ルートの切り替えには効かなかった
// 0x378E 以外は意味が分かるまで生の値の欄として出す（AGENTS.md「未確認データの扱い」）。
//
// ❓ U-1 判定待ちのため [TS] の固定オフセット（案A）の位置で読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU8, writeU8 } from "./binary";
import { checkLayout } from "./hero";

export const ROUTE_CANDIDATE_START = 0x378d;
export const ROUTE_CANDIDATE_END = 0x37aa;
export const ROUTE_CANDIDATE_LENGTH = ROUTE_CANDIDATE_END - ROUTE_CANDIDATE_START + 1;

/** ✅ [U] 隠しルート（1）。三姉妹見参（イベント添字70）が成功（04）のときだけ効く */
export const HIDDEN_ROUTE_OFFSET = 0x378e;
/** 三姉妹見参のイベント添字 */
export const HIDDEN_ROUTE_EVENT_INDEX = 70;

/**
 * 0・1 は書き換えで確認（✅ [U] 2026-10-06）。
 * 2 は 01 copy 12（正規の1周目の隠しルートで、赤城が死んだあと怒りの矛先を終えた）で 1 → 2 になった値（🔶 差分1回、意味は ❓。
 * 怒りの矛先のあとは大老暗殺計画へ飛ぶ（docs/event.md）ので、希望の光に進めない隠しルートか）
 */
export const HIDDEN_ROUTE_VALUES: readonly { value: number; label: string }[] = [
  { value: 0, label: "通常ルート" },
  { value: 1, label: "隠しルート" },
  { value: 2, label: "隠しルート・怒りの矛先のあと（未確認）" },
];
const HIDDEN_ROUTE_MAX = 2;

/** 通常モードで書ける上限。実セーブで見た値は 0〜2 */
export const ROUTE_CANDIDATE_NORMAL_MAX = 2;

/** 生の値で出すオフセット（隠しルートのフラグを除く） */
export const RAW_ROUTE_OFFSETS: readonly number[] = Array.from(
  { length: ROUTE_CANDIDATE_LENGTH },
  (_, i) => ROUTE_CANDIDATE_START + i,
).filter((o) => o !== HIDDEN_ROUTE_OFFSET);

/** 差分で何か分かっているバイトの説明。ないバイトは全セーブで 0 */
export const ROUTE_CANDIDATE_NOTES: Readonly<Record<number, string>> = {
  0x378d: "❓ 正規の隠しルートのセーブはすべて 02、ほかは 01。書き換えてもルートは変わらず、チャートの隠しルートの枠も出なかった",
  0x3793: "❓ 海兵隊の横暴に成功したときだけ 0 → 1（2回再現）",
  0x3799: "❓ 施設が変わった別周回（4日目）のセーブだけ 1。書き換えてもルートは変わらなかった",
  0x379f: "❓ 正規の隠しルートのセーブはすべて 1、ほかは 0。書き換えてもルートは変わらず、チャートの隠しルートの枠も出なかった",
  0x37a2: "❓ 大寄せで 0 → 2。0 にしても門は変わらなかった",
  0x37aa: "❓ 隠しルート直後＝02、阿弥浜港争乱のあと通常ルート＝01、別周回の4日目＝00。書き換えてもルートは変わらなかった",
};

export type RouteCandidatesView = {
  values: number[];
  /** 0x378E。0・1 以外なら hiddenProblem が入る */
  hidden: number;
  hiddenProblem: string | null;
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
  const hidden = readU8(bytes, HIDDEN_ROUTE_OFFSET);
  const layoutProblem = checkLayout(bytes);
  const hiddenProblem =
    layoutProblem ??
    (hidden > HIDDEN_ROUTE_MAX ? `隠しルートのフラグが 0〜${HIDDEN_ROUTE_MAX} 以外です（${hidden}）` : null);
  return { values, hidden, hiddenProblem, warning, problem: layoutProblem };
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

/** 0x378E の1バイトだけを書く。通常モードでは 0〜2 だけ、上級者モードでは任意の u8 */
export function writeHiddenRoute(bytes: Uint8Array, value: number, opts: { advanced: boolean }): void {
  const view = readRouteCandidates(bytes);
  if (view.hiddenProblem) throw new RangeError(view.hiddenProblem);
  if (!Number.isInteger(value) || value < 0 || value > 0xff) throw new RangeError(`u8 の範囲外です: ${value}`);
  if (!opts.advanced && value > HIDDEN_ROUTE_MAX)
    throw new RangeError(`0〜${HIDDEN_ROUTE_MAX} を指定してください: ${value}`);
  writeU8(bytes, HIDDEN_ROUTE_OFFSET, value);
}
