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
import { checkLayout } from './hero'
import { eventLabelId } from './master/label-types'
import { eventLabel, findLabel } from './master/labels'

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
  { value: 0x02, label: '断った・保留した', confirmed: false },
  { value: 0x03, label: '引き受けた・進行中', confirmed: false },
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

/** イベント一覧の1行。名前はイベントの表（master/event-names.ts）から通し番号で引く（eventLabel） */
export type EventListEntry = {
  day: string
  /**
   * 'chart'＝ゲーム内のチャートで添字とイベントの対応を確認（✅ [U] 2026-10-05）、
   * 'game'＝差分の観察で添字とイベントの対応を確認（🟢）
   */
  basis: 'chart' | 'game'
}

/**
 * 名前の分かっている添字。名前は docs/save_format/datatable/event/event.csv。day は docs/event.md（Wiki）の時間帯。
 * 行末のコメントの名前は読みやすさのための写しで、表示には使わない。
 * 2〜46 の名前はユーザーがゲーム内のチャートで確かめた（[U] 2026-10-05）。52〜98 も同じ（[U] 2026-10-06）。
 * 4日目以降のイベントの day は時間帯ではなく、docs/event.md の節（ルート・エンディング）を入れる。
 * 51・99・116 も [U] 2026-10-06。名前はゲーム内の表記に合わせる（🟢）。
 *
 * 画面のイベント一覧に出すのはここにある添字だけ（ユーザー判断 2026-10-06）。覚え書き：
 *   47〜50・67・84  チャートに出ない・起きない添字。フラグ確認用に画面の下にまとめて出す（EVENT_GAP_NOTES）
 *   100〜165（116 以外）🟢 対応するイベントがない。表示しない
 *     102 ガイジンとゲイシャで「102 = 3」のときの別の会話があるが、値を書く場面がない（使われていない。🟢）
 */
