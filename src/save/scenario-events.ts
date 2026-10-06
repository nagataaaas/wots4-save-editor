// イベントチャートの状態。出典：docs/save_format/chunks/event-chart（[U] 2026-10-05 のシナリオ差分とゲーム内での書き込み確認）、
// イベント名は docs/save_format/datatable/event/event.csv。
//
//   0x36A8〜 u8 × 166  周回中のイベント状態（A）。添字ごとに1イベント。
//                      🟢 通し番号 0〜165（添字＝ゲーム内のイベントID）。166 からは重要人物の状態（characters.ts）
//   0x3838〜 u8 × 166  周回をまたぐ記録（B、🔶 生きた証）。チャートに表示するかどうかを決めていると推定
//
// A の値：
//   FF / 00 未到達。✅ [U] 記録が 04 の代官所潜入で A を FF にすると、チャートでは「未達成」と表示された（2026-10-05）。
//           周回開始時、記録が FF の添字は FF、そうでない添字は 00 になっている（🔶 差分の観察）
//   01 導入を見た    🟢 04 copy 9 → copy 10（剣術大会の準備の導入、添字36）
//   02 参加を決めた  🟢 依頼を受けた。実データでは未確認
//   03 進行中        🟢 03 copy 2 → copy 3（志士との出会いの途中）。会話・移動のあと、戦闘の前
//   04 成功・完了    🟢 海兵隊の横暴（2回再現）ほかの差分
//   05 失敗          ✅ [U] 書き込みでチャートに失敗のマークがついた（2026-10-05）。逃走・主要人物の死亡など
// イベントが始まる条件は、ほとんどが「A ≤ 02」（🟢）。
//
// B の値：
//   FF チャートの枠は出るが、イベント名などが隠れる（✅ [U] 2026-10-06 の説明）。
//      ✅ [U] 記録が FF の阿片密売で A を 05 にしても、名前は隠れたまま失敗扱いになった。
//      ただし A が 04（成功）なら FF でも名前が出る（✅ [U] 2026-10-06）。A が 01・03 のときは ❓
//      枠そのものが出るかどうかは B ではなく別のところで決まる（[U] 2026-10-06：まだ到達したことのない日や、
//      隠しルートに入ったことがない周回では枠が出ない）。位置は ❓（chunks/event-chart）
//   04 イベント名が出る。✅ [U] チャート表示に効くのは FF と 04 だけ（ユーザー確認 2026-10-05）。
//      ✅ [U] 2026-10-06：隠しルートを記録していない周回（01 copy 12）で、状態が 05 の再起の望み（添字72）はチャートに出なかったが、
//      記録を 04 にすると失敗として出た。状態が成功・失敗のどちらでも、記録 04 なら結果どおりに出る。
//      大老暗殺計画（添字83）も記録を 04 にすると出た。
//      ✅ [U] 2026-10-06：隠しルート以外では、記録 FF・状態 05 でもチャートに出る。隠しルートのイベントだけ、記録 FF だと
//      成功（状態 04）以外は枠ごと出ない（隠しルートを過去の周回で記録していない主人公。正規のプレイでも同じ）
//      03 copy の阿片密売（添字10）で A を FF のまま B を FF → 04 にすると、チャートに「未達成」で出た
//   00 ❓ 名無し侍の添字 13・21・24・48 で見た値。チャート表示の値ではない（[U] 2026-10-05）ので、読むだけで選択肢には出さない
//
// ❓ U-1 判定待ちのため [TS] の固定オフセット（案A）の位置で読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU8, writeU8 } from './binary'
import { checkLayout } from './hero'

export const EVENT_STATE_OFFSET = 0x36a8 // 🟢 chunks/event-chart（通し番号 0）
export const EVENT_RECORD_OFFSET = 0x3838 // 🔶 chunks/event-chart
export const EVENT_COUNT = 166 // 🟢 chunks/event-chart（通し番号 166 から重要人物の状態）

/**
 * 周回中の状態（A）。confirmed は書き込みでゲーム内の表示を確かめたもの。
 * 01〜04 の意味は 🟢（chunks/event-chart）
 */
export const EVENT_STATES = [
  { value: 0x00, label: '未到達', confirmed: false },
  { value: 0xff, label: '未到達（FF）', confirmed: true },
  { value: 0x01, label: '導入を見た', confirmed: false },
  { value: 0x02, label: '参加を決めた', confirmed: false },
  { value: 0x03, label: '進行中', confirmed: false },
  { value: 0x04, label: '成功', confirmed: false },
  { value: 0x05, label: '失敗', confirmed: true },
] as const

/**
 * 周回をまたぐ記録（B）のうち、チャート表示に効く値。✅ [U] 2026-10-05。
 * FF は枠だけ出て名前が隠れる。FF でも状態が成功（04）なら名前が出る（✅ [U] 2026-10-06）。枠が出るかどうかは B では決まらない
 */
export const EVENT_RECORDS = [
  { value: 0xff, label: '名前を隠す（成功なら出る）' },
  { value: 0x04, label: '名前を出す' },
] as const

/** 読み込み時に妥当とみなす値。EVENT_STATES と同じ */
const PLAUSIBLE_STATES = new Set([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0xff])

export type EventName = {
  name: string
  day: string
  /**
   * 'chart'＝ゲーム内のチャートで添字とイベントの対応を確認（✅ [U] 2026-10-05）、
   * 'game'＝差分の観察で添字とイベントの対応を確認（🟢）
   */
  basis: 'chart' | 'game'
}

