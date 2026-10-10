import { useMemo, useState, type ReactNode } from "react";
import { CertaintyBadge } from "@/components/certainty-badge";
import { FieldRow, type ParseResult } from "@/components/field-row";
import { InfoTip } from "@/components/info-tip";
import { startNewCycle, type CycleEnd, type NewCycleReport } from "@/save/new-cycle";
import {
  PLAY_COUNT_MAX,
  PLAY_COUNT_OFFSET,
  PLAY_COUNT_REVEALS_BEST_ROUTE,
  countFinishedCycle,
  readCycleCounts,
  validatePlayCount,
  writePlayCount,
  type CycleCountsView,
} from "@/save/cycle-counts";
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
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import {
  SCENARIO_FLAGS,
  WORLD_FLAGS,
  readScenarioFlags,
  readWorldFlags,
  writeScenarioFlag,
  writeWorldFlag,
  type ScenarioFlagsView,
  type WorldFlagGroup,
  type WorldFlagMeaning,
  type WorldFlagsView,
} from "@/save/world-flags";
import {
  FACTION_EXIT_FLAGS,
  readFactionExit,
  writeFactionExit,
  type FactionExitView,
} from "@/save/faction-exit";
import {
  FACILITY_FLAGS,
  facilitiesReadyForLightOfHope,
  facilitySlotEvent,
  readFacilityFlags,
  writeFacilityFlag,
  type FacilityFlagsView,
} from "@/save/facility-flags";
import {
  CHARACTER_NOTES,
  CHARACTER_OFFSETS,
  characterValues,
  readCharacters,
  writeCharacter,
  type CharactersView,
} from "@/save/characters";
import {
  OTHER_TOWNSFOLK_OFFSETS,
  PERSON_RECORD_SIZE,
  TOWNSFOLK_FLAG_GROUPS,
  TOWNSFOLK_NOTES,
  TOWNSFOLK_PEOPLE,
  TOWNSFOLK_START,
  personOffset,
  readTownsfolk,
  reviveNote,
  writePersonDead,
  writeTownsfolk,
  type TownsfolkView,
} from "@/save/townsfolk";
import { Checkbox } from "@/components/ui/checkbox";
import { WarningTip } from "@/components/warning-tip";
import {
  BEST_ROUTE_EVENT_INDEX,
  BEST_ROUTE_OFFSET,
  BEST_ROUTE_VALUES,
  NPC_ROUTE_OFFSETS,
  RAW_ROUTE_OFFSETS,
  ROUTE_CANDIDATE_NOTES,
  ROUTE_CANDIDATE_START,
  readRouteCandidates,
  writeBestRoute,
  writeRouteCandidate,
  type RouteCandidatesView,
} from "@/save/route-candidates";
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
  DIFFICULTIES,
  DIFFICULTY_OFFSET,
  readDifficulty,
  writeDifficulty,
  type DifficultyView,
} from "@/save/difficulty";
import {
  DATE_OFFSETS,
  DAY_RANGE,
  DAY_TIME_AFTER_DAY3,
  PENDING_VALUES,
  STAGES,
  STAGE_PROLOGUE,
  TIME_SLOTS,
  readDate,
  validateDay,
  writeDayTime,
  writePending,
  writeStage,
  type DateView,
} from "@/save/scenario-date";
import {
  namedIndices,
  readEvents,
  writeEventRecords,
  writeEventStates,
  type EventsView,
} from "@/save/scenario-events";
import { EventChartCard } from "@/features/event-chart/event-chart-card";
import { recordOptions, stateOptions } from "./event-options";

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

type Views = {
  difficulty: DifficultyView;
  cycle: CycleCountsView;
  date: DateView;
  events: EventsView;
  factions: FactionsView;
  route: RouteJudgeView;
  factionExit: FactionExitView;
  flags: WorldFlagsView;
  facilities: FacilityFlagsView;
  characters: CharactersView;
  townsfolk: TownsfolkView;
  routeCandidates: RouteCandidatesView;
  publicOrder: PublicOrderView;
};

function parseInteger(input: string, validate: (v: number) => string | null): ParseResult<number> {
  if (!/^\d+$/.test(input.trim())) return { ok: false, error: "0以上の整数を入力してください" };
  const value = Number(input.trim());
  const error = validate(value);
  return error ? { ok: false, error } : { ok: true, value };
}

/** 世界 / 阿弥浜：難易度・治安・周回、段階・日数・時間帯、門・柵、施設（ユーザー判断 2026-10-11） */
export function AmihamaPage() {
  return (
    <ViewsPage
      note={
        <>
          この画面の項目は、どれもセーブの差分から推定したものです（解析ドキュメントの
          difficulty・date-location・gates・facilities）。
          難易度、新しい周回を始める書き込み、日数・時間帯、治安は書き換えの反映を確認済みです。そのほかの値は確かめていません。
        </>
      }
    >
      {(views, k) => (
        <>
          <CycleCard
            key={`${k}-cycle`}
            view={views?.difficulty ?? null}
            counts={views?.cycle ?? null}
            publicOrder={views?.publicOrder ?? null}
          />
          <DateCard key={`${k}-date`} view={views?.date ?? null} />
          <WorldFlagsCard key={`${k}-flags`} view={views?.flags ?? null} />
          <FacilityFlagsCard key={`${k}-facilities`} view={views?.facilities ?? null} />
        </>
      )}
    </ViewsPage>
  );
}

