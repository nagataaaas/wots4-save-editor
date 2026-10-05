import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { CertaintyBadge } from "@/components/certainty-badge";
import { FieldRow, type ParseResult } from "@/components/field-row";
import type { SelectOption } from "@/components/select-options";
import { SelectRow } from "@/components/select-row";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { WORLD_FLAGS, readWorldFlags, writeWorldFlag, type WorldFlagsView } from "@/save/world-flags";
import { formatHex2 } from "@/lib/format";
import { useSave } from "@/lib/save-context";
import {
  FACTIONS,
  FACTION_ROWS,
  FACTION_VALUE_MAX,
  HOSTILE_ROW,
  HOSTILE_VALUES,
  ROUTE_JUDGE_OFFSET,
  ROUTE_JUDGE_VALUES,
  ROUTE_NONE_OFFSET,
  ROUTE_NONE_VALUES,
  ROUTE_THRESHOLD,
  factionOffset,
  routeEligible,
  readFactions,
  readRouteJudge,
  validateFactionValue,
  writeFactionValue,
  writeRouteJudge,
  type FactionsView,
  type RouteJudgeView,
} from "@/save/factions";
import {
  DATE_OFFSETS,
  DAY_RANGE,
  PENDING_VALUES,
  TIME_SLOTS,
  readDate,
  validateDay,
  writeDayTime,
  writePending,
  type DateView,
} from "@/save/scenario-date";
import {
  EVENT_COUNT,
  EVENT_NAMES,
  EVENT_RECORDS,
  EVENT_RECORD_OFFSET,
  EVENT_STATES,
  EVENT_STATE_OFFSET,
  EVENT_USED_COUNT,
  bulkIndices,
  readEvents,
  recordLabel,
  stateLabel,
  writeEventRecord,
  writeEventRecords,
  writeEventState,
  writeEventStates,
  type BulkScope,
  type EventEntry,
  type EventsView,
} from "@/save/scenario-events";

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

type Views = {
  date: DateView;
  events: EventsView;
  factions: FactionsView;
  route: RouteJudgeView;
  flags: WorldFlagsView;
};

function parseInteger(input: string, validate: (v: number) => string | null): ParseResult<number> {
  if (!/^\d+$/.test(input.trim())) return { ok: false, error: "0以上の整数を入力してください" };
  const value = Number(input.trim());
  const error = validate(value);
  return error ? { ok: false, error } : { ok: true, value };
}

