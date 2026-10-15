import { tr } from "@/lib/i18n";
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
      title={tr({ ja: "イベント関連フラグ", en: "Event flags" })}
      description={
        <>
          {tr({
            ja: "イベントで変わる状態や、イベントの起き方を変えるフラグを編集できます。",
            en: "Edit states that change through events, and flags that change how events play out.",
          })}
          <br />
          {tr({
            ja: "各欄の説明に、状態が変わる場面と、影響するイベントを書いています。",
            en: "Each field's help explains when the state changes and which events it affects.",
          })}
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
