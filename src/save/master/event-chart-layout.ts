// イベントチャート（スタートメニュー「状況」）の升の並び。出典：docs/save_format/datatable/event/chart-cell.csv（全行 🟢）。
// 升ごとの名前・段階・行の種類は chart-nodes.ts（chart-node.csv、🟢）から引く。
//
// - 格子は列 0〜46・行 0〜10。枠は偶数の列にあり、線は枠のあいだの奇数の列と、枠のない升にある
// - 行は上から攘夷（0〜1）・幕府（2〜3）・外国（4〜5）・共通（6〜7）・真ルート（8〜10）
// - 線の形は、左・右・上・下のどちらへ伸びるか（形の番号 0〜11）。升どうしは、どちらかが相手の向きへ伸びていればつながる
// - 「隠し」：1 は真ルートの升（ふだんは出ない）、2 は共通の行から真ルートへ下りる分かれ目の線。出し方は event-chart-view.ts
// 名前の表示は共通ラベル層から引く。
import { CHART_CELL_TABLE } from './dataset/chart-cell'
import { CHART_NODES, type ChartRoute } from './chart-nodes'
import { chartNodeLabel } from './labels'

export type { ChartRoute }

/** 向き。0 左・1 右・2 上・3 下 */
export type ChartDir = 0 | 1 | 2 | 3
export const CHART_DIRS: readonly ChartDir[] = [0, 1, 2, 3]
/** 向きの名前 */
export const DIR = { left: 0, right: 1, up: 2, down: 3 } as const satisfies Record<string, ChartDir>
/** 反対の向き */
export const OPPOSITE: Readonly<Record<ChartDir, ChartDir>> = { 0: 1, 1: 0, 2: 3, 3: 2 }
const STEP: Readonly<Record<ChartDir, readonly [dc: number, dr: number]>> = {
  0: [-1, 0],
  1: [1, 0],
  2: [0, -1],
  3: [0, 1],
}

/** 🟢 線の形の番号 → 左・右・上・下のどちらへ伸びるか */
export const LINE_SHAPES: readonly (readonly [boolean, boolean, boolean, boolean])[] = [
  [false, false, false, false], // 0 なし
  [true, true, false, false], // 1 ─
  [true, true, true, true], // 2 ┼
  [true, true, false, true], // 3 ┬
  [true, true, true, false], // 4 ┴
  [true, false, true, true], // 5 ┤
  [false, true, true, true], // 6 ├
  [true, false, true, false], // 7 ┘
  [true, false, false, true], // 8 ┐
  [false, true, false, true], // 9 ┌
  [false, true, true, false], // 10 └
  [false, false, true, true], // 11 │
]

type CellBase = {
  /** chart-cell.csv の ID（升の並び順。ゲームが升を調べる順と同じ） */
  id: number
  col: number
  row: number
  /** 🟢 0 通常、1 真ルートの升、2 真ルートへの分かれ目の線 */
  hidden: 0 | 1 | 2
  /** 左・右・上・下へ伸びるか。枠は左右だけ */
  arms: readonly [boolean, boolean, boolean, boolean]
}

export type ChartFrame = CellBase & {
  type: 'frame'
  /** chart-nodes.ts のノード番号 */
  node: number
  /** イベントの通し番号（0x36A8 + n の n） */
  eventId: number
  phase: number | null
  route: ChartRoute
}

export type ChartLine = CellBase & { type: 'line'; shape: number }

export type ChartCell = ChartFrame | ChartLine

const FRAME_ARMS = LINE_SHAPES[1]

function hiddenOf(r: { id_dec: number; hidden: number | null }): CellBase['hidden'] {
  const h = r.hidden
  if (h !== 0 && h !== 1 && h !== 2) throw new Error(`chart-cell.csv の升 ${r.id_dec} の隠しの値が分かりません: ${h}`)
  return h
}

/** 🟢 全部の升（chart-cell.csv の順） */
export const CHART_CELLS: readonly ChartCell[] = Object.values(CHART_CELL_TABLE).map((r): ChartCell => {
  const base = { id: r.id_dec, col: r.col, row: r.row, hidden: hiddenOf(r) }
  if (r.type === 'frame') {
    const node = CHART_NODES[r.node ?? -1]
    if (!node || node.eventId === null) throw new Error(`chart-cell.csv の升 ${r.id_dec} のノードがイベントに当たりません: ${r.node}`)
    return { ...base, type: 'frame', arms: FRAME_ARMS, node: node.id, eventId: node.eventId, phase: node.phase, route: node.route }
  }
  const arms = LINE_SHAPES[r.shape ?? -1]
  if (!arms) throw new Error(`chart-cell.csv の升 ${r.id_dec} の線の形が分かりません: ${r.shape}`)
  return { ...base, type: 'line', arms, shape: r.shape ?? 0 }
})

export const CHART_FRAMES: readonly ChartFrame[] = CHART_CELLS.filter((c) => c.type === 'frame')
export const CHART_LINES: readonly ChartLine[] = CHART_CELLS.filter((c) => c.type === 'line')

export const CHART_COLS = Math.max(...CHART_CELLS.map((c) => c.col)) + 1
export const CHART_ROWS = Math.max(...CHART_CELLS.map((c) => c.row)) + 1

const cellAt = new Map(CHART_CELLS.map((c) => [`${c.col},${c.row}`, c]))

/**
 * 🟢 升ごとの隣（左・右・上・下）。升が相手の向きへ伸びていれば、両方の升がお互いを隣に持つ
 */
export const CHART_NEIGHBORS: ReadonlyMap<number, readonly (ChartCell | null)[]> = (() => {
  const nb = new Map(CHART_CELLS.map((c) => [c.id, [null, null, null, null] as (ChartCell | null)[]]))
  for (const c of CHART_CELLS)
    for (const k of CHART_DIRS) {
      if (!c.arms[k]) continue
      const [dc, dr] = STEP[k]
      const other = cellAt.get(`${c.col + dc},${c.row + dr}`)
      if (!other) continue
      nb.get(c.id)![k] = other
      nb.get(other.id)![OPPOSITE[k]] = c
    }
  return nb
})()

/** ノード番号から、チャートに出す名前 */
export function frameName(frame: ChartFrame): string {
  return chartNodeLabel(CHART_NODES[frame.node])
}
