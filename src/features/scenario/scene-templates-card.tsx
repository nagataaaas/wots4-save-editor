import { tr } from "@/lib/i18n";
import { useSaveView } from "@/lib/use-save-view";
import { useWrite } from "@/lib/use-write";
import { AnchoredCard } from "@/components/anchored-card";
import { ActionButton } from "@/components/action-button";
import { FieldShell } from "@/components/field-shell";
import { PageBanner } from "@/components/page-banner";
import { CardContent } from "@/components/ui/card";
import { readDate } from "@/save/scenario-date";
import { EVENT_STATE_OFFSET } from "@/save/scenario-events";
import { SCENE_TEMPLATE_GROUPS } from "@/save/scene-templates";
import { EVENTS_ANCHORS } from "./anchors";

/**
 * 場面のテンプレ（scene-templates.ts）。周回の進み具合を初期化して、決まった戦いの直前の道筋を書く。
 * 画面に出すのはゲームで確かめたテンプレだけ（剣術大会直前は ✅ [U] 2026-10-16）
 */
export function SceneTemplatesCard() {
  const { view, error: readError } = useSaveView(readDate);
  const { tryWrite, message } = useWrite();
  const problem = view?.problem ?? null;

  return (
    <AnchoredCard
      anchor={EVENTS_ANCHORS.templates}
      title={tr({ ja: "場面のテンプレ", en: "Scene presets" })}
      description={tr({
        ja: "決まった戦いの直前から遊べるように、物語の進み具合を書き換えます。今の周回のイベントの進み具合・勢力の状態・門や柵・人物の生死・日付・現在地は、その場面までの決まった道筋に置き換わります。武器・道具・お金・主人公・町の人・なりわい・夜這いはそのままです。",
        en: "Rewrites the story progress so you can play from right before a specific battle. This playthrough's event progress, faction status, gates and fences, who is alive, the date and the location are replaced with a set path up to that scene. Weapons, items, money, your character, townsfolk, missions and night crawling are left as they are.",
      })}
    >
      <CardContent className="flex flex-col gap-4">
        <PageBanner error={readError} />
        {SCENE_TEMPLATE_GROUPS.map((group) => (
          <FieldShell
            key={group.id}
            label={tr(group.label)}
            offset={EVENT_STATE_OFFSET}
            problem={problem}
            note={tr(group.note)}
            hint={message && !message.error ? message.text : undefined}
            error={message?.error ? message.text : null}
          >
            <div className="flex flex-wrap gap-2">
              {group.templates.map((t) => (
                <ActionButton
                  key={t.id}
                  size="sm"
                  disabled={!view || problem !== null}
                  label={tr(t.label)}
                  confirm="repeat"
                  onAction={() =>
                    tryWrite(t.apply, () =>
                      tr({
                        ja: `「${tr(group.label)}（${tr(t.label)}）」にしました。保存してゲームでロードしてください`,
                        en: `Set to "${tr(group.label)} (${tr(t.label)})". Save and load it in the game`,
                      }),
                    )
                  }
                />
              ))}
            </div>
          </FieldShell>
        ))}
      </CardContent>
    </AnchoredCard>
  );
}
