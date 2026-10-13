import { useState } from "react";
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
              : `今の三姉妹見参の状態：${stateLabel(sisters)}${sisters === EVENT_STATE_VALUES.success ? "（真ルートに分岐）" : "（成功ではないので、「真ルート」にしても通常ルートのまま）"}`
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
    <SearchScope title="一括設定（デバッグ用）" className="flex flex-col gap-3">
      <h3 className="flex flex-wrap items-center gap-2 text-sm font-medium">
        {/* ❓ ゲームへの影響は未確認 */}
        一括設定（デバッグ用）
      </h3>
      <p className="text-muted-foreground text-xs">
        名前の付いたイベント（{NAMED_EVENT_INDICES.length}件）すべてに、同じ値をまとめて書きます。
        チャートに出ない項目は対象にしません。
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-end gap-2">
          <BulkSelect
            label="状態"
            value={state}
            options={stateOptions}
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
            書く
          </Button>
        </div>
        <div className="flex items-end gap-2">
          <BulkSelect
            label="チャート表示"
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
            書く
          </Button>
        </div>
      </div>
      {problem && <p className="text-muted-foreground text-xs">読み取り専用：{problem}</p>}
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
        placeholder="選ぶ"
      />
    </div>
  );
}
