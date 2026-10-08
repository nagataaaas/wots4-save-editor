// 新しい周回の始め。出典：docs/save_format/chunks/date-location の調査記録 2026-10-08_new-cycle.md（[U] 2026-10-08）。
//
// 2つの書き込みを用意する（[U] 2026-10-08 のユーザー判断）：
//
// 1. enableCharacterSetup：0x0010（段階）を 0 にするだけ。
//    ✅ [U] 「続きから」で難易度と主人公の設定に進む。イベントの状態は前の周回のままなので、序章のイベントは始まらず、セーブした場所から始まる
//
// 2. startNewCycle：周回ごとに初期化されるとみられる値を、エンディング後（周回の開始前）のセーブの値にそろえる。
//    書く値はすべて、エンディング後のセーブで見た値。どの範囲がエンディングで初期化されるかは差分で確かめていない（🔶）。
//    ✅ [U] 0x0010＝0 と船上の侍（0x36A8）＝00 で、序章のイベントから始まった
//    ✅ [U] 2026-10-08 周回の途中のセーブに startNewCycle を書くと、新しい周回として遊べた。
//    個々の値が初期化に必要か・エンディング後と同じ値でよいかは、下の表の確度のまま
//
//    | 位置 | 値 | 確度 |
//    | 0x0010 u16 段階 | 0（序章） | ✅ |
//    | 0x0012 u8 時間帯を進める保留量 | 0 | 🔶 |
//    | 0x0013 u8 現在地 | 0x27（港（騒乱／希望の光用）） | 🔶 必要かは未確認 |
//    | 0x0014 u8 時間帯 | 0 | 🔶 |
//    | 0x0B90 u32 プレイ時間（周回中） | 0 | 🔶 |
//    | 0x0BC0 float32 時間とともに増える値 | 0 | ❓ 意味は不明。エンディング後のセーブでは 0 |
//    | 0x0BC8 u32 斬殺数（周回中） | 0 | 🔶 |
//    | 0x0BD0 u32 魂技による斬殺数（周回中か） | 0 | ❓ |
//    | 0x0BD8 u32 経過日数 | 0（1日目） | ✅ 値の意味 |
//    | 0x0C84〜0x1C23 敵の種類ごとの斬殺数（周回中） | すべて 0 | 🔶 範囲の終わりは累計の表の直前 |
//    | 0x36A8〜0x374D イベントの状態 A | NEW_CYCLE_EVENT_FF の番号は FF、ほかは 00 | 🔶 並びは1件のセーブで見たもの |
//    | 0x374E〜0x3837 シナリオのフラグ | 0（施設 0x375D〜0x375F と堂島の職 0x3799 は変えない） | 🔶 |
//    | 0x3900 u16 次のイベントのヒント | 0xFFFF | 🔶 |
//
//    変えないもの：難易度、記録 B（周回をまたぐ）、施設（周回をまたいで引き継がれる 🔶）、堂島の職 0x3799
//    （エンディング後のセーブでは 1。引き継がれるのか初期値なのか ❓）、所持金・武器・アイテム・装飾品・容姿・特典、
//    町の人となりわい、夜這いの記録、治安（周回をまたいで引き継がれる [W]）、累計の記録
//
// ❓ U-1 判定待ちのため [TS] の固定オフセット（案A）の位置で読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { writeF32, writeU16, writeU32, writeU8 } from './binary'
import { HERO_OFFSETS, checkLayout } from './hero'
import { DATE_OFFSETS } from './scenario-date'
import { EVENT_STATE_OFFSET } from './scenario-events'

/** イベントの状態 A の件数（通し番号 0〜165） */
const EVENT_COUNT = 166

/** 🔶 エンディング後のセーブで FF だった、イベントの状態 A の番号。ほかは 00 */
export const NEW_CYCLE_EVENT_FF: readonly number[] = [
  2, 10, 14, 16, 19, 25, 32, 53, 54, 55, 56, 59, 60, 61, 64, 65, 66, 67, 68, 69, 74, 76, 80, 83, 93, 94, 95, 96,
  ...Array.from({ length: 165 - 99 + 1 }, (_, i) => 99 + i),
]

/** シナリオのフラグ（通し番号 166〜399） */
const SCENARIO_FLAGS = { start: 0x374e, end: 0x3837 } as const
/** シナリオのフラグのうち変えないもの：施設（引き継がれる 🔶）、堂島の職（❓） */
export const NEW_CYCLE_KEEP_FLAGS: readonly number[] = [0x375d, 0x375e, 0x375f, 0x3799]

/** 🔶 敵の種類ごとの斬殺数（周回中）。累計の表（0x1C24〜）の直前まで */
const KILL_COUNTS_CYCLE = { start: 0x0c84, end: 0x1c23 } as const

export const NEW_CYCLE_OFFSETS = {
  playTimeCycle: 0x0b90,
  timeFloat: 0x0bc0,
  killsCycle: 0x0bc8,
  soulKillsCycle: 0x0bd0,
  dayIndex: DATE_OFFSETS.dayIndex,
  hint: 0x3900,
} as const

/** 段階の上書きに使う値 */
const STAGE_PROLOGUE = 0
/** 🔶 エンディング後のセーブの現在地（港（騒乱／希望の光用）） */
export const NEW_CYCLE_LOCATION = 0x27
const HINT_NONE = 0xffff

function assertLayout(bytes: Uint8Array): void {
  const problem = checkLayout(bytes)
  if (problem) throw new RangeError(problem)
}

/** 0x0010（u16）だけを 0 にする。✅ [U] 次のロードで難易度と主人公の設定に進む */
export function enableCharacterSetup(bytes: Uint8Array): void {
  assertLayout(bytes)
  writeU16(bytes, DATE_OFFSETS.dayTime, STAGE_PROLOGUE)
}

/** 周回ごとに初期化されるとみられる値を、エンディング後のセーブの値にそろえる（表は冒頭のコメント） */
export function startNewCycle(bytes: Uint8Array): void {
  assertLayout(bytes)

  writeU16(bytes, DATE_OFFSETS.dayTime, STAGE_PROLOGUE)
  writeU8(bytes, DATE_OFFSETS.pending, 0)
  writeU8(bytes, HERO_OFFSETS.location, NEW_CYCLE_LOCATION)
  writeU8(bytes, DATE_OFFSETS.slot, 0)

  const o = NEW_CYCLE_OFFSETS
  writeU32(bytes, o.playTimeCycle, 0)
  writeF32(bytes, o.timeFloat, 0)
  writeU32(bytes, o.killsCycle, 0)
  writeU32(bytes, o.soulKillsCycle, 0)
  writeU32(bytes, o.dayIndex, 0)
  bytes.fill(0, KILL_COUNTS_CYCLE.start, KILL_COUNTS_CYCLE.end + 1)

  const ff = new Set(NEW_CYCLE_EVENT_FF)
  for (let n = 0; n < EVENT_COUNT; n++) writeU8(bytes, EVENT_STATE_OFFSET + n, ff.has(n) ? 0xff : 0x00)

  const keep = new Set(NEW_CYCLE_KEEP_FLAGS)
  for (let p = SCENARIO_FLAGS.start; p <= SCENARIO_FLAGS.end; p++) if (!keep.has(p)) writeU8(bytes, p, 0)

  writeU16(bytes, o.hint, HINT_NONE)
}
