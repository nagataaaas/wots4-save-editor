import { useState } from "react";
import { tr } from "@/lib/i18n";
import { SearchScope } from "@/lib/search-context";
import { FilterSelect } from "@/components/filter-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { FlagRow } from "@/components/flag-row";
import { BEST_ROUTE_FLAG } from "@/save/flags/event-flags";
import { useWrite } from "@/lib/use-write";
import { WriteError } from "@/components/write-error";
import { EVENT_STATE_VALUES, NAMED_EVENT_INDICES, stateLabel, writeEventRecords, writeEventStates } from "@/save/scenario-events";
import { recordOptions, stateOptions } from "@/features/event-chart/event-options";

/**
 * 真ルート（BEST_ROUTE_FLAG）。イベントチャートの上に出す。sisters は三姉妹見参（イベント添字70）の状態 A
 */
export function BestRouteRow({ sisters }: { sisters: number | null }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="grid gap-4 sm:grid-cols-3">
        <FlagRow
          flag={BEST_ROUTE_FLAG}
          hint={
            sisters === null
              ? undefined
              : sisters === EVENT_STATE_VALUES.success
                ? tr({
                    ja: `今の三姉妹見参の状態：${stateLabel(sisters)}（真ルートに分岐）`,
                    en: `Meeting with the Three Sisters is now: ${stateLabel(sisters)} (branches to the true route)`,
                  })
                : tr({
                    ja: `今の三姉妹見参の状態：${stateLabel(sisters)}（成功ではないので、「真ルート」にしても通常ルートのまま）`,
                    en: `Meeting with the Three Sisters is now: ${stateLabel(sisters)} (not succeeded, so you stay on the normal route even with "True route")`,
                  })
          }
        />
      </div>
    </section>
  );
}

/**
 * デバッグ用：状態・チャート表示を、イベントと対応のついた添字すべてにまとめて書く。イベントチャートの下に出す。
 * 対応のない添字（47〜50・67・84 など）は対象にしない（ユーザー判断 2026-10-06）
 */
export function BulkEventsPanel({ problem, disabled }: { problem: string | null; disabled: boolean }) {
  const { tryWrite: run, error } = useWrite();
  const { advanced } = useAdvancedMode();
  const [state, setState] = useState<string>("");
  const [record, setRecord] = useState<string>("");
  const locked = disabled || problem !== null;

  return (
    <SearchScope title={tr({ ja: "一括設定（デバッグ用）", en: "Bulk set (for debugging)" })} className="flex flex-col gap-3">
      <h3 className="flex flex-wrap items-center gap-2 text-sm font-medium">
        {/* ❓ ゲームへの影響は未確認 */}
        {tr({ ja: "一括設定（デバッグ用）", en: "Bulk set (for debugging)" })}
      </h3>
      <p className="text-muted-foreground text-xs">
        {tr({
          ja: `名前の付いたイベント（${NAMED_EVENT_INDICES.length}件）すべてに、同じ値をまとめて書きます。チャートに出ない項目は対象にしません。`,
          en: `Writes the same value to all ${NAMED_EVENT_INDICES.length} named events at once. Entries that don't appear on the chart are skipped.`,
        })}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-end gap-2">
          <BulkSelect
            label={tr({ ja: "状態", en: "State" })}
            value={state}
            options={stateOptions()}
            disabled={locked}
            onChange={setState}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={locked || state === ""}
            onClick={() =>
              run((b) => writeEventStates(b, NAMED_EVENT_INDICES, Number(state), { advanced }))
            }
          >
            {tr({ ja: "書く", en: "Write" })}
          </Button>
        </div>
        <div className="flex items-end gap-2">
          <BulkSelect
            label={tr({ ja: "チャート表示", en: "Chart display" })}
            value={record}
            options={recordOptions(advanced)}
            disabled={locked}
            onChange={setRecord}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={locked || record === ""}
            onClick={() =>
              run((b) => writeEventRecords(b, NAMED_EVENT_INDICES, Number(record), { advanced }))
            }
          >
            {tr({ ja: "書く", en: "Write" })}
          </Button>
        </div>
      </div>
      {problem && (
        <p className="text-muted-foreground text-xs">
          {tr({ ja: `読み取り専用：${problem}`, en: `Read-only: ${problem}` })}
        </p>
      )}
      <WriteError error={error} />
    </SearchScope>
  );
}

function BulkSelect({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <Label>{label}</Label>
      <FilterSelect
        options={options}
        value={value === "" ? null : value}
        onChange={onChange}
        disabled={disabled}
        className="w-full"
        placeholder={tr({ ja: "選ぶ", en: "Choose" })}
      />
    </div>
  );
}
