// イベントの概要。docs/events/*.md の summary・summary_en から pnpm gen:dataset で作った表を引く。
import { tr } from "@/lib/i18n";
import { EVENT_SUMMARY_EN_TABLE, EVENT_SUMMARY_TABLE } from "./event-summary-table";

/** イベントの通し番号から、今の言語の概要を引く（英語がなければ日本語）。docs/events にないイベントは null */
export function eventSummaryOf(eventId: number): string | null {
  const ja = EVENT_SUMMARY_TABLE[eventId];
  if (ja === undefined) return null;
  return tr({ ja, en: EVENT_SUMMARY_EN_TABLE[eventId] ?? "" });
}
