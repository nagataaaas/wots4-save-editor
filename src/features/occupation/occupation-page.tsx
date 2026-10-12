import { OCCUPATION_ANCHORS } from "./anchors";
import { useMemo, useState } from "react";
import { CollapsibleCard } from "@/components/collapsible-card";
import { GameLabel } from "@/components/game-label";
import { InfoTip } from "@/components/info-tip";
import { LazySelect } from "@/components/lazy-select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnchoredCard } from "@/components/anchored-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { formatOffset } from "@/lib/format";
import { useSave } from "@/lib/save-context";
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
import { TIME_SLOTS } from "@/save/scenario-date";
import {
  OCCUPATION_CLEAR_COUNT_OFFSET,
  OCCUPATION_CLEAR_MAX,
  OCCUPATION_NOT_APPEARED,
  OCCUPATION_STATE_OFFSET,
  occupationStateOffset,
  readOccupations,
  syncClearCount,
  validateOccupationState,
  writeOccupationState,
  writeOccupationStates,
  type OccupationView,
} from "@/save/occupation";
import { labelKeywords, occupationGroupLabel, occupationLabel } from "@/save/master/labels";
import {
  OCCUPATIONS,
  OCCUPATION_GROUPS,
  occupationById,
  occupationGroupByKey,
  occupationGroupOf,
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

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

type Views = {
  occupations: OccupationView;
  accepted: AcceptedView;
};

type StateKind = "hidden" | "open" | "cleared";

const kindOf = (v: number): StateKind =>
  v === OCCUPATION_NOT_APPEARED ? "hidden" : v === 0 ? "open" : "cleared";

const KIND_LABELS: Record<StateKind, string> = {
  hidden: "まだ出ていない",
  open: "出た・未クリア",
  cleared: "クリア済み",
};

/** 種類を選んだときに書く値。クリア済みは今の回数を残し、0 回なら 1 にする */
const valueForKind = (kind: StateKind, current: number) =>
  kind === "hidden"
    ? OCCUPATION_NOT_APPEARED
    : kind === "open"
      ? 0
      : kindOf(current) === "cleared"
        ? current
        : 1;

function matches(query: string, ...texts: string[]): boolean {
  const q = query.trim().toLowerCase();
  return q === "" || texts.some((t) => t.toLowerCase().includes(q));
}

const entryLabel = (entry: OccupationEntry) => occupationLabel(entry.labelId);
const entryKeywords = (entry: OccupationEntry) => labelKeywords({ kind: "occupation", id: entry.labelId });

function occupationLabelById(id: number): string | undefined {
  const entry = occupationById(id);
  return entry ? entryLabel(entry) : undefined;
}

const groupLabelOf = (id: number) => {
  const group = occupationGroupByKey(occupationGroupOf(id));
  return group && occupationGroupLabel(group);
};

/** なりわい：状態の表・クリア数・受注中、連続なりわいなどの進み具合（なりわいのフラグ） */
export function OccupationPage() {
  const { save, update } = useSave();
  const [writeError, setWriteError] = useState<string | null>(null);
  const result = useMemo((): { views: Views } | { error: string } | null => {
    if (!save) return null;
    try {
      return {
        views: {
          occupations: readOccupations(save.working),
          accepted: readAccepted(save.working),
        },
      };
    } catch (e) {
      return { error: errorMessage(e) };
    }
  }, [save]);
  const views = result && "views" in result ? result.views : null;

  function write(mutator: (bytes: Uint8Array) => void) {
    setWriteError(null);
    try {
      update(mutator);
    } catch (e) {
      setWriteError(errorMessage(e));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {result && "error" in result && (
        <Alert variant="destructive">
          <AlertTitle>読み込めません</AlertTitle>
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      )}
      {views?.occupations.layoutProblem && (
        <Alert variant="destructive">
          <AlertTitle>読み取り専用</AlertTitle>
          <AlertDescription>{views.occupations.layoutProblem}</AlertDescription>
        </Alert>
      )}
      {writeError && (
        <Alert variant="destructive">
          <AlertTitle>書き込めません</AlertTitle>
          <AlertDescription>{writeError}</AlertDescription>
        </Alert>
      )}
      <SummaryCard
        view={views?.occupations ?? null}
        accepted={views?.accepted ?? null}
        write={write}
      />
      <SeriesCard />
      <DlcCard />
      <SecurityCard />
      <StatesCard
        key={`${save?.loadId ?? 0}-states`}
        view={views?.occupations ?? null}
        write={write}
      />
    </div>
  );
}

// ---------------------------------------------------------------- クリア数・受注中

function SummaryCard({
  view,
  accepted,
  write,
}: {
  view: OccupationView | null;
  accepted: AcceptedView | null;
  write: (m: (b: Uint8Array) => void) => void;
}) {
  const readOnly = !view || view.layoutProblem !== null;
  const mismatch = view !== null && view.clearCount !== view.stateSum;

  return (
    <AnchoredCard anchor={OCCUPATION_ANCHORS.current}>
      <CardHeader>
        <CardTitle>受注中・クリア数</CardTitle>
        <CardDescription>
          {/* ❓ 揃っていないときのゲームの動作は未確認。クリアしたなりわいの数も周回をまたぐ統計で、下の記録のクリア回数の合計と揃える */}
          受注中のなりわいと、これまでにクリアしたなりわいの数を編集できます。
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Label>クリアしたなりわいの数</Label>
            <InfoTip offset={OCCUPATION_CLEAR_COUNT_OFFSET}>下の記録のクリア回数の合計と同じ値にしておきます</InfoTip>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm">{view ? view.clearCount : "—"}</span>
            <span className="text-muted-foreground text-xs">
              （状態の表の合計 {view ? view.stateSum : "—"}）
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={readOnly || !mismatch}
              onClick={() => write(syncClearCount)}
            >
              表の合計に揃える
            </Button>
          </div>
          {mismatch && (
            <p className="text-destructive text-xs">クリア数と状態の表の合計が違います</p>
          )}
        </div>
        <AcceptRow view={accepted} write={write} />
      </CardContent>
    </AnchoredCard>
  );
}

/**
 * 受注中のなりわい。受注・外す書き込みは occupation-accept.ts（✅ 受注中の情報、🟢 受注で書くフラグ、🔶 外すときのフラグ）。
 * ❓ 書き込みのゲーム内の反映は要ゲーム内確認
 */
function AcceptRow({
  view,
  write,
}: {
  view: AcceptedView | null;
  write: (m: (b: Uint8Array) => void) => void;
}) {
  const entry = view && view.id !== 0 ? occupationById(view.id) : undefined;
  const options: SelectOption[] = [
    { value: "0", label: "受注していない" },
    ...OCCUPATIONS.map((o) => ({
      value: String(o.id),
      label: entryLabel(o),
      group: groupLabelOf(o.id),
      keywords: [...entryKeywords(o), o.client, o.type],
    })),
  ];
  return (
    <SearchSelectRow
      label="受注中のなりわい"
      offset={ACCEPT_OFFSETS.id}
      value={view === null ? null : String(view.id)}
      currentLabel={view ? "不明" : undefined}
      options={options}
      problem={view?.problem ?? null}
      searchPlaceholder="名前・依頼主"
      note="受注すると、今の日・時間帯で受注したことにします。連続なりわいなら、依頼主の次の依頼も進みます。記録が「まだ出ていない」なら「出た・未クリア」にします。ほかのなりわいを受注中なら、先にそれを外します（連続なりわいは「n 件目を依頼する前」に戻ります）"
      hint={
        view && view.id !== 0
          ? `${view.day + 1}日目 ${TIME_SLOTS[view.slot] ?? "不明な時間帯"}に受注${entry ? `（${entry.client}）` : ""}`
          : "受注すると、今の日・時間帯で受注したことになります"
      }
      onChange={(v) =>
        write((b) => (v === "0" ? releaseOccupation(b) : acceptOccupation(b, Number(v))))
      }
    />
  );
}

// ---------------------------------------------------------------- 依頼主ごとの進み具合（なりわいのフラグ）

const flagOffsetTip = `${formatOffset(OCCUPATION_FLAG_START)} + 番号`;

/** 連続なりわい・四天王の話・最終なりわい（OCCUPATION_SERIES_FLAGS） */
function SeriesCard() {
  return (
    <CollapsibleCard
      anchor={OCCUPATION_ANCHORS.chain}
      title="連続なりわい"
      extra={
        <InfoTip offset={flagOffsetTip}>
          なりわいのフラグ。依頼主はこの値を見て次の依頼を出します（状態の表は見ません）。「連続なりわい」は Wiki での呼び方です（ゲーム内には呼び方がありません）
        </InfoTip>
      }
      description={
        <>
          岡っ引き・極道・泥棒・宿無しの4人から順に受ける依頼の進み具合を選べます。
          <br />
          4種類をすべて終えると、最終なりわいにつながります。
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
      title="治安なりわい"
      extra={<InfoTip offset={flagOffsetTip}>なりわいのフラグ</InfoTip>}
      description={
        <>
          同心頭の佐古津と賭場の女将から受ける、治安によって内容が変わるなりわいの状態です。
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
      title="DLC なりわい"
      extra={<InfoTip offset={flagOffsetTip}>なりわいのフラグ</InfoTip>}
      description={
        <>
          DLC の人斬り 汁部理人と組んで受けるなりわいの進み具合です。
          <br />
          受注は上の「受注中のなりわい」の欄で設定します。
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
  const isSeries = n >= 4 && n <= 7;
  return (
    <FlagRow
      flag={flag}
      options={isSeries ? seriesOptions(n, flag.values, flag.jobs ?? []) : undefined}
      note={
        isSeries
          ? `${flag.note}。「受注済」を選ぶと、そのなりわいを今の日・時間帯で受注したことにします（受注中のなりわいも書く）。ほかの値を選ぶと、この連続なりわいを受注中なら受注を外します`
          : undefined
      }
      hint={flag.jobs && jobList(flag.jobs, separator)}
      write={(b, value, opts) => writeSeriesState(b, [{ flag: n, value }], seriesAcceptOf(n, value), opts)}
    />
  );
}

const jobList = (ids: readonly number[], separator = " → ") =>
  ids.map((id) => occupationLabelById(id) ?? "不明").join(separator);

// ---------------------------------------------------------------- 周回をまたぐ記録

type KindFilter = "all" | StateKind;

function StatesCard({
  view,
  write,
}: {
  view: OccupationView | null;
  write: (m: (b: Uint8Array) => void) => void;
}) {
  const { advanced } = useAdvancedMode();
  const readOnly = !view || view.layoutProblem !== null;
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const [filter, setFilter] = useState<KindFilter>("all");
  const [sync, setSync] = useState(true);

  const rows = OCCUPATIONS.filter((o) => group === "all" || occupationGroupOf(o.id) === group)
    .filter((o) => matches(query, ...entryKeywords(o), o.client, o.type))
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

  const groupItems = {
    all: "すべて",
    ...Object.fromEntries(OCCUPATION_GROUPS.map((g) => [g.key, occupationGroupLabel(g)])),
  };
  const filterItems = { all: "すべて", ...KIND_LABELS };

  return (
    <CollapsibleCard
      anchor={OCCUPATION_ANCHORS.records}
      title="なりわいの記録（周回をまたぐ統計）"
      extra={
        <InfoTip offset={formatOffset(OCCUPATION_STATE_OFFSET)}>
          {/* 🔶 0 の意味と、FFFF・0 への書き込みは要ゲーム内確認。1 でクリア済みになるのは ✅（今宵の虎徹で確認）。FFFF＝まだ出ていない、0＝出た・未クリア、1 以上＝クリアした回数 */}
          まだ出ていない・出た・未クリア・クリア済み（クリアした回数）のどれかです。クリア回数を入れるとなりわい一覧でクリア済みになります
        </InfoTip>
      }
      description={
        <>
          なりわいごとのクリア回数（ゲーム内の統計）を編集できます。報酬は増えません。
          <br />
          全 {OCCUPATIONS.length} 件：クリア済み {counts.cleared}・出た・未クリア {counts.open}・まだ出ていない {counts.hidden}
          {/* クリア済みにしても、報酬（お金・容姿・装飾品）は増えず、今の周回の連続なりわいも進まない */}
        </>
      }
      contentClassName="flex flex-col gap-3"
    >
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="w-56"
            placeholder="名前・依頼主で絞り込み"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Select value={group} items={groupItems} onValueChange={(v) => v !== null && setGroup(v)}>
            <SelectTrigger className="w-44" aria-label="まとまり">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              {OCCUPATION_GROUPS.map((g) => (
                <SelectItem key={g.key} value={g.key}>
                  {occupationGroupLabel(g)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filter}
            items={filterItems}
            onValueChange={(v) => v !== null && setFilter(v as KindFilter)}
          >
            <SelectTrigger className="w-44" aria-label="状態">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              {(Object.keys(KIND_LABELS) as StateKind[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {KIND_LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(KIND_LABELS) as StateKind[]).map((k) => (
            <Button
              key={k}
              variant="outline"
              size="sm"
              disabled={readOnly || rows.length === 0}
              onClick={() =>
                writeStates((b) => {
                  // クリア済みは、すでにクリアしたものの回数を残す
                  for (const o of rows)
                    writeOccupationStates(b, [o.id], valueForKind(k, view?.states[o.id] ?? 0));
                })
              }
            >
              表示中を「{KIND_LABELS[k]}」に
            </Button>
          ))}
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={sync}
              onCheckedChange={(on: boolean) => setSync(on)}
              aria-label="クリア数も揃える"
            />
            書き込むときにクリア数も揃える
          </label>
        </div>
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
  write: (m: (b: Uint8Array) => void) => void;
}) {
  const kind = value === null ? null : kindOf(value);
  const offset = occupationStateOffset(o.id);
  return (
    <div className="flex flex-wrap items-center gap-3 py-1.5">
      <LazySelect
        value={kind}
        items={KIND_LABELS}
        placeholder="未読み込み"
        disabled={readOnly}
        className="w-48"
        aria-label={entryLabel(o)}
        onValueChange={(k) =>
          value !== null &&
          write((b) =>
            writeOccupationState(b, o.id, valueForKind(k as StateKind, value), { advanced }),
          )
        }
      >
        {(Object.keys(KIND_LABELS) as StateKind[]).map((k) => (
          <SelectItem key={k} value={k}>
            {KIND_LABELS[k]}
          </SelectItem>
        ))}
      </LazySelect>
      {kind === "cleared" && value !== null && (
        <CountInput id={o.id} value={value} readOnly={readOnly} advanced={advanced} write={write} />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm"><GameLabel occupation={o.labelId} /></span>
          <InfoTip offset={offset}>
            <GameLabel occupation={o.labelId} lang="en" />
            {o.noteJa && `。${o.noteJa}`}
          </InfoTip>
          <Badge variant="secondary" className="font-normal">
            {o.client}
          </Badge>
          <Badge variant="outline" className="font-normal">
            {o.type}
          </Badge>
          {o.alignment && (
            <Badge variant="outline" className="font-normal">
              {o.alignment}
            </Badge>
          )}
          {accepted && <Badge className="font-normal">受注中</Badge>}
        </div>
        <span className="text-muted-foreground text-xs">
          報酬 {o.reward.toLocaleString()} 文
          {o.bonus > 0 && `・追加 ${o.bonus.toLocaleString()} 文`}
          {o.deadlineDays !== null && `・期限 ${o.deadlineDays} 日`}
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
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState(value);
  // セーブ側の値が変わったら入力中の値を捨てる
  if (shown !== value) {
    setShown(value);
    setDraft(String(value));
    setError(null);
  }

  function commit() {
    const text = draft.trim();
    if (!/^\d+$/.test(text) || Number(text) < 1) {
      setError("1 以上の整数で入力してください");
      return;
    }
    const v = Number(text);
    const problem = validateOccupationState(id, v, value, { advanced });
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    if (v !== value) write((b) => writeOccupationState(b, id, v, { advanced }));
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        className="w-20"
        inputMode="numeric"
        aria-label="クリア回数"
        disabled={readOnly}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
      />
      <span className="text-muted-foreground text-xs">回</span>
      {error && <span className="text-destructive text-xs">{error}</span>}
      {!error && !advanced && value > OCCUPATION_CLEAR_MAX && (
        <span className="text-destructive text-xs">上限 {OCCUPATION_CLEAR_MAX} を超えています</span>
      )}
    </div>
  );
}
