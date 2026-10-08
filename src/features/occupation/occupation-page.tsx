import { useMemo, useState } from "react";
import { CertaintyBadge } from "@/components/certainty-badge";
import { CollapsibleCard } from "@/components/collapsible-card";
import { GameLabel } from "@/components/game-label";
import { InfoTip } from "@/components/info-tip";
import { LazySelect } from "@/components/lazy-select";
import { SelectRow } from "@/components/select-row";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  acceptRuleOf,
  readAccepted,
  releaseOccupation,
  seriesAcceptOf,
  writeSeriesState,
  type AcceptedView,
  type FlagWrite,
} from "@/save/occupation-accept";
import { TIME_SLOTS } from "@/save/scenario-date";
import {
  OCCUPATION_CLEAR_COUNT_OFFSET,
  OCCUPATION_CLEAR_MAX,
  OCCUPATION_NOT_APPEARED,
  OCCUPATION_STATE_OFFSET,
  OCCUPATION_WRITE_CONFIRMED,
  occupationStateOffset,
  readOccupations,
  syncClearCount,
  validateOccupationState,
  writeOccupationState,
  writeOccupationStates,
  type OccupationView,
} from "@/save/occupation";
import { labelOf } from "@/save/master/labels";
import {
  OCCUPATIONS,
  OCCUPATION_GROUPS,
  occupationById,
  occupationGroupOf,
  type OccupationEntry,
} from "@/save/master/occupation-names";
import {
  SHIRUBE_FLAG_OFFSETS,
  SHIRUBE_JOB_IDS,
  SHIRUBE_STATES,
  readShirube,
  writeShirubeState,
  type ShirubeView,
} from "@/save/shirube";
import {
  OCCUPATION_FLAG_START,
  TOWNSFOLK_NOTES,
  TOWNSFOLK_START,
  readTownsfolk,
  type TownsfolkView,
} from "@/save/townsfolk";

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

type Views = {
  occupations: OccupationView;
  townsfolk: TownsfolkView;
  shirube: ShirubeView;
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

/** 連続なりわいなど（なりわいのフラグ）の欄の下に出す、その依頼主のなりわい */
const FLAG_JOBS: Readonly<Record<number, readonly number[]>> = {
  [OCCUPATION_FLAG_START + 4]: range(171, 178),
  [OCCUPATION_FLAG_START + 5]: range(179, 186),
  [OCCUPATION_FLAG_START + 6]: range(187, 194),
  [OCCUPATION_FLAG_START + 7]: range(195, 206),
  [OCCUPATION_FLAG_START + 8]: range(163, 166),
  [OCCUPATION_FLAG_START + 9]: [167, 168, 169, 170],
  [OCCUPATION_FLAG_START + 26]: [207, 208],
};

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i).filter((id) =>
    occupationById(id),
  );
}

function matches(query: string, ...texts: string[]): boolean {
  const q = query.trim().toLowerCase();
  return q === "" || texts.some((t) => t.toLowerCase().includes(q));
}

const occupationLabel = (entry: OccupationEntry) =>
  labelOf({ kind: "occupation", id: entry.labelId });

function occupationLabelById(id: number): string | undefined {
  const entry = occupationById(id);
  return entry ? occupationLabel(entry) : undefined;
}

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
          townsfolk: readTownsfolk(save.working),
          shirube: readShirube(save.working),
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
      {!save && (
        <Alert>
          <AlertTitle>セーブファイルが読み込まれていません</AlertTitle>
          <AlertDescription>
            サイドバーの「ファイルを開く」から読み込むと、下の項目を編集できます。
          </AlertDescription>
        </Alert>
      )}
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
      <SeriesCard view={views?.townsfolk ?? null} write={write} />
      <DlcCard view={views?.shirube ?? null} write={write} />
      <SecurityCard view={views?.townsfolk ?? null} write={write} />
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
    <Card>
      <CardHeader>
        <CardTitle>受注中・クリア数</CardTitle>
        <CardDescription>
          クリアしたなりわいの数も周回をまたぐ統計で、下の記録の合計（クリア回数の合計）と揃えておきます。揃っていないときのゲームの動作は
          ❓ です。
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Label>クリアしたなりわいの数</Label>
            <InfoTip offset={OCCUPATION_CLEAR_COUNT_OFFSET}>u16。状態の表の合計に等しい</InfoTip>
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
    </Card>
  );
}

