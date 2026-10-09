// 次のイベントのヒント。出典：docs/save_format/chunks/hint（調査記録 2026-10-06_hint.md・2026-10-07_hint-node.md）。
//
//   0x3900 u16  最後に状態を進めたイベントの、チャート上のノード番号（0〜118）🟢。ゲームはこの番号からヒントの文を決める
//               ノードの表：master/chart-nodes.ts（datatable/event/chart-node.csv）
//               ✅ 場面の分かっている実データの 11 の値（2・3・5・6・8・9・10・78・83・89・102）は、どれも直前に進めたイベントのノード。
//               導入（状態 03）でも完了（04）でも書き換わる
//               🔶 0xFFFF＝なし（寝て5日目にしたセーブで見た）
//   ヒントの文はノードごとに1つ 🟢。1日目のノード 2〜10 の文だけ分かっている（🔶。6 だけ ✅ 書き込みで確認）。それ以外は ❓
//   🔶 ノードの時間帯と現在の時間帯が合わないと、既定の文「さて どうしたものか」になる（2日目昼に 7・13・18・83・89 を書くと既定の文 ✅）
//
// [TS] の固定オフセットで読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU16, writeU16 } from "./binary";
import { checkLayout } from "./hero";
import { CHART_NODE_MAX, chartNode, type ChartNodeEntry } from "./master/chart-nodes";
import { chartNodeLabel } from "./master/labels";

export const HINT_OFFSET = 0x3900;

/** 🔶 なし（寝て5日目にしたセーブで見た値） */
export const HINT_NONE = 0xffff;

/** 🟢 通常モードで書けるノード番号の上限（0〜118 と 0xFFFF を許す） */
export const HINT_NORMAL_MAX = CHART_NODE_MAX;

/** 🟢 既定の文（ヒントなし） */
export const HINT_DEFAULT_TEXT = "さて どうしたものか";

/**
 * 🔶 1日目のノードのヒントの文（6 だけ ✅ 書き込みで確認）。ほかのノードの文は ❓。
 * 2 志士との出会いは既定の文そのもの。
 */
export const HINT_TEXTS: ReadonlyMap<number, string> = new Map([
  [2, HINT_DEFAULT_TEXT],
  [3, "大通りの様子を見に行くか"],
  [4, "領事館の様子を見てみるか"],
  [5, "夕方 朱美の店に行ってみるか"],
  [6, "港の様子でも見てみるか"],
  [7, "夜の領事館の様子でも見てみるか"],
  [8, "神社の様子でも見に行ってみるか"],
  [9, "三姉妹は元気にしているだろうか"],
  [10, "ローラは元気にしているだろうか"],
]);

export type HintView = {
  value: number;
  /** 値に当たるノード。0xFFFF や表にない値は null */
  node: ChartNodeEntry | null;
  /** 🔶 ノードのヒントの文。分かっていなければ null（❓） */
  text: string | null;
  /** 表にない値・イベントに当たらないノードなら理由。編集はできる */
  warning: string | null;
  /** 妥当性検証に落ちた理由。null なら編集可能 */
  problem: string | null;
};

/** 値の表示名（例：「6 琴吹光探検隊」「65535 なし」） */
export function hintLabel(value: number): string {
  if (value === HINT_NONE) return `${value}（0xFFFF）なし 🔶`;
  const node = chartNode(value);
  if (!node) return `${value}（ノード表にない値）`;
  return node.labelId !== null ? `${value} ${chartNodeLabel(node)}` : `${value}（イベントに当たらないノード）`;
}

/** 表にない値・イベントに当たらないノードなら警告の文。0xFFFF とイベントのノードは null */
export function hintWarning(value: number): string | null {
  if (value === HINT_NONE) return null;
  const node = chartNode(value);
  if (!node) return `ノードの表（0〜${CHART_NODE_MAX}）にない値です（${value}）`;
  if (node.eventId === null) return `イベントに当たらないノードです（${value}）`;
  return null;
}

export function readHint(bytes: Uint8Array): HintView {
  if (bytes.byteLength < HINT_OFFSET + 2) throw new RangeError("ファイルが小さすぎてヒントを読めません");
  const value = readU16(bytes, HINT_OFFSET);
  return {
    value,
    node: value === HINT_NONE ? null : (chartNode(value) ?? null),
    text: HINT_TEXTS.get(value) ?? null,
    warning: hintWarning(value),
    problem: checkLayout(bytes),
  };
}

/** 通常モードは 0〜118（ノード）と 0xFFFF、上級者モードは任意の u16。問題がなければ null */
export function validateHint(value: number, opts: { advanced: boolean }): string | null {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) return `u16 の範囲外です: ${value}`;
  if (!opts.advanced && value > HINT_NORMAL_MAX && value !== HINT_NONE)
    return `通常モードでは 0〜${HINT_NORMAL_MAX}（ノード番号）か 65535（0xFFFF）を指定してください: ${value}`;
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
