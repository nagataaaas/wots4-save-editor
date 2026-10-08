import { useMemo, useRef, useState, type KeyboardEvent } from "react";
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
import { PLAY_COUNT_REVEALS_BEST_ROUTE, readCycleCounts } from "@/save/cycle-counts";
import {
  chartViewWithoutSave,
  computeChartView,
  frameLookLabel,
  type ArmLook,
  type ChartView,
  type FrameLook,
} from "@/save/event-chart-view";
import {
  CHART_COLS,
  CHART_DIRS,
  CHART_FRAMES,
  CHART_LINES,
  CHART_ROWS,
  frameName,
  type ChartFrame,
  type ChartRoute,
  type ChartLine,
} from "@/save/master/event-chart-layout";
import {
  EVENT_LIST,
  eventNameOf,
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

// 描く大きさ（px）。格子の偶数の列は枠の列、奇数の列は線の列
const FRAME_COL_PX = 118;
const LINE_COL_PX = 26;
const ROW_PX = 34;
const FRAME_H = 24;
const MARGIN = 16;

/** 列の左端 */
const colX = (col: number) => MARGIN + Math.ceil(col / 2) * FRAME_COL_PX + Math.floor(col / 2) * LINE_COL_PX;
const colW = (col: number) => (col % 2 === 0 ? FRAME_COL_PX : LINE_COL_PX);
const rowY = (row: number) => MARGIN + row * ROW_PX;
const WIDTH = colX(CHART_COLS) + MARGIN;
const HEIGHT = rowY(CHART_ROWS) + MARGIN;

// ゲーム画面のチャートの色に寄せる。線はふだん黒で、到達した枠どうしをつなぐ道が赤い
const BACKGROUND = "#F4E6EA";
const LINK_COLOR = "#2B2B2B";
const RED_LINK = "#D40000";
const HIDDEN_COLOR = "#8A8A8A";
const FAILED_COLOR = "#7A0000";
const GLOW_COLOR = "#F0B400";
const TEXT_COLOR = "#3B2A2E";
const ROUTE_COLORS: Readonly<Record<ChartRoute, { fill: string; stroke: string; label: string }>> = {
  prajna: { fill: "#F7D3DC", stroke: "#D2557A", label: "攘夷" },
  shogunate: { fill: "#D8EDC7", stroke: "#78A955", label: "幕府" },
  foreigners: { fill: "#CFE4F1", stroke: "#5E9BC4", label: "外国" },
  other: { fill: "#F3EBC2", stroke: "#C2A845", label: "共通・無所属" },
  best: { fill: "#E6D6EF", stroke: "#9C6FB8", label: "真ルート" },
  tutorial: { fill: "#EEEEEE", stroke: "#999999", label: "その他" },
};
const LEGEND_ROUTES: readonly ChartRoute[] = ["prajna", "shogunate", "foreigners", "other", "best"];
const MASKED = { fill: "#7A7A7A", stroke: "#111111", text: "#D4D4D4" };

type Read = { events: EventsView; view: ChartView; playCount: number; clearTotal: number } | { error: string } | null;

export function EventChartPage() {
  const { save } = useSave();

  const result = useMemo((): Read => {
    if (!save) return null;
    try {
      const b = save.working;
      const events = readEvents(b);
      const counts = readCycleCounts(b);
      return {
        events,
        playCount: counts.playCount,
        clearTotal: counts.clearTotal,
        view: computeChartView({ entries: events.entries, playCount: counts.playCount, clearTotal: counts.clearTotal }),
      };
    } catch (e) {
      return { error: errorMessage(e) };
    }
  }, [save]);
  // 名前が隠れる枠に、？？？の代わりに名前を出す。既定は隠す（ユーザー判断 2026-10-07）
  const [revealNames, setRevealNames] = useState(false);
  const noSave = useMemo(() => chartViewWithoutSave(), []);

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
            ゲームの「状況」のチャートを、ゲームと同じ升の並びと規則で、イベントの状態（0x36A8＋添字）・チャート表示の記録（0x3838＋添字）・周回数（0x0B8C）から描いたものです。
            状態が 03・04 か記録が 04 の枠は名前が出て、それ以外は「？？？」です。状態が 05 の枠と、後ろの段階に進んだのに何もしなかった時間帯の枠には失敗の印が付きます。
            赤い線は、今の周回で到達した枠（状態 03〜05、時間帯を過ぎて失敗）どうしをつなぐ道です。
            真ルートの枠は、状態が 03・04 か記録が 04 のときだけ出ます（周回数が {PLAY_COUNT_REVEALS_BEST_ROUTE} 以上なら全部出ます）。ゲームで出ない升は点線で薄く描いています（今の周回で結末に到達しているときは描きません）。
            ゲームは「いま始められるイベント」も到達した枠として扱いますが、それはセーブだけでは決まらないので、ここでは描いていません。
            真ルートの扱い・赤い線・カーソルの範囲は、ゲームのデータから読んだ規則で、ゲーム内では確かめていません（要ゲーム内確認）。
            {result &&
              ` 周回数：${result.playCount.toLocaleString()}、クリア回数の合計：${result.clearTotal.toLocaleString()}`}
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
          {result && result.view.cursorMaxCol >= 0 && (
            <p className="text-muted-foreground text-xs">
              ゲームでは、カーソルは名前・進行中・失敗のどれかの枠のうち最も右の列（破線）より右へ動きません。
              {result.view.scrollLocked
                ? "まだ一度もクリアしていない（クリア回数の合計が 0）ので、左右のスクロールと縮小もできず、灰色の範囲はゲームの画面にほとんど入りません。"
                : "クリアしたことがあるので、左右のスクロールと縮小で先の枠も見られます。"}
            </p>
          )}
          <ChartCanvas
            key={save?.loadId ?? 0}
            events={result?.events ?? null}
            view={result?.view ?? noSave}
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
      {LEGEND_ROUTES.map((r) => {
        const c = ROUTE_COLORS[r];
        return (
          <span key={r} className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-5 rounded-sm border" style={{ background: c.fill, borderColor: c.stroke }} />
            {c.label}
          </span>
        );
      })}
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-5 rounded-sm border" style={{ background: MASKED.fill, borderColor: MASKED.stroke }} />
        ？？？
      </span>
      <span className="flex items-center gap-1.5">
        <svg width={20} height={12} aria-hidden>
          <rect x={0.5} y={0.5} width={19} height={11} rx={2} fill="#fff" stroke="#999" />
          <line x1={1} y1={11} x2={19} y2={1} stroke={FAILED_COLOR} strokeWidth={1.5} />
        </svg>
        失敗
      </span>
      <span className="flex items-center gap-1.5">
        <svg width={20} height={12} aria-hidden>
          <rect x={1} y={1} width={18} height={10} rx={2} fill="#fff" stroke={GLOW_COLOR} strokeWidth={2} />
        </svg>
        進行中（状態 03）
      </span>
      <span className="flex items-center gap-1.5">
        <svg width={20} height={12} aria-hidden>
          <line x1={0} y1={6} x2={20} y2={6} stroke={RED_LINK} strokeWidth={2} />
        </svg>
        到達した枠どうしの道
      </span>
      <span className="flex items-center gap-1.5">
        <svg width={20} height={12} aria-hidden>
          <rect x={0.5} y={0.5} width={19} height={11} rx={2} fill="none" stroke={HIDDEN_COLOR} strokeDasharray="3 3" />
        </svg>
        ゲームでは出ない
      </span>
    </div>
  );
}

