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
// 段階と日数・時間帯は別々に書く。日数・時間帯を変えても段階は変えず、合っていなくても警告しない（[U] 2026-10-10 のユーザー判断）。
// メインイベントが起きるかどうかは段階で決まり、日数・時間帯は影響しない。
//
// 4日目以降（🔶 03 copy 7・8・9、[U] 2026-10-05）：
//   copy 7（5日目昼）＝0x0BD8 4・0x0014 0、copy 8（5日目夕）＝4・1、copy 9（6日目昼）＝5・0。いずれも 0x0010＝400。
//   ✅ [U] 03 copy 5（1日目夕）を 5日目に書き換える（0x0010＝400）と、大老 鬼怒川怨仙が発生した（2026-10-05）
//
// [TS] の固定オフセットで読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU16, readU8, writeU16, writeU8 } from './binary'
import { validateRange, type EditOpts, type ViewStatus } from './field'
import { tr, type Localized } from '@/lib/i18n'
import { flagValues, localizedStrings, validateKnownValue } from './flags/byte-flag'
import { assertWritable, checkLayout } from './layout'

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

/**
 * 🟢 代金を踏み倒した店のビット（u32）。地域の読み込み（エリア移動・ロード）と周回の終わりに 0 になるので、
 * エディタでは欄を出さない。周回の初期化（new-cycle.ts）だけが 0 を書く（chunks/date-location）
 */
export const UNPAID_SHOPS_OFFSET = 0x0018
/** 🟢 使われていない予約の領域（i32 × 48、0x001C〜0x00DB。end は含まない）。常に FF で、新しいデータと周回の終わりに FF で埋められる（chunks/date-location） */
export const RESERVED_AREA = { start: 0x001c, end: 0x00dc } as const

/** 0 はゲーム内で「昼」とも「朝」とも表示される（1日目は昼、2日目の始まりは朝 [U]） */
const TIME_SLOT_LABELS: readonly Localized[] = [
  { ja: '昼（朝）', en: 'Daytime (morning)' },
  { ja: '夕', en: 'Evening' },
  { ja: '夜', en: 'Night' },
]

/** 時間帯の名前。要素は読むたびに今の言語で返す */
export const TIME_SLOTS = localizedStrings(TIME_SLOT_LABELS) as readonly [string, string, string]

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
const PENDING_KNOWN = PENDING_VALUES.map((value) => ({ value }))

export type Stage = {
  value: number
  label: string
}

/**
 * 🟢 段階の値の一覧。ラベルの 400 以降は、その段階で起きるイベントから付けた。
 * 実セーブで見たのは 0・100・110・120・200・400。ほかを書き込んだときのゲーム内の動作は ❓
 */
export const STAGES: readonly Stage[] = flagValues([
  { value: 0, label: { ja: '序章（周回の開始前）', en: 'Prologue (before the playthrough starts)' } },
  { value: 100, label: { ja: '1日目 昼', en: 'Day 1 daytime' } },
  { value: 110, label: { ja: '1日目 夕', en: 'Day 1 evening' } },
  { value: 120, label: { ja: '1日目 夜', en: 'Day 1 night' } },
  { value: 200, label: { ja: '2日目 朝', en: 'Day 2 morning' } },
  { value: 210, label: { ja: '2日目 夕', en: 'Day 2 evening' } },
  { value: 220, label: { ja: '2日目 夜', en: 'Day 2 night' } },
  { value: 300, label: { ja: '3日目 昼', en: 'Day 3 daytime' } },
  { value: 310, label: { ja: '3日目 夕', en: 'Day 3 evening' } },
  { value: 320, label: { ja: '3日目 夜', en: 'Day 3 night' } },
  { value: 400, label: { ja: '4日目以降（剣術大会の前）', en: 'Day 4 and later (before the Battle Tournament)' } },
  { value: 410, label: { ja: '4日目以降（ローラの決意）', en: "Day 4 and later (Laura's Determination)" } },
  {
    value: 420,
    label: {
      ja: '4日目以降（ローラ奪還・士魂は屈せず）',
      en: 'Day 4 and later (Rescuing Laura, The Fighting Spirit Never Dies)',
    },
  },
  {
    value: 500,
    label: {
      ja: '剣術大会のあと（闇黒の意志・大老武断など）',
      en: 'After the Battle Tournament (A Dark Will, Chief Minister At War, etc.)',
    },
  },
  {
    value: 510,
    label: {
      ja: '剣術大会のあと（般若党壊滅・鬼怒川の魔手など）',
      en: "After the Battle Tournament (Annihilation of the Prajnas, Kinugawa's Evil Influence, etc.)",
    },
  },
  {
    value: 520,
    label: {
      ja: '剣術大会のあと（剣客 茂呂茂・武人 琴吹光）',
      en: 'After the Battle Tournament (Shigeru Moro, Swordsman / Hikaru Kotobuki, Military Man)',
    },
  },
  {
    value: 600,
    label: {
      ja: '鬼怒川の魔手のあと（夕暮れの船上・討ち入り）',
      en: "After Kinugawa's Evil Influence (Twilight On Board, The Raid)",
    },
  },
  { value: 999, label: { ja: '結末（エンディング）', en: 'Ending' } },
])

/** 序章（周回の開始前） */
export const STAGE_PROLOGUE = 0

export function stageOf(value: number): Stage | null {
  return STAGES.find((s) => s.value === value) ?? null
}

