// 日数・時間帯・シナリオの段階。出典：docs/save_format/chunks/date-location（[U] 2026-10-05 のシナリオ差分とゲーム内での書き込み確認）。
//
// 役割の分担（[U] 2026-10-08 の整理）：
//   0x0BD8 u16  経過日数（1日目＝0）🟢 幅。直後の 0x0BDA〜0x0BDB は詰め物で書かない。ゲーム内の日数の表示はこれで決まる。
//               ✅ [U] 03 copy 5（1日目夕）を 2日目に書き換えると、ゲームでも2日目になった（2026-10-05。0x0010・0x0014 と同時に書いた）。
//               ✅ [U] 0x0010 の日の部分だけを書き換えても日数は変わらなかった（2026-10-05）
//               ✅ [U] 04 copy 3・4（2026-10-08）は 0x0BD8＝4 で、ゲーム内の表示は5日目
//   0x0014 u8   時間帯（0＝昼・朝、1＝夕、2＝夜）。4日目以降も進む。
//               ✅ [U] 04 copy 3 → copy 4（5日目昼 → 夕）で変わったのは 0x0014 だけ（0x0BDC 以降は変わらない）
//   0x0010 u16  シナリオの段階。イベントの発生条件に使われる。1〜3日目は「日×100＋時間帯×10」、4日目以降は 400 で止まり、
//               その先は話の進み具合で 410・420・500〜520・600・999 に進む（🟢 値の一覧。実セーブで見たのは 0・100〜200・400）。
//               0＝序章。✅ [U] 大通りのセーブの 0x0010 を 0 にすると「続きから」で主人公の設定画面に進んだ（2026-10-08）。
//               ただし序章のイベントは始まらず、セーブした場所から始まった。0 にする書き込みは new-cycle.ts
//   0x0012 u8   時間帯を進める保留量。✅ [U] 10 → 0 の書き換えで、エリア移動しても時間帯が進まなくなった（2026-10-05）
//
// 段階は日数・時間帯と「連動」しているとき（1〜3日目の「日×100＋時間帯×10」か、4日目以降の 400）だけ、日数・時間帯の書き込みで一緒に書く。
// 話の進み具合で決まる段階（0・410 以降など）のときは、日数・時間帯を変えても段階を変えない（[U] 2026-10-08 のユーザー判断）。
//
// 4日目以降（🔶 03 copy 7・8・9、[U] 2026-10-05）：
//   copy 7（5日目昼）＝0x0BD8 4・0x0014 0、copy 8（5日目夕）＝4・1、copy 9（6日目昼）＝5・0。いずれも 0x0010＝400。
//   ✅ [U] 03 copy 5（1日目夕）を 5日目に書き換える（0x0010＝400）と、大老 鬼怒川怨仙が発生した（2026-10-05）
//
// [TS] の固定オフセットで読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU16, readU8, writeU16, writeU8 } from './binary'
import { checkLayout } from './hero'

export const DATE_OFFSETS = {
  /** u16 シナリオの段階 */
  dayTime: 0x10,
  /** u8 ✅ [U] 時間帯を進める保留量（イベント完了で 10） */
  pending: 0x12,
  /** u8 ✅ [U] 時間帯 */
  slot: 0x14,
  /** u16 ✅ [U] 経過日数（1日目＝0）。🟢 幅は u16 */
  dayIndex: 0xbd8,
} as const

/** 0 はゲーム内で「昼」とも「朝」とも表示される（1日目は昼、2日目の始まりは朝 [U]） */
export const TIME_SLOTS = ['昼（朝）', '夕', '夜'] as const

/**
 * 日数の正規の範囲。通常モードは 99 日目まで（[U] 2026-10-05 の要望）。上級者モードは 655 日目まで。
 * DAY_SEEN_MAX を超えると警告する
 */
