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
import { tr, type Localized } from "@/lib/i18n";
import { readU16, writeU16 } from "./binary";
import { validateRange, warningsOf, type EditOpts, type ViewStatus } from "./field";
import { assertWritable, checkLayout } from "./layout";
import { CHART_NODE_MAX, chartNode, type ChartNodeEntry } from "./master/chart-nodes";
import { chartNodeLabel } from "./master/labels";

export const HINT_OFFSET = 0x3900;

/** 🔶 なし（寝て5日目にしたセーブで見た値） */
export const HINT_NONE = 0xffff;

/** 🟢 通常モードで書けるノード番号の上限（0〜118 と 0xFFFF を許す） */
export const HINT_NORMAL_MAX = CHART_NODE_MAX;

/** 🟢 既定の文（ヒントなし） */
export const HINT_DEFAULT: Localized = { ja: "さて どうしたものか", en: "Let's see what's happening..." };
/** 🟢 既定の文の日本語 */
export const HINT_DEFAULT_TEXT = HINT_DEFAULT.ja;

/**
 * 🔶 1日目のノードのヒントの文（6 だけ ✅ 書き込みで確認）。ほかのノードの文は ❓。
 * 2 志士との出会いは既定の文そのもの。
 */
export const HINT_TEXTS: ReadonlyMap<number, Localized> = new Map([
  [2, HINT_DEFAULT],
  [3, { ja: "大通りの様子を見に行くか", en: "Maybe I should check out the main plaza..." }],
  [4, { ja: "領事館の様子を見てみるか", en: "Maybe I should check out the consulate..." }],
  [5, { ja: "夕方 朱美の店に行ってみるか", en: "Maybe I should head to Akemi's place this evening..." }],
  [6, { ja: "港の様子でも見てみるか", en: "Maybe I should check out the harbor..." }],
  [7, { ja: "夜の領事館の様子でも見てみるか", en: "Maybe I should check out the consulate tonight..." }],
  [8, { ja: "神社の様子でも見に行ってみるか", en: "Maybe I should check out the cave shrine..." }],
  [9, { ja: "三姉妹は元気にしているだろうか", en: "I wonder how the three sisters are doing..." }],
  [10, { ja: "ローラは元気にしているだろうか", en: "I wonder how Laura is doing..." }],
]);

/** warnings は、表にない値・イベントに当たらないノードのとき。編集はできる */
export type HintView = ViewStatus & {
  value: number;
  /** 値に当たるノード。0xFFFF や表にない値は null */
  node: ChartNodeEntry | null;
  /** 🔶 ノードのヒントの文。分かっていなければ null（❓） */
  text: string | null;
};

/** 値の表示名（例：「6 琴吹光探検隊」「65535 なし」） */
export function hintLabel(value: number): string {
  if (value === HINT_NONE) return tr({ ja: "なし", en: "None" }); // 🔶
  const node = chartNode(value);
  if (!node) return tr({ ja: "一覧にないイベント", en: "Event not in the list" });
  return node.labelId !== null
    ? chartNodeLabel(node, tr({ ja: "不明", en: "Unknown" }))
    : tr({ ja: "イベントに当たらない項目", en: "Entry with no event" });
}

/** 表にない値・イベントに当たらないノードなら警告の文。0xFFFF とイベントのノードは null */
export function hintWarning(value: number): string | null {
  if (value === HINT_NONE) return null;
  const node = chartNode(value);
  if (!node) return tr({ ja: "一覧にないイベントです", en: "This event is not in the list" });
  if (node.eventId === null) return tr({ ja: "イベントに当たらない項目です", en: "This entry has no event" });
  return null;
}

export function readHint(bytes: Uint8Array): HintView {
  if (bytes.byteLength < HINT_OFFSET + 2)
    throw new RangeError(tr({ ja: "ファイルが小さすぎてヒントを読めません", en: "The file is too small to read the hint" }));
  const value = readU16(bytes, HINT_OFFSET);
  const text = HINT_TEXTS.get(value);
  return {
    value,
    node: value === HINT_NONE ? null : (chartNode(value) ?? null),
    text: text ? tr(text) : null,
    warnings: warningsOf(hintWarning(value)),
    problem: checkLayout(bytes),
  };
}

/** 通常モードは 0〜118（ノード）と 0xFFFF、上級者モードは任意の u16。問題がなければ null */
export function validateHint(value: number, opts: EditOpts): string | null {
  // 通常モードの範囲は 0〜118 に「なし」を足したものなので、格納できる範囲だけを validateRange で見る
  const rangeProblem = validateRange(value, { systemMax: 0xffff }, opts);
  if (rangeProblem) return rangeProblem;
  if (!opts.advanced && value > HINT_NORMAL_MAX && value !== HINT_NONE)
    return tr({ ja: "通常モードでは指定できないイベントです", en: "This event can't be set outside Advanced mode" });
  return null;
}

/** 0x3900 の2バイトだけを書く */
export function writeHint(bytes: Uint8Array, value: number, opts: EditOpts): void {
  assertWritable(bytes);
  const error = validateHint(value, opts);
  if (error) throw new RangeError(error);
  writeU16(bytes, HINT_OFFSET, value);
}
