import { STATS_ANCHORS } from "./anchors";
import { useCallback, useMemo, useState } from "react";
import { CollapsibleCard } from "@/components/collapsible-card";
import { FieldRow, type ParseResult } from "@/components/field-row";
import { SearchSelectRow } from "@/components/search-select-row";
import type { SelectOption } from "@/components/select-options";
import {
  SCORE_SYSTEM_MAX,
  SCORE_TABLES,
  readScoreTable,
  scoreEntries,
  scoreEntryName,
  scoreOffset,
  validateScore,
  writeScore,
  type ScoreScope,
  type ScoreTableId,
} from "@/save/score-tables";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { formatWarnings } from "@/lib/format";
import { parseInteger } from "@/lib/parse";
import { useSaveView } from "@/lib/use-save-view";
import { useWrite } from "@/lib/use-write";
import { PageBanner } from "@/components/page-banner";
import { tr, type Localized } from "@/lib/i18n";
import {
  STAT_FIELDS,
  STAT_GROUPS,
  formatSeconds,
  readStats,
  validateStat,
  writeStat,
  type StatField,
  type StatGroupId,
} from "@/save/stats";

/** 最初から開いておくまとまり */
const OPEN_GROUPS: readonly StatGroupId[] = ["evaluation", "actions"];

/** float32 は有効桁7桁程度なので、それを超える桁は表示しない */
const formatValue = (field: StatField) => (v: number) =>
  field.type === "f32" ? String(Number(v.toPrecision(7))) : String(v);

const unsignedError = () => ({
  error: tr({ ja: "0以上の整数を入力してください", en: "Enter a whole number of 0 or more" }),
});

function parseValue(field: StatField, input: string, advanced: boolean): ParseResult<number> {
  if (field.type !== "f32") return parseInteger(input, (value) => validateStat(field, value, { advanced }), unsignedError());
  const text = input.trim();
  if (!/^-?\d+(\.\d+)?$/.test(text)) return { ok: false, error: tr({ ja: "数値を入力してください", en: "Enter a number" }) };
  const value = Number(text);
  const error = validateStat(field, value, { advanced });
  return error ? { ok: false, error } : { ok: true, value };
}

/** 0 から max までの範囲の表示 */
const rangeText = (max: number) => tr({ ja: `0〜${max.toLocaleString()}`, en: `0–${max.toLocaleString()}` });

function unitHint(field: StatField, value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "";
  const paren = (s: string) => tr({ ja: `（${s}）`, en: ` (${s})` });
  if (field.unit === "seconds") return paren(formatSeconds(value));
  if (field.unit === "distance") return paren(`${(value / 1000).toFixed(1)} km`);
  return "";
}

