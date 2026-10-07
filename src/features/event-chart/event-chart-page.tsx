import { useMemo, useState, type KeyboardEvent } from "react";
import { SelectRow } from "@/components/select-row";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { recordOptions, stateOptions } from "@/features/scenario/event-options";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { formatHex2 } from "@/lib/format";
import { useSave } from "@/lib/save-context";
import {
  CHART_BOX_LOOK_LABELS,
  chartBoxLook,
  hiddenRouteEntered,
  type ChartBoxLook,
  type ChartContext,
} from "@/save/event-chart-view";
import { CHART_NODES } from "@/save/master/chart-nodes";
import {
  BOX_HEIGHT,
  BOX_WIDTH,
  CHART_BOXES,
  CHART_COLS,
  CHART_LINKS,
  CHART_ROWS,
  boxEventId,
  boxName,
  linkSegments,
  type ChartBox,
  type ChartBoxKind,
} from "@/save/master/event-chart-layout";
import { readRouteCandidates } from "@/save/route-candidates";
import { readDate } from "@/save/scenario-date";
import {
  EVENT_NAMES,
  EVENT_RECORD_OFFSET,
  EVENT_STATE_OFFSET,
  readEvents,
  recordLabel,
  stateLabel,
  writeEventRecord,
  writeEventState,
  type EventsView,
} from "@/save/scenario-events";

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

// 描く大きさ（px）。列・段の単位（event-chart-layout.ts）をこの倍率で広げる
const COL_PX = 160;
const ROW_PX = 26;
const MARGIN = 16;
const BOX_W = BOX_WIDTH * COL_PX;
const BOX_H = BOX_HEIGHT * ROW_PX;
const WIDTH = CHART_COLS * COL_PX + MARGIN * 2;
const HEIGHT = CHART_ROWS * ROW_PX + MARGIN * 2;

const px = (col: number) => MARGIN + col * COL_PX;
const py = (row: number) => MARGIN + row * ROW_PX;

// ゲーム画面のチャートの色に寄せる
const BACKGROUND = "#F4E6EA";
// ゲームの線はふだん黒。赤くなる線の規則は ❓ なので、赤い線は描かない
const LINK_COLOR = "#2B2B2B";
const FAILED_COLOR = "#E00000";
const TEXT_COLOR = "#3B2A2E";
const KIND_COLORS: Readonly<Record<ChartBoxKind, { fill: string; stroke: string; label: string }>> = {
  prajna: { fill: "#F7D3DC", stroke: "#D2557A", label: "攘夷" },
  shogunate: { fill: "#D8EDC7", stroke: "#78A955", label: "幕府" },
  foreigners: { fill: "#CFE4F1", stroke: "#5E9BC4", label: "外国" },
  other: { fill: "#F3EBC2", stroke: "#C2A845", label: "その他" },
  hidden: { fill: "#E6D6EF", stroke: "#9C6FB8", label: "隠しルート" },
};
const MASKED = { fill: "#7A7A7A", stroke: "#111111", text: "#D4D4D4" };

type Read = { events: EventsView; ctx: ChartContext } | { error: string } | null;

const NO_SAVE: ChartContext = { now: null, hiddenRouteEntered: false };