export const DAY_RANGE = { normal: { min: 1, max: 99 }, system: { min: 1, max: 655 } } as const
/** 実データで値を見た最後の日（03 copy 9） */
export const DAY_SEEN_MAX = 6
/** 4日目以降の 0x0010 の値（03 copy 7・8・9。✅ [U] 書き換えで 5日目のイベントが発生） */
export const DAY_TIME_AFTER_DAY3 = 400

/** 保留量の正規の値。🔶 差分で見たのは 0 と 10 だけ */
export const PENDING_VALUES = [0, 10] as const

export type Stage = {
  value: number
  label: string
  /** 実セーブで値を見たか。見ていないものは 🟢（値の一覧）で、書き込んだときのゲーム内の動作は ❓ */
  seen: boolean
}

/** 🟢 段階の値の一覧。ラベルの 400 以降は、その段階で起きるイベントから付けた */
export const STAGES: readonly Stage[] = [
  { value: 0, label: '序章（周回の開始前）', seen: true },
  { value: 100, label: '1日目 昼', seen: true },
  { value: 110, label: '1日目 夕', seen: true },
  { value: 120, label: '1日目 夜', seen: true },
  { value: 200, label: '2日目 朝', seen: true },
  { value: 210, label: '2日目 夕', seen: false },
  { value: 220, label: '2日目 夜', seen: false },
  { value: 300, label: '3日目 昼', seen: false },
  { value: 310, label: '3日目 夕', seen: false },
  { value: 320, label: '3日目 夜', seen: false },
  { value: 400, label: '4日目以降（剣術大会の前）', seen: true },
  { value: 410, label: '4日目以降（ローラの決意）', seen: false },
  { value: 420, label: '4日目以降（ローラ奪還・士魂は屈せず）', seen: false },
  { value: 500, label: '剣術大会のあと（闇黒の意志・大老武断など）', seen: false },
  { value: 510, label: '剣術大会のあと（般若党壊滅・鬼怒川の魔手など）', seen: false },
  { value: 520, label: '剣術大会のあと（剣客 茂呂茂・武人 琴吹光）', seen: false },
  { value: 600, label: '鬼怒川の魔手のあと（夕暮れの船上・討ち入り）', seen: false },
  { value: 999, label: '結末（エンディング）', seen: false },
]

/** 序章（周回の開始前） */
export const STAGE_PROLOGUE = 0

export function stageOf(value: number): Stage | null {
  return STAGES.find((s) => s.value === value) ?? null
}

/** 日数・時間帯に連動しているときの段階。1〜3日目は「日×100＋時間帯×10」、4日目以降は 400 */
export function linkedStage(day: number, slot: number): number {
  return day <= 3 ? day * 100 + slot * 10 : DAY_TIME_AFTER_DAY3
}

export type DateView = {
  layoutProblem: string | null
  /** 0x0BD8＋1 */
  day: number
  /** 0x0014。0＝昼（朝）、1＝夕、2＝夜 */
  slot: number
  pending: number
  /** 0x0010 */
  stage: number
  /** 段階が日数・時間帯と連動しているか（日数・時間帯を書くと段階も書く） */
  linked: boolean
  raw: { dayTime: number; slot: number; dayIndex: number }
  /** 妥当性検証に落ちた理由。null なら編集可能 */
  problem: string | null
  /** 編集はできるが注意が必要な理由 */
  warning: string | null
}

