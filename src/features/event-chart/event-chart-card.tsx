import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { SelectRow } from "@/components/select-row";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScopeAnchorLink } from "@/components/anchor-link";
import { AnchoredCard } from "@/components/anchored-card";
import { EVENTS_ANCHORS } from "@/features/scenario/anchors";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { recordOptions, stateOptions } from "@/features/scenario/event-options";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { useSave } from "@/lib/save-context";
import { PLAY_COUNT_REVEALS_BEST_ROUTE, type CycleCountsView } from "@/save/cycle-counts";
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
import { eventSummaryOf } from "@/save/master/event-summaries";
import {
  eventDayOf,
  eventNameOf,
  EVENT_RECORD_OFFSET,
  EVENT_STATE_OFFSET,
  recordLabel,
  stateLabel,
  writeEventRecord,
  writeEventState,
  type EventsView,
} from "@/save/scenario-events";

// 描く大きさ（px）。格子の偶数の列は枠の列、奇数の列は線の列
const FRAME_COL_PX = 118;
const LINE_COL_PX = 26;
const ROW_PX = 34;
const FRAME_H = 24;
const MARGIN = 16;

/** 列の左端 */
const colX = (col: number) =>
  MARGIN + Math.ceil(col / 2) * FRAME_COL_PX + Math.floor(col / 2) * LINE_COL_PX;
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
// 🟢 状態 03・04 の枠の緑の枠と、今の段階の枠を囲む紫の箱（どちらもゲームと同じ色・透明度）
const LIT_COLOR = "rgb(152 235 168 / 0.55)";
const STAGE_BOX_COLOR = "rgb(153 77 179 / 0.3)";
/** 紫の箱の、枠の外側の余白。ゲームは枠の高さの 14/32 */
const STAGE_BOX_PAD = Math.round((FRAME_H * 14) / 32);
const TEXT_COLOR = "#3B2A2E";
const ROUTE_COLORS: Readonly<Record<ChartRoute, { fill: string; stroke: string; label: string }>> =
  {
    prajna: { fill: "#F7D3DC", stroke: "#D2557A", label: "攘夷" },
    shogunate: { fill: "#D8EDC7", stroke: "#78A955", label: "幕府" },
    foreigners: { fill: "#CFE4F1", stroke: "#5E9BC4", label: "外国" },
    other: { fill: "#F3EBC2", stroke: "#C2A845", label: "共通・無所属" },
    best: { fill: "#E6D6EF", stroke: "#9C6FB8", label: "真ルート" },
    tutorial: { fill: "#EEEEEE", stroke: "#999999", label: "その他" },
  };
const LEGEND_ROUTES: readonly ChartRoute[] = ["prajna", "shogunate", "foreigners", "other", "best"];
const MASKED = { fill: "#7A7A7A", stroke: "#111111", text: "#D4D4D4" };

/**
 * イベントチャートのカード。events・counts が null ならセーブ未読み込みで、全部の枠を名前つきで描く。
 * top はチャートの上（凡例の前）に並べる欄（真ルート）、bottom はチャートの下に並べる欄（一括設定）
 */