export function StatsPage() {
  const { write: update } = useWrite();
  const { advanced } = useAdvancedMode();
  const { view, error: readError, problem } = useSaveView(readStats);
  const byKey = new Map(view?.values.map((v) => [v.field.key, v]));

  const row = (field: StatField) => {
    const v = byKey.get(field.key) ?? null;
    const value = v?.value ?? null;
    return (
      <FieldRow
        key={field.key}
        label={tr(field.label)}
        offset={field.offset}
        value={value}
        problem={view?.problem ?? null}
        warning={formatWarnings(v?.warnings)}
        format={formatValue(field)}
        parse={(input) => parseValue(field, input, advanced)}
        apply={(n) => update((b) => writeStat(b, field.key, n, { advanced }))}
        inputMode={field.type === "f32" ? "decimal" : "numeric"}
        hint={`${rangeText(field.max)}${unitHint(field, value)}`}
        note={tr(field.note)}
      />
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <PageBanner error={readError} problem={problem} />
      {/* 書き換えたときのゲーム内の表示は要ゲーム内確認 */}
      <p className="text-muted-foreground text-sm">
        {tr({
          ja: "侍点は「基本情報」、周回数は「世界 / 阿弥浜」、経過日数は「世界 / 阿弥浜」の日数で編集します。上限はゲームが値を増やすときの上限で、上級者モードではさらに大きな値も入力できます。",
          en: "Edit Samurai Points on the Basics screen, and the playthrough count and days elapsed on the World / Amihama screen. The limits are those the game uses when increasing these values; Advanced mode lets you enter larger values.",
        })}
      </p>
      {STAT_GROUPS.map((g) => (
        <CollapsibleCard
          key={g.id}
          anchor={STATS_ANCHORS.group(g.id)}
          title={tr(g.label)}
          description={tr(g.note)}
          defaultOpen={OPEN_GROUPS.includes(g.id)}
          contentClassName="grid gap-4 sm:grid-cols-2"
        >
          {STAT_FIELDS.filter((f) => f.group === g.id).map(row)}
        </CollapsibleCard>
      ))}
      <ScoreTableCard key="arts" table="arts" />
      <ScoreTableCard key="items" table="items" />
    </div>
  );
}

// arts のゲームの上限は未確認（上限はエディタの目安）。
// とどめを刺した技・使った道具の周回中と累計が 1 ずつ増え、累計でいちばん多いものが記録の画面に出る
const SCORE_NOTES: Record<ScoreTableId, Localized> = {
  arts: {
    ja: "技ごとに、とどめを刺した回数です。いちばん多い技が「得意技」になります。",
    en: "How many times each move finished someone off. The move with the most becomes your \"Signature Move\".",
  },
  items: {
    ja: "道具ごとに、使った回数です。いちばん多い道具が「好きな道具」になります。",
    en: "How many times each item was used. The item used most becomes your \"Preferred Item\".",
  },
};

const SCORE_TOP = 10;

/** 🟢 技ごとの斬殺数・道具の使用回数。1件を選んで、周回中と累計を書く */
function ScoreTableCard({ table }: { table: ScoreTableId }) {
  const { write: update } = useWrite();
  const { advanced } = useAdvancedMode();
  const t = SCORE_TABLES[table];
  const read = useCallback((bytes: Uint8Array) => readScoreTable(bytes, table), [table]);
  const { view, error, problem } = useSaveView(read);
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
      key={scope}
      label={scope === "cycle" ? tr({ ja: "周回中", en: "This playthrough" }) : tr({ ja: "累計", en: "All-time" })}
      offset={scoreOffset(table, scope, index)}
      value={view ? (scope === "cycle" ? view.cycle[index] : view.total[index]) : null}
      problem={view?.problem ?? null}
      format={String}
      parse={(input) => parseInteger(input, (value) => validateScore(table, index, value, { advanced }), unsignedError())}
      apply={(v) => update((b) => writeScore(b, table, scope, index, v, { advanced }))}
      inputMode="numeric"
      hint={rangeText(advanced ? SCORE_SYSTEM_MAX : t.max)}
      note={
        scope === "cycle"
          ? tr({ ja: "周回の終わりに 0", en: "Reset to 0 at the end of a playthrough" })
          : tr({ ja: "周回をまたいで残る", en: "Carries over between playthroughs" })
      }
    />
  );

  return (
    <CollapsibleCard anchor={STATS_ANCHORS.scoreTable(table)} title={tr(t.label)} description={tr(SCORE_NOTES[table])} contentClassName="flex flex-col gap-4">
      <PageBanner error={error} problem={problem} />
      {(!view || top.length > 0) && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="text-muted-foreground">{tr({ ja: "累計の上位：", en: "Top all-time:" })}</span>
          {!view && <span className="text-muted-foreground">—</span>}
          {top.map((x) => (
            <button
              key={x.i}
              type="button"
              className="hover:bg-muted rounded border px-1.5 py-0.5"
              onClick={() => setIndex(x.i)}
            >
              {scoreEntryName(table, x.i) ?? tr({ ja: "不明", en: "Unknown" })} {x.n.toLocaleString()}
            </button>
          ))}
        </div>
      )}
      <SearchSelectRow
        label={table === "arts" ? tr({ ja: "技", en: "Move" }) : tr({ ja: "道具", en: "Item" })}
        offset={scoreOffset(table, "cycle", index)}
        // 表示する1件を選ぶだけでセーブには書かないので、未読み込みのときも選べる
        value={String(index)}
        currentLabel={tr({ ja: "不明", en: "Unknown" })}
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