export function ScenarioPage() {
  const { save } = useSave();

  const result = useMemo((): { views: Views } | { error: string } | null => {
    if (!save) return null;
    try {
      const b = save.working;
      return {
        views: {
          date: readDate(b),
          events: readEvents(b),
          factions: readFactions(b),
          route: readRouteJudge(b),
          flags: readWorldFlags(b),
        },
      };
    } catch (e) {
      return { error: errorMessage(e) };
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

  const views = result?.views ?? null;
  const k = save?.loadId ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {!views && (
        <Alert>
          <AlertTitle>セーブファイルが読み込まれていません</AlertTitle>
          <AlertDescription>
            サイドバーの「ファイルを開く」から読み込むと、下の項目を編集できます。
          </AlertDescription>
        </Alert>
      )}

      {views?.date.layoutProblem && (
        <Alert variant="destructive">
          <AlertTitle>読み取り専用</AlertTitle>
          <AlertDescription>{views.date.layoutProblem}</AlertDescription>
        </Alert>
      )}

      <Alert>
        <AlertTitle>検証用（要ゲーム内確認）</AlertTitle>
        <AlertDescription>
          この画面の項目は、どれもセーブの差分から推定したものです（解析ノート §3.5）。
          日数・時間帯、イベントの失敗（05）・未到達（FF）、チャート表示、勢力の友好度 +・−・敵対状態は書き換えの反映を確認済みです。そのほかの値は確かめていません。
          書き換える前のセーブを残してから試してください。
        </AlertDescription>
      </Alert>

      <DateCard key={`${k}-date`} view={views?.date ?? null} />
      <FactionCard
        key={`${k}-factions`}
        view={views?.factions ?? null}
        route={views?.route ?? null}
      />
      <WorldFlagsCard key={`${k}-flags`} view={views?.flags ?? null} />
      <EventsCard key={`${k}-events`} view={views?.events ?? null} />
    </div>
  );
}

const slotOptions: SelectOption[] = TIME_SLOTS.map((label, i) => ({ value: String(i), label }));
const pendingOptions: SelectOption[] = PENDING_VALUES.map((v) => ({
  value: String(v),
  label: v === 0 ? "0（なし）" : `${v}（エリア移動・ロードで時間帯が1つ進む）`,
}));

/** 日数・時間帯。view が null ならセーブ未読み込み */
function DateCard({ view }: { view: DateView | null }) {
  const { update } = useSave();
  const { advanced } = useAdvancedMode();
  const range = advanced ? DAY_RANGE.system : DAY_RANGE.normal;
  const problem = view?.problem ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>日数・時間帯</CardTitle>
        <CardDescription>
          日数（0x0BD8・0x0010・0x0014）・時間帯（0x0010・0x0014）・保留量（0x0012）は、書き換えがゲームに反映されることを確認済みです。
          日を進めると、過ぎた時間帯に済ませていないイベントはチャートで失敗と表示されます（寝て日を飛ばしたときと同じ）。
          {view &&
            ` 生の値：0x0010＝${view.raw.dayTime}、0x0012＝${view.pending}、0x0014＝${view.raw.slot}、0x0BD8＝${view.raw.dayIndex}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <FieldRow
          label="日数"
          offset={DATE_OFFSETS.dayIndex}
          value={view?.day ?? null}
          problem={problem}
          warning={view?.warning}
          format={String}
          parse={(input) => parseInteger(input, (v) => validateDay(v, { advanced }))}
          apply={(day) => update((b) => writeDayTime(b, day, view!.slot, { advanced }))}
          inputMode="numeric"
          hint={`${range.min}〜${range.max}日目`}
          note="0x0BD8（u32、経過日数）・0x0010（u16）・0x0014（u8）を書きます。0x0010 だけでは日数は変わりませんでした。日を進めると、過ぎた時間帯の未処理イベントはチャートで失敗と表示されます（セーブ上の状態は変わりません）。4日目以降は 0x0010 に 400 を書きます"
        />
        <SelectRow
          label="時間帯"
          offset={DATE_OFFSETS.slot}
          value={view ? String(view.slot) : null}
          options={slotOptions}
          problem={problem}
          note="0x0010（u16）と 0x0014（u8）を書きます。ゲーム内で反映を確認済み"
          onChange={(v) => update((b) => writeDayTime(b, view!.day, Number(v), { advanced }))}
        />
        <SelectRow
          label="時間帯を進める保留量"
          offset={DATE_OFFSETS.pending}
          value={view ? String(view.pending) : null}
          options={pendingOptions}
          problem={problem}
          note="イベントを完了すると 10 が入り、エリア移動やロードのときに 0x0010 に足されて 0 に戻ると推定しています"
          onChange={(v) => update((b) => writePending(b, Number(v)))}
        />
      </CardContent>
    </Card>
  );
}

const flagOptions: SelectOption[] = [
  { value: "0", label: "0" },
  { value: "1", label: "1" },
];

/** 門・柵のフラグ候補。view が null ならセーブ未読み込み */
function WorldFlagsCard({ view }: { view: WorldFlagsView | null }) {
  const { update } = useSave();
  const { advanced } = useAdvancedMode();

  return (
    <Card>
      <CardHeader>
        <CardTitle>門・柵のフラグ（候補）</CardTitle>
        <CardDescription>
          ルート分岐を書き換えても、門が閉じたままだとそのルートに進めませんでした。
          大寄せのあと、根無し草では 0x37FA・0x37FB が 1、幕府ルートでは 0 だったので、門の候補として表示しています。
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        {WORLD_FLAGS.map((flag, i) => (
          <SelectRow
            key={flag.offset}
            label={flag.label}
            offset={flag.offset}
            badges={<CertaintyBadge mark="🔶" text="差分から推定・書き込み未検証" />}
            value={view ? String(view.values[i]) : null}
            currentLabel={view ? String(view.values[i]) : undefined}
            options={flagOptions}
            problem={view?.problem ?? null}
            note={flag.note}
            onChange={(v) => update((b) => writeWorldFlag(b, i, Number(v), { advanced }))}
          />
        ))}
      </CardContent>
    </Card>
  );
}

const hostileOptions: SelectOption[] =HOSTILE_VALUES.map((v) => ({
  value: String(v.value),
  label: `${v.value} ${v.label}`,
}));
const judgeOptions: SelectOption[] =ROUTE_JUDGE_VALUES.map((v) => ({
  value: String(v.value),
  label: `${formatHex2(v.value)} ${v.label}`,
}));
const noneOptions: SelectOption[] = ROUTE_NONE_VALUES.map((v) => ({
  value: String(v.value),
  label: `${formatHex2(v.value)} ${v.label}`,
}));

/** 剣術大会以後のルート分岐（0x3789〜0x378C）。view が null ならセーブ未読み込み */
function RouteJudgeRows({
  view,
  factions,
}: {
  view: RouteJudgeView | null;
  factions: FactionsView | null;
}) {
  const { update } = useSave();
  const { advanced } = useAdvancedMode();
  const problem = view?.problem ?? null;
  const current = (v: number) => `${formatHex2(v)} 不明`;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">剣術大会以後のルート分岐</p>
      <div className="grid gap-4 sm:grid-cols-4">
        {FACTIONS.map((faction, c) => (
          <SelectRow
            key={faction}
            label={faction}
            offset={ROUTE_JUDGE_OFFSET + c}
            value={view ? String(view.judges[c]) : null}
            currentLabel={view ? current(view.judges[c]) : undefined}
            options={judgeOptions}
            problem={problem}
            hint={
              factions && !factions.problem
                ? `今の記録なら大寄せで${routeEligible(factions.values, c) ? "入れる" : "入れない"}（友好度 ${factions.values[0][c]} − ${factions.values[1][c]} ＝ ${factions.values[0][c] - factions.values[1][c]}）`
                : undefined
            }
            note={`大寄せのときに書かれる。友好度（友好度 + − 友好度 −）が ${ROUTE_THRESHOLD} 以上で 01（入れる）、それ未満で 02（入れない）。敵対状態は関係しない`}
            onChange={(v) => update((b) => writeRouteJudge(b, c, Number(v), { advanced }))}
          />
        ))}
        <SelectRow
          label="無所属"
          offset={ROUTE_NONE_OFFSET}
          value={view ? String(view.none) : null}
          currentLabel={view ? current(view.none) : undefined}
          options={noneOptions}
          problem={problem}
          warning={view?.warning}
          note="どの勢力にも入れないとき 01（根無し草）。勢力のどれかが 01 だと、ここが 01 でも根無し草にはならない"
          onChange={(v) => update((b) => writeRouteJudge(b, FACTIONS.length, Number(v), { advanced }))}
        />
      </div>
    </div>
  );
}

/** 勢力の 3×3 表。view が null ならセーブ未読み込み */
function FactionCard({ view, route }: { view: FactionsView | null; route: RouteJudgeView | null }) {
  const { update } = useSave();
  const { advanced } = useAdvancedMode();
  const max = advanced ? FACTION_VALUE_MAX.system : FACTION_VALUE_MAX.normal;

  return (
    <Card>
      <CardHeader>
        <CardTitle>勢力の記録</CardTitle>
        <CardDescription>
          0x3780〜0x3788 の9バイトを、3勢力 × 3項目に並べたものと推定しています。
          友好度は「友好度 +（協力・成功）− 友好度 −（不利益・敵対行為）」です（Wiki の説明と差分が合う）。
          大寄せの時点で友好度が 3 以上の勢力のルートに入れます（書き換えで確認済み）。
          友好度そのもの（符号つきの値）は別の場所にある可能性があります。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <RouteJudgeRows view={route} factions={view} />
        {FACTION_ROWS.map((row, r) => (
          <div key={row.label} className="flex flex-col gap-2">
            <p className="text-sm font-medium">{row.label}</p>
            <div className="grid gap-4 sm:grid-cols-3">
              {FACTIONS.map((faction, c) =>
                r === HOSTILE_ROW ? (
                  <SelectRow
                    key={faction}
                    label={faction}
                    offset={factionOffset(r, c)}
                    value={view ? String(view.values[r][c]) : null}
                    currentLabel={view ? `${view.values[r][c]} 不明` : undefined}
                    options={hostileOptions}
                    problem={view?.problem ?? null}
                    note={row.note}
                    onChange={(v) => update((b) => writeFactionValue(b, r, c, Number(v), { advanced }))}
                  />
                ) : (
                  <FieldRow
                    key={faction}
                    label={faction}
                    offset={factionOffset(r, c)}
                    value={view?.values[r][c] ?? null}
                    problem={view?.problem ?? null}
                    format={String}
                    parse={(input) =>
                      parseInteger(input, (v) => validateFactionValue(v, { advanced }, r))
                    }
                    apply={(v) => update((b) => writeFactionValue(b, r, c, v, { advanced }))}
                    inputMode="numeric"
                    hint={`0〜${max}`}
                    note={row.note}
                  />
                ),
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function stateOptions(advanced: boolean): SelectOption[] {
  const options: SelectOption[] = EVENT_STATES.map((s) => ({
    value: String(s.value),
    label: `${formatHex2(s.value)} ${s.label}${s.confirmed ? "" : "（未確認）"}`,
  }));
  // 上級者モードでは、まだ見ていない値（大成功などの候補）も選べるようにする
  if (advanced)
    for (const v of [0x02])
      options.push({ value: String(v), label: `${formatHex2(v)} 不明`, group: "未確認の値" });
  return options;
}

const recordOptions: SelectOption[] = EVENT_RECORDS.map((r) => ({
  value: String(r.value),
  label: `${formatHex2(r.value)} ${r.label}`,
}));

/** イベントの状態。view が null ならセーブ未読み込み */
function EventsCard({ view }: { view: EventsView | null }) {
  const { advanced } = useAdvancedMode();
  const options = useMemo(() => stateOptions(advanced), [advanced]);
  // 使われている添字（0〜98）は名前の有無にかかわらず添字順に並べ、それより後はトグルの中に入れる
  const used = Array.from({ length: EVENT_USED_COUNT }, (_, i) => i);
  const unused = view?.entries.slice(EVENT_USED_COUNT) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>イベントの状態</CardTitle>
        <CardDescription>
          「状態」は周回中の状態（0x36A8＋添字）です。失敗（05）と未到達（FF）は、書き換えでチャートの表示が変わることを確認済みです。
          「チャート表示」は周回をまたぐ記録（0x3838＋添字、🔶
          生きた証）で、FF ならチャートに出ず、04 なら出ます（確認済み）。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <BulkEventsPanel problem={view?.problem ?? null} disabled={!view} stateOptions={options} />
        <div className="grid gap-4 sm:grid-cols-2">
          {used.map((i) => (
            <EventBox
              key={i}
              index={i}
              entry={view?.entries[i] ?? null}
              problem={view?.problem ?? null}
              options={options}
            />
          ))}
        </div>

        <Collapsible className="flex flex-col">
          <CollapsibleTrigger className="group hover:text-foreground text-muted-foreground flex items-center gap-1 border-b pb-1 text-left text-sm font-medium">
            <ChevronRight
              className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-90"
              aria-hidden
            />
            使われていないように見える添字 {EVENT_USED_COUNT}〜{EVENT_COUNT - 1}（{unused.length}件）
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid gap-4 pt-3 sm:grid-cols-2 lg:grid-cols-3">
              {unused.map((e) => (
                <EventBox
                  key={e.index}
                  index={e.index}
                  entry={e}
                  problem={view?.problem ?? null}
                  options={options}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

const scopeOptions: { value: BulkScope; label: string }[] = [
  { value: "named", label: `名前の分かる添字（${bulkIndices("named").length}件）` },
  { value: "used", label: `使われている添字 0〜${EVENT_USED_COUNT - 1}（${EVENT_USED_COUNT}件）` },
  { value: "all", label: `すべての添字（${EVENT_COUNT}件）` },
];

/** デバッグ用：状態・チャート表示を範囲内の添字にまとめて書く */
function BulkEventsPanel({
  problem,
  disabled,
  stateOptions,
}: {
  problem: string | null;
  disabled: boolean;
  stateOptions: SelectOption[];
}) {
  const { update } = useSave();
  const { advanced } = useAdvancedMode();
  const [scope, setScope] = useState<BulkScope>("named");
  const [state, setState] = useState<string>("");
  const [record, setRecord] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const locked = disabled || problem !== null;

  const run = (write: (b: Uint8Array) => void) => {
    setError(null);
    try {
      update(write);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border border-dashed p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
        一括設定（デバッグ用）
        <CertaintyBadge mark="❓" text="ゲームへの影響は未確認" />
      </div>
      <p className="text-muted-foreground text-xs">
        選んだ範囲の添字に、同じ値をまとめて書きます。添字 99 以降は使われていないように見える（状態・記録とも FF）ため、
        「すべて」で FF 以外を書くとゲームが想定しない並びになるかもしれません。
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <BulkSelect
          label="範囲"
          value={scope}
          options={scopeOptions}
          disabled={locked}
          onChange={(v) => setScope(v as BulkScope)}
        />
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
              run((b) => writeEventStates(b, bulkIndices(scope), Number(state), { advanced }))
            }
          >
            書く
          </Button>
        </div>
        <div className="flex items-end gap-2">
          <BulkSelect
            label="チャート表示"
            value={record}
            options={recordOptions}
            disabled={locked}
            onChange={setRecord}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={locked || record === ""}
            onClick={() =>
              run((b) => writeEventRecords(b, bulkIndices(scope), Number(record), { advanced }))
            }
          >
            書く
          </Button>
        </div>
      </div>
      {problem && <p className="text-muted-foreground text-xs">読み取り専用：{problem}</p>}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
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
      <Select value={value} disabled={disabled} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="選ぶ" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** 1イベント分の枠。周回中の状態とチャート表示（記録）を並べる */
function EventBox({
  index,
  entry,
  problem,
  options,
}: {
  index: number;
  entry: EventEntry | null;
  problem: string | null;
  options: SelectOption[];
}) {
  const { update } = useSave();
  const { advanced } = useAdvancedMode();
  const name = EVENT_NAMES[index];

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
        {name ? `${index}. ${name.name}` : `添字 ${index}`}
        {name &&
          (name.basis === "chart" ? (
            // ✅ チャートで確認した対応にはバッジを付けない
            <span className="text-muted-foreground text-xs font-normal">{name.day}</span>
          ) : (
            <CertaintyBadge
              mark="🔶"
              text={`${name.day}・${name.basis === "diff" ? "差分で確認" : "推測"}`}
            />
          ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectRow
          label="状態"
          offset={EVENT_STATE_OFFSET + index}
          value={entry ? String(entry.state) : null}
          currentLabel={entry ? `${formatHex2(entry.state)} ${stateLabel(entry.state)}` : undefined}
          options={options}
          problem={problem}
          onChange={(v) => update((b) => writeEventState(b, index, Number(v), { advanced }))}
        />
        <SelectRow
          label="チャート表示"
          offset={EVENT_RECORD_OFFSET + index}
          value={entry ? String(entry.record) : null}
          currentLabel={entry ? `${formatHex2(entry.record)} ${recordLabel(entry.record)}` : undefined}
          options={recordOptions}
          problem={problem}
          note="周回をまたぐ記録（生きた証）。FF で出ない、04 で出る。ほかの周回にも引き継がれる可能性があります"
          onChange={(v) => update((b) => writeEventRecord(b, index, Number(v), { advanced }))}
        />
      </div>
    </div>
  );
}
