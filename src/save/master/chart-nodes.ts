// イベントチャートのノードのマスターデータ。次のイベントのヒント 0x3900 の値（ノード番号）と、そのノードのイベント。
// docs/save_format/datatable/event/chart-node.csv（全行 🟢）をビルド時に読み込む（表を二重に持たない）。
//
// - 0〜118 の番号で、イベントの通し番号（chunks/event-chart）とは別 🟢
// - 1つのイベントが複数のノードを持つことがある（大老暗殺計画は7つ、大老 鬼怒川怨仙は4つ、小公女倒れる（通し番号 34）は町の薬師を含めて3つ）🟢
// - イベントに当たらないノード（0・1・53・113・114・118）は通し番号が null 🟢
// - ノードの名前は、ふつうはイベントの名前（event.csv）と同じ。違うノード（町の薬師・闇討ち ～小暮捜索）だけ
//   CHART_NODE_OWN_LABELS に chart-node.csv の名前を持つ。表示は labels.ts の chartNodeLabel で引く
import nodeCsv from "../../../docs/save_format/datatable/event/chart-node.csv?raw";
import { EVENT_LABELS } from "./event-names";
import { parseCsv } from "./item-names";
import { eventLabelId, type EventLabelId, type LocalizedLabel } from "./label-types";

export type ChartNodeEntry = {
  id: number;
  /** ノードのイベントの名前。null はイベントに当たらないノード */
  labelId: EventLabelId | null;
  /** イベントの通し番号（0x36A8 + n の n）。null はイベントに当たらないノード */
  eventId: number | null;
};

function loadNodes(text: string): { entries: ChartNodeEntry[]; ownLabels: Map<number, LocalizedLabel> } {
  const [header, ...rows] = parseCsv(text.replace(/^﻿/, ""));
  const col = (name: string) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`chart-node.csv に ${name} 列がありません`);
    return i;
  };
  const c = { id: col("id_dec"), ja: col("name_ja"), en: col("name_en"), event: col("event_id") };
  const entries: ChartNodeEntry[] = [];
  const ownLabels = new Map<number, LocalizedLabel>();
  for (const r of rows.filter((r) => r.length > 1)) {
    const id = Number(r[c.id]);
    if (r[c.event] === "") {
      entries.push({ id, labelId: null, eventId: null });
      continue;
    }
    const eventId = Number(r[c.event]);
    const labelId = eventLabelId(eventId);
    const eventName = EVENT_LABELS.get(labelId);
    if (!eventName) throw new Error(`chart-node.csv のノード ${id} の event_id が event.csv にありません: ${eventId}`);
    if (r[c.ja] !== eventName.ja) ownLabels.set(id, { ja: r[c.ja], en: r[c.en] });
    entries.push({ id, labelId, eventId });
  }
  return { entries, ownLabels };
}

const loaded = loadNodes(nodeCsv);

/** 🟢 ノード 0〜118（ID 昇順、欠番なし） */
export const CHART_NODES: readonly ChartNodeEntry[] = loaded.entries;

/** 🟢 イベントの名前と違う名前を持つノード（ノード番号 → 名前） */
export const CHART_NODE_OWN_LABELS: ReadonlyMap<number, LocalizedLabel> = loaded.ownLabels;

/** 🟢 ノード番号の最大値 */
export const CHART_NODE_MAX = 118;

/** ノード番号からノードを引く。表にない値は undefined */
export function chartNode(id: number): ChartNodeEntry | undefined {
  return Number.isInteger(id) && id >= 0 && id <= CHART_NODE_MAX ? CHART_NODES[id] : undefined;
}
