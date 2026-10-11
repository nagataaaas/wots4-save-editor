import { useMemo, useState } from "react";
import { CollapsibleCard } from "@/components/collapsible-card";
import { FieldRow, type ParseResult } from "@/components/field-row";
import { SearchSelectRow } from "@/components/search-select-row";
import type { SelectOption } from "@/components/select-options";
import {
  SCORE_TABLES,
  readScoreTable,
  scoreEntries,
  scoreEntryName,
  scoreOffset,
  validateScore,
  writeScore,
  type ScoreScope,
  type ScoreTableId,
  type ScoreTableView,
} from "@/save/score-tables";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { useSave } from "@/lib/save-context";
import {
  STAT_FIELDS,
  STAT_GROUPS,
  formatSeconds,
  readStats,
  validateStat,
  writeStat,
  type StatField,
  type StatGroupId,
  type StatsView,
} from "@/save/stats";

/** 最初から開いておくまとまり */
const OPEN_GROUPS: readonly StatGroupId[] = ["evaluation", "actions"];

/** float32 は有効桁7桁程度なので、それを超える桁は表示しない */
const formatValue = (field: StatField) => (v: number) =>
  field.type === "f32" ? String(Number(v.toPrecision(7))) : String(v);

function parseValue(field: StatField, input: string, advanced: boolean): ParseResult<number> {
  const text = input.trim();
  const pattern = field.type === "f32" ? /^-?\d+(\.\d+)?$/ : /^\d+$/;
  if (!pattern.test(text))
    return { ok: false, error: field.type === "f32" ? "数値を入力してください" : "0以上の整数を入力してください" };
  const value = Number(text);
  const error = validateStat(field, value, { advanced });
  return error ? { ok: false, error } : { ok: true, value };
}

function unitHint(field: StatField, value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "";
  if (field.unit === "seconds") return `（${formatSeconds(value)}）`;
  if (field.unit === "distance") return `（${(value / 1000).toFixed(1)} km）`;
  return "";
}