export function EventChartPage() {
  const { save } = useSave();

  const result = useMemo((): Read => {
    if (!save) return null;
    try {
      const b = save.working;
      const date = readDate(b);
      const events = readEvents(b);
      const route = readRouteCandidates(b);
      return {
        events,
        ctx: {
          // 日付が検証に落ちたときは、時間帯の経過による失敗の印を付けない
          now: date.problem ? null : { day: date.day, slot: date.slot },
          hiddenRouteEntered: hiddenRouteEntered(events.entries, route.hiddenProblem ? null : route.hidden),
        },
      };
    } catch (e) {
      return { error: errorMessage(e) };
    }
  }, [save]);
  // 名前が隠れる枠に、？？？の代わりに名前を出す。既定は隠す（ユーザー判断 2026-10-07）
  const [revealNames, setRevealNames] = useState(false);

  if (result && "error" in result) {
    return (
      <Alert variant="destructive">
        <AlertTitle>読み込めません</AlertTitle>
        <AlertDescription>{result.error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!result && (
        <Alert>
          <AlertTitle>セーブファイルが読み込まれていません</AlertTitle>
          <AlertDescription>
            全部の枠を名前つきで描いています。サイドバーの「ファイルを開く」から読み込むと、セーブの状態に合わせて描き分け、枠をクリックして状態を編集できます。
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>イベントチャート</CardTitle>
          <CardDescription>
            ゲームの「状況」のチャートを、イベントの状態（0x36A8＋添字）とチャート表示の記録（0x3838＋添字）から描いたものです。
            グレーの「？？？」は名前が隠れる枠、赤い斜線は失敗です。隠しルートに入ったことがない（隠しルートのフラグ 0x378E が 0 で、三姉妹見参の状態も記録も 04 でない）ときは、
            ゲームでは隠しルートの枠ごと出ないので、点線で示します。
            線は出し分けの規則が分からないため、常に全部を黒で描いています（ゲームで赤くなる線の規則は未確認）。状態が 01〜03 のときの見え方は未確認です（要ゲーム内確認）。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Legend />
            <div className="flex items-center gap-2">
              <Switch id="reveal-names" checked={revealNames} onCheckedChange={setRevealNames} />
              <Label htmlFor="reveal-names" className="text-xs">
                隠れた名前を表示する
              </Label>
            </div>
          </div>
          <ChartCanvas
            key={save?.loadId ?? 0}
            events={result?.events ?? null}
            ctx={result?.ctx ?? NO_SAVE}
            revealNames={revealNames}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
      {Object.values(KIND_COLORS).map((c) => (
        <span key={c.label} className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-5 rounded-sm border" style={{ background: c.fill, borderColor: c.stroke }} />
          {c.label}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block h-3 w-5 rounded-sm border"
          style={{ background: MASKED.fill, borderColor: MASKED.stroke }}
        />
        名前が隠れる
      </span>
      <span className="flex items-center gap-1.5">
        <svg width={20} height={12} aria-hidden>
          <rect x={0.5} y={0.5} width={19} height={11} rx={2} fill="#fff" stroke="#999" />
          <line x1={1} y1={11} x2={19} y2={1} stroke={FAILED_COLOR} strokeWidth={1.5} />
        </svg>
        失敗
      </span>
    </div>
  );
}

function ChartCanvas({
  events,
  ctx,
  revealNames,
}: {
  events: EventsView | null;
  ctx: ChartContext;
  revealNames: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const selectedBox = CHART_BOXES.find((b) => b.node === selected);
  // ポップオーバーを選んだ枠の位置に出すための、枠と同じ位置・大きさの要素
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);

  const looks = useMemo(
    () =>
      new Map(
        CHART_BOXES.map((b) => {
          const id = boxEventId(b);
          const entry = events && id !== null ? (events.entries[id] ?? null) : null;
          return [b.node, chartBoxLook(entry, ctx, b)];
        }),
      ),
    [events, ctx],
  );

  return (
    <div className="overflow-x-auto rounded-md border">
      <div className="relative" style={{ width: WIDTH, height: HEIGHT }}>
        <svg
          width={WIDTH}
          height={HEIGHT}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label="イベントチャート"
          style={{ background: BACKGROUND, display: "block" }}
        >
          <g stroke={LINK_COLOR} strokeWidth={1.5} fill="none" strokeLinecap="square">
            {CHART_LINKS.flatMap((l, i) =>
              linkSegments(l).map((s, j) => (
                <line
                  key={`${i}-${j}`}
                  x1={px(s.x1)}
                  y1={py(s.y1)}
                  x2={px(s.x2)}
                  y2={py(s.y2)}
                />
              )),
            )}
          </g>
          {CHART_BOXES.map((b) => (
            <BoxShape
              key={b.node}
              box={b}
              look={looks.get(b.node) ?? "shown"}
              selected={b.node === selected}
              revealName={revealNames}
              onSelect={() => setSelected(b.node)}
            />
          ))}
        </svg>
        {selectedBox && (
          <div
            ref={setAnchor}
            className="pointer-events-none absolute"
            style={{
              left: px(selectedBox.col),
              top: py(selectedBox.row + (1 - BOX_HEIGHT) / 2),
              width: BOX_W,
              height: BOX_H,
            }}
          />
        )}
        <Popover open={selectedBox !== undefined} onOpenChange={(open) => !open && setSelected(null)}>
          <PopoverContent className="w-80" align="start" anchor={anchor}>
            {selectedBox && (
              <BoxEditor box={selectedBox} events={events} look={looks.get(selectedBox.node) ?? "shown"} />
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

function BoxShape({
  box,
  look,
  selected,
  revealName,
  onSelect,
}: {
  box: ChartBox;
  look: ChartBoxLook;
  selected: boolean;
  /** 名前が隠れる枠でも、？？？の代わりに名前を出す */
  revealName: boolean;
  onSelect: () => void;
}) {
  const x = px(box.col);
  const y = py(box.row + (1 - BOX_HEIGHT) / 2);
  const name = boxName(box);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  };
  const common = {
    role: "button",
    tabIndex: 0,
    onClick: onSelect,
    onKeyDown,
    style: { cursor: "pointer", outline: "none" },
  } as const;

  // 枠ごと出ない枠：クリックして編集できるように、薄い点線だけ描く
  if (look === "absent")
    return (
      <g {...common} aria-label={`${name}（${CHART_BOX_LOOK_LABELS[look]}）`}>
        <title>{`${name}（${CHART_BOX_LOOK_LABELS[look]}）`}</title>
        <rect
          x={x}
          y={y}
          width={BOX_W}
          height={BOX_H}
          rx={3}
          fill="transparent"
          stroke={selected ? "#000" : KIND_COLORS[box.kind].stroke}
          strokeOpacity={selected ? 1 : 0.45}
          strokeDasharray="3 3"
        />
      </g>
    );

  const masked = look === "masked" || look === "masked-failed";
  const failed = look === "masked-failed" || look === "shown-failed";
  const color = KIND_COLORS[box.kind];
  const fill = masked ? MASKED.fill : color.fill;
  const stroke = masked ? MASKED.stroke : color.stroke;
  const label = masked && !revealName ? "？？？" : name;

  return (
    <g {...common} aria-label={`${name}（${CHART_BOX_LOOK_LABELS[look]}）`}>
      <title>{`${name}（${CHART_BOX_LOOK_LABELS[look]}）`}</title>
      <rect
        x={x}
        y={y}
        width={BOX_W}
        height={BOX_H}
        rx={3}
        fill={fill}
        stroke={selected ? "#000" : stroke}
        strokeWidth={selected ? 2 : 1.2}
      />
      {/* ゲーム画面の枠の四隅の点 */}
      {[
        [x + 2.5, y + 2.5],
        [x + BOX_W - 2.5, y + 2.5],
        [x + 2.5, y + BOX_H - 2.5],
        [x + BOX_W - 2.5, y + BOX_H - 2.5],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={1.2} fill={stroke} />
      ))}
      <text
        x={x + BOX_W / 2}
        y={y + BOX_H / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fill={masked ? MASKED.text : TEXT_COLOR}
        style={{ userSelect: "none" }}
      >
        {label}
      </text>
      {failed && (
        <line x1={x + 1} y1={y + BOX_H - 1} x2={x + BOX_W - 1} y2={y + 1} stroke={FAILED_COLOR} strokeWidth={2} />
      )}
    </g>
  );
}

function BoxEditor({ box, events, look }: { box: ChartBox; events: EventsView | null; look: ChartBoxLook }) {
  const { update } = useSave();
  const { advanced } = useAdvancedMode();
  const index = boxEventId(box);
  if (index === null) return <p className="text-sm">{boxName(box)}（イベントに当たらない枠）</p>;
  const entry = events?.entries[index] ?? null;
  const problem = events?.problem ?? null;
  const shared = CHART_NODES.filter((n) => n.eventId === index).length > 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <div className="text-sm font-medium">
          {index}. {EVENT_NAMES[index]?.name ?? boxName(box)}
        </div>
        <div className="text-muted-foreground text-xs">
          {EVENT_NAMES[index]?.day}
          {events && `　チャート：${CHART_BOX_LOOK_LABELS[look]}`}
        </div>
      </div>
      <SelectRow
        label="状態"
        offset={EVENT_STATE_OFFSET + index}
        value={entry ? String(entry.state) : null}
        currentLabel={entry ? `${formatHex2(entry.state)} ${stateLabel(entry.state)}` : undefined}
        options={stateOptions}
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
        note="周回をまたぐ記録（生きた証）。FF で名前が隠れ、04 で名前が出る。FF でも状態が成功（04）なら出ます。隠しルートのイベントは FF だと成功以外は枠ごと出ません（確認済み）。ほかの周回にも引き継がれる可能性があります"
        onChange={(v) => update((b) => writeEventRecord(b, index, Number(v), { advanced }))}
      />
      {shared && (
        <p className="text-muted-foreground text-xs">
          このイベントはチャートにほかの枠も持ちます。値はイベントごとなので、どの枠も同じ値になります。
        </p>
      )}
    </div>
  );
}