export function EventChartCard({
  events,
  counts,
  stage,
  bestRoute,
  top,
  bottom,
}: {
  events: EventsView | null;
  counts: CycleCountsView | null;
  /** 段階（0x0010）。null なら紫の箱を描かない */
  stage: number | null;
  /** 真ルート（0x378E）。null なら紫の箱を描かない */
  bestRoute: number | null;
  top?: ReactNode;
  bottom?: ReactNode;
}) {
  const { save } = useSave();
  const view = useMemo(
    () =>
      events && counts
        ? computeChartView({
            entries: events.entries,
            playCount: counts.playCount,
            clearTotal: counts.clearTotal,
            stage,
            bestRoute,
          })
        : chartViewWithoutSave(),
    [events, counts, stage, bestRoute],
  );
  const loaded = events !== null && counts !== null;
  // 名前が隠れる枠に、？？？の代わりに名前を出す。既定は隠す（ユーザー判断 2026-10-07）
  const [revealNames, setRevealNames] = useState(false);

  return (
    <AnchoredCard anchor={EVENTS_ANCHORS.chart} searchLabel="イベントチャート">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2"><ScopeAnchorLink />イベントチャート</CardTitle>
        <CardDescription>
          ゲーム内の「状況」のチャートを、セーブの内容から再現した図です。
          {loaded ? "枠をクリックすると、そのイベントの状態を編集できます。" : "セーブを読み込むまでは、全部の枠を名前つきで描いています。"}
          <br />
          緑の枠は引き受けた・成功したイベント、紫の箱は今の段階、赤い線は今の周回でたどった道です。
          {/* 引き受けた・成功した枠か、チャートに名前を出す設定の枠は名前が出て、それ以外は「？？？」。
              失敗した枠と、後ろの段階に進んだのに何もしなかった時間帯の枠には失敗の印。
              紫の箱は今の段階と同じ段階の枠を囲む。真ルートに入っているときは真ルートの行の枠だけを囲み、当てはまる枠がなければ出ない。
              赤い線は今の周回で到達した枠（引き受けた・成功した・失敗した枠）どうしをつなぐ。
              真ルートの枠は、引き受けた・成功したか名前を出す設定のときだけ出る（周回数が PLAY_COUNT_REVEALS_BEST_ROUTE 以上なら全部出る）。
              ゲームで出ない升は点線で薄く描く。ゲームは「いま始められるイベント」も到達した枠として扱うが、セーブだけでは決まらないので描かない。
              状態 03・04 = 引き受けた・成功、記録 04 = 名前を出す、状態 05 = 失敗、段階 0x0010、真ルート 0x378E、周回数 0x0B8C、イベントの状態 0x36A8＋添字、チャート表示の記録 0x3838＋添字。
              ❓ 真ルートの扱い・赤い線・緑の枠・紫の箱・カーソルの範囲は要ゲーム内確認 */}
          <br />
          周回数 {counts ? counts.playCount.toLocaleString() : "—"}・クリア回数の合計{" "}
          {counts ? counts.clearTotal.toLocaleString() : "—"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {top}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Legend />
          <div className="flex items-center gap-2">
            <Switch id="reveal-names" checked={revealNames} onCheckedChange={setRevealNames} />
            <Label htmlFor="reveal-names" className="text-xs">
              隠れた名前を表示する
            </Label>
          </div>
        </div>
        {loaded && cursorLimited(view) && (
          <p className="text-muted-foreground text-xs">
            ゲームでは、カーソルは名前・進行中・失敗のどれかの枠のうち最も右の列（破線）より右へ動きません。
            {view.scrollLocked
              ? "まだ一度もクリアしていない（クリア回数の合計が 0）ので、左右のスクロールと縮小もできず、灰色の範囲はゲームの画面にほとんど入りません。"
              : "クリアしたことがあるので、左右のスクロールと縮小で先の枠も見られます。"}
          </p>
        )}
        <ChartCanvas
          key={save?.loadId ?? 0}
          events={events}
          view={view}
          revealNames={revealNames}
        />
        {bottom}
      </CardContent>
    </AnchoredCard>
  );
}

/**
 * カーソルの右端（ここから先は見えない）を示すか。結末に到達しているとき（ユーザー判断 2026-10-09）と、
 * カーソルが最後の列（結末の列）まで届いていて右に見えない部分がないときは示さない
 */
function cursorLimited(view: ChartView): boolean {
  return !view.endingReached && view.cursorMaxCol >= 0 && view.cursorMaxCol + 1 < CHART_COLS;
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
      {LEGEND_ROUTES.map((r) => {
        const c = ROUTE_COLORS[r];
        return (
          <span key={r} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-5 rounded-sm border"
              style={{ background: c.fill, borderColor: c.stroke }}
            />
            {c.label}
          </span>
        );
      })}
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block h-3 w-5 rounded-sm border"
          style={{ background: MASKED.fill, borderColor: MASKED.stroke }}
        />
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
          <rect
            x={1.5}
            y={1.5}
            width={17}
            height={9}
            rx={2}
            fill="#fff"
            stroke={LIT_COLOR}
            strokeWidth={3}
          />
        </svg>
        引き受けた・成功
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-5 rounded-sm" style={{ background: STAGE_BOX_COLOR }} />
        今の段階
      </span>
      <span className="flex items-center gap-1.5">
        <svg width={20} height={12} aria-hidden>
          <rect
            x={0.5}
            y={0.5}
            width={19}
            height={11}
            rx={2}
            fill="none"
            stroke={HIDDEN_COLOR}
            strokeDasharray="3 3"
          />
        </svg>
        ゲームでは出ない
      </span>
    </div>
  );
}

