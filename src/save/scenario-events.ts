// イベントチャートの状態。出典：docs/save_format/chunks/event-chart（[U] 2026-10-05 のシナリオ差分とゲーム内での書き込み確認）、
// イベント名は docs/save_format/datatable/event/event.csv。
//
//   0x36A8〜 u8 × 166  周回中のイベント状態（A）。添字ごとに1イベント。
//                      🟢 通し番号 0〜165（添字＝ゲーム内のイベントID）。166 からは重要人物の状態（flags/characters.ts）
//   0x3838〜 u8 × 166  周回をまたぐ記録（B、🔶 生きた証）。チャートに表示するかどうかを決めていると推定
//
// A の値：
//   FF / 00 未到達。✅ [U] 記録が 04 の代官所潜入で A を FF にすると、チャートでは「未達成」と表示された（2026-10-05）。
//           周回開始時、記録が FF の添字は FF、そうでない添字は 00 になっている（🔶 差分の観察）
//   01 導入を見た    🟢 04 copy 9 → copy 10（剣術大会の準備の導入、添字36）
//   02 導入を見て断った・保留した  🟢 もう一度話しかけると誘い直しの会話になる。実データでは未確認
//   03 引き受けた・進行中  🟢 03 copy 2 → copy 3（志士との出会いの途中）。会話・移動のあと、戦闘の前
//   04 成功・完了    🟢 海兵隊の横暴（2回再現）ほかの差分。大成功と成功はどちらも 04。
//                    護衛の相手を死なせても 04 になるイベントがある（講師ご到着・語学所開設・ガイジンとゲイシャ。🟢）
//   05 失敗          ✅ [U] 書き込みでチャートに失敗のマークがついた（2026-10-05）。逃走・主要人物の死亡など
// イベントが始まる条件は、ほとんどが「A ≤ 02」（🟢）。
//
// B の値：
//   FF チャートの枠は出るが、イベント名などが隠れる（✅ [U] 2026-10-06 の説明）。
//      ✅ [U] 記録が FF の阿片密売で A を 05 にしても、名前は隠れたまま失敗扱いになった。
//      ただし A が 04（成功）なら FF でも名前が出る（✅ [U] 2026-10-06）。A が 01・03 のときは ❓
//      枠そのものが出るかどうかは B ではなく別のところで決まる（[U] 2026-10-06：まだ到達したことのない日や、
//      真ルートに入ったことがない周回では枠が出ない）。位置は ❓（chunks/event-chart）
//   04 イベント名が出る。✅ [U] チャート表示に効くのは FF と 04 だけ（ユーザー確認 2026-10-05）。
//      ✅ [U] 2026-10-06：真ルートを記録していない周回（01 copy 12）で、状態が 05 の再起の望み（添字72）はチャートに出なかったが、
//      記録を 04 にすると失敗として出た。状態が成功・失敗のどちらでも、記録 04 なら結果どおりに出る。
//      大老暗殺計画（添字83）も記録を 04 にすると出た。
//      ✅ [U] 2026-10-06：真ルート以外では、記録 FF・状態 05 でもチャートに出る。真ルートのイベントだけ、記録 FF だと
//      成功（状態 04）以外は枠ごと出ない（真ルートを過去の周回で記録していない主人公。正規のプレイでも同じ）
//      03 copy の阿片密売（添字10）で A を FF のまま B を FF → 04 にすると、チャートに「未達成」で出た
//   00 ❓ 名無し侍の添字 13・21・24・48 で見た値。チャート表示の値ではない（[U] 2026-10-05）ので、読むだけで選択肢には出さない
//
// [TS] の固定オフセットで読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU8, writeU8 } from './binary'
import { type EditOpts, type ViewStatus } from './field'
import { validateKnownValue } from './flags/byte-flag'
import { assertWritable, checkLayout } from './layout'
import { eventLabelId } from './master/label-types'
import { eventLabel, findLabel } from './master/labels'
import { EVENT_TABLE } from './master/dataset/event'

export const EVENT_STATE_OFFSET = 0x36a8 // 🟢 chunks/event-chart（通し番号 0）
export const EVENT_RECORD_OFFSET = 0x3838 // 🔶 chunks/event-chart
export const EVENT_COUNT = 166 // 🟢 chunks/event-chart（通し番号 166 から重要人物の状態）

/**
 * 状態（A）・記録（B）のうち、ほかのモジュールが判定に使う値。
 * failedAlternate（06）は 🟢 チャートで 05 と同じ失敗の印になる値。選択肢（EVENT_STATES）には入れず、読み込み時も妥当な値とみなさない
 */
