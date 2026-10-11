// イベントチャートをゲームと同じ規則で描き分ける。出典：docs/save_format/chunks/event-chart「チャート表示の規則」（🟢）。
//
// 枠の状態（A＝状態 0x36A8+n、B＝記録 0x3838+n）
//   A＝03 → 名前・進行中、A＝04 → 名前、A＝05・06 → 失敗の印、どれでもなく B＝04 → 名前（✅ B 04・A 04 ／ 🟢 ほか）
//   名前がなければ「？？？」
// 緑の枠（🟢）
//   A＝03・04 の枠だけ。03 と 04 で見え方は同じ。B＝04 だけ・失敗では付かない
// 今の段階の紫の箱（🟢）
//   段階 0x0010 と同じ段階の枠を全部囲む。真ルート 0x378E が 0 なら真ルート以外の行の枠、0 以外なら真ルートの行の枠だけ。
//   枠が出ているかは見ない。当てはまる枠がなければ描かない。日数・時間帯は見ない
// 時間帯を過ぎた枠の失敗の印（🟢）
//   到達した枠（名前・進行中・失敗のどれか）の段階の最大 P より前の段階 p（0, 10, 20, …）ごとに、
//   その段階に到達した枠があれば、たどる行をその枠の行にする（共通以外を優先）。なければ、たどっている行の枠に失敗の印を付ける。
//   たどる行は共通から始まる
// 真ルートの升（🟢）
//   ふだんは出ない。枠は名前か進行中になれば出る（失敗だけでは出ない ✅）。周回数 0x0B8C が 3 以上なら全部出る（要ゲーム内確認）。
//   真ルートの線は、出ている真ルートの枠から左へたどって、出ている枠に着く道の線と腕だけを出す。
//   分かれ目の線は、上と右の腕はいつも出し、下の腕は真ルートの枠が1つでも出ているときだけ出す
// 赤い線（🟢）
//   出ていて到達した枠から右へ（右・上・下に）たどり、出ていて到達した別の枠に着く道の腕を赤くする
// 先の日（🟢 要ゲーム内確認）
//   カーソルは、名前・進行中・失敗のどれかの枠のうち最も右の列より右へ動かない。
//   クリア回数の合計が 0 なら左右のスクロールと縮小ができないので、その先はゲームの画面に入らない
//
// ゲームは「いま始められるイベント」も到達した枠として扱い、「？？？」を濃い字で出すが、どのイベントがいま始められるかはセーブだけでは
// 決められない（ゲームのイベントの管理が判断する）ので、ここでは扱わない。
import {
  CHART_CELLS,
  CHART_DIRS,
  CHART_FRAMES,
  CHART_NEIGHBORS,
  OPPOSITE,
  type ChartCell,
  type ChartDir,
  type ChartFrame,
} from './master/event-chart-layout'
import { PLAY_COUNT_REVEALS_BEST_ROUTE } from './cycle-counts'
import type { EventEntry } from './scenario-events'

/** 線の腕の描き方。none は形にない腕、hidden はゲームで出ない腕 */
export type ArmLook = 'none' | 'hidden' | 'black' | 'red'

export type FrameLook = {
  /** ゲームで枠が出るか（真ルートの枠は出ないことがある） */
  visible: boolean
  /** 名前を出すか。false なら「？？？」 */
  named: boolean
  /** 失敗の印 */
  failed: boolean
  /** 失敗の印のうち、時間帯を過ぎたことによるもの（状態は 05 でない） */
  missed: boolean
  /** 進行中（A＝03） */
  inProgress: boolean
  /** 🟢 緑の枠（A＝03・04） */
  lit: boolean
  /** 名前・進行中・失敗のどれか（赤い線とカーソルの範囲を決める） */
  reached: boolean
}

export type ChartView = {
  frames: ReadonlyMap<number, FrameLook>
  /** 升の ID → 左・右・上・下の腕 */
  lines: ReadonlyMap<number, readonly ArmLook[]>
  /** カーソルが動ける最も右の列。到達した枠がなければ -1 */
  cursorMaxCol: number
  /** クリア回数の合計が 0 で、左右のスクロールと縮小ができない */
  scrollLocked: boolean
  /** 🟢 今の段階の紫の箱で囲む枠の ID。空なら箱を描かない */
  stageFrames: readonly number[]
  /** 今の周回で結末（段階 999）の枠に到達した（状態 03〜05）。エディタはカーソルの右端を示さない（ユーザー判断 2026-10-09） */
  endingReached: boolean
}