/** 世界 / NPC：勢力の退場、人物の状態、町の人の生死、NPCイベントフラグ（ユーザー判断 2026-10-11） */
export function NpcPage() {
  return (
    <ViewsPage
      note={
        <>
          この画面の項目は、どれもセーブの差分から推定したものです（解析ドキュメントの
          factions・characters・townsfolk・best-route）。
          勢力の退場は書き換えの反映を確認済みです。そのほかの値は確かめていません。
        </>
      }
    >
      {(views, k) => (
        <>
          <FactionExitCard key={`${k}-faction-exit`} view={views?.factionExit ?? null} />
          <CharactersCard key={`${k}-characters`} view={views?.characters ?? null} />
          <PeopleCard key={`${k}-people`} view={views?.townsfolk ?? null} />
          <NpcFlagsCard
            key={`${k}-npc-flags`}
            view={views?.townsfolk ?? null}
            route={views?.routeCandidates ?? null}
          />
        </>
      )}
    </ViewsPage>
  );
}

/** 世界 / イベント：イベントチャート（真ルート・一括設定つき）、勢力の状態、イベント関連フラグ（ユーザー判断 2026-10-11） */
export function EventsPage() {
  return (
    <ViewsPage
      note={
        <>
          この画面の項目は、どれもセーブの差分から推定したものです（解析ドキュメントの
          event-chart・best-route・factions・scenario-flags）。
          イベントの失敗（05）・未到達（FF）、チャート表示、真ルート、勢力の友好度
          +・−・敵対状態は書き換えの反映を確認済みです。そのほかの値は確かめていません。
        </>
      }
    >
      {(views, k) => (
        <>
          <EventChartCard
            key={`${k}-chart`}
            events={views?.events ?? null}
            counts={views?.cycle ?? null}
            top={
              <>
                <BestRouteRow
                  view={views?.routeCandidates ?? null}
                  sisters={views?.events.entries[BEST_ROUTE_EVENT_INDEX]?.state ?? null}
                />
                <BulkEventsPanel problem={views?.events.problem ?? null} disabled={!views} />
              </>
            }
          />
          <FactionCard
            key={`${k}-factions`}
            view={views?.factions ?? null}
            route={views?.route ?? null}
          />
          <EventFlagsCard key={`${k}-event-flags`} route={views?.routeCandidates ?? null} />
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
          difficulty: readDifficulty(b),
          cycle: readCycleCounts(b),
          date: readDate(b),
          events: readEvents(b),
          factions: readFactions(b),
          route: readRouteJudge(b),
          factionExit: readFactionExit(b),
          flags: readWorldFlags(b),
          facilities: readFacilityFlags(b),
          characters: readCharacters(b),
          townsfolk: readTownsfolk(b),
          routeCandidates: readRouteCandidates(b),
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

const difficultyOptions: SelectOption[] = DIFFICULTIES.map((d) => ({
  value: String(d.value),
  label: d.certainty === "✅" ? d.label : `${d.label}（🟢）`,
}));

const CYCLE_END_LABELS: Record<CycleEnd, string> = {
  clear: "クリアとして終える",
  gone: "立ち去りとして終える",
};

function cycleReportText(r: NewCycleReport): string {
  const parts = [
    r.end === "clear"
      ? "周回数とクリア回数を1つ増やしました"
      : "周回数と立ち去った回数を1つ増やしました",
    `金庫に ${r.vaultAdded.toLocaleString()} 両`,
    `武器箪笥へ ${r.weaponsMoved} 本`,
    `道具の箪笥へ ${r.itemsMoved} 枠`,
    `部品の箪笥へ ${r.partsMoved} 個`,
    `取り除いた貴重品 ${r.valuablesRemoved} 枠`,
  ];
  const left = [
    r.weaponsLeft && `武器袋に ${r.weaponsLeft} 本`,
    r.itemsLeft && `手持ちに ${r.itemsLeft} 枠`,
    r.partsLeft && `部品 ${r.partsLeft} 個`,
  ].filter(Boolean);
  return `${parts.join("、")}。${left.length ? `箪笥に入りきらず残ったもの：${left.join("、")}。` : ""}`;
}

/**
 * 難易度（0x0000）、治安（0x0015。✅ [U] 書き換えはゲームに反映される）、周回数（0x0B8C）と、
 * 新しい周回を始める書き込み（new-cycle.ts）。view が null ならセーブ未読み込み
 */
function CycleCard({
  view,
  counts,
  publicOrder,
}: {
  view: DifficultyView | null;
  counts: CycleCountsView | null;
  publicOrder: PublicOrderView | null;
}) {
  const { update } = useSave();
  const { advanced } = useAdvancedMode();
  const [armed, setArmed] = useState<CycleEnd | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<string | null>(null);

  const start = (end: CycleEnd) => {
    if (armed !== end) return setArmed(end);
    setArmed(null);
    try {
      const box: { result?: NewCycleReport } = {};
      update((b) => {
        box.result = startNewCycle(b, end);
        // 🟢 ゲームは周回を終えるたびに周回数 0x0B8C を +1 する（クリア・立ち去りのどちらでも）
        countFinishedCycle(b);
      });
      setReport(box.result ? cycleReportText(box.result) : null);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>難易度・治安・周回</CardTitle>
        <CardDescription>
          難易度は 0x0000 の値です。易しい＝0・超難しい＝3
          は、スロット一覧の表示と一致しました。書き換えはゲーム内の難易度に反映されます（確認済み）。
          治安（0x0015）は {publicOrderLevelsText} です。
          「新しい周回」は、物語を終えたときにゲームが行う引き継ぎと初期化を、同じ順序で行います。終わり方はクリア（結末を見た）か立ち去り（町を立ち去った）を選びます。
          次のロードの「続きから」で難易度と主人公の設定に進み、序章のイベント（船上の侍）から新しい周回として遊べます（以前の版で確認済み）。
          段階だけを 0 にして主人公の設定だけをやり直すときは、「主人公」画面のボタンを使います。
          {view && ` 難易度の生の値：${view.value}`}
          {publicOrder &&
            `　治安の生の値：${publicOrder.value}（${formatHex2(publicOrder.value)}）${publicOrder.level ? `＝${publicOrder.level}` : ""}`}
          {counts &&
            `　クリア回数（0x43398〜、難易度ごと）：${counts.clears.join("・")}、立ち去った回数（0x46340）：${counts.goneCount}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <SelectRow
          label="難易度"
          offset={DIFFICULTY_OFFSET}
          value={view ? String(view.value) : null}
          currentLabel={view ? `不明な値 ${view.value}` : undefined}
          options={difficultyOptions}
          problem={view?.problem ?? null}
          warning={view?.warning}
          note="0x0000 の1バイトだけを書きます。普通＝1・難しい＝2 は 0 と 3 の間を埋めた推測です（🔶）。幅は u8 とみています（0x0001〜0x0007 は見たセーブではすべて 0）"
          onChange={(v) => update((b) => writeDifficulty(b, Number(v)))}
        />
        <FieldRow
          label="治安"
          offset={PUBLIC_ORDER_OFFSET}
          value={publicOrder?.value ?? null}
          problem={publicOrder?.problem ?? null}
          warning={publicOrder?.warning}
          format={String}
          parse={(input) => parseInteger(input, (v) => validatePublicOrder(v, { advanced }))}
          apply={(v) => update((b) => writePublicOrder(b, v, { advanced }))}
          inputMode="numeric"
          hint={advanced ? "0〜255" : `0〜${PUBLIC_ORDER_MAX}`}
          note="0x0015 の1バイトだけを書きます。1日目のセーブで 0 の例があり、初期値 50 とは合いません（❓）"
        />
        <FieldRow
          label="周回数"
          offset={PLAY_COUNT_OFFSET}
          value={counts?.playCount ?? null}
          problem={counts?.problem ?? null}
          warning={counts?.warning}
          format={String}
          parse={(input) => parseInteger(input, (v) => validatePlayCount(v, { advanced }))}
          apply={(n) => update((b) => writePlayCount(b, n, { advanced }))}
          inputMode="numeric"
          hint={advanced ? "0〜4,294,967,295" : `0〜${PLAY_COUNT_MAX.toLocaleString()}`}
          note={`0x0B8C（u32）の4バイトだけを書きます。終えた周回の数で、クリアでも立ち去りでも物語を終えるたびにゲームが1つ増やします（${PLAY_COUNT_MAX.toLocaleString()} まで）。新しい周回の初期化では 0 になりません。${PLAY_COUNT_REVEALS_BEST_ROUTE} 以上だと、イベントチャートに真ルートの枠と線が全部出ます（要ゲーム内確認）。死亡で増えるかは未確認です`}
        />
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Label>新しい周回</Label>
            <InfoTip offset={DATE_OFFSETS.dayTime}>
              引き継ぎ：クリアなら難易度ごとのクリア回数 0x43398〜、立ち去りなら立ち去った回数
              0x46340 を1つ増やします。 記録 B 0x3838〜 を状態 A から更新し（B が 04
              の番号は残す）、なりわいのフラグ 4〜14・18・19・23〜31 を 0 にします。
              武器袋の武器は武器箪笥へ（本数 0x129F4
              も増やす）、所持金は金庫へ、手持ちの道具は道具の箪笥へ、持っている刃・鍔・柄は部品の箪笥へ移します。箪笥に入りきらないものは元の場所に残ります。帯刀はそのまま次の主人公が持ちます。
              初期化：難易度 0x0000＝1（普通）、段階 0x0010＝0、現在地
              0x0013＝0x27、時間帯・保留量・所持金＝0、周回中の記録・技ごとの斬殺数・道具の使用回数＝0、
              HP・活力＝1000、イベントの状態 A は FF 以外を 00、シナリオのフラグ
              0x374E〜0x3837＝0（0x375D〜0x3760・0x3799・0x379A は残す）、ヒント 0x3900＝FFFF、
              貴重品は鉄4種だけを残す、夜這いの記録・約束を消す（回数は残す）、町の人 0x015C〜0x0B33
              ほか一部の範囲を初期化。
              ゲームが流通の武器を確率で消したり変えたりする処理は行いません。元に戻す操作はないので、書き換える前のセーブを残してください
            </InfoTip>
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CYCLE_END_LABELS) as CycleEnd[]).map((end) => (
              <Button
                key={end}
                variant={armed === end ? "destructive" : "outline"}
                size="sm"
                className="w-fit"
                disabled={!view || view.problem !== null}
                onClick={() => start(end)}
                onBlur={() => setArmed(null)}
              >
                {armed === end ? "もう一度押すと書き込みます" : CYCLE_END_LABELS[end]}
              </Button>
            ))}
          </div>
          {report && <p className="text-muted-foreground text-xs">{report}</p>}
          {error && <p className="text-destructive text-xs">{error}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

const slotOptions: SelectOption[] = TIME_SLOTS.map((label, i) => ({ value: String(i), label }));
const pendingOptions: SelectOption[] = PENDING_VALUES.map((v) => ({
  value: String(v),
  label: v === 0 ? "0（なし）" : `${v}（エリア移動・ロードで時間帯が1つ進む）`,
}));
/** ❓ 410 以降は書き込んだときのゲーム内の動作を確かめていない。0（序章）は「新しい周回を始める」か主人公画面のボタンで書くので選ばせない */
const stageOptions: SelectOption[] = STAGES.map((s) => ({
  value: String(s.value),
  label:
    s.value === STAGE_PROLOGUE
      ? `${s.value}：${s.label}（「新しい周回を始める」などで書く）`
      : `${s.value}：${s.label}${s.value > DAY_TIME_AFTER_DAY3 ? "（❓ 要ゲーム内確認）" : ""}`,
  selectedLabel: `${s.value}：${s.label}`,
  disabled: s.value === STAGE_PROLOGUE,
}));

/** 段階・日数・時間帯。view が null ならセーブ未読み込み */
function DateCard({ view }: { view: DateView | null }) {
  const { update } = useSave();
  const { advanced } = useAdvancedMode();
  const range = advanced ? DAY_RANGE.system : DAY_RANGE.normal;
  const problem = view?.problem ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>段階・日数・時間帯</CardTitle>
        <CardDescription>
          段階（0x0010）は、メインイベントが起きるかどうかを決めます。
          日数（0x0BD8）と時間帯（0x0014）はゲーム内の表示で、メインイベントには影響しません。段階と日数・時間帯は別々に書きます
          {view &&
            ` 生の値：0x0010＝${view.raw.dayTime}、0x0012＝${view.pending}、0x0014＝${view.raw.slot}、0x0BD8＝${view.raw.dayIndex}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <SelectRow
          label="段階"
          offset={DATE_OFFSETS.dayTime}
          value={view ? String(view.stage) : null}
          currentLabel={view ? `一覧にない値 ${view.stage}` : undefined}
          options={stageOptions}
          problem={problem}
          hint="メインイベントの進行に影響します"
          note="0x0010（u16）だけを書きます。日数・時間帯は変えません。0（序章）にするときは、上の「新しい周回を始める」か、主人公画面の「難易度と主人公設定を行えるようにする」を使います。410 以降を書いたときのゲーム内の動作は確かめていません"
          onChange={(v) => update((b) => writeStage(b, Number(v)))}
        />
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
          hint={`${range.min}〜${range.max}日目。メインイベントには影響しません`}
        />
        <SelectRow
          label="時間帯"
          offset={DATE_OFFSETS.slot}
          value={view ? String(view.slot) : null}
          options={slotOptions}
          problem={problem}
          hint="メインイベントには影響しません"
          onChange={(v) => update((b) => writeDayTime(b, view!.day, Number(v), { advanced }))}
        />
        <SelectRow
          label="時間帯を進める保留量"
          offset={DATE_OFFSETS.pending}
          value={view ? String(view.pending) : null}
          options={pendingOptions}
          problem={problem}
          note="イベントを完了すると 10 が入り、エリア移動やロードのときに時間が進みます"
          onChange={(v) => update((b) => writePending(b, Number(v)))}
        />
      </CardContent>
    </Card>
  );
}

const publicOrderLevelsText = PUBLIC_ORDER_LEVELS.map(
  (l, i) =>
    `${l.label} ${l.min}〜${i === 0 ? PUBLIC_ORDER_MAX : PUBLIC_ORDER_LEVELS[i - 1].min - 1}`,
).join("／");

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

// 🟢 閉鎖条件の0は、初期開放・ルート・イベントによる閉鎖を打ち消さない。
const worldFlagOptions: Record<WorldFlagMeaning, SelectOption[]> = {
  close: [
    { value: "0", label: "0 閉鎖指定なし" },
    { value: "1", label: "1 閉じる" },
  ],
  open: flagOptions.open,
};

const factionExitOptions: SelectOption[] = [
  { value: "0", label: "0 町にいる" },
  { value: "1", label: "1 退場した" },
];

/** 勢力の退場（0x378F〜0x3791）。view が null ならセーブ未読み込み */
function FactionExitCard({ view }: { view: FactionExitView | null }) {
  const { update } = useSave();
  const { advanced } = useAdvancedMode();

  return (
    <Card>
      <CardHeader>
        <CardTitle>勢力の退場</CardTitle>
        <CardDescription>
          1 にすると、その勢力の人物が町から出なくなります。 3つとも書き換えで確認済みです。
          外国・攘夷は物語の中でも 1 になります（ローラの死・帰国、般若党の壊滅など）。幕府が 1
          になる場面はありません。
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        {FACTION_EXIT_FLAGS.map((flag, i) => (
          <SelectRow
            key={flag.offset}
            label={flag.label}
            offset={flag.offset}
            badges={
              flag.confirmed ? undefined : (
                <CertaintyBadge mark="❓" text="書き換えの反映は未確認" />
              )
            }
            value={view ? String(view.values[i]) : null}
            currentLabel={view ? `${view.values[i]} 不明` : undefined}
            options={factionExitOptions}
            problem={view?.problem ?? null}
            note={flag.note}
            onChange={(v) => update((b) => writeFactionExit(b, i, Number(v), { advanced }))}
          />
        ))}
      </CardContent>
    </Card>
  );
}

/** 門・柵のフラグ。view が null ならセーブ未読み込み */
function WorldFlagsCard({ view }: { view: WorldFlagsView | null }) {
  const { update } = useSave();
  const { advanced } = useAdvancedMode();

  const section = (group: WorldFlagGroup, title?: string) => (
    <section className="flex flex-col gap-3">
      {title && <h3 className="text-sm font-medium">{title}</h3>}
      <div className="grid gap-4 sm:grid-cols-3">
        {WORLD_FLAGS.map((flag, i) => {
          if (flag.group !== group) return null;
          const paired = view?.paired[i] ?? null;
          // 一緒に書くバイトと値が食い違うときは、どの候補とも一致しない値として出す
          const mismatch = view !== null && paired !== null && paired !== view.values[i];
          return (
            <SelectRow
              key={flag.offset}
              label={flag.label}
              offset={flag.offset}
              value={
                view ? (mismatch ? `${view.values[i]}/${paired}` : String(view.values[i])) : null
              }
              currentLabel={
                view
                  ? mismatch
                    ? `${formatOffset(flag.offset)}=${view.values[i]}・${formatOffset(flag.pairedOffset!)}=${paired} 不一致`
                    : `${view.values[i]} 不明`
                  : undefined
              }
              options={worldFlagOptions[flag.meaning]}
              problem={view?.problem ?? null}
              hint={flag.hint}
              note={flag.note}
              onChange={(v) => update((b) => writeWorldFlag(b, i, Number(v), { advanced }))}
            />
          );
        })}
      </div>
    </section>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>門・柵のフラグ</CardTitle>
        <CardDescription>
          神社は「入口の柵」と「洞窟内の柵」が別々の閉鎖フラグです。 洞窟内の柵（0x3761）は、1
          で降りて通行を塞ぐことを確認済みです。 0
          に戻したときの上昇・通行の回復は要ゲーム内確認です。
          代官所の表門（0x37FA）・居留地の外門（0x3764）・神社入口の柵（0x37C3）は、 1 → 0
          で開くことを確認済みです。裏門（0x37FB）の反映は要ゲーム内確認です。 🟢
          閉鎖フラグは大寄せ前にも有効で、0 は閉鎖の指定を解除する値です。
          初日昼勧誘フラグ（0x377D〜0x377F）は序章〜1日目昼（段階 ≤100）の開放判定に使われ、1
          で開きます。 ルートやイベントの条件によっても閉じるため、0
          にするだけで必ず開くとは限りません。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {section("recruit", "初日勧誘（1日目昼のみ影響）")}
        {section("close", "閉鎖（1日目夕～大老の大寄せまで）")}
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">大老の大寄せ以降</h3>
          <p className="text-sm text-muted-foreground">
            🟢{" "}
            <a href="#post-tournament-route" className="text-primary underline underline-offset-4">
              剣術大会以後のルート分岐
            </a>
            が 02 になった段階で、対応する勢力の門・柵が閉じます。
          </p>
          <p className="text-sm text-muted-foreground">
            グループ名は進行時期の目安です。初日勧誘は序章にも影響し、閉鎖フラグは初日昼以前・大寄せ以降にも有効です。
            大寄せ以降は閉鎖フラグを 0 にしても、ルート分岐が 02 なら閉じます。
          </p>
        </section>
        {section("door")}
      </CardContent>
    </Card>
  );
}

/** 1 になる場面の分かったフラグ1つ分の欄（生の値＋候補）。view が null ならセーブ未読み込み */
function ScenarioFlagField({ index, view }: { index: number; view: ScenarioFlagsView | null }) {
  const { update } = useSave();
  const { advanced } = useAdvancedMode();
  const flag = SCENARIO_FLAGS[index];

  return (
    <SelectRow
      label={flag.label}
      offset={flag.offset}
      value={view ? String(view.values[index]) : null}
      currentLabel={view ? `${view.values[index]} 不明` : undefined}
      options={flag.values.map((v) => ({ value: String(v.value), label: v.label }))}
      problem={view?.problem ?? null}
      note={flag.note}
      onChange={(v) => update((b) => writeScenarioFlag(b, index, Number(v), { advanced }))}
    />
  );
}

/** 真ルートの範囲（0x378D〜0x37AA）のバイト1つ分の欄。値の表から選ぶ。view が null ならセーブ未読み込み */
function RouteCandidateField({
  offset,
  view,
  badges,
}: {
  offset: number;
  view: RouteCandidatesView | null;
  badges?: ReactNode;
}) {
  const { update } = useSave();
  const { advanced } = useAdvancedMode();
  const info = ROUTE_CANDIDATE_NOTES[offset];
  const current = view?.values[offset - ROUTE_CANDIDATE_START] ?? null;

  return (
    <SelectRow
      label={info.name ?? formatOffset(offset)}
      offset={offset}
      badges={badges}
      value={current === null ? null : String(current)}
      currentLabel={current === null ? undefined : `${current} 不明`}
      options={info.values.map((v) => ({ value: String(v.value), label: `${v.value} ${v.label}` }))}
      problem={view?.problem ?? null}
      note={info.note}
      hint={info.effect}
      onChange={(v) => update((b) => writeRouteCandidate(b, offset, Number(v), { advanced }))}
    />
  );
}

const NPC_ROUTE_OFFSET_LIST: readonly number[] = Object.values(NPC_ROUTE_OFFSETS);

/**
 * イベントで値が変わる、またはイベントを変えるフラグ（生の値＋候補）。
 * route は真ルートの範囲の生の値（鍛冶屋・道場のバイトは NPCイベントフラグに出す）
 */
function EventFlagsCard({ route }: { route: RouteCandidatesView | null }) {
  const { save } = useSave();
  const view = useMemo((): ScenarioFlagsView | null => {
    if (!save) return null;
    try {
      return readScenarioFlags(save.working);
    } catch {
      return null;
    }
  }, [save]);

  // 位置の順に並べる
  const fields = [
    ...SCENARIO_FLAGS.map((flag, i) => ({
      offset: flag.offset,
      node: <ScenarioFlagField key={flag.offset} index={i} view={view} />,
    })),
    ...RAW_ROUTE_OFFSETS.filter((o) => !NPC_ROUTE_OFFSET_LIST.includes(o)).map((offset) => ({
      offset,
      node: <RouteCandidateField key={offset} offset={offset} view={route} />,
    })),
  ].sort((a, b) => a.offset - b.offset);

  return (
    <Card>
      <CardHeader>
        <CardTitle>イベント関連フラグ</CardTitle>
        <CardDescription>
          イベントで値が変わるフラグと、イベントの起き方を変えるフラグです。説明は、値が変わる場面と、値によって変わるイベントです。
          書き換えたときにゲームへどう反映されるかは確かめていません（要ゲーム内確認）。
          通常モードでは、その場面で現れる値だけを選べます。
          {route?.warning && ` ${route.warning}`}
        </CardDescription>
        <div className="flex flex-wrap gap-2">
          <CertaintyBadge mark="❓" text="書き換えの反映は未確認" />
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">{fields.map((f) => f.node)}</CardContent>
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
          カジノだけ値が逆で、1 が閉じている状態です。3つとも 0
          が初期状態（病院・語学所は閉、カジノは開）です。
          周回をまたいで引き継がれると考えられます。
          2日目の各枠では、施設の値によって起きるイベントが入れ替わります。
          真ルートで希望の光に進むには、病院・語学所が開き、カジノが閉じている必要があります。
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
  const offsets = CHARACTER_OFFSETS;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">人物の状態</CardTitle>
        <CardDescription>
          イベントの状態のすぐ後ろにある15バイトと、寿司屋の状態（0x37F9）で、重要人物ごとの状態（生死など）です。周回の始めはすべて
          0 です。 多くの人物は 0 が生存、1 が死亡です。赤城の 3 は病院に運ばれて助かった状態、J.J.
          の 3・4・5 は伯爵救出の成功・打ち解けた・逮捕された状態です。
          鬼怒川怨仙（0x3756）は船上の侍で 2 になり、大老暗殺計画で倒すと 0 になります。
          朱美・ローラ・J.J. は 1
          を書くといなくなることを確認済みです。ほかの人物の書き換えの効果は要ゲーム内確認です。
          各欄は値の意味から選びます。説明に、値が変わる場面と、値を条件にするイベントを書いています。
          {view?.warning && ` ${view.warning}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {offsets.map((offset, i) => {
          const info = CHARACTER_NOTES[offset];
          const hex = `0x${offset.toString(16).toUpperCase()}`;
          const current = view?.values[i] ?? null;
          return (
            <SelectRow
              key={offset}
              label={info?.name ? `${hex}（${info.name}）` : hex}
              offset={offset}
              value={current === null ? null : String(current)}
              currentLabel={current === null ? undefined : `${current} 不明`}
              options={characterValues(offset).map((s) => ({
                value: String(s.value),
                label: `${s.value} ${s.label}`,
              }))}
              problem={view?.problem ?? null}
              note={info?.note}
              onChange={(v) => update((b) => writeCharacter(b, offset, Number(v), { advanced }))}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}

/** 意味の分かったなりわいのフラグ1つ分の欄。値の表から選ぶ（表にない値は上級者モードで書ける） */
function TownsfolkField({ offset, view }: { offset: number; view: TownsfolkView | null }) {
  const { update } = useSave();
  const { advanced } = useAdvancedMode();
  const info = TOWNSFOLK_NOTES[offset];
  const current = view?.values[offset - TOWNSFOLK_START] ?? null;

  return (
    <SelectRow
      label={info.name ?? formatOffset(offset)}
      offset={offset}
      value={current === null ? null : String(current)}
      currentLabel={current === null ? undefined : `${current} 不明`}
      options={(info.values ?? []).map((s) => ({
        value: String(s.value),
        label: `${s.value} ${s.label}`,
        group: s.group,
      }))}
      problem={view?.problem ?? null}
      note={info.note}
      hint={info.effect}
      onChange={(v) => update((b) => writeTownsfolk(b, offset, Number(v), { advanced }))}
    />
  );
}

/** 🟢 町の人（人物番号 p）の死亡のビット（0x015C + 12 × p の bit0）。view が null ならセーブ未読み込み */
function PeopleCard({ view }: { view: TownsfolkView | null }) {
  const { update } = useSave();
  const groups = [...new Set(TOWNSFOLK_PEOPLE.map((x) => x.group))];
  const deadOf = (p: number) => {
    const v = view?.values[personOffset(p) - TOWNSFOLK_START];
    return v === undefined ? null : (v & 1) === 1;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          町の人の生死
          <InfoTip offset={`0x015C + ${PERSON_RECORD_SIZE} × 人物番号（+0x00 の bit0）`}>
            町の人ごとの 12 バイトのレコードの先頭のビット。ほかのビットとバイトは使われていません
          </InfoTip>
        </CardTitle>
        <CardDescription>
          チェックの付いた人は死亡した（または引退などで町からいなくなった）人で、町に出てきません。周回の終わりに全員が生き返ります。
          堂島・寿司屋・鍛冶屋のおやじは死亡の位置を差分で確認済みで、寿司屋と鍛冶屋のおやじは外すと生き返ることを確認済みです。
          重要人物・寿司屋・薬屋は、外すだけでは生き返りません（警告のアイコンに一緒に戻す値を書いています）。
          ほかの人は外せば町に出てくるはずですが、要ゲーム内確認です。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {groups.map((g) => (
          <div key={g} className="flex flex-col gap-2">
            <p className="text-sm font-medium">{g}</p>
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {TOWNSFOLK_PEOPLE.filter((x) => x.group === g).map((x) => {
                const dead = deadOf(x.p);
                const revive = reviveNote(x.p);
                return (
                  <div key={x.p} className="flex items-center gap-1">
                    <Label className="flex items-center gap-2 font-normal">
                      <Checkbox
                        checked={dead ?? false}
                        disabled={dead === null || view?.problem != null}
                        onCheckedChange={(on) => update((b) => writePersonDead(b, x.p, on))}
                      />
                      <span>
                        {x.name}
                        <span className="text-muted-foreground ml-1 font-mono text-xs">
                          {formatOffset(personOffset(x.p))}
                        </span>
                      </span>
                    </Label>
                    {revive && <WarningTip warning={`外すだけでは生き返りません：${revive}`} />}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * 🟢 町の人（鍛冶屋・道場など）のイベントのフラグ。なりわいのフラグのうちなりわいの画面で扱わないものと、
 * 真ルートの範囲の堂島・先生の職（0x3799・0x379A）。view・route が null ならセーブ未読み込み
 */
function NpcFlagsCard({
  view,
  route,
}: {
  view: TownsfolkView | null;
  route: RouteCandidatesView | null;
}) {
  const grouped: readonly number[] = [
    ...TOWNSFOLK_FLAG_GROUPS.smith,
    ...TOWNSFOLK_FLAG_GROUPS.dojo,
  ];
  const groups = [
    {
      title: "鍛冶屋",
      townsfolk: TOWNSFOLK_FLAG_GROUPS.smith,
      route: [NPC_ROUTE_OFFSETS.smith],
    },
    {
      title: "道場・先生",
      townsfolk: TOWNSFOLK_FLAG_GROUPS.dojo,
      route: [NPC_ROUTE_OFFSETS.dojo],
    },
    {
      title: "その他",
      townsfolk: OTHER_TOWNSFOLK_OFFSETS.filter((o) => !grouped.includes(o)),
      route: [],
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>NPCイベントフラグ</CardTitle>
        <CardDescription>
          町の人のイベントの進み具合のフラグです。0x011C〜0x015B
          のなりわいのフラグのうち意味の分かったものと、
          堂島・先生の職（0x3799・0x379A）です。連続なりわいの進み具合などは「なりわい」の画面で編集します。
          鍛冶屋の後継者イベント・鍛冶屋の状態と、堂島が鍛冶屋を継いだか（周回後に誰が鍛冶屋になるかを決める）は、書き換えで確認済みです。
          そのほかのフラグの書き換えの効果は要ゲーム内確認です。エリア移動・ロードで消えるフラグは載せていません。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {groups.map((g) => (
          <section key={g.title} className="flex flex-col gap-3">
            <h3 className="text-sm font-medium">{g.title}</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {g.townsfolk.map((offset) => (
                <TownsfolkField key={offset} offset={offset} view={view} />
              ))}
              {g.route.map((offset) => (
                <RouteCandidateField key={offset} offset={offset} view={route} />
              ))}
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}

const bestRouteOptions: SelectOption[] = BEST_ROUTE_VALUES.map((v) => ({
  value: String(v.value),
  label: `${v.value} ${v.label}`,
}));

/**
 * 真ルート（0x378E）。イベントチャートの上に出す。周りのバイトはイベント関連フラグ・NPCイベントフラグに出す。
 * view が null ならセーブ未読み込み。sisters は三姉妹見参（イベント添字70）の状態 A
 */
function BestRouteRow({
  view,
  sisters,
}: {
  view: RouteCandidatesView | null;
  sisters: number | null;
}) {
  const { update } = useSave();
  const { advanced } = useAdvancedMode();

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <div className="text-sm font-medium">真ルート</div>
      <p className="text-muted-foreground text-xs">
        0x378E が 1 で真ルートです（書き換えで確認済み）。ただし、三姉妹見参（イベント
        {BEST_ROUTE_EVENT_INDEX}）が成功（04）でないと効きません。
        病院（0x375D）が閉じていると赤城が死に、再起の望みより後ろのイベントが起きません。
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectRow
          label="ルート"
          offset={BEST_ROUTE_OFFSET}
          value={view ? String(view.best) : null}
          currentLabel={view ? `${view.best} 不明` : undefined}
          options={bestRouteOptions}
          problem={view?.bestProblem ?? null}
          hint={
            sisters === null
              ? undefined
              : `今の三姉妹見参の状態：${formatHex2(sisters)}${sisters === 0x04 ? "（成功。真ルートが効く）" : "（成功ではないので、1 にしても通常ルートのまま）"}`
          }
          note="1 にしただけでは通常ルートのまま。三姉妹見参の状態も 04（成功）にすると真ルート（お早い到着）に入る。0 にすると通常ルートに戻る。2 は真ルートを外れた状態（再起の望みで小暮が死ぬ、怒りの矛先の成功、闇討ちの失敗、傷心の帰国船の成功などで 2 になり、周回中は戻らない）。2 で大通りに行くと大老暗殺計画が起きる。真ルートを過去の周回で記録していないと、正規のプレイでもチャートに失敗したイベントや先のイベントの枠が出ない"
          onChange={(v) => update((b) => writeBestRoute(b, Number(v), { advanced }))}
        />
      </div>
    </div>
  );
}

const hostileOptions: SelectOption[] = HOSTILE_VALUES.map((v) => ({
  value: String(v.value),
  label: `${v.value} ${v.label}`,
}));
const judgeOptions: SelectOption[] = ROUTE_JUDGE_VALUES.map((v) => ({
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
    <div id="post-tournament-route" className="flex scroll-mt-4 flex-col gap-2">
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
            note={`大寄せのときに書かれる。友好度（友好ポイント - 対立ポイント）が ${ROUTE_THRESHOLD} 以上で 01（入れる）、それ未満で 02（入れない）。敵対状態は関係しない。${c === 0 ? "幕府は茂呂（0x3752）が死亡（01）だと友好度にかかわらず 02。" : ""}大寄せのあと、ほかの勢力の剣術大会の誘いを引き受けると 02、その勢力の人物に斬りかかっても 02、最後通告に逆らうと 3勢力とも 02`}
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
          onChange={(v) =>
            update((b) => writeRouteJudge(b, FACTIONS.length, Number(v), { advanced }))
          }
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
        <CardTitle>勢力の状態</CardTitle>
        <CardDescription>
          0x3780〜0x3788 の9バイトを、3勢力 × 3項目に並べたものと推定しています。
          友好度は「友好ポイント（協力・成功）− 対立ポイント（不利益・敵対行為）」。
          大寄せの時点で友好度が 3
          以上の勢力のルートに入れます。幕府は茂呂が生きていることも条件です。
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
                    onChange={(v) =>
                      update((b) => writeFactionValue(b, r, c, Number(v), { advanced }))
                    }
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

/**
 * デバッグ用：状態・チャート表示を、イベントと対応のついた添字すべてにまとめて書く。イベントチャートの上に出す。
 * 対応のない添字（47〜50・67・84 など）は対象にしない（ユーザー判断 2026-10-06）
 */
function BulkEventsPanel({ problem, disabled }: { problem: string | null; disabled: boolean }) {
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
        名前の付いたイベント（{namedIndices().length}件）すべてに、同じ値をまとめて書きます。
        チャートに出ない添字（47〜50・67・84）は対象にしません。
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