export const EVENT_STATE_VALUES = { inProgress: 0x03, success: 0x04, failed: 0x05, failedAlternate: 0x06 } as const
export const EVENT_RECORD_SHOWN = 0x04

/**
 * 周回中の状態（A）。FF・05 は書き込みでゲーム内の表示を確かめた（✅ [U]）。
 * 01〜04 の意味は 🟢（chunks/event-chart）。00 は ❓ 書き込みでの表示は未確認
 */
export const EVENT_STATES = [
  { value: 0x00, label: '未到達' },
  { value: 0xff, label: '未到達（初期状態）' }, // 🔶 FF の呼び名は仮。00 との違いは ❓
  { value: 0x01, label: '導入を見た' },
  { value: 0x02, label: '断った・保留した' },
  { value: EVENT_STATE_VALUES.inProgress, label: '引き受けた・進行中' },
  { value: EVENT_STATE_VALUES.success, label: '成功' },
  { value: EVENT_STATE_VALUES.failed, label: '失敗' },
] as const

/**
 * 周回をまたぐ記録（B）のうち、チャート表示に効く値。✅ [U] 2026-10-05。
 * FF は枠だけ出て名前が隠れる。FF でも状態が成功（04）なら名前が出る（✅ [U] 2026-10-06）。枠が出るかどうかは B では決まらない
 */
export const EVENT_RECORDS = [
  { value: 0xff, label: '名前を隠す（成功なら出る）' },
  { value: EVENT_RECORD_SHOWN, label: '名前を出す' },
] as const

/** 読み込み時に妥当とみなす値。EVENT_STATES と同じ */
const PLAUSIBLE_STATES = new Set<number>(EVENT_STATES.map(s => s.value))

/** 名前の付いたイベント1件。名前はイベントの表（master/event-names.ts）から添字で引く（eventNameOf） */
export type NamedEvent = {
  /** 添字（通し番号） */
  index: number
  /** 時間帯。4日目以降はルート・エンディングの区分 */
  day: string
}

/**
 * 名前の付いたイベント（添字の順）。イベントチャートの枠の説明と、一括設定の対象はこの配列で決める。
 * 名前は docs/save_format/datatable/event/event.csv。day は docs/event.md（Wiki）の時間帯。
 * 添字とイベントの対応の根拠：
 *   0・1・3・6・9〜12  🟢 差分の観察（chunks/event-chart の調査記録）
 *   2〜46 のそのほか  ✅ ユーザーがゲーム内のチャートで確かめた（[U] 2026-10-05）
 *   51〜99・116      ✅ 同じ（[U] 2026-10-06）。名前はゲーム内の表記に合わせる（🟢）
 * 4日目以降のイベントの day は時間帯ではなく、docs/event.md の節（ルート・エンディング）を入れる。
 *
 * 載せない添字（ユーザー判断 2026-10-06）：
 *   47〜50  🟢 剣術大会（幕府／外国／攘夷／無所属）。チャートには出ない。
 *           出場した勢力の1つだけが 03 になり、優勝で 04、負け・降参で 05（🟢）
 *   67      悲しみのローラ。未実装のイベントとみられる（[U] 2026-10-06）
 *   84      🟢 名前不明。ローラの決意（85）の前半の導入。人間湯通しの恐怖に続く場面が始まると 04 になり、
 *           85 の開始条件が「84 = 04」。チャートには名前が出ない
 *   100〜165（116 以外）🟢 対応するイベントがない
 *     102 ガイジンとゲイシャで「102 = 3」のときの別の会話があるが、値を書く場面がない（使われていない。🟢）
 */
export const NAMED_EVENTS: readonly NamedEvent[] = Object.values(EVENT_TABLE)
  .filter(r => r.day !== '')
  .map(r => ({ index: r.id_dec, day: r.day }))

/** NAMED_EVENTS の添字。昇順 */
export const NAMED_EVENT_INDICES: readonly number[] = NAMED_EVENTS.map((e) => e.index)

/** 添字のイベントの時間帯。名前の付いていない添字は null */
export function eventDayOf(index: number): string | null {
  return NAMED_EVENTS.find((e) => e.index === index)?.day ?? null
}

/** 添字（通し番号）のイベント名。名前の分からない添字は null */
export function eventNameOf(index: number): string | null {
  const id = eventLabelId(index)
  return findLabel({ kind: 'event', id }) ? eventLabel(id) : null
}

export type EventEntry = {
  index: number
  /** A（周回中の状態） */
  state: number
  /** B（周回をまたぐ記録） */
  record: number
}

