import { useMemo, useState, type ReactNode } from "react";
import { useAnchor } from "@/lib/navigation-context";
import { AMIHAMA_ANCHORS, EVENTS_ANCHORS, NPC_ANCHORS } from "./anchors";
import { CollapsibleCard } from "@/components/collapsible-card";
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
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnchorLink } from "@/components/anchor-link";
import { ScopeAnchorLink } from "@/components/anchor-link";
import { AnchoredCard } from "@/components/anchored-card";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { FlagGrid, FlagRow } from "@/components/flag-row";
import { useFlag } from "@/hooks/use-flag";
import { flagProblem, readFlag, type ByteFlag } from "@/save/flags/byte-flag";
import { CHARACTER_FLAGS } from "@/save/flags/characters";
import {
  BEST_ROUTE_EVENT_INDEX,
  BEST_ROUTE_FLAG,
  EVENT_FLAGS,
} from "@/save/flags/event-flags";
import {
  FACILITY_FLAGS,
  facilitiesReadyForLightOfHope,
  facilitySlotEvent,
  type FacilityFlag,
} from "@/save/flags/facilities";
import { FACTION_EXIT_FLAGS } from "@/save/flags/faction-exit";
import { GATE_CLOSE_FLAGS, GATE_DOOR_FLAGS, GATE_RECRUIT_FLAGS } from "@/save/flags/gates";
import { NPC_DOJO_FLAGS, NPC_OTHER_FLAGS, NPC_SMITH_FLAGS } from "@/save/flags/npc-events";
import {
  TOWNSFOLK_PEOPLE,
  TOWNSFOLK_START,
  personOffset,
  readTownsfolk,
  reviveNote,
  writePersonDead,
  type TownsfolkView,
} from "@/save/townsfolk";
import { Checkbox } from "@/components/ui/checkbox";
import { WarningTip } from "@/components/warning-tip";
import {
  PUBLIC_ORDER_LEVELS,
  PUBLIC_ORDER_MAX,
  PUBLIC_ORDER_OFFSET,
  readPublicOrder,
  validatePublicOrder,
  writePublicOrder,
  type PublicOrderView,
} from "@/save/public-order";
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
  NAMED_EVENT_INDICES,
  readEvents,
  stateLabel,
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
  townsfolk: TownsfolkView;
  /** 真ルート（BEST_ROUTE_FLAG）の値。イベントチャートの紫の箱に使う */
  bestRoute: number;
  publicOrder: PublicOrderView;
};

function parseInteger(input: string, validate: (v: number) => string | null): ParseResult<number> {
  if (!/^\d+$/.test(input.trim())) return { ok: false, error: "0以上の整数を入力してください" };
  const value = Number(input.trim());
  const error = validate(value);
  return error ? { ok: false, error } : { ok: true, value };
}

/**
 * 世界 / 阿弥浜：難易度・治安・周回、段階・日数・時間帯、施設、門・柵（ユーザー判断 2026-10-11）
 * 確度：どれもセーブの差分から推定（docs: difficulty・date-location・gates・facilities）。
 * 難易度、新しい周回を始める書き込み、日数・時間帯、治安は ✅ 書き換えの反映を確認。そのほかは ❓ 要ゲーム内確認
 */
export function AmihamaPage() {
  return (
    <ViewsPage>
      {(views, k) => (
        <>
          <CycleCard
            key={`${k}-cycle`}
            view={views?.difficulty ?? null}
            counts={views?.cycle ?? null}
            publicOrder={views?.publicOrder ?? null}
          />
          <DateCard key={`${k}-date`} view={views?.date ?? null} />
          <FacilityFlagsCard />
          <GateFlagsCard />
        </>
      )}
    </ViewsPage>
  );
}

/**
 * 世界 / NPC：勢力の退場、人物の状態、町の人の生死、NPCイベントフラグ（ユーザー判断 2026-10-11）
 * 確度：どれもセーブの差分から推定（docs: factions・characters・townsfolk・best-route）。
 * 勢力の退場は ✅ 書き換えの反映を確認。そのほかは ❓ 要ゲーム内確認
 */
export function NpcPage() {
  return (
    <ViewsPage>
      {(views, k) => (
        <>
          <FactionExitCard />
          <CharactersCard />
          <PeopleCard key={`${k}-people`} view={views?.townsfolk ?? null} />
          <NpcFlagsCard />
        </>
      )}
    </ViewsPage>
  );
}