/** 線の升の中心から、腕の向きの端まで */
function armSegment(line: ChartLine, k: number) {
  const x = colX(line.col);
  const y = rowY(line.row);
  const cx = x + colW(line.col) / 2;
  const cy = y + ROW_PX / 2;
  const end = [
    [x, cy],
    [x + colW(line.col), cy],
    [cx, y],
    [cx, y + ROW_PX],
  ][k];
  return { x1: cx, y1: cy, x2: end[0], y2: end[1] };
}

function ChartCanvas({
  events,
  view,
  revealNames,
}: {
  events: EventsView | null;
  view: ChartView;
  revealNames: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const selectedFrame = CHART_FRAMES.find((f) => f.id === selected);
  // ポップオーバーを選んだ枠の位置に出すための、枠と同じ位置・大きさの要素
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);
  // 最初の説明ボタンではなく編集パネルにフォーカスし、開いた直後に Tooltip が出るのを防ぐ。
  const editorRef = useRef<HTMLDivElement>(null);

  const arms = (looks: readonly ArmLook[]) =>
    CHART_LINES.flatMap((l) =>
      CHART_DIRS.filter((k) => looks.includes(view.lines.get(l.id)?.[k] ?? "none")).map((k) => ({
        key: `${l.id}-${k}`,
        ...armSegment(l, k),
      })),
    );
  const cursorX = Number.isFinite(view.cursorMaxCol) && view.cursorMaxCol >= 0 ? colX(view.cursorMaxCol + 1) : null;

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
          {cursorX !== null && view.scrollLocked && (
            <rect x={cursorX} y={0} width={WIDTH - cursorX} height={HEIGHT} fill="#000" fillOpacity={0.12} />
          )}
          {!view.endingReached && (
            <g stroke={HIDDEN_COLOR} strokeOpacity={0.6} strokeWidth={1} strokeDasharray="3 3" fill="none">
              {arms(["hidden"]).map((s) => (
                <line key={s.key} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
              ))}
            </g>
          )}
          <g stroke={LINK_COLOR} strokeWidth={1.5} fill="none" strokeLinecap="square">
            {arms(["black"]).map((s) => (
              <line key={s.key} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
            ))}
          </g>
          <g stroke={RED_LINK} strokeWidth={2.5} fill="none" strokeLinecap="square">
            {arms(["red"]).map((s) => (
              <line key={s.key} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
            ))}
          </g>
          {cursorX !== null && (
            <line x1={cursorX} y1={0} x2={cursorX} y2={HEIGHT} stroke="#555" strokeWidth={1} strokeDasharray="6 4" />
          )}
          {/* 結末に到達していれば、ゲームで出ない枠は描かない（ユーザー判断 2026-10-09） */}
          {CHART_FRAMES.filter((f) => !view.endingReached || view.frames.get(f.id)!.visible).map((f) => (
            <FrameShape
              key={f.id}
              frame={f}
              look={view.frames.get(f.id)!}
              selected={f.id === selected}
              revealName={revealNames}
              onSelect={() => setSelected(f.id)}
            />
          ))}
        </svg>
        {selectedFrame && (
          <div
            ref={setAnchor}
            className="pointer-events-none absolute"
            style={{
              left: colX(selectedFrame.col),
              top: rowY(selectedFrame.row) + (ROW_PX - FRAME_H) / 2,
              width: FRAME_COL_PX,
              height: FRAME_H,
            }}
          />
        )}
        <Popover open={selectedFrame !== undefined} onOpenChange={(open) => !open && setSelected(null)}>
          <PopoverContent ref={editorRef} initialFocus={editorRef} className="w-80" align="start" anchor={anchor}>
            {selectedFrame && (
              <FrameEditor frame={selectedFrame} events={events} look={view.frames.get(selectedFrame.id)!} />
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

function FrameShape({
  frame,
  look,
  selected,
  revealName,
  onSelect,
}: {
  frame: ChartFrame;
  look: FrameLook;
  selected: boolean;
  /** 名前が隠れる枠でも、？？？の代わりに名前を出す */
  revealName: boolean;
  onSelect: () => void;
}) {
  const x = colX(frame.col);
  const y = rowY(frame.row) + (ROW_PX - FRAME_H) / 2;
  const w = FRAME_COL_PX;
  const name = frameName(frame);
  const title = `${name}（${frameLookLabel(look)}）`;
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
    "aria-label": title,
    style: { cursor: "pointer", outline: "none" },
  } as const;
  const color = ROUTE_COLORS[frame.route];

  // ゲームで出ない枠：クリックして編集できるように、薄い点線だけ描く。隠れた名前を表示するときは名前も薄く出す
  if (!look.visible)
    return (
      <g {...common}>
        <title>{title}</title>
        <rect
          x={x}
          y={y}
          width={w}
          height={FRAME_H}
          rx={3}
          fill="transparent"
          stroke={selected ? "#000" : color.stroke}
          strokeOpacity={selected ? 1 : 0.45}
          strokeDasharray="3 3"
        />
        {revealName && (
          <text
            x={x + w / 2}
            y={y + FRAME_H / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={11}
            fill={TEXT_COLOR}
            fillOpacity={0.5}
            style={{ userSelect: "none" }}
          >
            {name}
          </text>
        )}
      </g>
    );

  const masked = !look.named;
  const fill = masked ? MASKED.fill : color.fill;
  const stroke = masked ? MASKED.stroke : color.stroke;
  const label = masked && !revealName ? "？？？" : name;

  return (
    <g {...common}>
      <title>{title}</title>
      {look.inProgress && (
        <rect x={x - 2} y={y - 2} width={w + 4} height={FRAME_H + 4} rx={4} fill="none" stroke={GLOW_COLOR} strokeWidth={3} />
      )}
      <rect
        x={x}
        y={y}
        width={w}
        height={FRAME_H}
        rx={3}
        fill={fill}
        stroke={selected ? "#000" : stroke}
        strokeWidth={selected ? 2 : 1.2}
      />
      {/* ゲーム画面の枠の四隅の点 */}
      {[
        [x + 2.5, y + 2.5],
        [x + w - 2.5, y + 2.5],
        [x + 2.5, y + FRAME_H - 2.5],
        [x + w - 2.5, y + FRAME_H - 2.5],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={1.2} fill={stroke} />
      ))}
      <text
        x={x + w / 2}
        y={y + FRAME_H / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fill={masked ? MASKED.text : TEXT_COLOR}
        style={{ userSelect: "none" }}
      >
        {label}
      </text>
      {look.failed && (
        <line x1={x + 1} y1={y + FRAME_H - 1} x2={x + w - 1} y2={y + 1} stroke={FAILED_COLOR} strokeWidth={2} />
      )}
    </g>
  );
}

function FrameEditor({ frame, events, look }: { frame: ChartFrame; events: EventsView | null; look: FrameLook }) {
  const { update } = useSave();
  const { advanced } = useAdvancedMode();
  const index = frame.eventId;
  const entry = events?.entries[index] ?? null;
  const problem = events?.problem ?? null;
  const shared = CHART_FRAMES.filter((f) => f.eventId === index).length > 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <div className="text-sm font-medium">
          {index}. {eventNameOf(index) ?? frameName(frame)}
        </div>
        <div className="text-muted-foreground text-xs">
          {EVENT_LIST[index]?.day}
          {events && `　チャート：${frameLookLabel(look)}`}
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
        note={`周回をまたぐ記録（生きた証）。04 で名前が出て、それ以外は状態が 03・04 のときだけ名前が出ます（確認済みは FF と 04）。真ルートのイベントは、これが 04 か状態が 03・04 でないと枠ごと出ません（状態が 04 以外で FF のときに出ないことは確認済み。周回数が ${PLAY_COUNT_REVEALS_BEST_ROUTE} 以上なら常に出る）。ほかの周回にも引き継がれる可能性があります`}
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