const flagWritesText = (writes: readonly FlagWrite[]) =>
  writes.map((w) => `番号 ${w.flag}＝${w.value}`).join("、");

/** 受注中のなりわい。受注・外す書き込みは occupation-accept.ts（✅ 受注中の情報、🟢 受注で書くフラグ、🔶 外すときのフラグ） */
function AcceptRow({
  view,
  write,
}: {
  view: AcceptedView | null;
  write: (m: (b: Uint8Array) => void) => void;
}) {
  const entry = view && view.id !== 0 ? occupationById(view.id) : undefined;
  const rule = view && view.id !== 0 ? acceptRuleOf(view.id) : null;
  const options: SelectOption[] = [
    { value: "0", label: "受注していない" },
    ...OCCUPATIONS.map((o) => ({
      value: String(o.id),
      label: `${o.id} ${occupationLabel(o)}`,
      group: OCCUPATION_GROUPS.find((g) => g.key === occupationGroupOf(o.id))?.label,
      keywords: [occupationLabel(o), o.client, o.en, o.type],
    })),
  ];
  return (
    <SearchSelectRow
      label="受注中のなりわい"
      offset={ACCEPT_OFFSETS.id}
      badges={
        <Badge variant="outline" className="font-normal">
          書き込みは要ゲーム内確認
        </Badge>
      }
      value={view === null ? null : String(view.id)}
      currentLabel={view ? `${view.id} 表にない ID` : undefined}
      options={options}
      problem={view?.problem ?? null}
      searchPlaceholder="名前・依頼主・ID"
      note={`${formatOffset(ACCEPT_OFFSETS.id)} u16 ID、${formatOffset(ACCEPT_OFFSETS.day)} u16 受注した日（経過日数）、${formatOffset(ACCEPT_OFFSETS.slot)} u8 受注した時間帯、${formatOffset(ACCEPT_OFFSETS.active)} u8 受注中だけ FF。受注すると、今の日・時間帯で受注したことにし、連続なりわいなら依頼主がそのとき書くなりわいのフラグ（野戸仏の2件目なら番号 4＝21 など）も書きます。記録が「まだ出ていない」なら「出た・未クリア」にします。ほかのなりわいを受注中なら、先にそれを外します（連続なりわいは「n 件目を依頼する前」に戻す）`}
      hint={
        view && view.id !== 0
          ? `${view.day + 1}日目 ${TIME_SLOTS[view.slot] ?? `時間帯 ${view.slot}`}に受注${entry ? `（${entry.client}）` : ""}${rule?.onAccept.length ? `。受注中のフラグ：${flagWritesText(rule.onAccept)}` : ""}${rule?.onRelease.length ? `。外すと ${flagWritesText(rule.onRelease)}` : ""}`
          : "受注すると、今の日・時間帯で受注したことになります"
      }
      onChange={(v) =>
        write((b) => (v === "0" ? releaseOccupation(b) : acceptOccupation(b, Number(v))))
      }
    />
  );
}

// ---------------------------------------------------------------- 依頼主ごとの進み具合（なりわいのフラグ）

type FlagCardProps = {
  view: TownsfolkView | null;
  write: (m: (b: Uint8Array) => void) => void;
};

/** 連続なりわい（番号 4〜7）、最終なりわい（26）、四天王の話（25） */
const SERIES_CARD_FLAGS = [4, 5, 6, 7, 26, 25] as const;
/** 治安なりわい（番号 8・9） */
const SECURITY_CARD_FLAGS = [8, 9] as const;

const flagOffsetTip = `${formatOffset(OCCUPATION_FLAG_START)} + 番号（u8）`;

function SeriesCard({ view, write }: FlagCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          連続なりわい
          <InfoTip offset={flagOffsetTip}>
            なりわいのフラグ。依頼主はこの値を見て次の依頼を出します（状態の表は見ません）。「連続なりわい」は Wiki での呼び方です（ゲーム内には呼び方がありません）
          </InfoTip>
        </CardTitle>
        <CardDescription>
          【岡っ引き】野戸仏・【極道】小鳩・【泥棒】泥棒さん・【宿無し】おっつぁんの4種類。十の位が何件目か、一の位が
          0＝依頼前・1＝依頼済みです。野戸仏は、20 で2件目「督促状」から始まり、100
          で完了になることを確認済みです。ほかの欄の書き込みの反映は要ゲーム内確認です。
          4種類をすべて終えると四天王の話が進み、最終なりわいにつながります。連続なりわいを 100
          にしても、最終なりわいが 99 未満なら新しい依頼は出ません。
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {SERIES_CARD_FLAGS.map((flag) => (
          <FlagRow key={flag} flag={flag} view={view} write={write} />
        ))}
      </CardContent>
    </Card>
  );
}

