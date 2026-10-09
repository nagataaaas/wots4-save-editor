// 真ルートのフラグ 0x378E と、その周り 0x378D〜0x37AA（30 B）の値。出典：docs/save_format/chunks/best-route、
// [U] 2026-10-06 の比較と書き換え（chunks/best-route/reserch）。
//
// ✅ [U] 2026-10-06 の書き換え：
//   0x378E＝1 と三姉妹見参（イベント添字70）の成功（04）の両方がそろうと真ルート（お早い到着）に入る。どちらか一方では通常ルートのまま。
//   正規の真ルートで 0x378E を 0 にすると通常ルートに入る。
//   0x378D・0x379F・0x37AA・0x3799 を正規の真ルートと同じ値にしても、ルートは変わらず、チャートの真ルートの枠も出なかった。
//
// 🟢 0x378D  序章のあとの道筋。序章の終わり（阿弥浜港争乱の3連戦の終わりなど）で 1、三姉妹見参の成功で 2。
//            1〜3日目の通常の勢力イベントはどれも開始条件が「= 1」。2 になると周回中は戻らない
// 🟢 0x378E  真ルート。三姉妹見参の成功で 1。真ルートのイベントはどれも開始条件が「= 1」。
//            2＝真ルートを外れた（大老暗殺計画の側へ）。再起の望みで小暮が死ぬ、怒りの矛先の成功、
//            小暮が死んでいるときに伯爵に刺激をの失敗・運命のルーレットで J.J が死ぬ、闇討ちの失敗、傷心の帰国船の成功で 2。戻らない。
//            大老暗殺計画の開始条件は「三姉妹見参の成功（0x36EE = 4）かつ 0x378E = 2 かつ大通り」
// 🟢 0x3792  ローラの好感度（yobai-points.ts）。0x3793 朱美の好感度。0x3794〜0x3796 三姉妹の拷問のポイント。0x3797 メリンダの峰打ちの点数
// 🟢 0x3799  堂島の職。0x379A 先生の職（値の意味は ❓）
// 🟢 0x379B  真実・夜の墓場でで朱美を送ると 1（意味は ❓）
// 🟢 0x379F  序章の大砲。阿弥浜港争乱で大砲の般若党を倒すと 1。0 だと三姉妹見参が起きない
// 🟢 0x37A0  欺きの代価で一人で剣崎を倒すと 1
// 🟢 0x37A1  小公女倒れるで薬を持っている（薬屋で 1、小公女倒れるの成功で 0）
// 🟢 0x37A2  場面だけ分かっている（意味は ❓）。再起の望みの失敗・将の器の成功・怒りの矛先の成功で 2（闇討ちの開始条件の1つ）。
//            大寄せで攘夷ルートに入れないとき・志士の刀で戦闘になると・願い虚しくで手紙を託されると 2。同士救出の成功で 1
// 🔶 0x37A3  会談の手紙の状態（願い虚しくで託されると 1、2 で領事館でローラへの報告の場面）
// 🔶 0x37A4  黒船の状態か。黒船を我が手にの終わりで 1。破滅への道・傷心の帰国船・鬼怒川の魔手の失敗・夕暮れの船上で断ると 2
// 🟢 0x37A8  最後通告に逆らうと 1。0x37A9 周回数か（🔶 chunks/scenario-flags）
// 🟢 0x37AA  チュートリアルの進み方。1＝チュートリアル（1周目は必ず）、2＝「口出し無用」、0＝「まとめて相手をしてやる」（3周目以降）
// 範囲の中には、真ルートに関係しないバイト（好感度・職など）も入っている（範囲は差分から取ったもの）。
// 0x378F〜0x3797 はほかの画面（勢力の退場・夜這い）で編集するので、生の値の欄には出さない。
// 0x378E 以外は、書き換えたときのゲーム内の反映を確かめていないので、生の値の欄として出す（AGENTS.md「未確認データの扱い」）。
//
// [TS] の固定オフセットで読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU8, writeU8 } from "./binary";
import { checkLayout } from "./hero";
import { POINT_NORMAL_MAX, YOBAI_POINTS } from "./yobai-points";