export function StatsPage() {
  const { save, update } = useSave();
  const { advanced } = useAdvancedMode();

  const result = useMemo((): { view: StatsView } | { error: string } | null => {
    if (!save) return null;
    try {
      return { view: readStats(save.working) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }, [save]);

  if (result && "error" in result) {
    return (
      <Alert variant="destructive">
        <AlertTitle>読み込めません</AlertTitle>
        <AlertDescription>{result.error}</AlertDescription>
      </Alert>
    );
  }

  const view = result?.view ?? null;
  const k = save?.loadId ?? 0;
  const byKey = new Map(view?.values.map((v) => [v.field.key, v]));

  const row = (field: StatField) => {
    const v = byKey.get(field.key) ?? null;
    const value = v?.value ?? null;
    return (
      <FieldRow
        key={`${k}-${field.key}`}
        label={field.label}
        offset={field.offset}
        value={value}
        problem={view?.problem ?? null}
        warning={v?.warning ?? null}
        format={formatValue(field)}
        parse={(input) => parseValue(field, input, advanced)}
        apply={(n) => update((b) => writeStat(b, field.key, n, { advanced }))}
        inputMode={field.type === "f32" ? "decimal" : "numeric"}
        hint={`0〜${field.max.toLocaleString()}${unitHint(field, value)}`}
        note={field.note}
      />
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {!view && (
        <Alert>
          <AlertTitle>セーブファイルが読み込まれていません</AlertTitle>
          <AlertDescription>
            サイドバーの「ファイルを開く」から読み込むと、下の項目を編集できます。
          </AlertDescription>
        </Alert>
      )}
      {view?.problem && (
        <Alert variant="destructive">
          <AlertTitle>読み取り専用</AlertTitle>
          <AlertDescription>{view.problem}</AlertDescription>
        </Alert>
      )}
      {/* 書き換えたときのゲーム内の表示は要ゲーム内確認 */}
      <p className="text-muted-foreground text-sm">
        侍点は「基本情報」、周回数は「世界 / 阿弥浜」、経過日数は「世界 / 阿弥浜」の日数で編集します。上限はゲームが値を増やすときの上限で、上級者モードでは型で書ける範囲まで入力できます。
      </p>
      {STAT_GROUPS.map((g) => (
        <CollapsibleCard
          key={`${k}-${g.id}`}
          title={g.label}
          description={g.note}
          defaultOpen={OPEN_GROUPS.includes(g.id)}
          contentClassName="grid gap-4 sm:grid-cols-2"
        >
          {STAT_FIELDS.filter((f) => f.group === g.id).map(row)}
        </CollapsibleCard>
      ))}
      <ScoreTableCard key={`${k}-arts`} table="arts" />
      <ScoreTableCard key={`${k}-items`} table="items" />
    </div>
  );
}

// arts のゲームの上限は未確認（上限はエディタの目安）。
// とどめを刺した技・使った道具の周回中と累計が 1 ずつ増え、累計でいちばん多いものが記録の画面に出る
const SCORE_NOTES: Record<ScoreTableId, string> = {
  arts: "技ごとに、とどめを刺した回数です。いちばん多い技が「得意技」になります。",
  items: "道具ごとに、使った回数です。いちばん多い道具が「好きな道具」になります。",
};

const SCORE_TOP = 10;

/** 🟢 技ごとの斬殺数・道具の使用回数。1件を選んで、周回中と累計を書く */
function ScoreTableCard({ table }: { table: ScoreTableId }) {
  const { save, update } = useSave();
  const { advanced } = useAdvancedMode();
  const t = SCORE_TABLES[table];
  const view = useMemo((): ScoreTableView | null => {
    if (!save) return null;
    try {
      return readScoreTable(save.working, table);
    } catch {
      return null;
    }
  }, [save, table]);
  const entries = useMemo(() => scoreEntries(table), [table]);
  const [index, setIndex] = useState(() => entries[0]?.index ?? 0);

  const top = useMemo(
    () =>
      view
        ? view.total
            .map((n, i) => ({ i, n }))
            .filter((x) => x.n > 0)
            .sort((a, b) => b.n - a.n)
            .slice(0, SCORE_TOP)
        : [],
    [view],
  );

  const options: SelectOption[] = entries.map((e) => ({
    value: String(e.index),
    label: e.name,
    keywords: [e.name],
  }));

  const countRow = (scope: ScoreScope) => (
    <FieldRow
      key={`${index}-${scope}`}
      label={scope === "cycle" ? "周回中" : "累計"}
      offset={scoreOffset(table, scope, index)}
      value={view ? (scope === "cycle" ? view.cycle[index] : view.total[index]) : null}
      problem={view?.problem ?? null}
      format={String}
      parse={(input) => {
        if (!/^\d+$/.test(input.trim())) return { ok: false, error: "0以上の整数を入力してください" };
        const value = Number(input.trim());
        const error = validateScore(table, index, value, { advanced });
        return error ? { ok: false, error } : { ok: true, value };
      }}
      apply={(v) => update((b) => writeScore(b, table, scope, index, v, { advanced }))}
      inputMode="numeric"
      hint={`0〜${(advanced ? 0xffff_ffff : t.max).toLocaleString()}`}
      note={scope === "cycle" ? "周回の終わりに 0" : "周回をまたいで残る"}
    />
  );

  return (
    <CollapsibleCard title={t.label} description={SCORE_NOTES[table]} contentClassName="flex flex-col gap-4">
      {top.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="text-muted-foreground">累計の上位：</span>
          {top.map((x) => (
            <button
              key={x.i}
              type="button"
              className="hover:bg-muted rounded border px-1.5 py-0.5"
              onClick={() => setIndex(x.i)}
            >
              {scoreEntryName(table, x.i) ?? "不明"} {x.n.toLocaleString()}
            </button>
          ))}
        </div>
      )}
      <SearchSelectRow
        label={table === "arts" ? "技" : "道具"}
        offset={scoreOffset(table, "cycle", index)}
        value={view ? String(index) : null}
        currentLabel="不明"
        options={options}
        problem={null}
        onChange={(v) => setIndex(Number(v))}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {countRow("cycle")}
        {countRow("total")}
      </div>
    </CollapsibleCard>
  );
}
