import { EVENTS_ANCHORS } from "./anchors";
import { CardContent } from "@/components/ui/card";
import { AnchoredCard } from "@/components/anchored-card";
import { FlagGrid } from "@/components/flag-row";
import { EVENT_FLAGS } from "@/save/flags/event-flags";

/**
 * イベントで値が変わる、またはイベントを変えるフラグ（EVENT_FLAGS）。
 * ❓ 書き換えたときのゲームへの反映は要ゲーム内確認
 */
export function EventFlagsCard() {
  return (
    <AnchoredCard
      anchor={EVENTS_ANCHORS.flags}
      title="イベント関連フラグ"
      description={
        <>
          イベントで変わる状態や、イベントの起き方を変えるフラグを編集できます。
          <br />
          各欄の説明に、状態が変わる場面と、影響するイベントを書いています。
          {/* 通常モードでは、その場面で現れる状態だけを選べる */}
        </>
      }
    >
      <CardContent>
        <FlagGrid flags={EVENT_FLAGS} />
      </CardContent>
    </AnchoredCard>
  );
}