export const ROUTE_CANDIDATE_START = 0x378d;
export const ROUTE_CANDIDATE_END = 0x37aa;
export const ROUTE_CANDIDATE_LENGTH = ROUTE_CANDIDATE_END - ROUTE_CANDIDATE_START + 1;

/** ✅ [U] 真ルート（1）。三姉妹見参（イベント添字70）が成功（04）のときだけ効く */
export const BEST_ROUTE_OFFSET = 0x378e;
/** 三姉妹見参のイベント添字 */
export const BEST_ROUTE_EVENT_INDEX = 70;

/** 0・1 は書き換えで確認（✅ [U] 2026-10-06）。2 は 🟢（真ルートを外れた。周回中は戻らない） */
export const BEST_ROUTE_VALUES: readonly { value: number; label: string }[] = [
  { value: 0, label: "真ルートに入っていない" },
  { value: 1, label: "真ルート" },
  { value: 2, label: "真ルートを外れた（大老暗殺計画へ）" },
];
const BEST_ROUTE_MAX = 2;

/** 通常モードで書ける上限（好感度・ポイント以外）。🟢 どのバイトも 0〜2 で使われる */
export const ROUTE_CANDIDATE_NORMAL_MAX = 2;

/** 好感度・ポイントのバイト（0x3792〜0x3797）。通常モードの上限は夜這いのページと同じ POINT_NORMAL_MAX（🔶 ゲームの上限ではない） */
const POINT_OFFSETS: ReadonlySet<number> = new Set(YOBAI_POINTS.map((p) => p.offset));

/** offset ごとの通常モードの上限 */
export function routeCandidateNormalMax(offset: number): number {
  return POINT_OFFSETS.has(offset) ? POINT_NORMAL_MAX : ROUTE_CANDIDATE_NORMAL_MAX;
}

/** ほかの画面で編集するバイト：勢力の退場 0x378F〜0x3791（faction-exit.ts）、好感度・ポイント 0x3792〜0x3797（yobai-points.ts） */
export const ELSEWHERE_ROUTE_START = 0x378f;
export const ELSEWHERE_ROUTE_END = 0x3797;

/** 生の値で出すオフセット（真ルートのフラグと、ほかの画面で編集するバイトを除く） */
export const RAW_ROUTE_OFFSETS: readonly number[] = Array.from(
  { length: ROUTE_CANDIDATE_LENGTH },
  (_, i) => ROUTE_CANDIDATE_START + i,
).filter((o) => o !== BEST_ROUTE_OFFSET && (o < ELSEWHERE_ROUTE_START || o > ELSEWHERE_ROUTE_END));

/** 意味や場面が分かっているバイトの名前と説明。ないバイトは意味不明（❓） */
export const ROUTE_CANDIDATE_NOTES: Readonly<Record<number, { name?: string; note: string }>> = {
  // 🟢
  0x378d: {
    name: "序章のあとの道筋",
    note:
      "1＝通常の1〜3日目（序章の終わりで 1。通常の勢力イベントはどれも 1 が条件）、2＝真ルートに入った（三姉妹見参の成功で 2。周回中は戻らない）。" +
      "書き換えてもルートは変わらず、チャートの真ルートの枠も出なかった",
  },
  0x3799: { name: "堂島の職", note: "値の意味は未確認。書き換えてもルートは変わらなかった" },
  0x379a: { name: "先生の職", note: "値の意味は未確認" },
  0x379b: { note: "真実・夜の墓場でで朱美を送ると 1。意味は未確認" },
  0x379f: {
    name: "序章の大砲",
    note: "阿弥浜港争乱で大砲の般若党を倒すと 1。0 だと三姉妹見参が起きない。書き換えてもルートは変わらなかった",
  },
  0x37a0: { note: "欺きの代価で一人で剣崎を倒すと 1" },
  0x37a1: { name: "小公女の薬", note: "小公女倒れるで薬を持っている。町の薬屋で 1、小公女倒れるの成功で 0" },
  // 🟢 場面 ／ ❓ 意味
  0x37a2: {
    note:
      "意味は未確認。2 が闇討ちの条件の1つ。再起の望みの失敗・将の器の成功・怒りの矛先の成功・大寄せで攘夷ルートに入れない・" +
      "志士の刀で戦闘・願い虚しくで手紙を託されると 2。同士救出の成功で 1",
  },
  // 🔶 意味
  0x37a3: { name: "会談の手紙（推定）", note: "願い虚しくで手紙を託されると 1、2 で領事館でローラへの報告の場面になる" },
  0x37a4: {
    name: "黒船の状態（推定）",
    note: "黒船を我が手にの終わりで 1。破滅への道・傷心の帰国船・鬼怒川の魔手の失敗・夕暮れの船上で断ると 2",
  },
  // 🟢 場面 ／ 🔶 0x37A9 の意味
  0x37a8: { note: "最後通告に逆らうと 1" },
  0x37a9: { name: "周回数（推定）", note: "周回数とみられる（未確認）" },
  // 🟢
  0x37aa: {
    name: "チュートリアルの進み方",
    note: "1＝チュートリアル（1周目は必ず）、2＝「口出し無用」、0＝「まとめて相手をしてやる」（3周目以降）。真ルートとは関係しない",
  },
};