/**
 * 世界 / イベント：イベントチャート（真ルート・一括設定つき）、勢力の状態、イベント関連フラグ（ユーザー判断 2026-10-11）
 * 確度：どれもセーブの差分から推定（docs: event-chart・best-route・factions・scenario-flags）。
 * イベントの失敗（05）・未到達（FF）、チャート表示、真ルート、勢力の友好度 +・−・敵対状態は ✅ 書き換えの反映を確認。
 * そのほかは ❓ 要ゲーム内確認
 */
export function EventsPage() {
  return (
    <ViewsPage>
      {(views, k) => (
        <>
          <EventChartCard
            key={`${k}-chart`}
            events={views?.events ?? null}
            counts={views?.cycle ?? null}
            stage={views?.date.stage ?? null}
            bestRoute={views?.bestRoute ?? null}
            top={<BestRouteRow sisters={views?.events.entries[BEST_ROUTE_EVENT_INDEX]?.state ?? null} />}
            bottom={<BulkEventsPanel problem={views?.events.problem ?? null} disabled={!views} />}
          />
          <FactionCard
            key={`${k}-factions`}
            view={views?.factions ?? null}
            route={views?.route ?? null}
          />
          <EventFlagsCard />
        </>
      )}
    </ViewsPage>
  );
}

/** セーブを読み、共通の注意書きを出して、children に各欄を描かせる。views が null ならセーブ未読み込み、k は読み込みごとの key */
function ViewsPage({ children }: { children: (views: Views | null, k: number) => ReactNode }) {
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
          townsfolk: readTownsfolk(b),
          bestRoute: readFlag(b, BEST_ROUTE_FLAG).value,
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
      {views?.date.layoutProblem && (
        <Alert variant="destructive">
          <AlertTitle>読み取り専用</AlertTitle>
          <AlertDescription>{views.date.layoutProblem}</AlertDescription>
        </Alert>
      )}

      <Alert>
        <AlertTitle>検証用</AlertTitle>
        <AlertDescription>
          この画面の値は、書き換える前のセーブを残してから試してください。
        </AlertDescription>
      </Alert>

      {children(views, k)}
    </div>
  );
}

