import { useMemo, useState, type ReactNode } from "react";
import { CertaintyBadge } from "@/components/certainty-badge";
import { FieldRow, type ParseResult } from "@/components/field-row";
import type { SelectOption } from "@/components/select-options";
import { SearchSelectRow } from "@/components/search-select-row";
import { SelectRow } from "@/components/select-row";
import { CHART_NODES } from "@/save/master/chart-nodes";
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
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import {
  SCENARIO_FLAGS,
  WORLD_FLAGS,
  readScenarioFlags,
  readWorldFlags,
  writeScenarioFlag,
  writeWorldFlag,
  type ScenarioFlagsView,
  type WorldFlagMeaning,
  type WorldFlagsView,
} from "@/save/world-flags";
import {
  FACILITY_FLAGS,
  facilitiesReadyForLightOfHope,
  facilitySlotEvent,
  readFacilityFlags,
  writeFacilityFlag,
  type FacilityFlagsView,
} from "@/save/facility-flags";
import {
  CHARACTER_LENGTH,
  CHARACTER_NORMAL_MAX,
  CHARACTER_NOTES,
  CHARACTER_START,
  readCharacters,
  validateCharacter,
  writeCharacter,
  type CharactersView,
} from "@/save/characters";
import {
  TOWNSFOLK_LENGTH,
  TOWNSFOLK_NOTES,
  TOWNSFOLK_START,
  readTownsfolk,
  validateTownsfolk,
  writeTownsfolk,
  type TownsfolkView,
} from "@/save/townsfolk";
import {
  HIDDEN_ROUTE_EVENT_INDEX,
  HIDDEN_ROUTE_OFFSET,
  HIDDEN_ROUTE_VALUES,
  RAW_ROUTE_OFFSETS,
  ROUTE_CANDIDATE_NOTES,
  ROUTE_CANDIDATE_START,
  readRouteCandidates,
  routeCandidateNormalMax,
  validateRouteCandidate,
  writeHiddenRoute,
  writeRouteCandidate,
  type RouteCandidatesView,
} from "@/save/route-candidates";
import {
  HINT_DEFAULT_TEXT,
  HINT_NONE,
  HINT_NORMAL_MAX,
  HINT_OFFSET,
  hintLabel,
  readHint,
  validateHint,
  writeHint,
  type HintView,
} from "@/save/hint";
import {
  PUBLIC_ORDER_LEVELS,
  PUBLIC_ORDER_MAX,
  PUBLIC_ORDER_OFFSET,
  readPublicOrder,
  validatePublicOrder,
  writePublicOrder,
  type PublicOrderView,
} from "@/save/public-order";
import { formatHex2, formatOffset } from "@/lib/format";
import { useSave } from "@/lib/save-context";
import {
  FACTIONS,
  FACTION_ROWS,
  FACTION_VALUE_MAX,
  HOSTILE_ROW,
  HOSTILE_VALUES,
  MORO_DEAD,
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
  EVENT_NAMES,
  EVENT_RECORD_OFFSET,
  EVENT_STATE_OFFSET,
  EVENT_GAP_INDICES,
  EVENT_GAP_NOTES,
  namedIndices,
  readEvents,
  recordLabel,
  stateLabel,
  writeEventRecord,
  writeEventRecords,
  writeEventState,
  writeEventStates,
  type EventEntry,
  type EventsView,
} from "@/save/scenario-events";
import { recordOptions, stateOptions } from "./event-options";

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

type Views = {
  date: DateView;
  events: EventsView;
  factions: FactionsView;
  route: RouteJudgeView;
  flags: WorldFlagsView;
  facilities: FacilityFlagsView;
  characters: CharactersView;
  townsfolk: TownsfolkView;
  routeCandidates: RouteCandidatesView;
  hint: HintView;
  publicOrder: PublicOrderView;
};

function parseInteger(input: string, validate: (v: number) => string | null): ParseResult<number> {
  if (!/^\d+$/.test(input.trim())) return { ok: false, error: "0以上の整数を入力してください" };
  const value = Number(input.trim());
  const error = validate(value);
  return error ? { ok: false, error } : { ok: true, value };
}

