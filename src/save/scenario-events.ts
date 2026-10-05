// イベントチャートの状態。出典：解析ノート §3.5（[U] 2026-10-05 のシナリオ差分とゲーム内での書き込み確認）、イベント名は docs/event.md。
//
//   0x36A8〜 u8 × 166  周回中のイベント状態（A）。添字ごとに1イベント
//   0x3838〜 u8 × 166  周回をまたぐ記録（B、🔶 生きた証）。チャートに表示するかどうかを決めていると推定
//
// A の値：
//   FF / 00 未到達。✅ [U] 記録が 04 の代官所潜入で A を FF にすると、チャートでは「未達成」と表示された（2026-10-05）。
//           周回開始時、記録が FF の添字は FF、そうでない添字は 00 になっている（🔶 差分の観察）
//   01 導入を見た  🔶 04 copy 9 → copy 10（剣術大会の準備の導入カットシーンを見たあと、添字36）
//   03 進行中      🔶 03 copy 2 → copy 3（志士との出会いの途中）
//   04 成功・完了  🔶 海兵隊の横暴（2回再現）、志士との出会い、阿片密売、辻斬り、代官所潜入
//   05 失敗        ✅ [U] 書き込みでチャートに失敗のマークがついた（2026-10-05）。差分は 04 copy 2（海兵隊の横暴で赤城と戦闘）
// 02 などほかの値（大成功など）は ❓。A の長さは B との間隔 0x190 から 166 B と置いた（❓ 200 B の可能性もある）。
//
// B の値：
//   FF チャートに出ない。✅ [U] 記録が FF の阿片密売で A を 05 にしても、チャートには出ないまま失敗扱いになった。
//      ただし A が 04（成功）なら FF でもチャートに出る（✅ [U] 2026-10-06）。A が 01・03 のときは ❓
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
/**
 * 🔶 イベントとして使われている添字の数（0〜98）。sample の13件すべてで、添字 99〜165 は A・B とも FF だった
 * （1周目の S4-DATA_04 を除く）。docs/event.md の Wiki の一覧は約91件で、数は合っていない（❓）
 * ただし 99 以降にもイベントはある（✅ [U] 2026-10-06：99＝大老は生きていた、116＝夜の墓場で）。99 以降で名前の分かる添字は usedIndices に含める
 */
export const EVENT_USED_COUNT = 99

/** 周回中の状態（A）。confirmed は書き込みでゲーム内の表示を確かめたもの */
export const EVENT_STATES = [
  { value: 0x00, label: '未到達', confirmed: false },
  { value: 0xff, label: '未到達（FF）', confirmed: true },
  { value: 0x01, label: '導入を見た', confirmed: false },
  { value: 0x03, label: '進行中', confirmed: false },
  { value: 0x04, label: '成功', confirmed: false },
  { value: 0x05, label: '失敗', confirmed: true },
] as const

/** 周回をまたぐ記録（B）のうち、チャート表示に効く値。✅ [U] 2026-10-05。FF でも状態が成功（04）なら出る（✅ [U] 2026-10-06） */
export const EVENT_RECORDS = [
  { value: 0xff, label: '出ない（成功なら出る）' },
  { value: 0x04, label: '出る' },
] as const

/** 読み込み時に妥当とみなす値。🔶 EVENT_STATES に、まだ見ていない 02 を足したもの */
const PLAUSIBLE_STATES = new Set([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0xff])

export type EventName = {
  name: string
  day: string
  /**
   * 'chart'＝ゲーム内のチャートで添字とイベントの対応を確認（✅ [U] 2026-10-05）、
   * 'diff'＝差分で確認（🔶）、'guess'＝ほかの添字との関係からの推測（🔶 根拠が弱い）
   */
  basis: 'chart' | 'diff' | 'guess'
}

/**
 * 名前の分かっている添字。§3.5「未確定のこと」。day は docs/event.md（Wiki）の時間帯。
 * 2〜46 の名前はユーザーがゲーム内のチャートで確かめた（[U] 2026-10-05）。52〜98 も同じ（[U] 2026-10-06）。
 * 4日目以降のイベントの day は時間帯ではなく、docs/event.md の節（ルート・エンディング）を入れる。
 * 51・99・116 も [U] 2026-10-06。47〜50・67・84 は ❓
 */