export type ChartInput = {
  /** イベントの通し番号ごとの状態と記録 */
  entries: readonly EventEntry[]
  playCount: number
  clearTotal: number
  /** 段階 0x0010。null なら紫の箱を描かない */
  stage: number | null
  /** 真ルート 0x378E。null なら紫の箱を描かない */
  bestRoute: number | null
}

const RECORD_SHOWN = 0x04
const OTHER_ROUTE = 'other'
const PHASE_STEP = 10
/** 🟢 結末の段階 */
const ENDING_PHASE = 999
/** ゲームが1つの段階で調べる枠の数 */
const FRAMES_PER_PHASE = 10

type Work = {
  /** 名前（1）・記録（2）・進行中（4） */
  shown: number
  failed: boolean
  missed: boolean
  hidden: boolean
}

/** セーブがないときは、全部の枠を名前つきで、線を全部黒で描く */
export function chartViewWithoutSave(): ChartView {
  return {
    frames: new Map(
      CHART_FRAMES.map((f) => [
        f.id,
        { visible: true, named: true, failed: false, missed: false, inProgress: false, lit: false, reached: false },
      ]),
    ),
    lines: new Map(
      CHART_CELLS.filter((c) => c.type === 'line').map((c) => [c.id, c.arms.map((a) => (a ? 'black' : 'none'))]),
    ),
    cursorMaxCol: Infinity,
    scrollLocked: false,
    stageFrames: [],
    endingReached: false,
  }
}

export function computeChartView({ entries, playCount, clearTotal, stage, bestRoute }: ChartInput): ChartView {
  const work = new Map<number, Work>()
  for (const c of CHART_CELLS) {
    let shown = 0
    let failed = false
    if (c.type === 'frame') {
      const e = entries[c.eventId]
      if (e) {
        // ゲームの枠の状態のビット：1 名前、2 記録、4 進行中（4 だけを見る処理はない）
        if (e.state === 0x03) shown = 1 | 4
        else if (e.state === 0x04) shown = 1
        else if (e.state === 0x05 || e.state === 0x06) failed = true
        if (shown === 0 && e.record === RECORD_SHOWN) shown = 2
      }
    }
    // 枠は真ルートの升（隠し 1）、線は隠し 1 のときだけ隠れた状態で始まる
    const hidden = c.type === 'frame' ? c.hidden !== 0 : c.hidden === 1
    work.set(c.id, { shown, failed, missed: false, hidden })
  }
  const w = (c: ChartCell) => work.get(c.id)!

  // 真ルートの枠は名前・進行中なら出る。カーソルの範囲は名前・進行中・失敗の枠の列まで
  let cursorMaxCol = -1
  for (const f of CHART_FRAMES) {
    const s = w(f)
    if (f.hidden !== 0 && s.shown !== 0) s.hidden = false
    if (s.shown !== 0 || s.failed) cursorMaxCol = Math.max(cursorMaxCol, f.col)
  }
  if (playCount >= PLAY_COUNT_REVEALS_BEST_ROUTE) for (const s of work.values()) s.hidden = false

  markMissedSlots(w)

  const reached = (f: ChartFrame) => (w(f).shown & (1 | 4)) !== 0 || w(f).failed
  const revealed = new Map<number, boolean[]>()
  const red = new Map<number, boolean[]>()
  const flags = (m: Map<number, boolean[]>, c: ChartCell) => {
    let v = m.get(c.id)
    if (!v) m.set(c.id, (v = [false, false, false, false]))
    return v
  }

  /** 出ている真ルートの枠から左へ、出ている枠に着く道の腕を出す */
  const reveal = (c: ChartCell | null, mask: number, arrival: ChartDir): ChartFrame | null => {
    if (!c) return null
    let found: ChartFrame | null = null
    for (const k of CHART_DIRS) {
      if (mask & (1 << k)) continue
      const n = CHART_NEIGHBORS.get(c.id)![k]
      if (!n) continue
      const f = n.type === 'frame' ? n : reveal(n, mask | (1 << OPPOSITE[k]), OPPOSITE[k])
      if (f && !w(f).hidden) {
        flags(revealed, c)[k] = true
        found = f
      }
    }
    if (found) {
      flags(revealed, c)[arrival] = true
      w(c).hidden = false
    }
    return found
  }

  /** 到達した枠から右へ、到達した別の枠に着く道の腕を赤くする */
  const paint = (c: ChartCell | null, mask: number, arrival: ChartDir): ChartFrame | null => {
    if (!c) return null
    let found: ChartFrame | null = null
    for (const k of CHART_DIRS) {
      if (mask & (1 << k)) continue
      const n = CHART_NEIGHBORS.get(c.id)![k]
      if (!n) continue
      const f = n.type === 'frame' ? n : paint(n, mask | (1 << OPPOSITE[k]), OPPOSITE[k])
      if (f && !w(f).hidden && reached(f)) {
        flags(red, c)[k] = true
        found = f
      }
    }
    if (found) flags(red, c)[arrival] = true
    return found
  }

  const anyBestFrameShown = CHART_FRAMES.some((f) => f.hidden !== 0 && !w(f).hidden)
  for (const c of CHART_CELLS) {
    if (c.type === 'line') {
      if (c.hidden === 2) {
        const v = flags(revealed, c)
        v[1] = v[2] = true
        if (anyBestFrameShown) v[3] = true
      }
      continue
    }
    if (w(c).hidden) continue
    const [left, right] = CHART_NEIGHBORS.get(c.id)!
    if (c.hidden !== 0) reveal(left, 1 << 1, 1)
    if (reached(c)) paint(right, 1 << 0, 0)
  }

  const frames = new Map<number, FrameLook>()
  for (const f of CHART_FRAMES) {
    const s = w(f)
    frames.set(f.id, {
      visible: !s.hidden,
      named: s.shown !== 0,
      failed: s.failed,
      missed: s.missed,
      inProgress: (s.shown & 4) !== 0,
      lit: (s.shown & (1 | 4)) !== 0,
      reached: reached(f),
    })
  }
  const lines = new Map<number, readonly ArmLook[]>()
  for (const c of CHART_CELLS) {
    if (c.type !== 'line') continue
    const lineHidden = w(c).hidden
    lines.set(
      c.id,
      CHART_DIRS.map((k): ArmLook => {
        if (!c.arms[k]) return 'none'
        if (lineHidden || (c.hidden !== 0 && !revealed.get(c.id)?.[k])) return 'hidden'
        return red.get(c.id)?.[k] ? 'red' : 'black'
      }),
    )
  }
  const endingReached = CHART_FRAMES.some((f) => f.phase === ENDING_PHASE && reached(f))
  return {
    frames,
    lines,
    cursorMaxCol,
    scrollLocked: clearTotal === 0,
    stageFrames: stageFramesOf(stage, bestRoute),
    endingReached,
  }
}

