import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { CertaintyBadge } from "@/components/certainty-badge";
import { FieldRow, type ParseResult } from "@/components/field-row";
import type { SelectOption } from "@/components/select-options";
import { SelectRow } from "@/components/select-row";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { formatHex2 } from "@/lib/format";
import { useSave } from "@/lib/save-context";
import {
  FACTIONS,
  FACTION_ROWS,
  FACTION_VALUE_MAX,
  factionOffset,
  readFactions,
  validateFactionValue,
  writeFactionValue,
  type FactionsView,
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
  EVENT_NAMES,
  EVENT_RECORD_OFFSET,
  EVENT_STATES,
  EVENT_STATE_OFFSET,
  readEvents,
  stateLabel,
  writeEventState,
  type EventEntry,
  type EventsView,
} from "@/save/scenario-events";

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));
/** シナリオ差分（§3.5）で読みを推定した。書き込みはゲーム内で未確認 */
const diffBadge = <CertaintyBadge mark="🔶" text="差分から推定・書き込み未検証" />;

type Views = { date: DateView; events: EventsView; factions: FactionsView };

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
      return { views: { date: readDate(b), events: readEvents(b), factions: readFactions(b) } };
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
          書き換えたセーブがゲームで読めるか、意図どおりに反映されるかは確かめていません。
          書き換える前のセーブを残してから試してください。
        </AlertDescription>
      </Alert>

      <DateCard key={`${k}-date`} view={views?.date ?? null} />
      <FactionCard key={`${k}-factions`} view={views?.factions ?? null} />
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
          時間帯（0x0010・0x0014）と保留量（0x0012）は、書き換えがゲームに反映されることを確認済みです。
          日数は 0x0010 の日の部分では変わらなかったため、0x0BD8（経過日数）を候補として一緒に書きます（未確認）。
          {view &&
            ` 生の値：0x0010＝${view.raw.dayTime}、0x0012＝${view.pending}、0x0014＝${view.raw.slot}、0x0BD8＝${view.raw.dayIndex}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <FieldRow
          label="日数"
          offset={DATE_OFFSETS.dayIndex}
          badges={diffBadge}
          value={view?.day ?? null}
          problem={problem}
          warning={view?.warning}
          format={String}
          parse={(input) => parseInteger(input, (v) => validateDay(v, { advanced }))}
          apply={(day) => update((b) => writeDayTime(b, day, view!.slot, { advanced }))}
          inputMode="numeric"
          hint={`${range.min}〜${range.max}日目`}
          note="0x0BD8（u32、経過日数）・0x0010（u16）・0x0014（u8）を書きます。0x0010 だけでは日数は変わりませんでした"
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

/** 勢力の 3×3 表。view が null ならセーブ未読み込み */
function FactionCard({ view }: { view: FactionsView | null }) {
  const { update } = useSave();
  const { advanced } = useAdvancedMode();
  const max = advanced ? FACTION_VALUE_MAX.system : FACTION_VALUE_MAX.normal;

  return (
    <Card>
      <CardHeader>
        <CardTitle>勢力の記録</CardTitle>
        <CardDescription>
          0x3780〜0x3788 の9バイトを、3勢力 × 3項目に並べたものと推定しています。
          項目の意味と勢力の並びは、6回の差分からの推測です。友好度そのもの（符号つきの値）は別の場所にある可能性があります。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {FACTION_ROWS.map((row, r) => (
          <div key={row.label} className="flex flex-col gap-2">
            <p className="text-sm font-medium">{row.label}</p>
            <div className="grid gap-4 sm:grid-cols-3">
              {FACTIONS.map((faction, c) => (
                <FieldRow
                  key={faction}
                  label={faction}
                  offset={factionOffset(r, c)}
                  badges={r === 0 && c === 0 ? diffBadge : undefined}
                  value={view?.values[r][c] ?? null}
                  problem={view?.problem ?? null}
                  format={String}
                  parse={(input) =>
                    parseInteger(input, (v) => validateFactionValue(v, { advanced }))
                  }
                  apply={(v) => update((b) => writeFactionValue(b, r, c, v, { advanced }))}
                  inputMode="numeric"
                  hint={`0〜${max}`}
                  note={row.note}
                />
              ))}
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
    label: `${formatHex2(s.value)} ${s.label}`,
  }));
  // 上級者モードでは、まだ見ていない値（大成功などの候補）も選べるようにする
  if (advanced)
    for (const v of [0x01, 0x02])
      options.push({ value: String(v), label: `${formatHex2(v)} 未確認`, group: "未確認の値" });
  return options;
}

/** イベントの状態。view が null ならセーブ未読み込み */
function EventsCard({ view }: { view: EventsView | null }) {
  const { advanced } = useAdvancedMode();
  const options = useMemo(() => stateOptions(advanced), [advanced]);
  const named = Object.keys(EVENT_NAMES).map(Number);
  const others = view?.entries.filter((e) => !(e.index in EVENT_NAMES)) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>イベントの状態</CardTitle>
        <CardDescription>
          周回中の状態（0x36A8＋添字）を書き換えます。周回をまたぐ記録（0x3838＋添字、🔶
          生きた証）は表示だけで、書き換えません。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {named.map((i) => (
            <EventRow
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
            名前の分からない添字（{others.length}件）
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid gap-4 pt-3 sm:grid-cols-3 lg:grid-cols-4">
              {others.map((e) => (
                <EventRow
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

function EventRow({
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
  const record = entry === null ? "" : `記録：${formatHex2(entry.record)} ${stateLabel(entry.record)}`;

  return (
    <SelectRow
      label={name ? `${index}. ${name.name}` : `添字 ${index}`}
      offset={EVENT_STATE_OFFSET + index}
      badges={
        name && (
          <CertaintyBadge
            mark="🔶"
            text={`${name.day}・${name.basis === "diff" ? "差分で確認" : "推測"}`}
          />
        )
      }
      value={entry ? String(entry.state) : null}
      currentLabel={entry ? `${formatHex2(entry.state)} ${stateLabel(entry.state)}` : undefined}
      options={options}
      problem={problem}
      hint={record}
      note={`記録の位置：0x${(EVENT_RECORD_OFFSET + index).toString(16).toUpperCase()}`}
      onChange={(v) => update((b) => writeEventState(b, index, Number(v), { advanced }))}
    />
  );
}