/** シナリオ：イベント・フラグ・人物・隠しルート・ヒント */
export function ScenarioPage() {
  return (
    <ViewsPage
      note={
        <>
          この画面の項目は、どれもセーブの差分から推定したものです（解析ドキュメントの event-chart・scenario-flags・characters・townsfolk・hidden-route・hint）。
          イベントの失敗（05）・未到達（FF）、チャート表示は書き換えの反映を確認済みです。そのほかの値は確かめていません。
        </>
      }
    >
      {(views, k) => (
        <>
          <ScenarioFlagsCard key={`${k}-scenario-flags`} />
          <CharactersCard key={`${k}-characters`} view={views?.characters ?? null} />
          <TownsfolkCard key={`${k}-townsfolk`} view={views?.townsfolk ?? null} />
          <RouteCandidatesCard
            key={`${k}-route-candidates`}
            view={views?.routeCandidates ?? null}
            sisters={views?.events.entries[HIDDEN_ROUTE_EVENT_INDEX]?.state ?? null}
          />
          <HintCard key={`${k}-hint`} view={views?.hint ?? null} />
          <EventsCard key={`${k}-events`} view={views?.events ?? null} />
        </>
      )}
    </ViewsPage>
  );
}

/** 世界：日数・時間帯、治安、勢力、門・柵、施設（ユーザー判断 2026-10-07） */
export function WorldPage() {
  return (
    <ViewsPage
      note={
        <>
          この画面の項目は、どれもセーブの差分から推定したものです（解析ドキュメントの date-location・factions・gates・facilities）。
          日数・時間帯、勢力の友好度 +・−・敵対状態は書き換えの反映を確認済みです。そのほかの値は確かめていません。
        </>
      }
    >
      {(views, k) => (
        <>
          <DateCard key={`${k}-date`} view={views?.date ?? null} />
          <PublicOrderCard key={`${k}-public-order`} view={views?.publicOrder ?? null} />
          <FactionCard key={`${k}-factions`} view={views?.factions ?? null} route={views?.route ?? null} />
          <WorldFlagsCard key={`${k}-flags`} view={views?.flags ?? null} />
          <FacilityFlagsCard key={`${k}-facilities`} view={views?.facilities ?? null} />
        </>
      )}
    </ViewsPage>
  );
}

