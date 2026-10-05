// イベントチャートの状態。出典：解析ノート §3.5（[U] 2026-10-05 のシナリオ差分とゲーム内での書き込み確認）、イベント名は docs/event.md。
//
//   0x36A8〜 u8 × 166  周回中のイベント状態（A）。添字ごとに1イベント
//   0x3838〜 u8 × 166  周回をまたぐ記録（B、🔶 生きた証）。チャートに表示するかどうかを決めていると推定
//
// A の値：
//   FF / 00 未到達。✅ [U] 記録が 04 の代官所潜入で A を FF にすると、チャートでは「未達成」と表示された（2026-10-05）。
//           周回開始時、記録が FF の添字は FF、そうでない添字は 00 になっている（🔶 差分の観察）
//   03 進行中      🔶 03 copy 2 → copy 3（志士との出会いの途中）
//   04 成功・完了  🔶 海兵隊の横暴（2回再現）、志士との出会い、阿片密売、辻斬り、代官所潜入
//   05 失敗        ✅ [U] 書き込みでチャートに失敗のマークがついた（2026-10-05）。差分は 04 copy 2（海兵隊の横暴で赤城と戦闘）
// 01・02 などほかの値（大成功など）は ❓。A の長さは B との間隔 0x190 から 166 B と置いた（❓ 200 B の可能性もある）。
//
// B の値：
//   FF チャートに出ない。✅ [U] 記録が FF の阿片密売で A を 05 にしても、チャートには出ないまま失敗扱いになった
//   04 チャートに出る。✅ [U] チャート表示に効くのは FF と 04 だけ（ユーザー確認 2026-10-05）。
//      03 copy の阿片密売（添字10）で A を FF のまま B を FF → 04 にすると、チャートに「未達成」で出た
//   00 ❓ 名無し侍の添字 13・21・24・48 で見た値。チャート表示の値ではない（[U] 2026-10-05）ので、読むだけで選択肢には出さない
//
// ❓ U-1 判定待ちのため [TS] の固定オフセット（案A）の位置で読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU8, writeU8 } from './binary'
import { checkLayout } from './hero'

export const EVENT_STATE_OFFSET = 0x36a8 // 🔶 §3.5
export const EVENT_RECORD_OFFSET = 0x3838 // 🔶 §3.5
export const EVENT_COUNT = 166 // ❓ §3.5

/** 周回中の状態（A）。confirmed は書き込みでゲーム内の表示を確かめたもの */
export const EVENT_STATES = [
  { value: 0x00, label: '未到達', confirmed: false },
  { value: 0xff, label: '未到達（FF）', confirmed: true },
  { value: 0x03, label: '進行中', confirmed: false },
  { value: 0x04, label: '成功', confirmed: false },
  { value: 0x05, label: '失敗', confirmed: true },
] as const

/** 周回をまたぐ記録（B）のうち、チャート表示に効く値。✅ [U] 2026-10-05 */
export const EVENT_RECORDS = [
  { value: 0xff, label: '出ない' },
  { value: 0x04, label: '出る' },
] as const

/** 読み込み時に妥当とみなす値。🔶 EVENT_STATES に、まだ見ていない 01・02 を足したもの */
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
  /** B（周回をまたぐ記録） */
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

export function recordLabel(value: number): string {
  if (value === 0x00) return '不明（名無し侍の一部で見た値）'
  return EVENT_RECORDS.find((s) => s.value === value)?.label ?? '不明'
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

function validateU8(value: number, known: readonly { value: number }[], opts: { advanced: boolean }): string | null {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) return `u8 の範囲外です: ${value}`
  if (!opts.advanced && !known.some((s) => s.value === value)) return `確認済みの値ではありません（0x${hex(value)}）`
  return null
}

export const validateEventState = (value: number, opts: { advanced: boolean }) => validateU8(value, EVENT_STATES, opts)
export const validateEventRecord = (value: number, opts: { advanced: boolean }) => validateU8(value, EVENT_RECORDS, opts)

function editable(bytes: Uint8Array, index: number): void {
  const view = readEvents(bytes)
  if (view.problem) throw new RangeError(view.problem)
  if (!Number.isInteger(index) || index < 0 || index >= EVENT_COUNT) throw new RangeError(`添字が範囲外です: ${index}`)
}

/**
 * 添字 index の周回中の状態（0x36A8＋index）の1バイトだけを書く。
 * 通常モードでは EVENT_STATES の値だけ。上級者モードでは任意の u8
 */
export function writeEventState(bytes: Uint8Array, index: number, value: number, opts: { advanced: boolean }): void {
  editable(bytes, index)
  const problem = validateEventState(value, opts)
  if (problem) throw new RangeError(problem)
  writeU8(bytes, EVENT_STATE_OFFSET + index, value)
}

/**
 * 添字 index の周回をまたぐ記録（0x3838＋index）の1バイトだけを書く。
 * 通常モードでは FF・04 だけ（✅ [U]）。上級者モードでは任意の u8
 */
export function writeEventRecord(bytes: Uint8Array, index: number, value: number, opts: { advanced: boolean }): void {
  editable(bytes, index)
  const problem = validateEventRecord(value, opts)
  if (problem) throw new RangeError(problem)
  writeU8(bytes, EVENT_RECORD_OFFSET + index, value)
}

/** 一括設定の範囲。'named' は EVENT_NAMES の添字、'all' は 0〜EVENT_COUNT−1 */
export type BulkScope = 'named' | 'all'

export function bulkIndices(scope: BulkScope): number[] {
  return scope === 'named' ? Object.keys(EVENT_NAMES).map(Number) : Array.from({ length: EVENT_COUNT }, (_, i) => i)
}

function writeBulk(bytes: Uint8Array, base: number, indices: readonly number[], value: number, problem: string | null): void {
  // 先に全部を検証してから書く。途中で止まって一部だけ書かれることがないようにする
  if (problem) throw new RangeError(problem)
  for (const i of indices) editable(bytes, i)
  for (const i of indices) writeU8(bytes, base + i, value)
}

/** デバッグ用：indices の周回中の状態（0x36A8＋添字）をすべて value にする。値の制限は writeEventState と同じ */
export function writeEventStates(bytes: Uint8Array, indices: readonly number[], value: number, opts: { advanced: boolean }): void {
  writeBulk(bytes, EVENT_STATE_OFFSET, indices, value, validateEventState(value, opts))
}

/** デバッグ用：indices の周回をまたぐ記録（0x3838＋添字）をすべて value にする。値の制限は writeEventRecord と同じ */
export function writeEventRecords(bytes: Uint8Array, indices: readonly number[], value: number, opts: { advanced: boolean }): void {
  writeBulk(bytes, EVENT_RECORD_OFFSET, indices, value, validateEventRecord(value, opts))
}
