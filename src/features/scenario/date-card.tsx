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

const slotOptions: SelectOption[] = TIME_SLOTS.map((label, i) => ({ value: String(i), label }));
const pendingOptions: SelectOption[] = PENDING_VALUES.map((v) => ({
  value: String(v),
  label: v === 0 ? "なし" : "あり（エリア移動・ロードで時間帯が1つ進む）",
}));
/** ❓ 410 以降（DAY_TIME_AFTER_DAY3 より後）は書き込んだときのゲーム内の動作を確かめていない。0（序章）は「新しい周回を始める」か主人公画面のボタンで書くので選ばせない */
const stageOptions: SelectOption[] = STAGES.map((s) => ({
  value: String(s.value),
  label:
    s.value === STAGE_PROLOGUE
      ? `${s.label}（「新しい周回を始める」などで書く）`
      : s.label,
  selectedLabel: s.label,
  disabled: s.value === STAGE_PROLOGUE,
}));

/**
 * 段階・日数・時間帯。view が null ならセーブ未読み込み
 * 確度：日数・時間帯は ✅ 書き換えの反映を確認。段階と保留量は ❓ 要ゲーム内確認（docs: date-location）
 */
export function DateCard() {
  const { view, error: readError, problem: readProblem } = useSaveView(readDate, { problem: (v) => v.problem });
  const { write: update } = useWrite();
  const { advanced } = useAdvancedMode();
  const range = advanced ? DAY_RANGE.system : DAY_RANGE.normal;
  const problem = view?.problem ?? null;

  return (
    <CollapsibleCard
      anchor={AMIHAMA_ANCHORS.progress}
      title="段階・日数・時間帯"
      contentClassName="grid gap-4 sm:grid-cols-3"
      // 閉じていても「読み込めません」「読み取り専用」が見えるよう、見出しの下に出す
      headerExtra={(readError || readProblem) && <PageBanner error={readError} problem={readProblem} />}
      description={
        <>
          物語の進み具合（段階）と、日数・時間帯を編集できます。
          <br />
          メインイベントが起きるかは段階で決まり、日数・時間帯は表示だけです。
        </>
      }
    >
      <SelectRow
        label="段階"
        offset={DATE_OFFSETS.dayTime}
        value={view ? String(view.stage) : null}
        currentLabel={view ? "一覧にない段階" : undefined}
        options={stageOptions}
        problem={problem}
        hint="メインイベントの進行に影響します"
        note="日数・時間帯は変えません。序章にするときは、上の「新しい周回を始める」か、主人公画面の「難易度と主人公設定を行えるようにする」を使います"
        onChange={(v) => update((b) => writeStage(b, Number(v)))}
      />
      <FieldRow
        label="日数"
        offset={DATE_OFFSETS.dayIndex}
        value={view?.day ?? null}
        problem={problem}
        warning={formatWarnings(view?.warnings)}
        format={String}
        parse={(input) => parseCount(input, (v) => validateDay(v, { advanced }))}
        apply={(day) => { if (view) update((b) => writeDayTime(b, day, view.slot, { advanced })); }}
        inputMode="numeric"
        hint={`${range.min}〜${range.max}日目。メインイベントには影響しません`}
      />
      <SelectRow
        label="時間帯"
        offset={DATE_OFFSETS.slot}
        value={view ? String(view.slot) : null}
        options={slotOptions}
        problem={problem}
        hint="メインイベントには影響しません"
        onChange={(v) => { if (view) update((b) => writeDayTime(b, view.day, Number(v), { advanced })); }}
      />
      <SelectRow
        label="時間帯を進める保留量"
        offset={DATE_OFFSETS.pending}
        value={view ? String(view.pending) : null}
        options={pendingOptions}
        problem={problem}
        note="イベントを完了すると保留量が入り、エリア移動やロードのときに時間が進みます"
        onChange={(v) => update((b) => writePending(b, Number(v)))}
      />
    </CollapsibleCard>
  );
}