function SecurityCard({ view, write }: FlagCardProps) {
  return (
    <CollapsibleCard
      title="治安なりわい"
      extra={<InfoTip offset={flagOffsetTip}>なりわいのフラグ</InfoTip>}
      description={
        <>
          【同心頭】佐古津と【賭場】女将の2人から受けるなりわいです。連続なりわいではなく、そのときの治安によって受けられるなりわいが変わり、何回でも受けられます。
          女将は最終なりわい（阿弥浜八人衆）を始める人でもあります。値の意味は未確認で、書き込みの反映は要ゲーム内確認です。
        </>
      }
      contentClassName="grid gap-4 sm:grid-cols-2"
    >
      {SECURITY_CARD_FLAGS.map((flag) => (
        <FlagRow key={flag} flag={flag} view={view} write={write} separator="・" />
      ))}
    </CollapsibleCard>
  );
}

function DlcCard({ view, write }: { view: ShirubeView | null; write: (m: (b: Uint8Array) => void) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          DLC なりわい
          <InfoTip offset={flagOffsetTip}>なりわいのフラグ 27〜31</InfoTip>
        </CardTitle>
        <CardDescription>人斬り 汁部理人と組んで受けるなりわい（209〜212）です。</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <ShirubeRow view={view} write={write} />
      </CardContent>
    </Card>
  );
}

/** なりわいのフラグ1つの欄。連続なりわい（番号 4〜7）の「依頼済み」は、そのなりわいの受注も書く */
function FlagRow({ flag, view, write, separator = " → " }: FlagCardProps & { flag: number; separator?: string }) {
  const { advanced } = useAdvancedMode();
  const offset = OCCUPATION_FLAG_START + flag;
  const info = TOWNSFOLK_NOTES[offset];
  const current = view?.values[offset - TOWNSFOLK_START] ?? null;
  const jobs = FLAG_JOBS[offset];
  const isSeries = flag >= 4 && flag <= 7;
  return (
    <SelectRow
      label={`${info.name}（番号 ${flag}）`}
      offset={offset}
      badges={
        <Badge variant="outline" className="font-normal">
          {flag === 4 ? "受注の書き込みは要ゲーム内確認" : "書き込みは要ゲーム内確認"}
        </Badge>
      }
      value={current === null ? null : String(current)}
      currentLabel={current === null ? undefined : `${current} 不明`}
      options={(info.values ?? []).map((s) => {
        const accept = seriesAcceptOf(flag, s.value);
        return {
          value: String(s.value),
          label: `${s.value} ${s.label}${accept ? `（${accept} ${occupationLabelById(accept)} を受注）` : ""}`,
          group: s.group,
        };
      })}
      problem={view?.problem ?? null}
      note={
        isSeries
          ? `${info.note}。「依頼済み」を選ぶと、そのなりわいを今の日・時間帯で受注したことにします（受注中のなりわいも書く）。ほかの値を選ぶと、この連続なりわいを受注中なら受注を外します`
          : info.note
      }
      hint={jobs && jobList(jobs, separator)}
      onChange={(v) =>
        write((b) =>
          writeSeriesState(b, [{ flag, value: Number(v) }], seriesAcceptOf(flag, Number(v)), { advanced }),
        )
      }
    />
  );
}

const jobList = (ids: readonly number[], separator = " → ") =>
  ids.map((id) => `${id} ${occupationLabelById(id)}`).join(separator);

/**
 * 汁部（DLC）のなりわい。なりわいのフラグ 27〜31 を1つの欄にまとめる（🟢。進み具合そのものはこの欄にない 🔶）。
 * 受注中のなりわい（0x45F4E）は書かない（受注中の欄にまとめる）
 */
