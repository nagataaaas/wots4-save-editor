import { OCCUPATION_ANCHORS } from "./anchors";
import { useMemo, useState } from "react";
import { CollapsibleCard } from "@/components/collapsible-card";
import { FilterSelect, type FilterOption } from "@/components/filter-select";
import { GameLabel } from "@/components/game-label";
import { InfoTip } from "@/components/info-tip";
import { LazySelect } from "@/components/lazy-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { AnchoredCard } from "@/components/anchored-card";
import { Input } from "@/components/ui/input";
import { SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { formatOffset } from "@/lib/format";
import { parseInteger } from "@/lib/parse";
import { matchesSearch } from "@/lib/search";
import { useSaveView } from "@/lib/use-save-view";
import { useWrite } from "@/lib/use-write";
import { PageBanner } from "@/components/page-banner";
import { WriteError } from "@/components/write-error";
import { useFieldDraft } from "@/lib/use-field-draft";
import { FieldShell } from "@/components/field-shell";
import { SearchSelectRow } from "@/components/search-select-row";
import type { SelectOption } from "@/components/select-options";
import {
  ACCEPT_OFFSETS,
  acceptOccupation,
  readAccepted,
  releaseOccupation,
  seriesAcceptOf,
  writeSeriesState,
  type AcceptedView,
} from "@/save/occupation-accept";
import { getLanguage, tr, type Localized } from "@/lib/i18n";
import {
  OCCUPATION_CLEAR_COUNT_OFFSET,
  OCCUPATION_CLEAR_MAX,
  OCCUPATION_STATE_OFFSET,
  occupationStateOffset,
  readOccupations,
  syncClearCount,
  validateOccupationState,
  writeOccupationState,
  writeOccupationStates,
  type OccupationView,
  occupationStateKind as kindOf,
  occupationValueForKind as valueForKind,
  type OccupationStateKind as StateKind,
} from "@/save/occupation";
import { labelKeywords, occupationGroupLabel, occupationLabel } from "@/save/master/labels";
import {
  OCCUPATIONS,
  OCCUPATION_GROUPS,
  occupationAlignment,
  occupationById,
  occupationClient,
  occupationGroupByKey,
  occupationGroupOf,
  occupationKeywords,
  occupationNote,
  occupationType,
  type OccupationEntry,
} from "@/save/master/occupation-names";
import { FlagRow } from "@/components/flag-row";
import {
  OCCUPATION_DLC_FLAGS,
  OCCUPATION_SECURITY_FLAGS,
  OCCUPATION_SERIES_FLAGS,
  type OccupationFlag,
} from "@/save/flags/occupation";
import { OCCUPATION_FLAG_START } from "@/save/townsfolk";

import { seriesOptions } from "./series-options";
import { OCCUPATION_SERIES } from "@/save/master/occupation-series";

const KIND_LABELS: Record<StateKind, Localized> = {
  hidden: { ja: "まだ出ていない", en: "Not appeared" },
  open: { ja: "出た・未クリア", en: "Appeared, not cleared" },
  cleared: { ja: "クリア済み", en: "Cleared" },
};
const KINDS = Object.keys(KIND_LABELS) as StateKind[];
/** 今の言語の状態の名前 */
const kindLabels = (): Record<StateKind, string> => ({
  hidden: tr(KIND_LABELS.hidden),
  open: tr(KIND_LABELS.open),
  cleared: tr(KIND_LABELS.cleared),
});

/** 受注した時間帯（scenario-date.ts の TIME_SLOTS と同じ並び） */
const SLOT_LABELS: readonly Localized[] = [
  { ja: "昼（朝）", en: "Daytime" },
  { ja: "夕", en: "Evening" },
  { ja: "夜", en: "Night" },
];

const entryLabel = (entry: OccupationEntry) => occupationLabel(entry.labelId);
const entryKeywords = (entry: OccupationEntry) => [
  ...labelKeywords({ kind: "occupation", id: entry.labelId }),
  ...occupationKeywords(entry),
];

function occupationLabelById(id: number): string | undefined {
  const entry = occupationById(id);
  return entry ? entryLabel(entry) : undefined;
}

const groupLabelOf = (id: number) => {
  const group = occupationGroupByKey(occupationGroupOf(id));
  return group && occupationGroupLabel(group);
};

const readViews = (bytes: Uint8Array) => ({ occupations: readOccupations(bytes), accepted: readAccepted(bytes) });

/** なりわい：状態の表・クリア数・受注中、連続なりわいなどの進み具合（なりわいのフラグ） */
export function OccupationPage() {
  const { view: views, error: readError, problem } = useSaveView(readViews, {
    problem: (v) => v.occupations.problem,
  });

  return (
    <div className="flex flex-col gap-4">
      <PageBanner error={readError} problem={problem} />
      <SummaryCard view={views?.occupations ?? null} accepted={views?.accepted ?? null} />
      <SeriesCard />
      <DlcCard />
      <SecurityCard />
      <StatesCard view={views?.occupations ?? null} />
    </div>
  );
}

// ---------------------------------------------------------------- クリア数・受注中

function SummaryCard({ view, accepted }: { view: OccupationView | null; accepted: AcceptedView | null }) {
  const { tryWrite, error } = useWrite();
  const readOnly = !view || view.problem !== null;
  const mismatch = view !== null && view.clearCount !== view.stateSum;

  return (
    <AnchoredCard
      anchor={OCCUPATION_ANCHORS.current}
      title={tr({ ja: "受注中・クリア数", en: "Current mission and clears" })}
      // ❓ 揃っていないときのゲームの動作は未確認。クリアしたなりわいの数も周回をまたぐ統計で、下の記録のクリア回数の合計と揃える
      description={tr({
        ja: "受注中のなりわいと、これまでにクリアしたなりわいの数を編集できます。",
        en: "Edit the mission you have accepted and the number of missions cleared so far.",
      })}
    >
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <FieldShell
          label={tr({ ja: "クリアしたなりわいの数", en: "Missions cleared" })}
          offset={OCCUPATION_CLEAR_COUNT_OFFSET}
          note={tr({
            ja: "下の記録のクリア回数の合計と同じ値にしておきます",
            en: "Keep this equal to the total clears in the records below",
          })}
          problem={view?.problem ?? null}
          error={
            error ??
            (mismatch
              ? tr({ ja: "クリア数と状態の表の合計が違います", en: "The clear count differs from the total in the records" })
              : null)
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm">{view ? view.clearCount : "—"}</span>
            <span className="text-muted-foreground text-xs">
              {tr({
                ja: `（状態の表の合計 ${view ? view.stateSum : "—"}）`,
                en: `(Total in the records: ${view ? view.stateSum : "—"})`,
              })}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={readOnly || !mismatch}
              onClick={() => tryWrite(syncClearCount)}
            >
              {tr({ ja: "表の合計に揃える", en: "Match the records total" })}
            </Button>
          </div>
        </FieldShell>
        <AcceptRow view={accepted} />
      </CardContent>
    </AnchoredCard>
  );
}

/**
 * 受注中のなりわい。受注・外す書き込みは occupation-accept.ts（✅ 受注中の情報、🟢 受注で書くフラグ、🔶 外すときのフラグ）。
 * ❓ 書き込みのゲーム内の反映は要ゲーム内確認
 */
const acceptOptions = (): SelectOption[] => [
  { value: "0", label: tr({ ja: "受注していない", en: "None" }) },
  ...OCCUPATIONS.map((o) => ({
    value: String(o.id),
    label: entryLabel(o),
    group: groupLabelOf(o.id),
    keywords: entryKeywords(o),
  })),
];

function acceptedHint(view: AcceptedView, entry: OccupationEntry | undefined): string {
  const slot = SLOT_LABELS[view.slot];
  const client = entry && occupationClient(entry);
  return tr({
    ja: `${view.day + 1}日目 ${slot ? slot.ja : "不明な時間帯"}に受注${client ? `（${client}）` : ""}`,
    en: `Accepted on Day ${view.day + 1}, ${slot ? slot.en : "unknown time"}${client ? ` (${client})` : ""}`,
  });
}

function AcceptRow({ view }: { view: AcceptedView | null }) {
  const { write } = useWrite();
  const entry = view && view.id !== 0 ? occupationById(view.id) : undefined;
  const options = useMemo(() => acceptOptions(), []);
  return (
    <SearchSelectRow
      label={tr({ ja: "受注中のなりわい", en: "Current mission" })}
      offset={ACCEPT_OFFSETS.id}
      value={view === null ? null : String(view.id)}
      currentLabel={view ? tr({ ja: "不明", en: "Unknown" }) : undefined}
      options={options}
      problem={view?.problem ?? null}
      searchPlaceholder={tr({ ja: "名前・依頼主", en: "Name or client" })}
      note={tr({
        ja: "受注すると、今の日・時間帯で受注したことにします。連続なりわいなら、依頼主の次の依頼も進みます。記録が「まだ出ていない」なら「出た・未クリア」にします。ほかのなりわいを受注中なら、先にそれを外します（連続なりわいは「n 件目を依頼する前」に戻ります）",
        en: 'Accepting a mission sets it as accepted on the current day and time. For a mission chain, the client\'s next request also advances. If the record is "Not appeared", it becomes "Appeared, not cleared". If another mission is accepted, it is dropped first (a mission chain goes back to "Before being offered" that mission)',
      })}
      hint={
        view && view.id !== 0
          ? acceptedHint(view, entry)
          : tr({
              ja: "受注すると、今の日・時間帯で受注したことになります",
              en: "Accepting a mission sets it as accepted on the current day and time",
            })
      }
      onChange={(v) =>
        write((b) => (v === "0" ? releaseOccupation(b) : acceptOccupation(b, Number(v))))
      }
    />
  );
}

// ---------------------------------------------------------------- 依頼主ごとの進み具合（なりわいのフラグ）

const flagOffsetTip = () => tr({ ja: `${formatOffset(OCCUPATION_FLAG_START)} + 番号`, en: `${formatOffset(OCCUPATION_FLAG_START)} + number` });

/** 連続なりわい・四天王の話・最終なりわい（OCCUPATION_SERIES_FLAGS） */
function SeriesCard() {
  return (
    <CollapsibleCard
      anchor={OCCUPATION_ANCHORS.chain}
      title={tr({ ja: "連続なりわい", en: "Mission chains" })}
      extra={
        <InfoTip offset={flagOffsetTip()}>
          {tr({
            ja: "なりわいのフラグ。依頼主はこの値を見て次の依頼を出します（状態の表は見ません）。「連続なりわい」は Wiki での呼び方です（ゲーム内には呼び方がありません）",
            en: 'Mission flags. Clients look at this value to decide their next request (not at the records). "Mission chain" is what the wiki calls them; the game has no name for them',
          })}
        </InfoTip>
      }
      description={
        <>
          {tr({
            ja: "岡っ引き・極道・泥棒・宿無しの4人から順に受ける依頼の進み具合を選べます。",
            en: "Choose the progress of the requests taken in order from the Thief-taker, the Scoundrel, the Thief, and the Vagabond.",
          })}
          <br />
          {tr({
            ja: "4種類をすべて終えると、最終なりわいにつながります。",
            en: "Finishing all four leads to the final missions.",
          })}
          {/* ✅ 野戸仏の 20・100 は書き込みで確認。ほかの欄の書き込みの反映は ❓ 要ゲーム内確認。十の位が何件目、一の位が 0＝受注前・1＝受注済。
              4種類を終えると四天王の話が進む。連続なりわいを終えても、最終なりわいが終わっていなければ新しい依頼は出ない */}
        </>
      }
      contentClassName="grid gap-4 sm:grid-cols-2"
    >
      {OCCUPATION_SERIES_FLAGS.map((flag) => (
        <OccupationFlagRow key={flag.offset} flag={flag} />
      ))}
    </CollapsibleCard>
  );
}

/** 治安なりわい（OCCUPATION_SECURITY_FLAGS） */
function SecurityCard() {
  return (
    <CollapsibleCard
      anchor={OCCUPATION_ANCHORS.security}
      title={tr({ ja: "治安なりわい", en: "Public order missions" })}
      extra={<InfoTip offset={flagOffsetTip()}>{tr({ ja: "なりわいのフラグ", en: "Mission flags" })}</InfoTip>}
      description={
        <>
          {tr({
            ja: "同心頭の佐古津と賭場の女将から受ける、治安によって内容が変わるなりわいの状態です。",
            en: "The state of the missions from Head Constable Sakotsu and the Gambling Mistress, whose content depends on public order.",
          })}
          {/* ❓ 値の意味と書き込みの反映は要ゲーム内確認。何回でも受けられる。女将は最終なりわい（阿弥浜八人衆）を始める人でもある */}
        </>
      }
      contentClassName="grid gap-4 sm:grid-cols-2"
    >
      {OCCUPATION_SECURITY_FLAGS.map((flag) => (
        <OccupationFlagRow key={flag.offset} flag={flag} separator="・" />
      ))}
    </CollapsibleCard>
  );
}

/** 汁部（DLC）：知り合ったか（27）と、209〜212 の進み具合（28〜31）（OCCUPATION_DLC_FLAGS）。🟢 */
function DlcCard() {
  return (
    <CollapsibleCard
      anchor={OCCUPATION_ANCHORS.dlc}
      title={tr({ ja: "DLC なりわい", en: "DLC missions" })}
      extra={<InfoTip offset={flagOffsetTip()}>{tr({ ja: "なりわいのフラグ", en: "Mission flags" })}</InfoTip>}
      description={
        <>
          {tr({
            ja: "DLC の人斬り 汁部理人と組んで受けるなりわいの進み具合です。",
            en: "Progress of the missions taken while partnered with the DLC Hired Assassin Rihito Shirube.",
          })}
          <br />
          {tr({
            ja: "受注は上の「受注中のなりわい」の欄で設定します。",
            en: 'Set the accepted mission in "Current mission" above.',
          })}
          {/* 汁部は 209〜212 のうち最初に「受注前」の仕事を頼み、すべて「成功」ならもう頼まない。
              持っている DLC によって、頼まれるのは 209・210 か 211・212 だけになる */}
        </>
      }
      contentClassName="grid gap-4 sm:grid-cols-2"
    >
      {OCCUPATION_DLC_FLAGS.map((flag) => (
        <FlagRow key={flag.offset} flag={flag} />
      ))}
    </CollapsibleCard>
  );
}

/**
 * 連続なりわい・治安なりわいのフラグ1つの欄。書き込みは受注の規則（writeSeriesState）を通す。
 * 連続なりわい（番号 4〜7）の「受注済」は、そのなりわいの受注も書く。
 * ❓ 書き込みの反映は要ゲーム内確認（番号 4 は受注の書き込みだけ）
 */
function OccupationFlagRow({ flag, separator = " → " }: { flag: OccupationFlag; separator?: string }) {
  const n = flag.number;
  const isSeries = Object.values(OCCUPATION_SERIES).some(series => series.flag === n);
  return (
    <FlagRow
      flag={flag}
      options={isSeries ? seriesOptions(n, flag.values) : undefined}
      note={
        isSeries
          ? tr({
              ja: `${flag.note}。「受注済」を選ぶと、そのなりわいを今の日・時間帯で受注したことにします（受注中のなりわいも書く）。ほかの値を選ぶと、この連続なりわいを受注中なら受注を外します`,
              en: `${flag.note}. Choosing "Accepted" sets that mission as accepted on the current day and time (also sets the current mission). Choosing any other value drops this chain's mission if it is the current one`,
            })
          : undefined
      }
      hint={flag.jobs && jobList(flag.jobs, separator === "・" ? tr({ ja: "・", en: ", " }) : separator)}
      write={(b, value, opts) => writeSeriesState(b, [{ flag: n, value }], seriesAcceptOf(n, value), opts)}
    />
  );
}

const jobList = (ids: readonly number[], separator = " → ") =>
  ids.map((id) => occupationLabelById(id) ?? tr({ ja: "不明", en: "Unknown" })).join(separator);

// ---------------------------------------------------------------- 周回をまたぐ記録

type KindFilter = "all" | StateKind;

const ALL: Localized = { ja: "すべて", en: "All" };
const groupFilterOptions = () => [
  { value: "all", label: tr(ALL) },
  ...OCCUPATION_GROUPS.map((g) => ({ value: g.key, label: occupationGroupLabel(g) })),
];
const kindFilterOptions = (): FilterOption<KindFilter>[] => [
  { value: "all", label: tr(ALL) },
  ...KINDS.map((value) => ({ value, label: tr(KIND_LABELS[value]) })),
];

function StatesCard({ view }: { view: OccupationView | null }) {
  const { write, attempt, error } = useWrite();
  const { advanced } = useAdvancedMode();
  const readOnly = !view || view.problem !== null;
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const [filter, setFilter] = useState<KindFilter>("all");
  const [sync, setSync] = useState(true);

  const labels = kindLabels();
  const rows = OCCUPATIONS.filter((o) => group === "all" || occupationGroupOf(o.id) === group)
    .filter((o) => matchesSearch(query, entryKeywords(o)))
    .filter((o) => filter === "all" || !view || kindOf(view.states[o.id]) === filter);
  const counts: Record<StateKind, number | "—"> = { hidden: "—", open: "—", cleared: "—" };
  if (view) {
    const tally = { hidden: 0, open: 0, cleared: 0 };
    for (const o of OCCUPATIONS) tally[kindOf(view.states[o.id])]++;
    Object.assign(counts, tally);
  }

  /** 状態を書き、指定があればクリア数も揃える */
  const writeStates = (mutator: (b: Uint8Array) => void) =>
    write((b) => {
      mutator(b);
      if (sync) syncClearCount(b);
    });

  return (
    <CollapsibleCard
      anchor={OCCUPATION_ANCHORS.records}
      title={tr({ ja: "なりわいの記録（周回をまたぐ統計）", en: "Mission records (across playthroughs)" })}
      extra={
        <InfoTip offset={formatOffset(OCCUPATION_STATE_OFFSET)}>
          {/* 🔶 0 の意味と、FFFF・0 への書き込みは要ゲーム内確認。1 でクリア済みになるのは ✅（今宵の虎徹で確認）。FFFF＝まだ出ていない、0＝出た・未クリア、1 以上＝クリアした回数 */}
          {tr({
            ja: "まだ出ていない・出た・未クリア・クリア済み（クリアした回数）のどれかです。クリア回数を入れるとなりわい一覧でクリア済みになります",
            en: "One of Not appeared, Appeared but not cleared, or Cleared (with the number of clears). Entering a clear count marks it as cleared in the mission list",
          })}
        </InfoTip>
      }
      description={
        <>
          {tr({
            ja: "なりわいごとのクリア回数（ゲーム内の統計）を編集できます。報酬は増えません。",
            en: "Edit the number of clears of each mission (the in-game statistics). This does not give rewards.",
          })}
          <br />
          {tr({
            ja: `全 ${OCCUPATIONS.length} 件：クリア済み ${counts.cleared}・出た・未クリア ${counts.open}・まだ出ていない ${counts.hidden}`,
            en: `${OCCUPATIONS.length} missions: ${counts.cleared} cleared, ${counts.open} appeared but not cleared, ${counts.hidden} not appeared`,
          })}
          {/* クリア済みにしても、報酬（お金・容姿・装飾品）は増えず、今の周回の連続なりわいも進まない */}
        </>
      }
      contentClassName="flex flex-col gap-3"
    >
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="w-56"
            placeholder={tr({ ja: "名前・依頼主で絞り込み", en: "Filter by name or client" })}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <FilterSelect
            options={groupFilterOptions()}
            value={group}
            onChange={setGroup}
            className="w-44"
            aria-label={tr({ ja: "まとまり", en: "Group" })}
          />
          {/* 状態はセーブで決まるので、未読み込みのときは無効にして絞り込まない */}
          <FilterSelect
            options={kindFilterOptions()}
            value={filter}
            onChange={setFilter}
            disabled={!view}
            className="w-44"
            aria-label={tr({ ja: "状態", en: "State" })}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {KINDS.map((k) => (
            <Button
              key={k}
              variant="outline"
              size="sm"
              disabled={readOnly || rows.length === 0}
              onClick={() =>
                attempt(() =>
                  writeStates((b) => {
                    // クリア済みは、すでにクリアしたものの回数を残す
                    writeOccupationStates(b, rows.map(o => o.id), k);
                  }),
                )
              }
            >
              {tr({ ja: `表示中を「${labels[k]}」に`, en: `Set shown to "${labels[k]}"` })}
            </Button>
          ))}
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={sync}
              onCheckedChange={(on: boolean) => setSync(on)}
              aria-label={tr({ ja: "クリア数も揃える", en: "Also match the clear count" })}
            />
            {tr({ ja: "書き込むときにクリア数も揃える", en: "Also match the clear count when writing" })}
          </label>
        </div>
        <WriteError error={error} />
        <div className="flex flex-col divide-y">
          {rows.map((o) => (
            <StateRow
              key={o.id}
              entry={o}
              value={view?.states[o.id] ?? null}
              accepted={view?.accepted === o.id}
              readOnly={readOnly}
              advanced={advanced}
              write={writeStates}
            />
          ))}
        </div>
    </CollapsibleCard>
  );
}

function StateRow({
  entry: o,
  value,
  accepted,
  readOnly,
  advanced,
  write,
}: {
  entry: OccupationEntry;
  value: number | null;
  accepted: boolean;
  readOnly: boolean;
  advanced: boolean;
  /** 失敗したら例外を投げる */
  write: (m: (b: Uint8Array) => void) => void;
}) {
  const { attempt, error } = useWrite();
  const kind = value === null ? null : kindOf(value);
  const offset = occupationStateOffset(o.id);
  const labels = kindLabels();
  const note = occupationNote(o);
  const alignment = occupationAlignment(o);
  return (
    <div className="flex flex-wrap items-center gap-3 py-1.5">
      <LazySelect
        value={kind}
        items={labels}
        placeholder={tr({ ja: "未読み込み", en: "Not loaded" })}
        disabled={readOnly}
        className="w-48"
        aria-label={entryLabel(o)}
        onValueChange={(k) =>
          value !== null &&
          attempt(() =>
            write((b) => writeOccupationState(b, o.id, valueForKind(k as StateKind, value), { advanced })),
          )
        }
      >
        {KINDS.map((k) => (
          <SelectItem key={k} value={k}>
            {labels[k]}
          </SelectItem>
        ))}
      </LazySelect>
      <WriteError error={error} />
      {kind === "cleared" && value !== null && (
        <CountInput id={o.id} value={value} readOnly={readOnly} advanced={advanced} write={write} />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm"><GameLabel occupation={o.labelId} /></span>
          <InfoTip offset={offset}>
            {/* もう一方の言語の名前 */}
            <GameLabel occupation={o.labelId} lang={getLanguage() === "ja" ? "en" : "ja"} />
            {note && tr({ ja: `。${note}`, en: `. ${note}` })}
          </InfoTip>
          <Badge variant="secondary" className="font-normal">
            {occupationClient(o)}
          </Badge>
          <Badge variant="outline" className="font-normal">
            {occupationType(o)}
          </Badge>
          {alignment && (
            <Badge variant="outline" className="font-normal">
              {alignment}
            </Badge>
          )}
          {accepted && <Badge className="font-normal">{tr({ ja: "受注中", en: "Accepted" })}</Badge>}
        </div>
        <span className="text-muted-foreground text-xs">
          {tr({ ja: `報酬 ${o.reward.toLocaleString()} 文`, en: `Reward: ${o.reward.toLocaleString()} mon` })}
          {o.bonus > 0 && tr({ ja: `・追加 ${o.bonus.toLocaleString()} 文`, en: ` / Bonus: ${o.bonus.toLocaleString()} mon` })}
          {o.deadlineDays !== null &&
            tr({
              ja: `・期限 ${o.deadlineDays} 日`,
              en: ` / Deadline: ${o.deadlineDays} ${o.deadlineDays === 1 ? "day" : "days"}`,
            })}
        </span>
      </div>
    </div>
  );
}

/** クリア回数の入力欄。Enter か欄を離れたときに書く */
function CountInput({
  id,
  value,
  readOnly,
  advanced,
  write,
}: {
  id: number;
  value: number;
  readOnly: boolean;
  advanced: boolean;
  write: (m: (b: Uint8Array) => void) => void;
}) {
  const draft = useFieldDraft({
    value, format: String, identity: occupationStateOffset(id), commitOn: 'blur',
    parse: (input) => {
      const error = tr({ ja: "1 以上の整数で入力してください", en: "Enter a whole number of 1 or more" });
      return parseInteger(input, (v) => (v < 1 ? error : validateOccupationState(id, v, value, { advanced })), { error });
    },
    apply: (v) => write((b) => writeOccupationState(b, id, v, { advanced })),
  });
  const { error } = draft;

  return (
    <div className="flex items-center gap-1.5">
      <Input
        className="w-20"
        inputMode="numeric"
        aria-label={tr({ ja: "クリア回数", en: "Clears" })}
        disabled={readOnly}
        value={draft.input}
        onChange={(e) => draft.change(e.target.value)}
        onFocus={draft.focus}
        onBlur={draft.blur}
        onKeyDown={(e) => e.key === "Enter" && draft.commit()}
      />
      <span className="text-muted-foreground text-xs">{tr({ ja: "回", en: "times" })}</span>
      {error && <span className="text-destructive text-xs">{error}</span>}
      {!error && !advanced && value > OCCUPATION_CLEAR_MAX && (
        <span className="text-destructive text-xs">
          {tr({ ja: `上限 ${OCCUPATION_CLEAR_MAX} を超えています`, en: `Exceeds the limit of ${OCCUPATION_CLEAR_MAX}` })}
        </span>
      )}
    </div>
  );
}
