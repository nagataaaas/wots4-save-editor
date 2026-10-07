// イベントチャートの枠をどう描くか。出典：docs/save_format/chunks/event-chart「チャート表示の規則」。
//
//   名前を出す   B（記録）が 04、または A（状態）が 04（✅ [U] 2026-10-06）
//   名前を隠す   B が FF で A が FF・00・05（✅）。A が 01〜03 のとき、B が 00・03・05 のときは ❓（隠すとして描く）
//   枠ごと出ない 隠しルートの枠で、B が FF かつ A が 04 以外（✅ [U] 2026-10-06）
//   失敗の印     A が 05（✅）。1〜3日目の勢力イベントで、A が 00・FF のまま時間帯が過ぎたもの（✅ [U] 2026-10-05、
//                当たるイベントの範囲は 🔶）
//   枠そのものを出すかどうか（まだ到達したことのない日の枠など）を決めるデータは ❓ なので、上のどれでもなければ枠は描く
import type { ChartBox } from './master/event-chart-layout'
import type { EventEntry } from './scenario-events'

export type ChartBoxLook = 'absent' | 'masked' | 'masked-failed' | 'shown' | 'shown-failed'

/** 今の日と時間帯（scenario-date.ts の readDate）。null は分からない */
export type ChartNow = { day: number; slot: number } | null

const RECORD_SHOW = 0x04
const RECORD_HIDE = 0xff
const STATE_SUCCESS = 0x04
const STATE_FAILED = 0x05
const UNREACHED = new Set([0x00, 0xff])

/** 時間帯が過ぎたか。4日目以降は1〜3日目の時間帯がすべて過ぎている */
function slotPassed(box: ChartBox, now: ChartNow): boolean {
  if (!now || box.day === undefined || box.slot === undefined) return false
  return now.day > box.day || (now.day === box.day && now.slot > box.slot)
}

/**
 * 枠の描き方。entry が null（セーブ未読み込み）なら名前を出して描く（ユーザー判断 2026-10-07）
 */
export function chartBoxLook(entry: EventEntry | null, now: ChartNow, box: ChartBox): ChartBoxLook {
  if (!entry) return 'shown'
  const { state, record } = entry
  if (box.kind === 'hidden' && record === RECORD_HIDE && state !== STATE_SUCCESS) return 'absent'
  const failed = state === STATE_FAILED || (UNREACHED.has(state) && slotPassed(box, now))
  const named = record === RECORD_SHOW || state === STATE_SUCCESS
  if (named) return failed ? 'shown-failed' : 'shown'
  return failed ? 'masked-failed' : 'masked'
}

export const CHART_BOX_LOOK_LABELS: Readonly<Record<ChartBoxLook, string>> = {
  absent: '枠ごと出ない',
  masked: '名前が隠れる',
  'masked-failed': '名前が隠れる・失敗',
  shown: '名前が出る',
  'shown-failed': '名前が出る・失敗',
}