export function readDate(bytes: Uint8Array): DateView {
  if (bytes.byteLength < DATE_OFFSETS.dayIndex + 4) throw new RangeError('ファイルが小さすぎて日付を読めません')
  const layoutProblem = checkLayout(bytes)
  const stage = readU16(bytes, DATE_OFFSETS.dayTime)
  const slot = readU8(bytes, DATE_OFFSETS.slot)
  const pending = readU8(bytes, DATE_OFFSETS.pending)
  const dayIndex = readU16(bytes, DATE_OFFSETS.dayIndex)
  const day = dayIndex + 1
  const linked = stage === linkedStage(day, slot)

  let problem: string | null = null
  if (slot >= TIME_SLOTS.length) problem = `0x0014 の時間帯が想定外です（${slot}）`
  else if (!(PENDING_VALUES as readonly number[]).includes(pending)) problem = `0x0012 の値が想定外です（${pending}）`

  const warnings: string[] = []
  const known = stageOf(stage)
  if (!known) warnings.push(`段階（0x0010）が一覧にない値です（${stage}）`)
  else if (!linked && stage >= 100 && stage <= DAY_TIME_AFTER_DAY3)
    warnings.push(`段階（${known.label}）が日数・時間帯（${day}日目 ${TIME_SLOTS[slot] ?? slot}）と合っていません`)
  if (pending !== 0) warnings.push('時間帯を進める保留量が入っています。エリア移動・ロードで時間帯が1つ進みます')
  if (day > DAY_SEEN_MAX) warnings.push(`${DAY_SEEN_MAX}日目より後の値は確かめていません`)

  return {
    layoutProblem,
    day,
    slot,
    pending,
    stage,
    linked,
    raw: { dayTime: stage, slot, dayIndex },
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
 * 日数と時間帯を書く。0x0BD8（u16）・0x0014（u8）を書き、段階が連動しているときだけ 0x0010（u16）も書く。保留量（0x0012）は変えない。
 * 時間帯・日数とも ✅ [U] ゲーム内で反映を確認。日を進めると、過ぎた時間帯の未処理イベントはチャートで失敗と表示される。
 * 4日目以降は 0x0010 に 400 を書く（✅ [U] 5日目への書き換えで大老 鬼怒川怨仙が発生）
 */
export function writeDayTime(bytes: Uint8Array, day: number, slot: number, opts: { advanced: boolean }): void {
  const view = editable(bytes)
  const problem = validateDay(day, opts)
  if (problem) throw new RangeError(problem)
  if (!Number.isInteger(slot) || slot < 0 || slot >= TIME_SLOTS.length) throw new RangeError(`時間帯が範囲外です: ${slot}`)
  if (view.linked) writeU16(bytes, DATE_OFFSETS.dayTime, linkedStage(day, slot))
  writeU8(bytes, DATE_OFFSETS.slot, slot)
  writeU16(bytes, DATE_OFFSETS.dayIndex, day - 1)
}

/**
 * 段階（0x0010 u16）だけを書く。日数・時間帯は変えない。一覧（STAGES）にある値だけ。
 * 1〜3日目の値と 400 は日数・時間帯と一緒に書いて反映を確認済み。❓ 410 以降を書いたときのゲーム内の動作は要ゲーム内確認。
 * 0（序章）はここでは書かない。0x0010 だけを 0 にすると、序章のイベントが始まらずセーブした場所から始まった（✅ [U] 2026-10-08）。
 * 0 にするときは new-cycle.ts の startNewCycle（周回の初期化）か enableCharacterSetup（0x0010 だけ）を使う
 */
export function writeStage(bytes: Uint8Array, value: number): void {
  editable(bytes)
  if (!stageOf(value)) throw new RangeError(`一覧にない段階です: ${value}`)
  if (value === STAGE_PROLOGUE)
    throw new RangeError('序章にするときは「新しい周回を始める」か「難易度と主人公設定を行えるようにする」を使ってください')
  writeU16(bytes, DATE_OFFSETS.dayTime, value)
}

/** 保留量（0x0012）の1バイトだけを書く。0 か 10 だけ（✅ [U] 10 → 0 で反映を確認） */
export function writePending(bytes: Uint8Array, value: number): void {
  editable(bytes)
  if (!(PENDING_VALUES as readonly number[]).includes(value)) throw new RangeError(`保留量は ${PENDING_VALUES.join('・')} のどれかです: ${value}`)
  writeU8(bytes, DATE_OFFSETS.pending, value)
}
