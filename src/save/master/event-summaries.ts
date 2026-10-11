// イベントの概要。docs/events/*.md の summary から pnpm gen:dataset で作った表を引く。
import { EVENT_SUMMARY_TABLE } from "./event-summary-table";

/** イベントの通し番号から概要を引く。docs/events にないイベントは null */
export function eventSummaryOf(eventId: number): string | null {
  return EVENT_SUMMARY_TABLE[eventId] ?? null;
}