export type DateView = ViewStatus & {
  /** 0x0BD8（1日目＝0） */
  dayIndex: number
  /** 0x0BD8＋1 */
  day: number
  /** 0x0014。0＝昼（朝）、1＝夕、2＝夜 */
  slot: number
  pending: number
  /** 0x0010 */
  stage: number
}

export function readDate(bytes: Uint8Array): DateView {
  if (bytes.byteLength < DATE_OFFSETS.dayIndex + 4)
    throw new RangeError(tr({ ja: 'ファイルが小さすぎて日付を読めません', en: 'The file is too small to read the date' }))
  const layoutProblem = checkLayout(bytes)
  const stage = readU16(bytes, DATE_OFFSETS.dayTime)
  const slot = readU8(bytes, DATE_OFFSETS.slot)
  const pending = readU8(bytes, DATE_OFFSETS.pending)
  const dayIndex = readU16(bytes, DATE_OFFSETS.dayIndex)
  const day = dayIndex + 1

  let problem: string | null = null
  if (slot >= TIME_SLOTS.length)
    problem = tr({ ja: '時間帯が想定外の状態になっています', en: 'The time of day is in an unexpected state' })
  else if (!(PENDING_VALUES as readonly number[]).includes(pending))
    problem = tr({
      ja: '時間帯を進める保留量が想定外の状態になっています',
      en: 'The queued time advance is in an unexpected state',
    })

  const warnings: string[] = []
  if (!stageOf(stage))
    warnings.push(tr({ ja: '段階が一覧にない状態です', en: 'The story stage is not in the list' }))
  if (pending !== 0)
    warnings.push(
      tr({
        ja: '時間帯を進める保留量が入っています。エリア移動・ロードで時間帯が1つ進みます',
        en: 'A time advance is queued. The time of day will move forward one step when you change areas or load',
      }),
    )
  if (day > DAY_SEEN_MAX)
    warnings.push(
      tr({
        ja: `${DAY_SEEN_MAX}日目より後の値は確かめていません`,
        en: `Days after Day ${DAY_SEEN_MAX} may not behave as expected in the game`,
      }),
    )

  return {
    dayIndex,
    day,
    slot,
    pending,
    stage,
    problem: layoutProblem ?? problem,
    warnings,
  }
}

export function validateDay(day: number, opts: EditOpts): string | null {
  return validateRange(
    day,
    { min: DAY_RANGE.normal.min, normalMax: DAY_RANGE.normal.max, systemMin: DAY_RANGE.system.min, systemMax: DAY_RANGE.system.max },
    opts,
  )
}

function editable(bytes: Uint8Array): DateView {
  const view = readDate(bytes)
  if (view.problem) throw new RangeError(view.problem)
  return view
}

/**
 * 日数と時間帯を書く。0x0BD8（u16）・0x0014（u8）だけを書き、段階（0x0010）と保留量（0x0012）は変えない（[U] 2026-10-10）。
 * 時間帯・日数とも ✅ [U] ゲーム内で反映を確認。日を進めると、過ぎた時間帯の未処理イベントはチャートで失敗と表示される
 */
export function writeDayTime(bytes: Uint8Array, day: number, slot: number, opts: EditOpts): void {
  assertWritable(bytes)
  editable(bytes)
  const problem = validateDay(day, opts)
  if (problem) throw new RangeError(problem)
  if (!Number.isInteger(slot) || slot < 0 || slot >= TIME_SLOTS.length)
    throw new RangeError(tr({ ja: '時間帯が範囲外です', en: 'The time of day is out of range' }))
  writeU8(bytes, DATE_OFFSETS.slot, slot)
  writeU16(bytes, DATE_OFFSETS.dayIndex, day - 1)
}

/**
 * 段階（0x0010 u16）だけを書く。日数・時間帯は変えない。一覧（STAGES）にある値だけ。
 * メインイベントが起きるかどうかはこの値で決まる。1〜3日目の値と 400 は日数・時間帯と一緒に書いて反映を確認済み。❓ 410 以降を書いたときのゲーム内の動作は要ゲーム内確認。
 * 0（序章）はここでは書かない。0x0010 だけを 0 にすると、序章のイベントが始まらずセーブした場所から始まった（✅ [U] 2026-10-08）。
 * 0 にするときは new-cycle.ts の startNewCycle（周回の初期化）か enableCharacterSetup（0x0010 だけ）を使う
 */
export function writeStage(bytes: Uint8Array, value: number): void {
  assertWritable(bytes)
  editable(bytes)
  if (!stageOf(value)) throw new RangeError(tr({ ja: '一覧にない段階です', en: 'This story stage is not in the list' }))
  if (value === STAGE_PROLOGUE)
    throw new RangeError(
      tr({
        ja: '序章にするときは「新しい周回を始める」か「難易度と主人公設定を行えるようにする」を使ってください',
        en: 'To go back to the prologue, use "New playthrough" or "Enable difficulty & Character Settings"',
      }),
    )
  writeU16(bytes, DATE_OFFSETS.dayTime, value)
}

/** 保留量（0x0012）の1バイトだけを書く。0 か 10 だけ（✅ [U] 10 → 0 で反映を確認） */
export function writePending(bytes: Uint8Array, value: number): void {
  assertWritable(bytes)
  editable(bytes)
  const problem = validateKnownValue(
    value,
    PENDING_KNOWN,
    { advanced: false },
    0xff,
    tr({ ja: '保留量は「なし」か「あり」のどちらかです', en: 'The queued time advance must be "None" or "Queued"' }),
  )
  if (problem) throw new RangeError(problem)
  writeU8(bytes, DATE_OFFSETS.pending, value)
}
