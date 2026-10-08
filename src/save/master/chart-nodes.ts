// イベントチャートのノードのマスターデータ。次のイベントのヒント 0x3900 の値（ノード番号）と、そのノードのイベント。
// docs/save_format/datatable/event/chart-node.csv（全行 🟢）から生成した dataset/chart-node.ts を使う（表を二重に持たない）。
//
// - 0〜118 の番号で、イベントの通し番号（chunks/event-chart）とは別 🟢
// - 1つのイベントが複数のノードを持つことがある（大老暗殺計画は7つ、大老 鬼怒川怨仙は4つ、小公女倒れる（通し番号 34）は町の薬師を含めて3つ）🟢
// - イベントに当たらないノード（0・1・53・113・114・118）は通し番号が null 🟢
// - ノードの名前は、ふつうはイベントの名前（event.csv）と同じ。違うノード（町の薬師・闇討ち ～小暮捜索、空白だけが違う大老 鬼怒川怨仙）だけ
//   CHART_NODE_OWN_LABELS に chart-node.csv の名前を持つ。表示は labels.ts の chartNodeLabel で引く
import { CHART_NODE_TABLE } from "./dataset/chart-node";
import { EVENT_LABELS } from "./event-names";
import { eventLabelId, type EventLabelId, type LocalizedLabel } from "./label-types";

export type ChartNodeEntry = {
  id: number;
  /** ノードのイベントの名前。null はイベントに当たらないノード */
  labelId: EventLabelId | null;
  /** イベントの通し番号（0x36A8 + n の n）。null はイベントに当たらないノード */
  eventId: number | null;
  /** 🟢 そのノードの段階（0〜999、date-location の 0x0010 と同じ値）。null は段階のないノード */
  phase: number | null;
  /** 🟢 チャートの行の種類（勢力・共通・真ルート。tutorial はチャートに出ないノード） */
  route: ChartRoute;
};

/** 🟢 チャートの行の種類 */
export type ChartRoute = "prajna" | "shogunate" | "foreigners" | "other" | "best" | "tutorial";

const ROWS = Object.values(CHART_NODE_TABLE);

/** 🟢 ノード 0〜118（ID 昇順、欠番なし） */
export const CHART_NODES: readonly ChartNodeEntry[] = ROWS.map((r) => ({
  id: r.id_dec,
  labelId: r.event_id === null ? null : eventLabelId(r.event_id),
  eventId: r.event_id,
  phase: r.phase,
  route: r.route,
}));

/** 🟢 イベントの名前と違う名前を持つノード（ノード番号 → 名前） */
export const CHART_NODE_OWN_LABELS: ReadonlyMap<number, LocalizedLabel> = new Map(
  ROWS.flatMap((r) => {
    if (r.event_id === null) return [];
    const eventName = EVENT_LABELS.get(eventLabelId(r.event_id));
    if (!eventName) throw new Error(`chart-node.csv のノード ${r.id_dec} の event_id が event.csv にありません: ${r.event_id}`);
    return r.name_ja === eventName.ja ? [] : [[r.id_dec, { ja: r.name_ja, en: r.name_en }] as const];
  }),
);

/** 🟢 ノード番号の最大値 */
export const CHART_NODE_MAX = 118;

/** ノード番号からノードを引く。表にない値は undefined */
export function chartNode(id: number): ChartNodeEntry | undefined {
  return Number.isInteger(id) && id >= 0 && id <= CHART_NODE_MAX ? CHART_NODES[id] : undefined;
}