/** 🟢 今の段階の枠を全部囲む紫の箱。囲む枠がなければ null */
function stageBoxOf(view: ChartView) {
  const frames = CHART_FRAMES.filter((f) => view.stageFrames.includes(f.id));
  if (frames.length === 0) return null;
  const left = Math.min(...frames.map((f) => colX(f.col))) - STAGE_BOX_PAD;
  const right = Math.max(...frames.map((f) => colX(f.col) + FRAME_COL_PX)) + STAGE_BOX_PAD;
  const top = Math.min(...frames.map((f) => rowY(f.row))) + (ROW_PX - FRAME_H) / 2 - STAGE_BOX_PAD;
  const bottom =
    Math.max(...frames.map((f) => rowY(f.row))) + (ROW_PX + FRAME_H) / 2 + STAGE_BOX_PAD;
  return { x: left, y: top, width: right - left, height: bottom - top };
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
  const cursorX = cursorLimited(view) ? colX(view.cursorMaxCol + 1) : null;
  const stageBox = stageBoxOf(view);

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
            <rect
              x={cursorX}
              y={0}
              width={WIDTH - cursorX}
              height={HEIGHT}
              fill="#000"
              fillOpacity={0.12}
            />
          )}
          {stageBox && <rect {...stageBox} fill={STAGE_BOX_COLOR} />}
          <g
            stroke={HIDDEN_COLOR}
            strokeOpacity={0.6}
            strokeWidth={1}
            strokeDasharray="3 3"
            fill="none"
          >
            {arms(["hidden"]).map((s) => (
              <line key={s.key} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
            ))}
          </g>
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
            <line
              x1={cursorX}
              y1={0}
              x2={cursorX}
              y2={HEIGHT}
              stroke="#555"
              strokeWidth={1}
              strokeDasharray="6 4"
            />
          )}
          {CHART_FRAMES.map((f) => (
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
        <Popover
          open={selectedFrame !== undefined}
          onOpenChange={(open) => !open && setSelected(null)}
        >
          <PopoverContent
            ref={editorRef}
            initialFocus={editorRef}
            className="w-80"
            align="start"
            anchor={anchor}
          >
            {selectedFrame && <FrameEditor frame={selectedFrame} events={events} />}
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
      {look.lit && (
        <rect
          x={x - 2}
          y={y - 2}
          width={w + 4}
          height={FRAME_H + 4}
          rx={4}
          fill="none"
          stroke={LIT_COLOR}
          strokeWidth={4}
        />
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
        <line
          x1={x + 1}
          y1={y + FRAME_H - 1}
          x2={x + w - 1}
          y2={y + 1}
          stroke={FAILED_COLOR}
          strokeWidth={2}
        />
      )}
    </g>
  );
}

function FrameEditor({ frame, events }: { frame: ChartFrame; events: EventsView | null }) {
  const { update } = useSave();
  const { advanced } = useAdvancedMode();
  const index = frame.eventId;
  const entry = events?.entries[index] ?? null;
  const problem = events?.problem ?? null;
  const shared = CHART_FRAMES.filter((f) => f.eventId === index).length > 1;
  const summary = eventSummaryOf(index);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <div className="text-sm font-medium">
          {eventNameOf(index) ?? frameName(frame)}
        </div>
        <div className="text-muted-foreground text-xs">{eventDayOf(index)}</div>
        {summary && (
          <p className="text-muted-foreground text-xs wrap-anywhere break-normal line-strict">
            {summary}
          </p>
        )}
      </div>
      <SelectRow
        label="状態"
        offset={EVENT_STATE_OFFSET + index}
        value={entry ? String(entry.state) : null}
        currentLabel={entry ? stateLabel(entry.state) : undefined}
        options={stateOptions}
        problem={problem}
        onChange={(v) => update((b) => writeEventState(b, index, Number(v), { advanced }))}
      />
      <SelectRow
        label="チャート表示"
        offset={EVENT_RECORD_OFFSET + index}
        value={entry ? String(entry.record) : null}
        currentLabel={
          entry ? recordLabel(entry.record) : undefined
        }
        options={recordOptions(advanced)}
        problem={problem}
        // 確度：名前の出方は FF と 04 で ✅。真ルートの枠が状態 04 以外・記録 FF で出ないのは ✅
        note={`周回をまたぐ記録（生きた証）。「名前を出す」にすると名前が出て、それ以外は引き受けた・成功のときだけ名前が出ます。真ルートのイベントは、これが「名前を出す」か、引き受けた・成功でないと枠ごと出ません（周回数が ${PLAY_COUNT_REVEALS_BEST_ROUTE} 以上なら常に出る）。ほかの周回にも引き継がれる可能性があります`}
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
