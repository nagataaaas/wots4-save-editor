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
// 🟢 0x3798・0x379E・0x37A5〜0x37A7・0x37A9  使われていない（0x37A9 は周回数ではない。周回数は 0x0B8C）
// 🟢 0x3799  堂島が鍛冶屋に戻ると 1、死ぬと 0。0x379A 先生が道場の師範代になると 1、死ぬ・追い出す・道場を失うと 0。
//            どちらも周回をまたいで残る。町に出るかはなりわいのフラグ 22・21 が決める
// 🟢 0x379B  朱美を送った印（真実・夜の墓場でで 1）。1 のあいだ居酒屋（地域 7）へ移動できない
// 🟢 0x379C・0x379D  使われていない。1 だと港のカジノ（地域 23）・居留地の病院（地域 12）へ移動できないが、1 にする場面はない
// 🟢 0x379F  序章の大砲。阿弥浜港争乱で大砲の般若党を倒すと 1。0 だと三姉妹見参が起きない
// 🟢 0x37A0  欺きの代価の結果。一人で剣崎を倒すと 1 で、1 なら報酬が出る
// 🟢 0x37A1  小公女倒れるで薬を持っている（薬屋で 1、小公女倒れるの成功で 0）
// 🟢 0x37A2  般若党の本拠。0 以外で神社の般若党・赤城・小暮・雑貨屋、居酒屋の朱美と客が町に出ない。
//            2＝離散した（闇討ちの開始条件の1つ）、1＝剣術大会以降に片付いた。1 を読む場面はなく、効果は 2 と同じ
//            （闇討ちの条件にならないことだけが違う）。1 と 2 を書き分ける意図は 🔶
// 🟢 0x37A3  会談の手紙。1＝ローラから預かった、2＝般若党の門番に渡した（2 で領事館の報告の場面）。持ち物の手紙は見ない
// 🟢 0x37A4  黒船。1＝幕府が借り受けた（甲板の乗組員が出ない）、2＝去った（甲板へ移動できない）
// 🟢 0x37A8  最後通告に逆らった印。1 のあいだ夜の雑魚が暗闇脳天になる
// 🟢 0x37AA  チュートリアルの進み方。1＝チュートリアル（1周目は必ず）、2＝「口出し無用」、0＝「まとめて相手をしてやる」（3周目以降）
// 範囲の中には、真ルートに関係しないバイト（好感度・なりわいなど）も入っている（範囲は差分から取ったもの）。
// 0x378F〜0x3797 はほかの画面（勢力の退場・夜這い）で編集するので、生の値の欄には出さない。
// 使われていないバイト（0x3798・0x379C〜0x379E・0x37A5〜0x37A7・0x37A9）も出さない。
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

/**
 * 🟢 使われていないバイト（生の値の欄に出さない）。0x379C・0x379D は 1 だと移動先が閉じるが、ゲームが 1 にする場面はない
 */
export const UNUSED_ROUTE_OFFSETS: ReadonlySet<number> = new Set([
  0x3798, 0x379c, 0x379d, 0x379e, 0x37a5, 0x37a6, 0x37a7, 0x37a9,
]);

/** 生の値で出すオフセット（真ルートのフラグ、ほかの画面で編集するバイト、使われていないバイトを除く） */
export const RAW_ROUTE_OFFSETS: readonly number[] = Array.from(
  { length: ROUTE_CANDIDATE_LENGTH },
  (_, i) => ROUTE_CANDIDATE_START + i,
).filter(
  (o) =>
    o !== BEST_ROUTE_OFFSET &&
    (o < ELSEWHERE_ROUTE_START || o > ELSEWHERE_ROUTE_END) &&
    !UNUSED_ROUTE_OFFSETS.has(o),
);

/** 生の値の欄に出すバイトの名前と説明（🟢） */
export const ROUTE_CANDIDATE_NOTES: Readonly<Record<number, { name?: string; note: string }>> = {
  // 🟢
  0x378d: {
    name: "序章のあとの道筋",
    note:
      "1＝通常の1〜3日目（序章の終わりで 1。通常の勢力イベントはどれも 1 が条件）、2＝真ルートに入った（三姉妹見参の成功で 2。周回中は戻らない）。" +
      "書き換えてもルートは変わらず、チャートの真ルートの枠も出なかった",
  },
  0x3799: {
    name: "堂島が鍛冶屋に戻った",
    note:
      "1＝鍛冶屋で働いている（堂島の説得に成功すると 1、死ぬと 0）。周回をまたいで残る。1 だと剣術大会・表彰式・結末に堂島が出ず、" +
      "簀巻き日和で助けに来ない（ゲームオーバー）。町に出るかはなりわいのフラグ 22 が決める",
  },
  0x379a: {
    name: "先生が道場の師範代",
    note:
      "1＝主人公の道場の師範代（死ぬ・追い出す・道場を失うと 0）。周回をまたいで残る。1 だと表彰式に先生が出ず、道場破りを先生が追い払う。" +
      "町に出るかはなりわいのフラグ 21 が決める",
  },
  0x379b: { name: "朱美を送った印", note: "真実・夜の墓場でで朱美を送ると 1。1 のあいだ居酒屋へ移動できない" },
  0x379f: {
    name: "序章の大砲",
    note: "阿弥浜港争乱で大砲の般若党を倒すと 1。0 だと三姉妹見参が起きない。書き換えてもルートは変わらなかった",
  },
  0x37a0: { name: "欺きの代価の結果", note: "一人で剣崎を倒すと 1。1 なら終わりに報酬が出る。このイベントの中だけで使う" },
  0x37a1: { name: "小公女の薬", note: "小公女倒れるで薬を持っている。町の薬屋で 1、小公女倒れるの成功で 0" },
  // 🟢（1 と 2 を書き分ける意図だけ 🔶）
  0x37a2: {
    name: "般若党の本拠",
    note:
      "0＝神社にいる、1＝片付いた（剣術大会以降。同士救出・般若党壊滅・三匹で斬るの成功）、" +
      "2＝離散した（再起の望みで赤城が死ぬ・将の器の成功・怒りの矛先の成功・大寄せで攘夷ルートに入れない・志士の刀で戦闘・願い虚しくで手紙を託される・臆病風）。" +
      "1 と 2 の効果は同じで、神社の般若党・赤城・小暮・雑貨屋と居酒屋の朱美・客が町に出ない。2 だけが真ルートの闇討ちの条件になる",
  },
  0x37a3: {
    name: "会談の手紙",
    note:
      "1＝ローラから預かった、2＝神社の般若党の門番に渡した（2 で領事館でローラへの報告の場面になる）。" +
      "話はこの値だけで進み、持ち物の会談の手紙（重要品の画面）は見ない",
  },
  0x37a4: {
    name: "黒船",
    note:
      "1＝幕府が借り受けた（黒船を我が手にの成功。甲板に乗組員が出ない）、" +
      "2＝去った（傷心の帰国船・鬼怒川の魔手・夕暮れの船上・破滅への道。甲板へ移動できない）",
  },
  0x37a8: { name: "最後通告に逆らった", note: "最後通告に逆らうと 1。1 のあいだ、夜に町へ出る雑魚が暗闇脳天になる" },
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
  // 使われていないバイトは欄に出さないので、警告の対象にもしない
  const bad = values.findIndex(
    (v, i) =>
      !UNUSED_ROUTE_OFFSETS.has(ROUTE_CANDIDATE_START + i) &&
      v > routeCandidateNormalMax(ROUTE_CANDIDATE_START + i),
  );
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
