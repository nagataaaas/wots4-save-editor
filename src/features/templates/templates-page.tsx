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
import { OCCUPATION_ACCEPTED_OFFSET } from "@/save/occupation";
import { SCENE_TEMPLATE_GROUPS, type SceneTemplate, type SceneTemplateGroup } from "@/save/scene-templates";
import { TEMPLATE_ANCHORS } from "./anchors";

/** まとまりごとの丸ハテナに出す位置（剣術大会はイベントの状態、なりわいは受注中の表） */
const GROUP_OFFSETS: Record<keyof typeof TEMPLATE_ANCHORS, number> = {
  tournament: EVENT_STATE_OFFSET,
  missions: OCCUPATION_ACCEPTED_OFFSET,
  "true-route": EVENT_STATE_OFFSET,
  killable: EVENT_STATE_OFFSET,
};

/**
 * テンプレート（scene-templates.ts）。決まった戦いの直前から遊べるように、セーブを書き換える。
 * 剣術大会直前は ✅ [U] 2026-10-16。なりわいの3つは ✅ [U] 2026-10-19。斬り殺せる戦いの7つは ✅ [U] 2026-10-19。真ルートの2つは 🔶（ゲームで確かめていない）
 */
export function TemplatesPage() {
  const { view, error: readError } = useSaveView(readDate);
  const problem = view?.problem ?? null;
  return (
    <div className="flex flex-col gap-4">
      <PageBanner error={readError} problem={problem} />
      {SCENE_TEMPLATE_GROUPS.map((group) => (
        <GroupCard key={group.id} group={group} disabled={!view || problem !== null} problem={problem} />
      ))}
    </div>
  );
}

function GroupCard({ group, disabled, problem }: { group: SceneTemplateGroup; disabled: boolean; problem: string | null }) {
  const anchor = group.id as keyof typeof TEMPLATE_ANCHORS;
  return (
    <AnchoredCard anchor={TEMPLATE_ANCHORS[anchor]} title={tr(group.label)} description={tr(group.description)}>
      <CardContent className="flex flex-col gap-4">
        {group.templates.map((t) => (
          <TemplateRow key={t.id} template={t} offset={GROUP_OFFSETS[anchor]} disabled={disabled} problem={problem} />
        ))}
      </CardContent>
    </AnchoredCard>
  );
}

function TemplateRow({ template, offset, disabled, problem }: { template: SceneTemplate; offset: number; disabled: boolean; problem: string | null }) {
  // message はこの行の書き込みの結果。読み込み直すと消える
  const { tryWrite, message } = useWrite();
  const label = tr(template.label);
  return (
    <FieldShell
      label={label}
      offset={offset}
      problem={problem}
      hint={message && !message.error ? message.text : undefined}
      error={message?.error ? message.text : null}
    >
      <p className="text-muted-foreground text-sm">{tr(template.note)}</p>
      {template.caution && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          ⚠ {tr(template.caution.text)}
          {template.caution.link && (
            <>
              {" "}
              <a href={template.caution.link.href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                {tr(template.caution.link.label)}
              </a>
            </>
          )}
        </p>
      )}
      <ActionButton
        size="sm"
        disabled={disabled}
        label={tr({ ja: "この場面にする", en: "Set to this scene" })}
        confirm="repeat"
        onAction={() =>
          tryWrite(template.apply, () =>
            tr({
              ja: `「${label}」の場面にしました。保存してゲームでロードしてください`,
              en: `Set to "${label}". Save and load it in the game`,
            }),
          )
        }
      />
    </FieldShell>
  );
}
