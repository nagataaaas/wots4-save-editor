// イベントチャートの状態。出典：解析ノート §3.5（[U] 2026-10-05 のシナリオ差分）、イベント名は docs/event.md。
//
// 🔶 どれも差分からの推定で、**書き込みはゲーム内で未確認**（要ゲーム内確認）：
//   0x36A8〜 u8 × 166  周回中のイベント状態（A）。添字ごとに1イベント
//   0x3838〜 u8 × 166  周回をまたぐ記録（B、🔶 生きた証）。表示だけで書き換えない
// A の値（§3.5）：
//   FF 隠れている（どの周回でもクリアしていない。阿片密売を阻止せよで [U] 2026-10-05 ユーザー確認）
//   00 チャートに表示されているが未到達
//   03 進行中      03 copy 2 → copy 3（志士との出会いの途中）
//   04 成功・完了  海兵隊の横暴（2回再現）、志士との出会い、阿片密売、辻斬り、代官所潜入
//   05 失敗        04 copy 2（海兵隊の横暴で赤城と戦闘）
// 01・02 などほかの値（大成功など）は ❓。A の長さは B との間隔 0x190 から 166 B と置いた（❓ 200 B の可能性もある）。
//
// ❓ U-1 判定待ちのため [TS] の固定オフセット（案A）の位置で読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU8, writeU8 } from './binary'
import { checkLayout } from './hero'

export const EVENT_STATE_OFFSET = 0x36a8 // 🔶 §3.5
export const EVENT_RECORD_OFFSET = 0x3838 // 🔶 §3.5
export const EVENT_COUNT = 166 // ❓ §3.5

export const EVENT_STATES = [
  { value: 0xff, label: '隠れている' },
  { value: 0x00, label: '未到達' },
  { value: 0x03, label: '進行中' },
  { value: 0x04, label: '成功' },
  { value: 0x05, label: '失敗' },
] as const

/** 読み込み時に妥当とみなす値。🔶 上の5つに、まだ見ていない 01・02 を足したもの */
const PLAUSIBLE_STATES = new Set([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0xff])

export type EventName = {
  name: string
  day: string
  /** 'diff'＝差分で確認（🔶）、'guess'＝ほかの添字との関係からの推測（🔶 根拠が弱い） */
  basis: 'diff' | 'guess'
}

/** 名前の分かっている添字。§3.5「未確定のこと」 */
export const EVENT_NAMES: Readonly<Record<number, EventName>> = {
  0: { name: 'オープニング（Samurai on Board）', day: '1日目昼', basis: 'guess' }, // どのセーブでも 04
  1: { name: '阿弥浜港争乱', day: '1日目昼', basis: 'guess' }, // スキップで 00、1周目で 04
  3: { name: '嵐の後', day: '1日目昼', basis: 'diff' }, // 03 copy → copy 2
  6: { name: '志士との出会い', day: '1日目昼', basis: 'diff' }, // 03 copy 2 → copy 3 → copy 4
  9: { name: '海兵隊の横暴', day: '1日目夕', basis: 'diff' }, // 03 copy 5 → 04 copy（成功）／04 copy 2（失敗）／04 copy 4（成功）
  10: { name: '阿片密売を阻止せよ', day: '1日目夜', basis: 'diff' }, // 04 copy 2 → copy 3
  11: { name: '辻斬りを辻斬る', day: '1日目夜', basis: 'diff' }, // 04 copy 4 → copy 5
  12: { name: '代官所潜入', day: '1日目夜', basis: 'diff' }, // 04 copy 4 → 03 copy 6
}

export type EventEntry = {
  index: number
  /** A（周回中の状態） */
  state: number
  /** B（周回をまたぐ記録）。表示だけ */
  record: number
}

export type EventsView = {
  layoutProblem: string | null
  entries: EventEntry[]
  /** 妥当性検証に落ちた理由。null なら編集可能 */
  problem: string | null
}

export function stateLabel(value: number): string {
  return EVENT_STATES.find((s) => s.value === value)?.label ?? '不明'
}

export function readEvents(bytes: Uint8Array): EventsView {
  if (bytes.byteLength < EVENT_RECORD_OFFSET + EVENT_COUNT) throw new RangeError('ファイルが小さすぎてイベントの状態を読めません')
  const layoutProblem = checkLayout(bytes)
  const entries = Array.from({ length: EVENT_COUNT }, (_, index) => ({
    index,
    state: readU8(bytes, EVENT_STATE_OFFSET + index),
    record: readU8(bytes, EVENT_RECORD_OFFSET + index),
  }))

  let problem: string | null = null
  const bad = entries.find((e) => !PLAUSIBLE_STATES.has(e.state) || !PLAUSIBLE_STATES.has(e.record))
  if (bad) problem = `添字${bad.index} の値が想定外です（周回中 0x${hex(bad.state)}／記録 0x${hex(bad.record)}）。位置がずれている可能性があります`
  return { layoutProblem, entries, problem: layoutProblem ?? problem }
}

function hex(v: number): string {
  return v.toString(16).toUpperCase().padStart(2, '0')
}

export function validateEventState(value: number, opts: { advanced: boolean }): string | null {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) return `u8 の範囲外です: ${value}`
  if (!opts.advanced && !EVENT_STATES.some((s) => s.value === value)) return `確認済みの状態ではありません（0x${hex(value)}）`
  return null
}

/**
 * 添字 index の周回中の状態（0x36A8＋index）の1バイトだけを書く。🔶 要ゲーム内確認。
 * 通常モードでは確認済みの5つの値だけ。上級者モードでは任意の u8
 */
export function writeEventState(bytes: Uint8Array, index: number, value: number, opts: { advanced: boolean }): void {
  const view = readEvents(bytes)
  if (view.problem) throw new RangeError(view.problem)
  if (!Number.isInteger(index) || index < 0 || index >= EVENT_COUNT) throw new RangeError(`添字が範囲外です: ${index}`)
  const problem = validateEventState(value, opts)
  if (problem) throw new RangeError(problem)
  writeU8(bytes, EVENT_STATE_OFFSET + index, value)
}