export const EVENT_NAMES: Readonly<Record<number, EventName>> = {
  0: { name: '船上の侍', day: '1日目昼', basis: 'guess' }, // どのセーブでも 04。名前は [U] 2026-10-05（Samurai on Board、オープニング）
  1: { name: '阿弥浜港争乱', day: '1日目昼', basis: 'guess' }, // スキップで 00、1周目で 04
  3: { name: '嵐の後', day: '1日目昼', basis: 'diff' }, // 03 copy → copy 2
  6: { name: '志士との出会い', day: '1日目昼', basis: 'diff' }, // 03 copy 2 → copy 3 → copy 4
  9: { name: '海兵隊の横暴', day: '1日目夕', basis: 'diff' }, // 03 copy 5 → 04 copy（成功）／04 copy 2（失敗）／04 copy 4（成功）
  10: { name: '阿片密売を阻止せよ', day: '1日目夜', basis: 'diff' }, // 04 copy 2 → copy 3
  11: { name: '辻斬りを辻斬る', day: '1日目夜', basis: 'diff' }, // 04 copy 4 → copy 5
  12: { name: '代官所潜入', day: '1日目夜', basis: 'diff' }, // 04 copy 4 → 03 copy 6
  2: { name: '簀巻き日和', day: '1日目昼', basis: 'chart' },
  4: { name: '代官所の面々', day: '1日目昼', basis: 'chart' },
  5: { name: '小公女謁見', day: '1日目昼', basis: 'chart' },
  7: { name: '琴吹光探検隊', day: '1日目夕', basis: 'chart' },
  8: { name: '電信あり', day: '1日目夕', basis: 'chart' },
  13: { name: '西洋医学お断り', day: '2日目昼', basis: 'chart' },
  14: { name: '病院廃業の企て', day: '2日目昼', basis: 'chart' },
  15: { name: '病院占拠事件', day: '2日目昼', basis: 'chart' },
  16: { name: '祝　病院開業', day: '2日目昼', basis: 'chart' },
  17: { name: '欺きの代価', day: '2日目昼', basis: 'chart' },
  18: { name: '講師ご到着', day: '2日目夕', basis: 'chart' },
  19: { name: '語学所開設', day: '2日目夕', basis: 'chart' },
  20: { name: 'お団子物語', day: '2日目夕', basis: 'chart' },
  21: { name: '語学無用', day: '2日目夕', basis: 'chart' },
  22: { name: '講師を亡き者に', day: '2日目夕', basis: 'chart' },
  23: { name: 'ガイジンとゲイシャ', day: '2日目夜', basis: 'chart' },
  24: { name: 'ライジングサン', day: '2日目夜', basis: 'chart' },
  25: { name: 'カジノ再建を急げ', day: '2日目夜', basis: 'chart' },
  26: { name: 'カジノを破壊せよ', day: '2日目夜', basis: 'chart' },
  27: { name: 'カジノ再建断固阻止', day: '2日目夜', basis: 'chart' },
  28: { name: '大老　鬼怒川怨仙', day: '3日目昼', basis: 'chart' },
  29: { name: '魔鱗組の力', day: '3日目昼', basis: 'chart' },
  30: { name: '小公女と大老', day: '3日目昼', basis: 'chart' },
  31: { name: '血で血を洗う戦い', day: '3日目昼', basis: 'chart' },
  32: { name: '白昼の激突', day: '3日目昼', basis: 'chart' },
  33: { name: '大老と三姉妹', day: '3日目夕', basis: 'chart' },
  34: { name: '小公女倒れる', day: '3日目夕', basis: 'chart' },
  35: { name: '売国奴を斬れ', day: '3日目夕', basis: 'chart' },
  36: { name: '剣術大会の準備', day: '3日目夜', basis: 'chart' },
  37: { name: '危険な賭け', day: '3日目夜', basis: 'chart' },
  38: { name: '真実', day: '3日目夜', basis: 'chart' },
  39: { name: '仕組まれた襲撃', day: '3日目夜', basis: 'chart' },
  40: { name: '罠を破れ', day: '3日目夜', basis: 'chart' },
  41: { name: '大老の大寄せ', day: '4日目以降', basis: 'chart' },
  42: { name: '公儀の剣', day: '4日目以降', basis: 'chart' }, // ユーザーの一覧では「広儀の剣」。docs/event.md の表記に合わせた
  43: { name: '東国の騎士', day: '4日目以降', basis: 'chart' },
  44: { name: '志士の刀', day: '4日目以降', basis: 'chart' },
  45: { name: '根無し草', day: '4日目以降', basis: 'chart' },
  46: { name: '剣術大会開催', day: '4日目以降', basis: 'chart' },
  51: { name: '覇者となる', day: '4日目以降', basis: 'chart' }, // [U] 2026-10-06
  52: { name: '最後通告', day: '4日目以降', basis: 'chart' },
  53: { name: '闇黒の意志', day: '幕府ルート', basis: 'chart' },
  54: { name: '大老武断', day: '幕府ルート', basis: 'chart' },
  55: { name: '憂国の士', day: '幕府ルート', basis: 'chart' },
  56: { name: '願い虚しく', day: '外国ルート', basis: 'chart' },
  57: { name: '臆病風', day: '攘夷ルート', basis: 'chart' },
  58: { name: '同士救出', day: '攘夷ルート', basis: 'chart' },
  59: { name: '般若党壊滅', day: '幕府ルート', basis: 'chart' },
  60: { name: '黒船を我が手に', day: '幕府ルート', basis: 'chart' },
  61: { name: '鬼怒川の魔手', day: '外国ルート', basis: 'chart' },
  62: { name: '領事館斬り込み', day: '攘夷ルート', basis: 'chart' },
  63: { name: '武士の魂', day: '攘夷ルート', basis: 'chart' },
  64: { name: '三匹で斬る', day: '幕府ルート', basis: 'chart' },
  65: { name: '剣客　茂呂茂', day: '幕府ルート', basis: 'chart' },
  66: { name: '武人　琴吹光', day: '幕府ルート', basis: 'chart' },
  68: { name: '夕暮れの船上', day: '外国ルート', basis: 'chart' },
  69: { name: '討ち入り', day: '外国ルート', basis: 'chart' },
  70: { name: '三姉妹見参', day: '隠しルート', basis: 'chart' },
  71: { name: 'お早い到着', day: '隠しルート', basis: 'chart' },
  72: { name: '再起の望み', day: '隠しルート', basis: 'chart' },
  73: { name: '将の器', day: '隠しルート', basis: 'chart' },
  74: { name: '怒りの矛先', day: '隠しルート', basis: 'chart' },
  75: { name: '伯爵に刺激を', day: '隠しルート', basis: 'chart' },
  76: { name: '運命のルーレット', day: '隠しルート', basis: 'chart' },
  77: { name: '闇討ち', day: '隠しルート', basis: 'chart' },
  78: { name: '学問のすすめ', day: '隠しルート', basis: 'chart' },
  79: { name: '刺激が欲しい', day: '隠しルート', basis: 'chart' },
  80: { name: '傷心の帰国船', day: '隠しルート', basis: 'chart' },
  81: { name: '伯爵救出', day: '隠しルート', basis: 'chart' },
  82: { name: '人間湯通しの恐怖', day: '隠しルート', basis: 'chart' },
  83: { name: '大老暗殺計画', day: '隠しルート', basis: 'chart' },
  85: { name: 'ローラの決意', day: '隠しルート', basis: 'chart' },
  86: { name: '士魂は屈せず', day: '隠しルート', basis: 'chart' },
  87: { name: 'ローラ奪還', day: '隠しルート', basis: 'chart' },
  88: { name: '鬼怒川を追え', day: '隠しルート', basis: 'chart' },
  89: { name: '黒船の決闘', day: '隠しルート', basis: 'chart' },
  90: { name: '希望の光', day: 'エンディング', basis: 'chart' },
  91: { name: '熱き魂', day: 'エンディング', basis: 'chart' },
  92: { name: '攘夷の炎', day: 'エンディング', basis: 'chart' },
  93: { name: '破滅への道', day: 'エンディング', basis: 'chart' },
  94: { name: '変わり往く心', day: 'エンディング', basis: 'chart' },
  95: { name: '海外雄飛', day: 'エンディング', basis: 'chart' },
  96: { name: '侍一直線', day: 'エンディング', basis: 'chart' },
  97: { name: '魔鱗組として', day: 'エンディング', basis: 'chart' }, // docs/event.md に記載なし。エンディングなのは [U] 2026-10-06
  98: { name: '釜茹で侍', day: 'エンディング', basis: 'chart' }, // 同上
  99: { name: '大老は生きていた', day: 'エンディング', basis: 'chart' }, // [U] 2026-10-06
  116: { name: '夜の墓場で', day: '3日目夜', basis: 'chart' }, // [U] 2026-10-06。99 以降で初めて見つかった添字
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

/** 使われている添字：0〜EVENT_USED_COUNT−1 と、それより後で名前の分かる添字（116 など）。昇順 */
export function usedIndices(): number[] {
  const named = Object.keys(EVENT_NAMES).map(Number).filter((i) => i >= EVENT_USED_COUNT)
  return [...Array.from({ length: EVENT_USED_COUNT }, (_, i) => i), ...named.sort((a, b) => a - b)]
}

/** 一括設定の範囲。'named' は EVENT_NAMES の添字、'used' は usedIndices()、'all' は 0〜EVENT_COUNT−1 */
export type BulkScope = 'named' | 'used' | 'all'

export function bulkIndices(scope: BulkScope): number[] {
  if (scope === 'named') return Object.keys(EVENT_NAMES).map(Number)
  if (scope === 'used') return usedIndices()
  return Array.from({ length: EVENT_COUNT }, (_, i) => i)
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
