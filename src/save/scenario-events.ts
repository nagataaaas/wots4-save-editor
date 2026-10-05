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
// B の値（🔶 ユーザーの推定 2026-10-05）：
//   FF チャートに出ない。✅ [U] 記録が FF の阿片密売で A を 05 にしても、チャートには出ないまま失敗扱いになった
//   04 チャートに出る（過去の周回でクリア済み）
//   00 ❓ 名無し侍の添字 13・21・24・48 だけ。チャートに出るがクリアしていない、と推定
// B の書き込みはゲーム内で未確認（要ゲーム内確認）。
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

/** 周回をまたぐ記録（B） */
export const EVENT_RECORDS = [
  { value: 0xff, label: '出ない' },
  { value: 0x00, label: '出る？（未クリア）' },
  { value: 0x04, label: '出る（クリア済み）' },
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
 * 添字 index の周回をまたぐ記録（0x3838＋index）の1バイトだけを書く。🔶 要ゲーム内確認。
 * 通常モードでは実データで見た FF・00・04 だけ。上級者モードでは任意の u8
 */
export function writeEventRecord(bytes: Uint8Array, index: number, value: number, opts: { advanced: boolean }): void {
  editable(bytes, index)
  const problem = validateEventRecord(value, opts)
  if (problem) throw new RangeError(problem)
  writeU8(bytes, EVENT_RECORD_OFFSET + index, value)
}