/** セーブを読み、共通の注意書きを出して、children に各欄を描かせる。views が null ならセーブ未読み込み、k は読み込みごとの key */
function ViewsPage({
  note,
  children,
}: {
  note: ReactNode;
  children: (views: Views | null, k: number) => ReactNode;
}) {
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
          facilities: readFacilityFlags(b),
          characters: readCharacters(b),
          townsfolk: readTownsfolk(b),
          routeCandidates: readRouteCandidates(b),
          hint: readHint(b),
          publicOrder: readPublicOrder(b),
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
          {note}
          書き換える前のセーブを残してから試してください。
        </AlertDescription>
      </Alert>

      {children(views, k)}
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

const publicOrderLevelsText = PUBLIC_ORDER_LEVELS.map(
  (l, i) => `${l.label} ${l.min}〜${i === 0 ? PUBLIC_ORDER_MAX : PUBLIC_ORDER_LEVELS[i - 1].min - 1}`,
).join("／");

/** 治安の候補（0x0015）。view が null ならセーブ未読み込み */
function PublicOrderCard({ view }: { view: PublicOrderView | null }) {
  const { update } = useSave();
  const { advanced } = useAdvancedMode();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          治安
          <CertaintyBadge mark="🔶" text="位置は差分からの推定。要ゲーム内確認" />
        </CardTitle>
        <CardDescription>
          0x0015（u8）を治安の候補として出しています。鍛冶屋で踏み倒すと 10 下がり、手元のセーブでは 0〜99 に収まっていました。
          書き換えがゲーム内の「今の治安」に反映されるかは確かめていません。
          段階（候補）：{publicOrderLevelsText}。
          {view && ` 生の値：${view.value}（${formatHex2(view.value)}）${view.level ? `＝${view.level}` : ""}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <FieldRow
          label="治安（候補）"
          offset={PUBLIC_ORDER_OFFSET}
          value={view?.value ?? null}
          problem={view?.problem ?? null}
          warning={view?.warning}
          format={String}
          parse={(input) => parseInteger(input, (v) => validatePublicOrder(v, { advanced }))}
          apply={(v) => update((b) => writePublicOrder(b, v, { advanced }))}
          inputMode="numeric"
          hint={advanced ? "0〜255" : `0〜${PUBLIC_ORDER_MAX}`}
          note="🔶 0x0015 の1バイトだけを書きます。1日目のセーブで 0 の例があり、初期値 50 とは合いません（❓）"
        />
      </CardContent>
    </Card>
  );
}

/** 10進数か 0x 付きの16進数 */
function parseHint(input: string, advanced: boolean): ParseResult<number> {
  const s = input.trim();
  let value: number;
  if (/^0x[0-9a-f]+$/i.test(s)) value = Number.parseInt(s.slice(2), 16);
  else if (/^\d+$/.test(s)) value = Number(s);
  else return { ok: false, error: "整数（10進数、または 0x 付きの16進数）を入力してください" };
  const error = validateHint(value, { advanced });
  return error ? { ok: false, error } : { ok: true, value };
}

/** 次のイベントのヒント（0x3900）。view が null ならセーブ未読み込み */
function HintCard({ view }: { view: HintView | null }) {
  const { update } = useSave();
  const { advanced } = useAdvancedMode();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          次のイベントのヒント
          <CertaintyBadge mark="❓" text="2日目以降のノードのヒントの文は未確認" />
        </CardTitle>
        <CardDescription>
          0x3900（u16）には、最後に状態を進めたイベントの、チャート上のノード番号（0〜{HINT_NORMAL_MAX}）が入ります。
          ゲームはこの番号からヒントの文を決めます。ノード番号はイベントの通し番号とは別です。
          ヒントの文が分かっているのは1日目のノード 2〜10 だけです（🔶。6＝「港の様子でも見てみるか」は確認済み）。ほかのノードの文は未確認（❓）です。
          {view &&
            ` 現在の値：${hintLabel(view.value)}（0x${view.value.toString(16).toUpperCase().padStart(4, "0")}）。ヒントの文：${
              view.text ? `「${view.text}」🔶` : "未確認 ❓"
            }`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Alert>
          <AlertTitle>🔶 時間帯が合わないと既定の文になります</AlertTitle>
          <AlertDescription>
            ノードの時間帯と現在の時間帯が合わないと、ヒントは既定の「{HINT_DEFAULT_TEXT}」になります。
            ヒントを変えたいときは、現在の時間帯の直前に当たるノードを選んでください（例：2日目昼のセーブに 7・13・18・83・89 を書くと既定の文でした）。
          </AlertDescription>
        </Alert>
        <div className="grid gap-4 sm:grid-cols-2">
          <SearchSelectRow
            label="ノード（イベント）"
            offset={HINT_OFFSET}
            searchPlaceholder="番号・イベント名・英語名で検索"
            value={view ? String(view.value) : null}
            currentLabel={view ? hintLabel(view.value) : undefined}
            options={hintOptions}
            problem={view?.problem ?? null}
            warning={view?.warning}
            hint="イベントに当たらないノード・表にない値は警告します"
            note="🟢 ノードの表：datatable/event/chart-node.csv。1つのイベントが複数のノードを持つことがあります（大老暗殺計画は7つ など）。0xFFFF＝なし（🔶）"
            onChange={(v) => update((b) => writeHint(b, Number(v), { advanced }))}
          />
          <FieldRow
            label="生の値"
            offset={HINT_OFFSET}
            value={view?.value ?? null}
            problem={view?.problem ?? null}
            warning={view?.warning}
            format={String}
            parse={(input) => parseHint(input, advanced)}
            apply={(v) => update((b) => writeHint(b, v, { advanced }))}
            inputMode="text"
            hint={advanced ? "0〜65535（0x 付きの16進数も可）" : `0〜${HINT_NORMAL_MAX} か 65535（0xFFFF）`}
            note="0x3900〜0x3901 の2バイトだけを書きます。上級者モードでは任意の u16 を書けます"
          />
        </div>
      </CardContent>
    </Card>
  );
}

/** 🟢 ノード 0〜118 と 🔶 0xFFFF（なし） */
const hintOptions: SelectOption[] = [
  ...CHART_NODES.map((n) => ({
    value: String(n.id),
    label: hintLabel(n.id),
    group: n.eventId === null ? "イベントに当たらないノード" : "イベントのノード",
    keywords: [String(n.id), n.ja ?? "", n.en ?? ""],
  })),
  { value: String(HINT_NONE), label: hintLabel(HINT_NONE), group: "なし", keywords: ["65535", "0xFFFF", "なし"] },
];

const flagOptions: Record<WorldFlagMeaning, SelectOption[]> = {
  close: [
    { value: "0", label: "0 開いている" },
    { value: "1", label: "1 閉じている" },
  ],
  open: [
    { value: "0", label: "0 閉じている" },
    { value: "1", label: "1 開いている" },
  ],
};

/** 門・柵のフラグ。view が null ならセーブ未読み込み */
function WorldFlagsCard({ view }: { view: WorldFlagsView | null }) {
  const { update } = useSave();
  const { advanced } = useAdvancedMode();

  return (
    <Card>
      <CardHeader>
        <CardTitle>門・柵のフラグ</CardTitle>
        <CardDescription>
          ルート分岐を書き換えても、門が閉じたままだとそのルートに進めません。
          代官所の表門（0x37FA）・居留地（0x3764）の門と神社入口の柵（0x37C3）は、1 → 0 の書き換えで開くことを確認済みです。
          代官所の裏門（0x37FB）は表門と同じ場面で同じ値になるので、表門とそろえてください（裏門が開くかは要ゲーム内確認）。
          この4つは大寄せで、ルートに入れなかった勢力の門が閉じます（それより前の門には関係しません）。
          居留地の門と神社入口の柵は、大寄せのあとのイベントでも閉じることがあります。
          大寄せ前の代官所（0x377D）・居留地（0x377E）・神社（0x377F）の門は、値が逆で 1 が開いている状態です（書き換えで反映を確認済み）。
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        {WORLD_FLAGS.map((flag, i) => (
          <SelectRow
            key={flag.offset}
            label={flag.label}
            offset={flag.offset}
            value={view ? String(view.values[i]) : null}
            currentLabel={view ? `${view.values[i]} 不明` : undefined}
            options={flagOptions[flag.meaning]}
            problem={view?.problem ?? null}
            note={flag.note}
            onChange={(v) => update((b) => writeWorldFlag(b, i, Number(v), { advanced }))}
          />
        ))}
      </CardContent>
    </Card>
  );
}

/** 門・施設・人物以外で、1 になる場面の分かったフラグ（生の値＋候補） */
function ScenarioFlagsCard() {
  const { save, update } = useSave();
  const { advanced } = useAdvancedMode();
  const view = useMemo((): ScenarioFlagsView | null => {
    if (!save) return null;
    try {
      return readScenarioFlags(save.working);
    } catch {
      return null;
    }
  }, [save]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>そのほかのフラグ</CardTitle>
        <CardDescription>
          値が変わる場面だけが分かっているフラグです。書き換えたときにゲームへどう反映されるかは確かめていません（要ゲーム内確認）。
          通常モードでは、その場面で現れる値だけを選べます。
        </CardDescription>
        <div className="flex flex-wrap gap-2">
          <CertaintyBadge mark="❓" text="書き換えの反映は未確認" />
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        {SCENARIO_FLAGS.map((flag, i) => (
          <SelectRow
            key={flag.offset}
            label={flag.label}
            offset={flag.offset}
            badges={flag.certainty === "🔶" ? <CertaintyBadge mark="🔶" text="意味は推測" /> : undefined}
            value={view ? String(view.values[i]) : null}
            currentLabel={view ? `${view.values[i]} 不明` : undefined}
            options={flag.values.map((v) => ({ value: String(v.value), label: v.label }))}
            problem={view?.problem ?? null}
            note={flag.note}
            onChange={(v) => update((b) => writeScenarioFlag(b, i, Number(v), { advanced }))}
          />
        ))}
      </CardContent>
    </Card>
  );
}

/** 施設の状態（0x375D〜0x375F）。view が null ならセーブ未読み込み */
function FacilityFlagsCard({ view }: { view: FacilityFlagsView | null }) {
  const { update } = useSave();
  const { advanced } = useAdvancedMode();

  return (
    <Card>
      <CardHeader>
        <CardTitle>施設</CardTitle>
        <CardDescription>
          病院（0x375D）・カジノ（0x375E）・語学所（0x375F）の開閉です。書き換えで反映を確認済みです。
          カジノだけ値が逆で、1 が閉じている状態です。3つとも 0 が初期状態（病院・語学所は閉、カジノは開）です。
          周回をまたいで引き継がれると考えられます。
          2日目の各枠では、施設の値によって起きるイベントが入れ替わります。
          隠しルートで希望の光に進むには、病院・語学所が開き、カジノが閉じている必要があります。
          {view &&
            !view.problem &&
            (facilitiesReadyForLightOfHope(view.values)
              ? " 今のセーブはこの条件を満たしています。"
              : " 今のセーブはこの条件を満たしていません。")}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        {FACILITY_FLAGS.map((flag, i) => (
          <div key={flag.offset} className="grid content-start gap-2">
            <SelectRow
              label={flag.label}
              offset={flag.offset}
              value={view ? String(view.values[i]) : null}
              currentLabel={view ? `${view.values[i]} 不明` : undefined}
              options={flagOptions[flag.meaning]}
              problem={view?.problem ?? null}
              note={flag.note}
              onChange={(v) => update((b) => writeFacilityFlag(b, i, Number(v), { advanced }))}
            />
            <ul className="text-muted-foreground list-disc pl-5 text-xs">
              {flag.slots.map((slot) => {
                const current = view ? facilitySlotEvent(slot, view.values[i]) : null;
                return (
                  <li key={slot.label}>
                    {slot.label}：0 で{slot.when0}、1 で{slot.when1}
                    {current && `（今は${current}）`}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** 🟢 重要人物の状態（0x374E〜0x375C）の生の値。view が null ならセーブ未読み込み */
function CharactersCard({ view }: { view: CharactersView | null }) {
  const { update } = useSave();
  const { advanced } = useAdvancedMode();
  const offsets = Array.from({ length: CHARACTER_LENGTH }, (_, i) => CHARACTER_START + i);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          人物の状態（生の値）
          <CertaintyBadge mark="🔶" text="書き換えの効果は要ゲーム内確認。万由・千佳・百合の値は未確認" />
        </CardTitle>
        <CardDescription>
          イベントの状態のすぐ後ろにある15バイトで、重要人物ごとの状態（生死など）です。周回の始めはすべて 0 です。
          多くの人物は 0 が生存、1 が死亡です。赤城の 3 は病院に運ばれて助かった状態、J.J. の 3・4・5 は伯爵救出の成功・打ち解けた・逮捕された状態です。
          鬼怒川怨仙（0x3756）は船上の侍で 2 になり、大老暗殺計画で倒すと 0 になります。
          朱美・ローラ・J.J. は 1 を書くといなくなることを確認済みです。ほかの人物の書き換えの効果は要ゲーム内確認です。
          各欄の説明に、値が変わる場面と、値を条件にするイベントを書いています。
          {view?.warning && ` ${view.warning}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {offsets.map((offset, i) => {
          const info = CHARACTER_NOTES[offset];
          const hex = `0x${offset.toString(16).toUpperCase()}`;
          return (
            <FieldRow
              key={offset}
              label={info?.name ? `${hex}（${info.name}）` : hex}
              offset={offset}
              value={view?.values[i] ?? null}
              problem={view?.problem ?? null}
              format={String}
              parse={(input) => parseInteger(input, (v) => validateCharacter(v, { advanced }))}
              apply={(v) => update((b) => writeCharacter(b, offset, v, { advanced }))}
              inputMode="numeric"
              hint={advanced ? "0〜255" : `0〜${CHARACTER_NORMAL_MAX}`}
              note={info?.note}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}

const TOWNSFOLK_ROW = 16;

/**
 * 1バイト分の入力欄。町の人の状態（0x0100〜0x05FF）用。
 * 値の表があるバイト（0x0127・0x0132）は表から選ぶ。raw なら数値で入力する（表にない値を上級者モードで書くため）
 */
function TownsfolkField({
  offset,
  view,
  raw = false,
}: {
  offset: number;
  view: TownsfolkView | null;
  raw?: boolean;
}) {
  const { update } = useSave();
  const { advanced } = useAdvancedMode();
  const info = TOWNSFOLK_NOTES[offset];
  const hex = formatOffset(offset);
  const current = view?.values[offset - TOWNSFOLK_START] ?? null;
  const label = info?.name ? `${hex}（${info.name}）` : hex;

  if (info?.values && !raw)
    return (
      <SelectRow
        label={label}
        offset={offset}
        value={current === null ? null : String(current)}
        currentLabel={current === null ? undefined : `${current} 不明`}
        options={info.values.map((s) => ({
          value: String(s.value),
          label: `${s.value} ${s.label}`,
          group: s.group,
        }))}
        problem={view?.problem ?? null}
        note={info?.note}
        onChange={(v) => update((b) => writeTownsfolk(b, offset, Number(v), { advanced }))}
      />
    );

  return (
    <FieldRow
      label={label}
      offset={offset}
      value={current}
      problem={view?.problem ?? null}
      format={String}
      parse={(input) =>
        parseInteger(input, (v) => validateTownsfolk(offset, v, current ?? 0, { advanced }))
      }
      apply={(v) => update((b) => writeTownsfolk(b, offset, v, { advanced }))}
      inputMode="numeric"
      hint={advanced ? "0〜255" : info?.values ? "表の値" : "0・1"}
      note={info?.note}
    />
  );
}

/** 🔶 町の人（店主など）の状態の候補（0x0100〜0x05FF）の生の値。view が null ならセーブ未読み込み */
function TownsfolkCard({ view }: { view: TownsfolkView | null }) {
  const [selected, setSelected] = useState<number | null>(null);
  const named = Object.keys(TOWNSFOLK_NOTES)
    .map(Number)
    .filter((o) => TOWNSFOLK_NOTES[o].name);
  const rows = Array.from(
    { length: TOWNSFOLK_LENGTH / TOWNSFOLK_ROW },
    (_, r) => TOWNSFOLK_START + r * TOWNSFOLK_ROW,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          町の人の状態（候補・生の値）
          <CertaintyBadge mark="🔶" text="並び方と書き換えの効果は未確認" />
        </CardTitle>
        <CardDescription>
          0x0100〜0x05FF の1,280バイトです（終わりの位置は未確定）。ほとんど 0 で、町の人（店主など）ごとの状態やイベントの進み具合の表と推定しています。
          鍛冶屋の後継者イベント・鍛冶屋の状態（0x0127）、堂島が鍛冶屋を継いだか（0x0132。周回後に誰が鍛冶屋になるかを決める）、堂島の死亡（0x0264）は、書き換えで確認済みです。
          寿司屋の店主（0x02C4）と鍛冶屋のおやじ（0x0444）は 1 で死亡です。0 に戻すと生き返ることを確認済みです。
          さよ（DLC、0x0528）も 1 で死亡と見ていますが、差分1回だけで、0 に戻して生き返るかは未確認です。
          下の表のマスを押すと、そのバイトを書き換えられます。0 以外のマスは色を付け、説明のあるマスには下線を引いています。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {named.map((offset) => (
            <TownsfolkField key={offset} offset={offset} view={view} />
          ))}
          {selected !== null && (!named.includes(selected) || TOWNSFOLK_NOTES[selected].values) && (
            <TownsfolkField key={`raw-${selected}`} offset={selected} view={view} raw />
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="font-mono text-[11px] leading-none">
            <tbody>
              {rows.map((rowStart) => (
                <tr key={rowStart}>
                  <th className="text-muted-foreground pr-2 text-right font-normal">
                    {rowStart.toString(16).toUpperCase().padStart(4, "0")}
                  </th>
                  {Array.from({ length: TOWNSFOLK_ROW }, (_, c) => {
                    const offset = rowStart + c;
                    const v = view?.values[offset - TOWNSFOLK_START] ?? null;
                    const info = TOWNSFOLK_NOTES[offset];
                    return (
                      <td key={c} className="p-0">
                        <button
                          type="button"
                          disabled={view === null}
                          title={`${formatOffset(offset)}${info ? `：${info.note}` : ""}`}
                          onClick={() => setSelected(offset)}
                          className={[
                            "h-5 w-6 rounded-sm",
                            v ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                            info ? "underline" : "",
                            offset === selected ? "ring-ring ring-2" : "",
                          ].join(" ")}
                        >
                          {v === null ? "··" : v.toString(16).toUpperCase().padStart(2, "0")}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

const hiddenRouteOptions: SelectOption[] = HIDDEN_ROUTE_VALUES.map((v) => ({
  value: String(v.value),
  label: `${v.value} ${v.label}`,
}));

/**
 * 隠しルート（0x378E）と、その周り 0x378D〜0x37AA の生の値。view が null ならセーブ未読み込み。
 * sisters は三姉妹見参（イベント添字70）の状態 A
 */
function RouteCandidatesCard({
  view,
  sisters,
}: {
  view: RouteCandidatesView | null;
  sisters: number | null;
}) {
  const { update } = useSave();
  const { advanced } = useAdvancedMode();

  return (
    <Card>
      <CardHeader>
        <CardTitle>隠しルート</CardTitle>
        <CardDescription>
          0x378E が 1 で隠しルートです（書き換えで確認済み）。ただし、三姉妹見参（イベント{HIDDEN_ROUTE_EVENT_INDEX}）が成功（04）でないと効きません。
          病院（0x375D）が閉じていると赤城が死に、再起の望みより後ろのイベントが起きません。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectRow
            label="ルート"
            offset={HIDDEN_ROUTE_OFFSET}
            value={view ? String(view.hidden) : null}
            currentLabel={view ? `${view.hidden} 不明` : undefined}
            options={hiddenRouteOptions}
            problem={view?.hiddenProblem ?? null}
            hint={
              sisters === null
                ? undefined
                : `今の三姉妹見参の状態：${formatHex2(sisters)}${sisters === 0x04 ? "（成功。隠しルートが効く）" : "（成功ではないので、1 にしても通常ルートのまま）"}`
            }
            note="1 にしただけでは通常ルートのまま。三姉妹見参の状態も 04（成功）にすると隠しルート（お早い到着）に入る。0 にすると通常ルートに戻る。2 は隠しルートを外れた状態（再起の望みで小暮が死ぬ、怒りの矛先の成功、闇討ちの失敗、傷心の帰国船の成功などで 2 になり、周回中は戻らない）。2 で大通りに行くと大老暗殺計画が起きる。隠しルートを過去の周回で記録していないと、正規のプレイでもチャートに失敗したイベントや先のイベントの枠が出ない"
            onChange={(v) => update((b) => writeHiddenRoute(b, Number(v), { advanced }))}
          />
        </div>

        <div className="flex flex-col gap-3 border-t pt-4">
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
            周りのバイト（生の値）
            <CertaintyBadge mark="🔶" text="書き換えたときのゲーム内の反映は未確認" />
          </div>
          <p className="text-muted-foreground text-xs">
            0x378D は序章のあとの道筋（1＝通常の1〜3日目、2＝隠しルートに入った）、0x379F は序章の大砲です。0x378D・0x379F・0x37AA を書き換えても、ルートは変わりませんでした。
            この範囲には、好感度や職など隠しルートに関係しないバイトも入っています。説明は、そのバイトが変わる場面です。書き換えたときのゲーム内の反映は確かめていません。
            {view?.warning && ` ${view.warning}`}
          </p>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {RAW_ROUTE_OFFSETS.map((offset) => {
              const info = ROUTE_CANDIDATE_NOTES[offset];
              const hex = `0x${offset.toString(16).toUpperCase()}`;
              return (
                <FieldRow
                  key={offset}
                  label={info?.name ? `${hex}（${info.name}）` : hex}
                  offset={offset}
                  value={view?.values[offset - ROUTE_CANDIDATE_START] ?? null}
                  problem={view?.problem ?? null}
                  format={String}
                  parse={(input) =>
                    parseInteger(input, (v) => validateRouteCandidate(v, { advanced, offset }))
                  }
                  apply={(v) => update((b) => writeRouteCandidate(b, offset, v, { advanced }))}
                  inputMode="numeric"
                  hint={advanced ? "0〜255" : `0〜${routeCandidateNormalMax(offset)}`}
                  note={info?.note}
                />
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const hostileOptions: SelectOption[] = HOSTILE_VALUES.map((v) => ({
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
                ? `今の記録なら大寄せで${routeEligible(factions.values, c, factions.moro) ? "入れる" : "入れない"}（友好度 ${factions.values[0][c]} − ${factions.values[1][c]} ＝ ${factions.values[0][c] - factions.values[1][c]}${c === 0 && factions.moro === MORO_DEAD ? "。茂呂が死亡" : ""}）`
                : undefined
            }
            note={`大寄せのときに書かれる。友好度（友好度 + − 友好度 −）が ${ROUTE_THRESHOLD} 以上で 01（入れる）、それ未満で 02（入れない）。敵対状態は関係しない。${c === 0 ? "幕府は茂呂（0x3752）が死亡（01）だと友好度にかかわらず 02。" : ""}大寄せのあと、ほかの勢力の剣術大会の誘いを引き受けると 02、その勢力の人物に斬りかかっても 02、最後通告に逆らうと 3勢力とも 02`}
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
          note="大寄せで3勢力とも 02 のとき 01（根無し草）。勢力のどれかが 01 だと、ここが 01 でも根無し草にはならない"
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
          大寄せの時点で友好度が 3 以上の勢力のルートに入れます（書き換えで確認済み）。幕府は茂呂が生きていることも条件です。
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

/** イベントの状態。view が null ならセーブ未読み込み */
function EventsCard({ view }: { view: EventsView | null }) {
  const options = stateOptions;
  // イベントと対応のついた添字だけを添字順に並べる。対応のない添字は表示しない（ユーザー判断 2026-10-06）
  const indices = namedIndices();

  return (
    <Card>
      <CardHeader>
        <CardTitle>イベントの状態</CardTitle>
        <CardDescription>
          「状態」は周回中の状態（0x36A8＋添字）です。失敗（05）と未到達（FF）は、書き換えでチャートの表示が変わることを確認済みです。
          「チャート表示」は周回をまたぐ記録（0x3838＋添字、🔶
          生きた証）で、FF なら枠だけ出て名前が隠れ、04 なら名前が出ます（確認済み）。ただし FF でも、状態が成功（04）のイベントは名前が出ます（確認済み）。
          隠しルートのイベントだけは、チャート表示が FF だと、成功したもの以外は枠ごと出ません（正規のプレイでも同じ。隠しルート以外は FF でも失敗が出ます）。
          チャート表示を 04 にすると、失敗したイベントも、まだ起きていない先のイベント（大老暗殺計画など）も出ます（確認済み）。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <BulkEventsPanel problem={view?.problem ?? null} disabled={!view} stateOptions={options} />
        <div className="grid gap-4 sm:grid-cols-2">
          {indices.map((i) => (
            <EventBox
              key={i}
              index={i}
              entry={view?.entries[i] ?? null}
              problem={view?.problem ?? null}
              options={options}
            />
          ))}
        </div>

        {/* 名前の付いた添字の間の欠番。チャートに出ない・起きない。フラグ確認用（ユーザー判断 2026-10-06） */}
        <div className="flex flex-col gap-3 border-t pt-4">
          <div className="text-sm font-medium">チャートに出ない添字（フラグ確認用）</div>
          <p className="text-muted-foreground text-xs">
            名前の付いた添字の間にある、チャートに出ない・ゲームで起きない添字です。
            47〜50 は剣術大会（幕府・外国・攘夷・無所属）、67 は未実装とみられる悲しみのローラ、84 は名前の分からないローラの決意の導入です。
            一括設定の対象にはしていません。
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EVENT_GAP_INDICES.map((i) => (
              <EventBox
                key={i}
                index={i}
                entry={view?.entries[i] ?? null}
                problem={view?.problem ?? null}
                options={options}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** デバッグ用：状態・チャート表示を、イベントと対応のついた添字すべてにまとめて書く */
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
        下に並んでいるイベント（{namedIndices().length}件）すべてに、同じ値をまとめて書きます。
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
              run((b) => writeEventStates(b, namedIndices(), Number(state), { advanced }))
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
              run((b) => writeEventRecords(b, namedIndices(), Number(record), { advanced }))
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
      <Select
        value={value === "" ? null : value}
        items={options}
        disabled={disabled}
        onValueChange={(v) => v !== null && onChange(v)}
      >
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
  const gap = EVENT_GAP_NOTES[index];
  const title = name?.name ?? gap?.name;

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
        {title ? `${index}. ${title}` : `添字 ${index}`}
        {/* ✅（チャートで確認）・🟢 の対応には確度のバッジを付けない */}
        {name && <span className="text-muted-foreground text-xs font-normal">{name.day}</span>}
        {gap &&
          (gap.name ? (
            <span className="text-muted-foreground text-xs font-normal">{gap.note}</span>
          ) : (
            <CertaintyBadge mark="❓" text={gap.note} />
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
          options={recordOptions(advanced)}
          problem={problem}
          note="周回をまたぐ記録（生きた証）。FF で名前が隠れ、04 で名前が出る。FF でも状態が成功（04）なら出ます。隠しルートのイベントは FF だと成功以外は枠ごと出ないので、ここを 04 にすると出ます（確認済み）。ほかの周回にも引き継がれる可能性があります"
          onChange={(v) => update((b) => writeEventRecord(b, index, Number(v), { advanced }))}
        />
      </div>
    </div>
  );
}