/** 🟢 今の段階の紫の箱で囲む枠（冒頭のコメント） */
function stageFramesOf(stage: number | null, bestRoute: number | null): number[] {
  if (stage === null || bestRoute === null) return []
  const best = bestRoute !== 0
  return CHART_FRAMES.filter((f) => f.phase === stage && (f.hidden !== 0) === best).map((f) => f.id)
}

/** 🟢 時間帯を過ぎた枠に失敗の印を付ける（冒頭のコメント） */
function markMissedSlots(w: (c: ChartCell) => Work): void {
  const isReached = (f: ChartFrame) => (w(f).shown & (1 | 4)) !== 0 || w(f).failed
  let last = 0
  for (const f of CHART_FRAMES) if (isReached(f) && f.phase !== null) last = Math.max(last, f.phase)
  let route: ChartFrame['route'] = OTHER_ROUTE
  for (let p = 0; p < last; p += PHASE_STEP) {
    const inPhase = CHART_FRAMES.filter((f) => f.phase === p).slice(0, FRAMES_PER_PHASE)
    let chosen: ChartFrame | null = null
    for (const f of inPhase) {
      if (!isReached(f)) continue
      if (f.route !== OTHER_ROUTE || chosen === null) chosen = f
    }
    if (chosen) {
      route = chosen.route
      continue
    }
    for (const f of inPhase)
      if (f.route === route) {
        w(f).failed = true
        w(f).missed = true
      }
  }
}

/** 枠の見え方の短い説明 */
export function frameLookLabel(look: FrameLook): string {
  if (!look.visible) return 'ゲームでは枠ごと出ない'
  const parts = [look.named ? '名前が出る' : '名前が隠れる（？？？）']
  if (look.inProgress) parts.push('進行中')
  if (look.failed) parts.push(look.missed ? '失敗（時間帯を過ぎた）' : '失敗')
  return parts.join('・')
}