export type RouteCandidatesView = {
  values: number[];
  /** 0x378E。0〜2 以外なら bestProblem が入る */
  best: number;
  bestProblem: string | null;
  /** 通常の進行では見ない値があれば理由。編集はできる */
  warning: string | null;
  problem: string | null;
};

export function readRouteCandidates(bytes: Uint8Array): RouteCandidatesView {
  if (bytes.byteLength <= ROUTE_CANDIDATE_END) throw new RangeError("ファイルが小さすぎてフラグを読めません");
  const values = Array.from({ length: ROUTE_CANDIDATE_LENGTH }, (_, i) =>
    readU8(bytes, ROUTE_CANDIDATE_START + i),
  );
  const bad = values.findIndex((v, i) => v > routeCandidateNormalMax(ROUTE_CANDIDATE_START + i));
  const warning =
    bad >= 0
      ? `0x${(ROUTE_CANDIDATE_START + bad).toString(16).toUpperCase()} に通常の進行では見ない値があります（${values[bad]}）`
      : null;
  const best = readU8(bytes, BEST_ROUTE_OFFSET);
  const layoutProblem = checkLayout(bytes);
  const bestProblem =
    layoutProblem ??
    (best > BEST_ROUTE_MAX ? `真ルートのフラグが 0〜${BEST_ROUTE_MAX} 以外です（${best}）` : null);
  return { values, best, bestProblem, warning, problem: layoutProblem };
}

/**
 * 通常モードは 0〜routeCandidateNormalMax(offset)（offset を省くと 0〜2）、上級者モードは任意の u8。問題がなければ null
 */
export function validateRouteCandidate(value: number, opts: { advanced: boolean; offset?: number }): string | null {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) return `u8 の範囲外です: ${value}`;
  const max = opts.offset === undefined ? ROUTE_CANDIDATE_NORMAL_MAX : routeCandidateNormalMax(opts.offset);
  if (!opts.advanced && value > max) return `通常モードでは 0〜${max} を指定してください: ${value}`;
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
  const error = validateRouteCandidate(value, { advanced: opts.advanced, offset });
  if (error) throw new RangeError(error);
  writeU8(bytes, offset, value);
}

/** 0x378E の1バイトだけを書く。通常モードでは 0〜2 だけ、上級者モードでは任意の u8 */
export function writeBestRoute(bytes: Uint8Array, value: number, opts: { advanced: boolean }): void {
  const view = readRouteCandidates(bytes);
  if (view.bestProblem) throw new RangeError(view.bestProblem);
  if (!Number.isInteger(value) || value < 0 || value > 0xff) throw new RangeError(`u8 の範囲外です: ${value}`);
  if (!opts.advanced && value > BEST_ROUTE_MAX)
    throw new RangeError(`0〜${BEST_ROUTE_MAX} を指定してください: ${value}`);
  writeU8(bytes, BEST_ROUTE_OFFSET, value);
}