const difficultyOptions: SelectOption[] = DIFFICULTIES.map((d) => ({
  value: String(d.value),
  label: d.label,
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

  // 確度：難易度の書き換えの反映は ✅。新しい周回は ✅（以前の版で確認）。
  // 普通＝1・難しい＝2 は 0 と 3 の間を埋めた 🔶 推測。治安の 1日目 0 の例と初期値 50 の食い違いは ❓。
  // 周回数が PLAY_COUNT_REVEALS_BEST_ROUTE 以上で真ルートの枠と線が全部出るのは ❓ 要ゲーム内確認、死亡で増えるかは ❓
  return (
    <AnchoredCard anchor={AMIHAMA_ANCHORS.cycle}>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2"><ScopeAnchorLink />難易度・治安・周回</CardTitle>
        <CardDescription>
          難易度・治安・周回数を編集できます。「新しい周回」で、物語を終えたときと同じように次の周回を始められます。
          {/* 新しい周回：物語を終えたときにゲームが行う引き継ぎと初期化を同じ順序で行う。終わり方はクリアか立ち去り。
              次のロードの「続きから」で難易度と主人公の設定に進み、序章（船上の侍）から遊べる。
              段階だけを序章に戻すのは「主人公」画面のボタン */}
          {/* view が null（セーブ未読み込み）のときは、今の値を「—」で出す */}
          {(!view || publicOrder?.level) && (
            <>
              <br />
              今の治安：{publicOrder?.level ?? "—"}
            </>
          )}
          {(!view || counts) && (
            <>
              <br />
              クリア回数：
              {counts ? counts.clears.map((n, i) => `${DIFFICULTIES[i]?.label ?? "不明"} ${n}`).join("・") : "—"}
              ／立ち去った回数：{counts ? counts.goneCount : "—"}
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <SelectRow
          label="難易度"
          offset={DIFFICULTY_OFFSET}
          value={view ? String(view.value) : null}
          currentLabel={view ? "不明" : undefined}
          options={difficultyOptions}
          problem={view?.problem ?? null}
          warning={view?.warning}
          note="書き換えはゲーム内の難易度に反映されます"
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
          note={`初期値は 50 です。${publicOrderLevelsText}`}
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
          note={`終えた周回の数で、クリアでも立ち去りでも物語を終えるたびにゲームが1つ増やします。新しい周回の初期化では 0 になりません。${PLAY_COUNT_REVEALS_BEST_ROUTE} 以上だと、イベントチャートに真ルートの枠と線が全部出ます`}
        />
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Label>新しい周回</Label>
            <InfoTip offset={DATE_OFFSETS.dayTime}>
              引き継ぎ：クリアなら難易度ごとのクリア回数、立ち去りなら立ち去った回数を1つ増やします。
              過去の周回の記録を更新し、なりわいの一部のフラグを初期化します。
              武器袋の武器は武器箪笥へ、所持金は金庫へ、手持ちの道具は道具の箪笥へ、持っている刃・鍔・柄は部品の箪笥へ移します。箪笥に入りきらないものは元の場所に残ります。帯刀はそのまま次の主人公が持ちます。
              初期化：難易度は普通、段階は序章、現在地は港、時間帯・時間帯を進める保留量・所持金は 0、周回中の記録・技ごとの斬殺数・道具の使用回数もリセット、
              HP・活力は初期値、イベントの状態は未到達、シナリオのフラグは初期値（施設・門柵の一部などは残す）、ヒントはなし、
              貴重品は鉄4種だけを残す、夜這いの記録・約束を消す（回数は残す）、町の人の状態を初期化。
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
    </AnchoredCard>
  );
}

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

/** 段階・日数・時間帯。view が null ならセーブ未読み込み */
function DateCard({ view }: { view: DateView | null }) {
  const { update } = useSave();
  const { advanced } = useAdvancedMode();
  const range = advanced ? DAY_RANGE.system : DAY_RANGE.normal;
  const problem = view?.problem ?? null;

  return (
    <CollapsibleCard
      anchor={AMIHAMA_ANCHORS.progress}
      title="段階・日数・時間帯"
      contentClassName="grid gap-4 sm:grid-cols-3"
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
        note="イベントを完了すると保留量が入り、エリア移動やロードのときに時間が進みます"
        onChange={(v) => update((b) => writePending(b, Number(v)))}
      />
    </CollapsibleCard>
  );
}

const publicOrderLevelsText = PUBLIC_ORDER_LEVELS.map(
  (l, i) =>
    `${l.label} ${l.min}〜${i === 0 ? PUBLIC_ORDER_MAX : PUBLIC_ORDER_LEVELS[i - 1].min - 1}`,
).join("／");

/** 勢力の退場（FACTION_EXIT_FLAGS） */
function FactionExitCard() {
  // 確度：3つとも ✅ 書き換えで確認
  return (
    <CollapsibleCard
      anchor={NPC_ANCHORS.factionExit}
      title="勢力の退場"
      contentClassName="grid gap-4 sm:grid-cols-3"
      description={
        <>
          幕府・外国・攘夷の勢力を、町から退場させるかを選べます。
          <br />
          退場した勢力の人物は町に出てこなくなります。
          {/* 外国・攘夷は物語の中でも退場する（ローラの死・帰国、般若党の壊滅など）。幕府が退場する場面はない */}
        </>
      }
    >
      {FACTION_EXIT_FLAGS.map((flag) => (
        <FlagRow key={flag.offset} flag={flag} />
      ))}
    </CollapsibleCard>
  );
}

/** 門・柵の状態（GATE_RECRUIT_FLAGS・GATE_CLOSE_FLAGS・GATE_DOOR_FLAGS） */
function GateFlagsCard() {
  // 確度：洞窟内の柵（0x3761）が 1 で降りて通行を塞ぐのは ✅、0 に戻したときの上昇・通行の回復は ❓ 要ゲーム内確認。
  // 表門（0x37FA）・外門（0x3764）・神社入口の柵（0x37C3）が 1 → 0 で開くのは ✅、裏門（0x37FB）の反映は ❓ 要ゲーム内確認。
  // 閉鎖フラグが大寄せ前にも有効なこと、大寄せ以降のルート分岐 02 で門・柵が閉じることは 🟢
  return (
    <CollapsibleCard
      anchor={AMIHAMA_ANCHORS.gates.card}
      title="門・柵の状態"
      contentClassName="flex flex-col gap-6"
      description={
        <>
          代官所・居留地・神社などの門や柵を開け閉めできます。
          <br />
          ルートやイベントによっても閉じるため、開けても通れないことがあります。
          {/* 神社は「入口の柵」と「洞窟内の柵」が別々の閉鎖の指定。洞窟内の柵は閉じると降りて通行を塞ぐ。
              代官所の表門・居留地の外門・神社入口の柵は、閉鎖指定なしにすると開く。閉鎖の指定は大寄せ前にも有効。
              初日勧誘の項目は序章〜1日目昼の開放判定に使われ、開いていれば通れる */}
        </>
      }
    >
      <FlagSection anchor={AMIHAMA_ANCHORS.gates.recruit} title="初日勧誘（1日目昼のみ影響）" flags={GATE_RECRUIT_FLAGS} />
      <FlagSection anchor={AMIHAMA_ANCHORS.gates.close} title="閉鎖（1日目夕～大老の大寄せまで）" flags={GATE_CLOSE_FLAGS} />
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">大老の大寄せ以降</h3>
        <p className="text-sm text-muted-foreground">
          <a href="#post-tournament-route" className="text-primary underline underline-offset-4">
            剣術大会以後のルート分岐
          </a>
          が「入れない」になった段階で、対応する勢力の門・柵が閉じます。
        </p>
        <p className="text-sm text-muted-foreground">
          グループ名は進行時期の目安です。初日勧誘は序章にも影響し、閉鎖の指定は初日昼以前・大寄せ以降にも有効です。
          大寄せ以降は閉鎖指定なしにしても、ルート分岐が「入れない」なら閉じます。
        </p>
      </section>
      <FlagGrid flags={GATE_DOOR_FLAGS} />
    </CollapsibleCard>
  );
}

/** カードの中の見出しつきのまとまり。flags は src/save/flags/ の配列1つ。anchor はリンク先にするときの名前（useAnchor） */
function FlagSection({ anchor, title, flags }: { anchor: string; title: string; flags: readonly ByteFlag[] }) {
  const { id } = useAnchor(anchor);
  return (
    <section id={id} className="flex scroll-mt-4 flex-col gap-3">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <AnchorLink id={id} />
        {title}
      </h3>
      <FlagGrid flags={flags} />
    </section>
  );
}

/**
 * イベントで値が変わる、またはイベントを変えるフラグ（EVENT_FLAGS）。
 * ❓ 書き換えたときのゲームへの反映は要ゲーム内確認
 */
function EventFlagsCard() {
  return (
    <AnchoredCard anchor={EVENTS_ANCHORS.flags}>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2"><ScopeAnchorLink />イベント関連フラグ</CardTitle>
        <CardDescription>
          イベントで変わる状態や、イベントの起き方を変えるフラグを編集できます。
          <br />
          各欄の説明に、状態が変わる場面と、影響するイベントを書いています。
          {/* 通常モードでは、その場面で現れる状態だけを選べる */}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FlagGrid flags={EVENT_FLAGS} />
      </CardContent>
    </AnchoredCard>
  );
}

/** 施設の状態（FACILITY_FLAGS。✅ 書き換えで反映を確認） */
function FacilityFlagsCard() {
  const { save } = useSave();
  const values = useMemo(() => {
    if (!save || flagProblem(save.working)) return null;
    return FACILITY_FLAGS.map((f) => readFlag(save.working, f).value);
  }, [save]);

  return (
    <CollapsibleCard
      anchor={AMIHAMA_ANCHORS.facilities}
      title="施設"
      contentClassName="grid gap-4 sm:grid-cols-3"
      description={
        <>
          病院・カジノ・語学所の開閉を切り替えられます。2日目に起きるイベントが変わります。
          <br />
          真ルートで希望の光に進むには、病院・語学所が開き、カジノが閉じている必要があります
          {/* セーブ未読み込みのときは、今のセーブの判定を出さない（判定する値がない） */}
          {values &&
            (facilitiesReadyForLightOfHope(values)
              ? "（今のセーブは満たしています）"
              : "（今のセーブは満たしていません）")}
          。
          {/* 初期状態は病院・語学所が閉、カジノが開。周回をまたいで引き継がれる */}
        </>
      }
    >
      {FACILITY_FLAGS.map((flag) => (
        <div key={flag.offset} className="grid content-start gap-2">
          <FlagRow flag={flag} />
          <FacilitySlots flag={flag} />
        </div>
      ))}
    </CollapsibleCard>
  );
}

/** 🟢 施設の値で入れ替わる2日目のイベント。選択肢の並びで「〇〇のとき△△」と書く */
function FacilitySlots({ flag }: { flag: FacilityFlag }) {
  const current = useFlag(flag)?.state.value ?? null;
  return (
    <ul className="text-muted-foreground list-disc pl-5 text-xs">
      {flag.slots.map((slot) => {
        const now = current === null ? null : facilitySlotEvent(slot, current);
        return (
          <li key={slot.label}>
            {slot.label}：
            {flag.values
              .map((v) => `${v.label}とき${facilitySlotEvent(slot, v.value) ?? "不明"}`)
              .join("、")}
            {now && `（今は${now}）`}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * 🟢 重要人物と寿司屋の状態（CHARACTER_FLAGS）。
 * 朱美・ローラ・J.J. に 1 を書くといなくなるのは ✅。ほかの人物の書き換えの効果は ❓ 要ゲーム内確認
 */
function CharactersCard() {
  return (
    <CollapsibleCard
      anchor={NPC_ANCHORS.characters}
      title="人物の状態"
      contentClassName="grid gap-4 sm:grid-cols-3 lg:grid-cols-5"
      description={
        <>
          重要人物と寿司屋の生死などの状態を選べます。
          <br />
          各欄の説明に、状態が変わる場面と、影響するイベントを書いています。
          {/* 周回の始めはすべて生存（通常）。赤城には病院に運ばれて助かった状態、J.J. には伯爵救出の成功・打ち解けた・逮捕された状態がある。
              鬼怒川怨仙は船上の侍で生存になり、大老暗殺計画で倒すと偽物が死亡になる。朱美・ローラ・J.J. は死亡にするといなくなる */}
        </>
      }
    >
      {CHARACTER_FLAGS.map((flag) => (
        <FlagRow key={flag.offset} flag={flag} />
      ))}
    </CollapsibleCard>
  );
}

/**
 * 🟢 町の人（人物番号 p）の死亡のビット（0x015C + 12 × p の bit0）。view が null ならセーブ未読み込み。
 * 堂島・寿司屋・鍛冶屋のおやじの死亡の位置は ✅ 差分で確認、寿司屋と鍛冶屋のおやじが外すと生き返るのは ✅。
 * ほかの人が外せば町に出てくるかは ❓ 要ゲーム内確認
 */
function PeopleCard({ view }: { view: TownsfolkView | null }) {
  const { update } = useSave();
  const groups = [...new Set(TOWNSFOLK_PEOPLE.map((x) => x.group))];
  const deadOf = (p: number) => {
    const v = view?.values[personOffset(p) - TOWNSFOLK_START];
    return v === undefined ? null : (v & 1) === 1;
  };

  return (
    <CollapsibleCard
      anchor={NPC_ANCHORS.townsfolk}
      title="町の人の生死"
      contentClassName="flex flex-col gap-4"
      description={
        <>
          死亡した（町からいなくなった）町の人を、チェックを外して生き返らせられます。
          <br />
          警告のアイコンが付いた人は、外すだけでは生き返りません。
          {/* チェックの付いた人は町に出てこない（引退なども含む）。周回の終わりに全員が生き返る。
              重要人物・寿司屋・薬屋は、警告のアイコンに一緒に戻すものを書く */}
        </>
      }
    >
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
                    <span>{x.name}</span>
                  </Label>
                  <InfoTip offset={personOffset(x.p)} />
                  {revive && <WarningTip warning={`外すだけでは生き返りません：${revive}`} />}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </CollapsibleCard>
  );
}

/**
 * 🟢 町の人（鍛冶屋・道場など）のイベントのフラグ（NPC_SMITH_FLAGS・NPC_DOJO_FLAGS・NPC_OTHER_FLAGS）。
 * 鍛冶屋の後継者イベント・鍛冶屋の状態・堂島が鍛冶屋を継いだかは ✅ 書き換えで確認。そのほかは ❓ 要ゲーム内確認
 */
function NpcFlagsCard() {
  // 道場の画面から「道場・先生」（NPC_LINKS.dojoFlags）へリンクしている
  return (
    <CollapsibleCard
      anchor={NPC_ANCHORS.flags.card}
      title="NPCイベントフラグ"
      contentClassName="flex flex-col gap-6"
      description={
        <>
          鍛冶屋・道場・堂島・先生など、町の人のイベントの進み具合を編集できます。
          <br />
          連続なりわいの進み具合は「なりわい」画面にあります。
          {/* 堂島が鍛冶屋を継いだかは、周回後に誰が鍛冶屋になるかを決める */}
        </>
      }
    >
      <FlagSection anchor={NPC_ANCHORS.flags.smith} title="鍛冶屋" flags={NPC_SMITH_FLAGS} />
      <FlagSection anchor={NPC_ANCHORS.flags.dojo} title="道場・先生" flags={NPC_DOJO_FLAGS} />
      <FlagSection anchor={NPC_ANCHORS.flags.other} title="その他" flags={NPC_OTHER_FLAGS} />
    </CollapsibleCard>
  );
}

/**
 * 真ルート（BEST_ROUTE_FLAG）。イベントチャートの上に出す。sisters は三姉妹見参（イベント添字70）の状態 A
 */
function BestRouteRow({ sisters }: { sisters: number | null }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="grid gap-4 sm:grid-cols-3">
        <FlagRow
          flag={BEST_ROUTE_FLAG}
          hint={
            sisters === null
              ? undefined
              : `今の三姉妹見参の状態：${stateLabel(sisters)}${sisters === 0x04 ? "（真ルートに分岐）" : "（成功ではないので、「真ルート」にしても通常ルートのまま）"}`
          }
        />
      </div>
    </section>
  );
}

const hostileOptions: SelectOption[] = HOSTILE_VALUES.map((v) => ({
  value: String(v.value),
  label: v.label,
}));
const judgeOptions: SelectOption[] = ROUTE_JUDGE_VALUES.map((v) => ({
  value: String(v.value),
  label: v.label,
}));
const noneOptions: SelectOption[] = ROUTE_NONE_VALUES.map((v) => ({
  value: String(v.value),
  label: v.label,
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
  const current = () => "不明";

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
            currentLabel={view ? current() : undefined}
            options={judgeOptions}
            problem={problem}
            hint={
              factions && !factions.problem
                ? `今の記録なら大寄せで${routeEligible(factions.values, c, factions.moro) ? "入れる" : "入れない"}（友好度 ${factions.values[0][c]} − ${factions.values[1][c]} ＝ ${factions.values[0][c] - factions.values[1][c]}${c === 0 && factions.moro === MORO_DEAD ? "。茂呂が死亡" : ""}）`
                : undefined
            }
            note={`大寄せのときに決まる。友好度（友好ポイント - 対立ポイント）が ${ROUTE_THRESHOLD} 以上で「ルートに入れる」、それ未満で「入れない」。敵対状態は関係しない。${c === 0 ? "幕府は茂呂が死亡していると友好度にかかわらず「入れない」。" : ""}大寄せのあと、ほかの勢力の剣術大会の誘いを引き受けると「入れない」、その勢力の人物に斬りかかっても「入れない」、最後通告に逆らうと3勢力とも「入れない」`}
            onChange={(v) => update((b) => writeRouteJudge(b, c, Number(v), { advanced }))}
          />
        ))}
        <SelectRow
          label="無所属"
          offset={ROUTE_NONE_OFFSET}
          value={view ? String(view.none) : null}
          currentLabel={view ? current() : undefined}
          options={noneOptions}
          problem={problem}
          warning={view?.warning}
          note="大寄せで3勢力とも「入れない」のとき「根無し草」になる。勢力のどれかが「ルートに入れる」だと、ここが「根無し草」でも根無し草にはならない"
          onChange={(v) =>
            update((b) => writeRouteJudge(b, FACTIONS.length, Number(v), { advanced }))
          }
        />
      </div>
    </div>
  );
}

/** 勢力の 3×3 表（🔶 3勢力 × 3項目の並びは推定）。view が null ならセーブ未読み込み */
function FactionCard({ view, route }: { view: FactionsView | null; route: RouteJudgeView | null }) {
  const { update } = useSave();
  const { advanced } = useAdvancedMode();
  const max = advanced ? FACTION_VALUE_MAX.system : FACTION_VALUE_MAX.normal;

  return (
    <AnchoredCard anchor={EVENTS_ANCHORS.factions}>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2"><ScopeAnchorLink />勢力の状態</CardTitle>
        <CardDescription>
          幕府・外国・攘夷との友好・対立の記録を編集できます。どの勢力のルートに入れるかが変わります。
          <br />
          大寄せの時点で友好度が 3 以上の勢力のルートに入れます（幕府は茂呂が生きていることも条件）。
          {/* 友好度＝友好ポイント（協力・成功）− 対立ポイント（不利益・敵対行為） */}
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
                    currentLabel={view ? "不明" : undefined}
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
    </AnchoredCard>
  );
}

/**
 * デバッグ用：状態・チャート表示を、イベントと対応のついた添字すべてにまとめて書く。イベントチャートの下に出す。
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
    <section className="flex flex-col gap-3">
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
      {error && <p className="text-destructive text-xs">{error}</p>}
    </section>
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