function ShirubeRow({
  view,
  write,
}: {
  view: ShirubeView | null;
  write: (m: (b: Uint8Array) => void) => void;
}) {
  return (
    <SelectRow
      label="【人斬り】汁部（DLC）（番号 27〜31）"
      offset={SHIRUBE_FLAG_OFFSETS[0]}
      badges={
        <Badge variant="outline" className="font-normal">
          書き込みは要ゲーム内確認
        </Badge>
      }
      value={view === null ? null : (view.state?.key ?? "current")}
      currentLabel={view ? `${view.values.join("・")} 表にない組み合わせ` : undefined}
      options={SHIRUBE_STATES.map((s) => ({
        value: s.key,
        label: s.label,
        group: s.group,
        selectedLabel: s.fullLabel,
      }))}
      problem={view?.problem ?? null}
      note={`${formatOffset(SHIRUBE_FLAG_OFFSETS[0])}〜${formatOffset(SHIRUBE_FLAG_OFFSETS[4])}（u8 × 5）。27＝組んでいる、28〜31＝209〜212 を終えたときの結果（1 成功、2 失敗を成功扱い）で、次に汁部と話すと 0 に戻ります。どれを選んでも 5 B すべてを書きます。受注中は 27〜31 が「組んだ」と同じ値で、受注中のなりわい ${formatOffset(ACCEPT_OFFSETS.id)} が 209〜212 になります。「受注」を選ぶと「受注中のなりわい」の欄と同じ書き込みをし、ほかを選ぶと汁部のなりわいの受注を外します`}
      hint={`${jobList(SHIRUBE_JOB_IDS)} の順に頼まれます。どこまで進んだかはこの欄にも、下の記録にもありません（位置は未確認）`}
      onChange={(key) => write((b) => writeShirubeState(b, key))}
    />
  );
}

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
    .filter((o) => matches(query, occupationLabel(o), o.en, o.client, o.type, String(o.id)))
    .filter((o) => filter === "all" || !view || kindOf(view.states[o.id]) === filter);
  const counts = { hidden: 0, open: 0, cleared: 0 };
  if (view) for (const o of OCCUPATIONS) counts[kindOf(view.states[o.id])]++;

  /** 状態を書き、指定があればクリア数も揃える */
  const writeStates = (mutator: (b: Uint8Array) => void) =>
    write((b) => {
      mutator(b);
      if (sync) syncClearCount(b);
    });

  const groupItems = {
    all: "すべて",
    ...Object.fromEntries(OCCUPATION_GROUPS.map((g) => [g.key, g.label])),
  };
  const filterItems = { all: "すべて", ...KIND_LABELS };

  return (
    <CollapsibleCard
      title="なりわいの記録（周回をまたぐ統計）"
      extra={
        <>
          <InfoTip offset={`${formatOffset(OCCUPATION_STATE_OFFSET)} + ID×2（u16 × 256）`}>
            FFFF＝まだ出ていない、0＝出た・未クリア（🔶）、1
            以上＝これまでの周回を通してクリアした回数。 1
            にするとなりわい一覧でクリア済みになることを確認済み（今宵の虎徹は）
          </InfoTip>
          <CertaintyBadge mark="🔶" text="0 の意味と、FFFF・0 への書き込みは要ゲーム内確認" />
        </>
      }
      description={
        <>
          ゲーム内の統計に出る、周回をまたいだなりわいごとのクリア回数です。クリア済みにしても、報酬（お金・容姿・装飾品）は増えず、今の周回の連続なりわいも進みません（連続なりわいは上の欄で進めます）。
          全 {OCCUPATIONS.length} 件のうち、クリア済み {counts.cleared}・出た・未クリア{" "}
          {counts.open}・まだ出ていない {counts.hidden}
        </>
      }
      contentClassName="flex flex-col gap-3"
    >
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="w-56"
            placeholder="名前・依頼主・ID で絞り込み"
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
                  {g.label}
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
        aria-label={occupationLabel(o)}
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
          <span className="text-muted-foreground font-mono text-xs">{o.id}</span>
          <span className="text-sm"><GameLabel occupation={o.labelId} /></span>
          <InfoTip offset={offset}>
            {o.en}
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
          {OCCUPATION_WRITE_CONFIRMED.has(o.id) && <span className="text-xs">✅</span>}
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
      setError("1 以上の整数");
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
