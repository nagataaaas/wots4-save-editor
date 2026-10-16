import { EVENTS_ANCHORS } from "./anchors";
import { readCycleCounts } from "@/save/cycle-counts";
import { readFlag } from "@/save/flags/byte-flag";
import { BEST_ROUTE_EVENT_INDEX, BEST_ROUTE_FLAG } from "@/save/flags/event-flags";
import { useSaveView } from "@/lib/use-save-view";
import { PageBanner } from "@/components/page-banner";
import { readDate } from "@/save/scenario-date";
import { readEvents } from "@/save/scenario-events";
import { EventChartCard } from "@/features/event-chart/event-chart-card";
import { FactionCard } from "./faction-card";
import { EventFlagsCard } from "./event-flags-card";
import { BestRouteRow, BulkEventsPanel } from "./event-controls";

const readChart = (b: Uint8Array) => ({
  events: readEvents(b),
  counts: readCycleCounts(b),
  date: readDate(b),
  bestRoute: readFlag(b, BEST_ROUTE_FLAG).value,
});

/**
 * 世界 / イベント：イベントチャート（真ルート・一括設定つき）、勢力の状態、イベント関連フラグ（ユーザー判断 2026-10-11）
 * 確度：どれもセーブの差分から推定（docs: event-chart・best-route・factions・scenario-flags）。
 * イベントの失敗（05）・未到達（FF）、チャート表示、真ルート、勢力の友好度 +・−・敵対状態は ✅ 書き換えの反映を確認。
 * そのほかは ❓ 要ゲーム内確認
 */
export function EventsPage() {
  const { view, error } = useSaveView(readChart);
  return (
    <div className="flex flex-col gap-4">
      <PageBanner error={error} />
      <EventChartCard
        anchor={EVENTS_ANCHORS.chart}
        events={view?.events ?? null}
        counts={view?.counts ?? null}
        stage={view?.date.stage ?? null}
        bestRoute={view?.bestRoute ?? null}
        top={<BestRouteRow sisters={view?.events.entries[BEST_ROUTE_EVENT_INDEX]?.state ?? null} />}
        bottom={<BulkEventsPanel problem={view?.events.problem ?? null} disabled={!view} />}
      />
      <FactionCard />
      <EventFlagsCard />
    </div>
  );
}
