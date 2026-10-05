// 日数・時間帯。出典：解析ノート §3.5（[U] 2026-10-05 のシナリオ差分とゲーム内での書き込み確認）。
//
//   0x0010 u16  日×100＋時間帯×10（🔶）。03 copy 4 → copy 5：100 → 110、04 copy 2 → copy 3：120 → 200
//               ✅ [U] 時間帯の部分は書き換えでゲーム内に反映された（0x0014 と同時に書いたので、どちらが効いたかは ❓）。
//               ✅ [U] 日の部分だけを書き換えても日数は変わらなかった（2026-10-05）。日数は 0x0BD8 から求めていると推定
//   0x0012 u8   時間帯を進める保留量。✅ [U] 10 → 0 の書き換えで、エリア移動しても時間帯が進まなくなった（2026-10-05）
//   0x0014 u8   時間帯（0＝昼・朝、1＝夕、2＝夜）。✅ [U] 上の 0x0010 と同時に書いて反映
//   0x0BD8 u32  🔶 経過日数（1日目＝0）。2日目に入った3つのセーブ（04 copy 3・03 copy 6・04 copy 5）だけが 1、ほかの11件は 0。
//               書き込みはゲーム内で未確認（要ゲーム内確認）
// 4日目以降（勢力ルート）でこれらがどうなるかは ❓。
//
// ❓ U-1 判定待ちのため [TS] の固定オフセット（案A）の位置で読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU16, readU32, readU8, writeU16, writeU32, writeU8 } from './binary'
import { checkLayout } from './hero'

export const DATE_OFFSETS = {
  /** u16 日×100＋時間帯×10（🔶） */
  dayTime: 0x10,
  /** u8 ✅ [U] 時間帯を進める保留量（イベント完了で 10） */
  pending: 0x12,
  /** u8 ✅ [U] 時間帯 */
  slot: 0x14,
  /** u32 🔶 経過日数（1日目＝0） */
  dayIndex: 0xbd8,
} as const

/** 0 はゲーム内で「昼」とも「朝」とも表示される（1日目は昼、2日目の始まりは朝 [U]） */
export const TIME_SLOTS = ['昼（朝）', '夕', '夜'] as const

/**
 * 日数の正規の範囲。🔶 1〜3日目は昼・夕・夜の3枠（§9.5）。
 * 4日目以降は値を見ていないので、上級者モードでだけ受け付ける（0x0010 に収まる 655 日目まで）
 */
export const DAY_RANGE = { normal: { min: 1, max: 3 }, system: { min: 1, max: 655 } } as const

/** 保留量の正規の値。🔶 差分で見たのは 0 と 10 だけ */
export const PENDING_VALUES = [0, 10] as const

export type DateView = {
  layoutProblem: string | null
  /** 0x0BD8＋1 */
  day: number
  /** 0＝昼（朝）、1＝夕、2＝夜 */
  slot: number
  pending: number
  raw: { dayTime: number; slot: number; dayIndex: number }
  /** 妥当性検証に落ちた理由。null なら編集可能 */
  problem: string | null
  /** 編集はできるが注意が必要な理由 */
  warning: string | null
}

export function readDate(bytes: Uint8Array): DateView {
  if (bytes.byteLength < DATE_OFFSETS.dayIndex + 4) throw new RangeError('ファイルが小さすぎて日付を読めません')
  const layoutProblem = checkLayout(bytes)
  const dayTime = readU16(bytes, DATE_OFFSETS.dayTime)
  const slotRaw = readU8(bytes, DATE_OFFSETS.slot)
  const pending = readU8(bytes, DATE_OFFSETS.pending)
  const dayIndex = readU32(bytes, DATE_OFFSETS.dayIndex)
  const dayFromTime = Math.floor(dayTime / 100)
  const slot = (dayTime % 100) / 10
  const day = dayIndex + 1

  let problem: string | null = null
  if (dayFromTime < 1 || !Number.isInteger(slot) || slot >= TIME_SLOTS.length)
    problem = `0x0010 の値（${dayTime}）が「日×100＋時間帯×10」の形になっていません`
  else if (slotRaw !== slot) problem = `0x0010 の時間帯（${slot}）と 0x0014 の時間帯（${slotRaw}）が一致しません`
  else if (dayFromTime !== day) problem = `0x0010 の日（${dayFromTime}）と 0x0BD8 の日（${day}）が一致しません`
  else if (!(PENDING_VALUES as readonly number[]).includes(pending)) problem = `0x0012 の値が想定外です（${pending}）`

  const warnings: string[] = []
  if (pending !== 0) warnings.push('時間帯を進める保留量が入っています。エリア移動・ロードで時間帯が1つ進みます')
  if (!problem && day > DAY_RANGE.normal.max) warnings.push(`${DAY_RANGE.normal.max}日目より後の値は確かめていません`)

  return {
    layoutProblem,
    day,
    slot,
    pending,
    raw: { dayTime, slot: slotRaw, dayIndex },
    problem: layoutProblem ?? problem,
    warning: warnings.length ? warnings.join('。') : null,
  }
}

export function validateDay(day: number, opts: { advanced: boolean }): string | null {
  const r = opts.advanced ? DAY_RANGE.system : DAY_RANGE.normal
  if (!Number.isInteger(day)) return '整数を入力してください'
  if (day < r.min || day > r.max) return `${r.min}〜${r.max} の範囲で入力してください`
  return null
}

function editable(bytes: Uint8Array): DateView {
  const view = readDate(bytes)
  if (view.problem) throw new RangeError(view.problem)
  return view
}

/**
 * 日数と時間帯を書く。0x0010（u16）・0x0014（u8）・0x0BD8（u32）だけを変える。保留量（0x0012）は変えない。
 * 時間帯は ✅ [U] ゲーム内で反映を確認。日数（0x0BD8）は 🔶 要ゲーム内確認
 */
export function writeDayTime(bytes: Uint8Array, day: number, slot: number, opts: { advanced: boolean }): void {
  editable(bytes)
  const problem = validateDay(day, opts)
  if (problem) throw new RangeError(problem)
  if (!Number.isInteger(slot) || slot < 0 || slot >= TIME_SLOTS.length) throw new RangeError(`時間帯が範囲外です: ${slot}`)
  writeU16(bytes, DATE_OFFSETS.dayTime, day * 100 + slot * 10)
  writeU8(bytes, DATE_OFFSETS.slot, slot)
  writeU32(bytes, DATE_OFFSETS.dayIndex, day - 1)
}

/** 保留量（0x0012）の1バイトだけを書く。0 か 10 だけ（✅ [U] 10 → 0 で反映を確認） */
export function writePending(bytes: Uint8Array, value: number): void {
  editable(bytes)
  if (!(PENDING_VALUES as readonly number[]).includes(value)) throw new RangeError(`保留量は ${PENDING_VALUES.join('・')} のどれかです: ${value}`)
  writeU8(bytes, DATE_OFFSETS.pending, value)
}
