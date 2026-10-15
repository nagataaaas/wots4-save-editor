import { tr } from "@/lib/i18n";
import { readDate } from "@/save/scenario-date";
import { useSaveView } from "@/lib/use-save-view";
import { PageBanner } from "@/components/page-banner";
import { AMIHAMA_ANCHORS } from "./anchors";
import { CollapsibleCard } from "@/components/collapsible-card";
import { FieldRow } from "@/components/field-row";
import type { SelectOption } from "@/components/select-options";
import { SelectRow } from "@/components/select-row";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { formatWarnings } from "@/lib/format";
import { useWrite } from "@/lib/use-write";
import { DATE_OFFSETS, DAY_RANGE, PENDING_VALUES, STAGES, STAGE_PROLOGUE, TIME_SLOTS, validateDay, writeDayTime, writePending, writeStage } from "@/save/scenario-date";
import { parseCount } from "./scenario-input";

const slotOptions = (): SelectOption[] => TIME_SLOTS.map((label, i) => ({ value: String(i), label }));
const pendingOptions = (): SelectOption[] =>
  PENDING_VALUES.map((v) => ({
    value: String(v),
    label:
      v === 0
        ? tr({ ja: "なし", en: "None" })
        : tr({
            ja: "あり（エリア移動・ロードで時間帯が1つ進む）",
            en: "Queued (time of day moves forward one step on area change or load)",
          }),
  }));
/** ❓ 410 以降（DAY_TIME_AFTER_DAY3 より後）は書き込んだときのゲーム内の動作を確かめていない。0（序章）は「新しい周回を始める」か主人公画面のボタンで書くので選ばせない */
const stageOptions = (): SelectOption[] =>
  STAGES.map((s) => ({
    value: String(s.value),
    label:
      s.value === STAGE_PROLOGUE
        ? tr({
            ja: `${s.label}（「新しい周回を始める」などで書く）`,
            en: `${s.label} (set with "New playthrough" etc.)`,
          })
        : s.label,
    selectedLabel: s.label,
    disabled: s.value === STAGE_PROLOGUE,
  }));

/**
 * 段階・日数・時間帯。view が null ならセーブ未読み込み
 * 確度：日数・時間帯は ✅ 書き換えの反映を確認。段階と保留量は ❓ 要ゲーム内確認（docs: date-location）
 */
export function DateCard() {
  const { view, error: readError, problem: readProblem } = useSaveView(readDate);
  const { write: update } = useWrite();
  const { advanced } = useAdvancedMode();
  const range = advanced ? DAY_RANGE.system : DAY_RANGE.normal;
  const problem = view?.problem ?? null;

  return (
    <CollapsibleCard
      anchor={AMIHAMA_ANCHORS.progress}
      title={tr({ ja: "段階・日数・時間帯", en: "Story stage, day & time" })}
      contentClassName="grid gap-4 sm:grid-cols-3"
      // 閉じていても「読み込めません」「読み取り専用」が見えるよう、見出しの下に出す
      headerExtra={(readError || readProblem) && <PageBanner error={readError} problem={readProblem} />}
      description={
        <>
          {tr({
            ja: "物語の進み具合（段階）と、日数・時間帯を編集できます。",
            en: "Edit the story progress (stage), the day and the time of day.",
          })}
          <br />
          {tr({
            ja: "メインイベントが起きるかは段階で決まり、日数・時間帯は表示だけです。",
            en: "Whether main events happen depends on the stage; the day and time of day are for display only.",
          })}
        </>
      }
    >
      <SelectRow
        label={tr({ ja: "段階", en: "Story stage" })}
        offset={DATE_OFFSETS.dayTime}
        value={view ? String(view.stage) : null}
        currentLabel={view ? tr({ ja: "一覧にない段階", en: "Stage not in the list" }) : undefined}
        options={stageOptions()}
        problem={problem}
        hint={tr({ ja: "メインイベントの進行に影響します", en: "Affects the progress of main events" })}
        note={tr({
          ja: "日数・時間帯は変えません。序章にするときは、上の「新しい周回を始める」か、主人公画面の「難易度と主人公設定を行えるようにする」を使います",
          en: "Doesn't change the day or time of day. To go back to the prologue, use \"New playthrough\" above or \"Enable difficulty & Character Settings\" on the Hero screen",
        })}
        onChange={(v) => update((b) => writeStage(b, Number(v)))}
      />
      <FieldRow
        label={tr({ ja: "日数", en: "Day" })}
        offset={DATE_OFFSETS.dayIndex}
        value={view?.day ?? null}
        problem={problem}
        warning={formatWarnings(view?.warnings)}
        format={String}
        parse={(input) => parseCount(input, (v) => validateDay(v, { advanced }))}
        apply={(day) => { if (view) update((b) => writeDayTime(b, day, view.slot, { advanced })); }}
        inputMode="numeric"
        hint={tr({
          ja: `${range.min}〜${range.max}日目。メインイベントには影響しません`,
          en: `Day ${range.min}–${range.max}. Doesn't affect main events`,
        })}
      />
      <SelectRow
        label={tr({ ja: "時間帯", en: "Time of day" })}
        offset={DATE_OFFSETS.slot}
        value={view ? String(view.slot) : null}
        options={slotOptions()}
        problem={problem}
        hint={tr({ ja: "メインイベントには影響しません", en: "Doesn't affect main events" })}
        onChange={(v) => { if (view) update((b) => writeDayTime(b, view.day, Number(v), { advanced })); }}
      />
      <SelectRow
        label={tr({ ja: "時間帯を進める保留量", en: "Queued time advance" })}
        offset={DATE_OFFSETS.pending}
        value={view ? String(view.pending) : null}
        options={pendingOptions()}
        problem={problem}
        note={tr({
          ja: "イベントを完了すると保留量が入り、エリア移動やロードのときに時間が進みます",
          en: "Completing an event sets this, and time moves forward when you change areas or load",
        })}
        onChange={(v) => update((b) => writePending(b, Number(v)))}
      />
    </CollapsibleCard>
  );
}