/**
 * 名前の分かっている添字。docs/save_format/datatable/event/event.csv。day は docs/event.md（Wiki）の時間帯。
 * 2〜46 の名前はユーザーがゲーム内のチャートで確かめた（[U] 2026-10-05）。52〜98 も同じ（[U] 2026-10-06）。
 * 4日目以降のイベントの day は時間帯ではなく、docs/event.md の節（ルート・エンディング）を入れる。
 * 51・99・116 も [U] 2026-10-06。名前はゲーム内の表記に合わせる（🟢）。
 *
 * 画面のイベント一覧に出すのはここにある添字だけ（ユーザー判断 2026-10-06）。覚え書き：
 *   47〜50・67・84  チャートに出ない・起きない添字。フラグ確認用に画面の下にまとめて出す（EVENT_GAP_NOTES）
 *   100〜165（116 以外）🟢 対応するイベントがない。表示しない
 */
export const EVENT_NAMES: Readonly<Record<number, EventName>> = {
  0: { name: '船上の侍', day: '1日目昼', basis: 'game' }, // どのセーブでも 04（Samurai on Board、オープニング）
  1: { name: '阿弥浜港争乱', day: '1日目昼', basis: 'game' }, // スキップで 00、1周目で 04
  3: { name: '嵐のあと', day: '1日目昼', basis: 'game' }, // 差分 03 copy → copy 2。Wiki の表記は「嵐の後」
  6: { name: '志士との出会い', day: '1日目昼', basis: 'game' }, // 差分 03 copy 2 → copy 3 → copy 4
  9: { name: '海兵隊の横暴', day: '1日目夕', basis: 'game' }, // 差分 03 copy 5 → 04 copy（成功）／04 copy 2（失敗）／04 copy 4（成功）
  10: { name: '阿片密売を阻止せよ', day: '1日目夜', basis: 'game' }, // 差分 04 copy 2 → copy 3
  11: { name: '辻斬りを辻斬る', day: '1日目夜', basis: 'game' }, // 差分 04 copy 4 → copy 5
  12: { name: '代官所潜入', day: '1日目夜', basis: 'game' }, // 差分 04 copy 4 → 03 copy 6
  2: { name: '簀巻き日和', day: '1日目昼', basis: 'chart' },
  4: { name: '代官所の面々', day: '1日目昼', basis: 'chart' },
  5: { name: '小公女謁見', day: '1日目昼', basis: 'chart' },
  7: { name: '琴吹光探検隊', day: '1日目夕', basis: 'chart' },
  8: { name: '電信あり', day: '1日目夕', basis: 'chart' },
  13: { name: '西洋医学お断り', day: '2日目昼', basis: 'chart' },
  14: { name: '病院廃業の企て', day: '2日目昼', basis: 'chart' },
  15: { name: '病院占拠事件', day: '2日目昼', basis: 'chart' },
  16: { name: '祝 病院開業', day: '2日目昼', basis: 'chart' },
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
  65: { name: '剣客 茂呂茂', day: '幕府ルート', basis: 'chart' },
  66: { name: '武人 琴吹光', day: '幕府ルート', basis: 'chart' },
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

/**
 * 記録（B）で見たが、チャート表示への効き方を確かめていない値。上級者モードでだけ選べる。
 *   05 ❓ 02 copy（過去の周回で隠しルートを記録した主人公）の再起の望み（添字72）。
 *      ✅（否定）[U] 2026-10-06：01 copy 12（状態 05）で書いても、再起の望みはチャートに出なかった。04 を書くと失敗として出た
 *   03 ❓ 00 の志士との出会い（添字6）
 *   00 ❓ 名無し侍の添字 13・21・24・48
 * 🔶 B は通し番号では 400＋添字に当たる（chunks/event-chart）
 */
export const EVENT_RECORDS_SEEN = [
  { value: 0x05, label: '不明（05。書いてもチャートに出なかった）' },
  { value: 0x03, label: '不明（03）' },
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

/**
 * 名前の付いた添字（0〜99）の間の欠番。チャートに出ない・起きないので、イベント一覧には入れない。
 * フラグ確認用に、イベント一覧とは別に画面の下へまとめて出す（ユーザー判断 2026-10-06）。一括設定の対象にはしない
 *   47〜50 🟢 剣術大会（幕府／外国／攘夷／無所属）。チャートには出ない
 *   67     悲しみのローラ。未実装のイベントとみられる（[U] 2026-10-06）
 *   84     ❓ どのイベントか不明（85 ローラの決意と対になるイベントとみられる）
 */
export const EVENT_GAP_NOTES: Readonly<Record<number, { name: string | null; note: string }>> = {
  47: { name: '剣術大会（幕府）', note: 'チャートには出ない' },
  48: { name: '剣術大会（外国）', note: 'チャートには出ない' },
  49: { name: '剣術大会（攘夷）', note: 'チャートには出ない' },
  50: { name: '剣術大会（無所属）', note: 'チャートには出ない' },
  67: { name: '悲しみのローラ', note: '未実装のイベントとみられる（ゲームでは起きない）' },
  84: { name: null, note: 'どのイベントか不明（隠しルートの4日目以降、ローラの決意の別の分岐か）' },
}

/** EVENT_GAP_NOTES の添字。昇順 */
export const EVENT_GAP_INDICES: readonly number[] = Object.keys(EVENT_GAP_NOTES)
  .map(Number)
  .sort((a, b) => a - b)

/** イベントと対応のついた添字（EVENT_NAMES のキー）。昇順 */
export function namedIndices(): number[] {
  return Object.keys(EVENT_NAMES)
    .map(Number)
    .sort((a, b) => a - b)
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