export const EVENT_LIST: Readonly<Record<number, EventListEntry>> = {
  0: { day: '1日目昼', basis: 'game' }, // 船上の侍。どのセーブでも 04（Samurai on Board、オープニング）
  1: { day: '1日目昼', basis: 'game' }, // 阿弥浜港争乱。スキップで 00、1周目で 04
  3: { day: '1日目昼', basis: 'game' }, // 嵐のあと。差分 03 copy → copy 2。Wiki の表記は「嵐の後」
  6: { day: '1日目昼', basis: 'game' }, // 志士との出会い。差分 03 copy 2 → copy 3 → copy 4
  9: { day: '1日目夕', basis: 'game' }, // 海兵隊の横暴。差分 03 copy 5 → 04 copy（成功）／04 copy 2（失敗）／04 copy 4（成功）
  10: { day: '1日目夜', basis: 'game' }, // 阿片密売を阻止せよ。差分 04 copy 2 → copy 3
  11: { day: '1日目夜', basis: 'game' }, // 辻斬りを辻斬る。差分 04 copy 4 → copy 5
  12: { day: '1日目夜', basis: 'game' }, // 代官所潜入。差分 04 copy 4 → 03 copy 6
  2: { day: '1日目昼', basis: 'chart' }, // 簀巻き日和
  4: { day: '1日目昼', basis: 'chart' }, // 代官所の面々
  5: { day: '1日目昼', basis: 'chart' }, // 小公女謁見
  7: { day: '1日目夕', basis: 'chart' }, // 琴吹光探検隊
  8: { day: '1日目夕', basis: 'chart' }, // 電信あり
  13: { day: '2日目昼', basis: 'chart' }, // 西洋医学お断り
  14: { day: '2日目昼', basis: 'chart' }, // 病院廃業の企て
  15: { day: '2日目昼', basis: 'chart' }, // 病院占拠事件
  16: { day: '2日目昼', basis: 'chart' }, // 祝 病院開業
  17: { day: '2日目昼', basis: 'chart' }, // 欺きの代価
  18: { day: '2日目夕', basis: 'chart' }, // 講師ご到着
  19: { day: '2日目夕', basis: 'chart' }, // 語学所開設
  20: { day: '2日目夕', basis: 'chart' }, // お団子物語
  21: { day: '2日目夕', basis: 'chart' }, // 語学無用
  22: { day: '2日目夕', basis: 'chart' }, // 講師を亡き者に
  23: { day: '2日目夜', basis: 'chart' }, // ガイジンとゲイシャ
  24: { day: '2日目夜', basis: 'chart' }, // ライジングサン
  25: { day: '2日目夜', basis: 'chart' }, // カジノ再建を急げ
  26: { day: '2日目夜', basis: 'chart' }, // カジノを破壊せよ
  27: { day: '2日目夜', basis: 'chart' }, // カジノ再建断固阻止
  28: { day: '3日目昼', basis: 'chart' }, // 大老 鬼怒川怨仙
  29: { day: '3日目昼', basis: 'chart' }, // 魔鱗組の力
  30: { day: '3日目昼', basis: 'chart' }, // 小公女と大老
  31: { day: '3日目昼', basis: 'chart' }, // 血で血を洗う戦い
  32: { day: '3日目昼', basis: 'chart' }, // 白昼の激突
  33: { day: '3日目夕', basis: 'chart' }, // 大老と三姉妹
  34: { day: '3日目夕', basis: 'chart' }, // 小公女倒れる
  35: { day: '3日目夕', basis: 'chart' }, // 売国奴を斬れ
  36: { day: '3日目夜', basis: 'chart' }, // 剣術大会の準備
  37: { day: '3日目夜', basis: 'chart' }, // 危険な賭け
  38: { day: '3日目夜', basis: 'chart' }, // 真実
  39: { day: '3日目夜', basis: 'chart' }, // 仕組まれた襲撃
  40: { day: '3日目夜', basis: 'chart' }, // 罠を破れ
  41: { day: '4日目以降', basis: 'chart' }, // 大老の大寄せ
  42: { day: '4日目以降', basis: 'chart' }, // 公儀の剣。ユーザーの一覧では「広儀の剣」。docs/event.md の表記に合わせた
  43: { day: '4日目以降', basis: 'chart' }, // 東国の騎士
  44: { day: '4日目以降', basis: 'chart' }, // 志士の刀
  45: { day: '4日目以降', basis: 'chart' }, // 根無し草
  46: { day: '4日目以降', basis: 'chart' }, // 剣術大会開催
  51: { day: '4日目以降', basis: 'chart' }, // 覇者となる。[U] 2026-10-06
  52: { day: '4日目以降', basis: 'chart' }, // 最後通告
  53: { day: '幕府ルート', basis: 'chart' }, // 闇黒の意志
  54: { day: '幕府ルート', basis: 'chart' }, // 大老武断
  55: { day: '幕府ルート', basis: 'chart' }, // 憂国の士
  56: { day: '外国ルート', basis: 'chart' }, // 願い虚しく
  57: { day: '攘夷ルート', basis: 'chart' }, // 臆病風
  58: { day: '攘夷ルート', basis: 'chart' }, // 同士救出
  59: { day: '幕府ルート', basis: 'chart' }, // 般若党壊滅
  60: { day: '幕府ルート', basis: 'chart' }, // 黒船を我が手に
  61: { day: '外国ルート', basis: 'chart' }, // 鬼怒川の魔手
  62: { day: '攘夷ルート', basis: 'chart' }, // 領事館斬り込み
  63: { day: '攘夷ルート', basis: 'chart' }, // 武士の魂
  64: { day: '幕府ルート', basis: 'chart' }, // 三匹で斬る
  65: { day: '幕府ルート', basis: 'chart' }, // 剣客 茂呂茂
  66: { day: '幕府ルート', basis: 'chart' }, // 武人 琴吹光
  68: { day: '外国ルート', basis: 'chart' }, // 夕暮れの船上
  69: { day: '外国ルート', basis: 'chart' }, // 討ち入り
  70: { day: '真ルート', basis: 'chart' }, // 三姉妹見参
  71: { day: '真ルート', basis: 'chart' }, // お早い到着
  72: { day: '真ルート', basis: 'chart' }, // 再起の望み
  73: { day: '真ルート', basis: 'chart' }, // 将の器
  74: { day: '真ルート', basis: 'chart' }, // 怒りの矛先
  75: { day: '真ルート', basis: 'chart' }, // 伯爵に刺激を
  76: { day: '真ルート', basis: 'chart' }, // 運命のルーレット
  77: { day: '真ルート', basis: 'chart' }, // 闇討ち
  78: { day: '真ルート', basis: 'chart' }, // 学問のすすめ
  79: { day: '真ルート', basis: 'chart' }, // 刺激が欲しい
  80: { day: '真ルート', basis: 'chart' }, // 傷心の帰国船
  81: { day: '真ルート', basis: 'chart' }, // 伯爵救出
  82: { day: '真ルート', basis: 'chart' }, // 人間湯通しの恐怖
  83: { day: '真ルート', basis: 'chart' }, // 大老暗殺計画
  85: { day: '真ルート', basis: 'chart' }, // ローラの決意
  86: { day: '真ルート', basis: 'chart' }, // 士魂は屈せず
  87: { day: '真ルート', basis: 'chart' }, // ローラ奪還
  88: { day: '真ルート', basis: 'chart' }, // 鬼怒川を追え
  89: { day: '真ルート', basis: 'chart' }, // 黒船の決闘
  90: { day: 'エンディング', basis: 'chart' }, // 希望の光
  91: { day: 'エンディング', basis: 'chart' }, // 熱き魂
  92: { day: 'エンディング', basis: 'chart' }, // 攘夷の炎
  93: { day: 'エンディング', basis: 'chart' }, // 破滅への道
  94: { day: 'エンディング', basis: 'chart' }, // 変わり往く心
  95: { day: 'エンディング', basis: 'chart' }, // 海外雄飛
  96: { day: 'エンディング', basis: 'chart' }, // 侍一直線
  97: { day: 'エンディング', basis: 'chart' }, // 魔鱗組として。docs/event.md に記載なし。エンディングなのは [U] 2026-10-06
  98: { day: 'エンディング', basis: 'chart' }, // 釜茹で侍。同上
  99: { day: 'エンディング', basis: 'chart' }, // 大老は生きていた。[U] 2026-10-06
  116: { day: '3日目夜', basis: 'chart' }, // 夜の墓場で。[U] 2026-10-06。99 以降で初めて見つかった添字
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
 *   05 ❓ 02 copy（過去の周回で真ルートを記録した主人公）の再起の望み（添字72）。
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
 *   47〜50 🟢 剣術大会（幕府／外国／攘夷／無所属）。チャートには出ない。
 *          出場した勢力の1つだけが 03 になり、優勝で 04、負け・降参で 05（🟢）
 *   67     悲しみのローラ。未実装のイベントとみられる（[U] 2026-10-06）
 *   84     🟢 名前不明。ローラの決意（85）の前半の導入。人間湯通しの恐怖に続く場面が始まると 04 になり、
 *          85 の開始条件が「84 = 04」。チャートには名前が出ない
 */
const TOURNAMENT_NOTE = 'チャートには出ない。出場した勢力だけ 03、優勝で 04、負け・降参で 05'
const LAURA_RESOLVE = 85 // ローラの決意
export const EVENT_GAP_NOTES: Readonly<Record<number, { name: string | null; note: string }>> = {
  47: { name: eventNameOf(47), note: TOURNAMENT_NOTE },
  48: { name: eventNameOf(48), note: TOURNAMENT_NOTE },
  49: { name: eventNameOf(49), note: TOURNAMENT_NOTE },
  50: { name: eventNameOf(50), note: TOURNAMENT_NOTE },
  67: { name: eventNameOf(67), note: '未実装のイベントとみられる（ゲームでは起きない）' },
  84: {
    name: `（名前不明。${eventNameOf(LAURA_RESOLVE)}の導入）`,
    note: `チャートには出ない。場面が始まると 04 になり、${eventNameOf(LAURA_RESOLVE)}（${LAURA_RESOLVE}）の開始条件が「84 = 04」`,
  },
}

/** EVENT_GAP_NOTES の添字。昇順 */
export const EVENT_GAP_INDICES: readonly number[] = Object.keys(EVENT_GAP_NOTES)
  .map(Number)
  .sort((a, b) => a - b)

/** イベントと対応のついた添字（EVENT_LIST のキー）。昇順 */
export function namedIndices(): number[] {
  return Object.keys(EVENT_LIST)
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
