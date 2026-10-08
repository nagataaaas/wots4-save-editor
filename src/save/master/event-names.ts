// イベントの名前のマスターデータ。イベントの通し番号（0x36A8 + n の n）と名前。
// docs/save_format/datatable/event/event.csv から生成した dataset/event.ts を使う（表を二重に持たない）。
// 名前の文字列は EVENT_LABELS にだけ持つ。画面やほかのモジュールでは labels.ts の eventLabel(EventLabelId) で引く。
import { EVENT_TABLE } from "./dataset/event";
import { eventId, eventLabelId, type EventId, type EventLabelId, type LocalizedLabel } from "./label-types";

export type EventMasterEntry = { id: EventId; labelId: EventLabelId };

const ROWS = Object.values(EVENT_TABLE);

/** 通し番号の昇順 */
export const EVENTS: readonly EventMasterEntry[] = ROWS.map((r) => ({
  id: eventId(r.id_dec),
  labelId: eventLabelId(r.id_dec),
}));

/** イベントの表示名（日本語・英語）。名前の分からない通し番号（84 など）は持たない */
export const EVENT_LABELS: ReadonlyMap<EventLabelId, LocalizedLabel> = new Map(
  ROWS.filter((r) => r.name_ja !== "").map((r) => [eventLabelId(r.id_dec), { ja: r.name_ja, en: r.name_en }]),
);
