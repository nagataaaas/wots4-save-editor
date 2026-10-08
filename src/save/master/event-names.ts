// イベントの名前のマスターデータ。イベントの通し番号（0x36A8 + n の n）と名前。
// docs/save_format/datatable/event/event.csv をビルド時に読み込む（表を二重に持たない）。
// 名前の文字列は EVENT_LABELS にだけ持つ。画面やほかのモジュールでは labels.ts の eventLabel(EventLabelId) で引く。
import eventCsv from "../../../docs/save_format/datatable/event/event.csv?raw";
import { parseCsv } from "./item-names";
import { eventId, eventLabelId, type EventId, type EventLabelId, type LocalizedLabel } from "./label-types";

export type EventMasterEntry = { id: EventId; labelId: EventLabelId };

function loadEvents(text: string): { entries: EventMasterEntry[]; labels: Map<EventLabelId, LocalizedLabel> } {
  const [header, ...rows] = parseCsv(text.replace(/^﻿/, ""));
  const col = (name: string) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`event.csv に ${name} 列がありません`);
    return i;
  };
  const c = { id: col("id_dec"), ja: col("name_ja"), en: col("name_en") };
  const entries: EventMasterEntry[] = [];
  const labels = new Map<EventLabelId, LocalizedLabel>();
  for (const r of rows.filter((r) => r.length > 1)) {
    const id = Number(r[c.id]);
    entries.push({ id: eventId(id), labelId: eventLabelId(id) });
    // 名前の分からない通し番号（84 など）は名前を持たない
    if (r[c.ja] !== "") labels.set(eventLabelId(id), { ja: r[c.ja], en: r[c.en] });
  }
  return { entries, labels };
}

const loaded = loadEvents(eventCsv);

/** 通し番号の昇順 */
export const EVENTS: readonly EventMasterEntry[] = loaded.entries;

/** イベントの表示名（日本語・英語） */
export const EVENT_LABELS: ReadonlyMap<EventLabelId, LocalizedLabel> = loaded.labels;