/** problem は、ファイルサイズかイベントの状態が想定外のとき（位置がずれている可能性がある） */
export type EventsView = ViewStatus & {
  entries: EventEntry[]
}

export function stateLabel(value: number): string {
  return EVENT_STATES.find((s) => s.value === value)?.label ?? '不明'
}

/**
 * 記録（B）で見たが、チャート表示への効き方を確かめていない値。上級者モードでだけ選べる。
 *   05 ❓ 02 copy（過去の周回で真ルートを記録した主人公）の再起の望み（添字72）。
 *      ✅（否定）[U] 2026-10-06：01 copy 12（状態 05）で書いても、再起の望みはチャートに出なかった。04 を書くと失敗として出た
 *   03 ❓ 00 の志士との出会い（添字6）
 *   00 ❓ 名無し侍の添字 13・21・24・48
 * 🔶 B は通し番号では 400＋添字に当たる（chunks/event-chart）
 */
export const EVENT_RECORDS_SEEN = [
  { value: 0x05, label: '不明（書いてもチャートに出ない）' },
  { value: 0x03, label: '不明（志士との出会いで見た値）' },
  { value: 0x00, label: '不明（名無し侍の一部で見た値）' },
] as const

export function recordLabel(value: number): string {
  return (
    EVENT_RECORDS.find((s) => s.value === value)?.label ??
    EVENT_RECORDS_SEEN.find((s) => s.value === value)?.label ??
    '不明'
  )
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
  if (bad) problem = '一部のイベントの状態が想定外です。位置がずれている可能性があります'
  return { warnings: [], entries, problem: layoutProblem ?? problem }
}

export const validateEventState = (value: number, opts: EditOpts) => validateKnownValue(value, EVENT_STATES, opts)
export const validateEventRecord = (value: number, opts: EditOpts) => validateKnownValue(value, EVENT_RECORDS, opts)

function editable(bytes: Uint8Array, index: number): void {
  const view = readEvents(bytes)
  if (view.problem) throw new RangeError(view.problem)
  if (!Number.isInteger(index) || index < 0 || index >= EVENT_COUNT) throw new RangeError('イベントの指定が範囲外です')
}

/**
 * 添字 index の周回中の状態（0x36A8＋index）の1バイトだけを書く。
 * 通常モードでは EVENT_STATES の値だけ。上級者モードでは任意の u8
 */
export function writeEventState(bytes: Uint8Array, index: number, value: number, opts: EditOpts): void {
  assertWritable(bytes)
  editable(bytes, index)
  const problem = validateEventState(value, opts)
  if (problem) throw new RangeError(problem)
  writeU8(bytes, EVENT_STATE_OFFSET + index, value)
}

/**
 * 添字 index の周回をまたぐ記録（0x3838＋index）の1バイトだけを書く。
 * 通常モードでは FF・04 だけ（✅ [U]）。上級者モードでは任意の u8
 */
export function writeEventRecord(bytes: Uint8Array, index: number, value: number, opts: EditOpts): void {
  assertWritable(bytes)
  editable(bytes, index)
  const problem = validateEventRecord(value, opts)
  if (problem) throw new RangeError(problem)
  writeU8(bytes, EVENT_RECORD_OFFSET + index, value)
}

function writeBulk(bytes: Uint8Array, base: number, indices: readonly number[], value: number, problem: string | null): void {
  // 領域を1回だけ検査し、すべての添字を検証してから書く（直接呼び出しても途中まで書かれない）。
  assertWritable(bytes)
  const view = readEvents(bytes)
  if (view.problem) throw new RangeError(view.problem)
  if (problem) throw new RangeError(problem)
  for (const i of indices)
    if (!Number.isInteger(i) || i < 0 || i >= EVENT_COUNT) throw new RangeError('イベントの指定が範囲外です')
  for (const i of indices) writeU8(bytes, base + i, value)
}

/** デバッグ用：indices の周回中の状態（0x36A8＋添字）をすべて value にする。値の制限は writeEventState と同じ */
export function writeEventStates(bytes: Uint8Array, indices: readonly number[], value: number, opts: EditOpts): void {
  writeBulk(bytes, EVENT_STATE_OFFSET, indices, value, validateEventState(value, opts))
}

/** デバッグ用：indices の周回をまたぐ記録（0x3838＋添字）をすべて value にする。値の制限は writeEventRecord と同じ */
export function writeEventRecords(bytes: Uint8Array, indices: readonly number[], value: number, opts: EditOpts): void {
  writeBulk(bytes, EVENT_RECORD_OFFSET, indices, value, validateEventRecord(value, opts))
}
