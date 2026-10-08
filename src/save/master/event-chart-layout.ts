// イベントチャート（スタートメニュー「状況」）の枠の配置と、枠をつなぐ線。
// 出典：ゲーム画面のスクリーンショット（[U] 2026-10-07、全イベントが出た周回のチャート）から列・段を書き起こした。
// 枠の名前とイベントの通し番号は chart-nodes.ts（🟢）から引く。
//
// - 列は 0〜23（左から。列 17 は枠のない列）、段は 0〜10（上から）。座標の単位は列・段で、描く側が px に直す
// - 線をどう出し分けているかは ❓ なので、線は常に全部描く（ユーザー判断 2026-10-07）
// - 1つのイベントが複数のノードを持つもののうち、スクリーンショットに出ていないノードは描かない：
//   大老 鬼怒川怨仙 73・74・115、学問のすすめ 117、町の薬師 39、小公女倒れる 40、闇討ち ～小暮捜索 30、
//   大老暗殺計画 57・61・67・68・69・70、士魂は屈せず 75、願い虚しく 100・116、討ち入り 79、悲しみのローラ 54（未実装とみられる）
// 名前の表示は共通ラベル層から引く。
import { CHART_NODES } from './chart-nodes'
import { chartNodeLabel } from './labels'

/** 枠の色。スクリーンショットの塗りの色（勢力）に合わせる */
export type ChartBoxKind = 'prajna' | 'shogunate' | 'foreigners' | 'other' | 'best'

export type ChartBox = {
  /** chart-nodes.ts のノード番号 */
  node: number
  col: number
  row: number
  kind: ChartBoxKind
  /**
   * 1〜3日目の勢力イベントの日と時間帯（0＝昼・1＝夕・2＝夜）。時間帯が過ぎると未処理でも失敗と出る（✅ [U] 2026-10-05）。
   * どのイベントがこの規則に当たるかは 🔶（確かめたのは1〜2日目の勢力イベント）
   */
  day?: 1 | 2 | 3
  slot?: 0 | 1 | 2
}

/**
 * 枠を線でつなぐ。from の各枠の右端から、出発の列のすぐ右の縦の線へ出て、to の各枠の段まで縦に進み、左端へ入る。
 * 横の線が途中の枠に重ならないように、つなぐ枠を選んである（テストで確かめる）
 */
export type ChartLink = {
  from: readonly number[]
  to: readonly number[]
}

export const CHART_COLS = 24
export const CHART_ROWS = 11

type Row = readonly [node: number, col: number, row: number, kind: ChartBoxKind, day?: 1 | 2 | 3, slot?: 0 | 1 | 2]

const P = 'prajna'
const S = 'shogunate'
const F = 'foreigners'
const O = 'other'
const H = 'best'

const ROWS: readonly Row[] = [
  // 1日目
  [78, 0, 0, O], // 船上の侍
  [83, 1, 0, O], // 阿弥浜港争乱
  [89, 1, 2, O], // 嵐のあと
  [2, 2, 0, P, 1, 0], // 志士との出会い
  [3, 2, 2, S, 1, 0], // 代官所の面々
  [4, 2, 4, F, 1, 0], // 小公女謁見
  [55, 2, 6, O], // 簀巻き日和
  [56, 2, 8, H], // 三姉妹見参
  [5, 3, 0, P, 1, 1], // 海兵隊の横暴
  [6, 3, 2, S, 1, 1], // 琴吹光探検隊
  [7, 3, 4, F, 1, 1], // 電信あり
  [90, 3, 8, H], // お早い到着
  [8, 4, 0, P, 1, 2], // 代官所潜入
  [9, 4, 2, S, 1, 2], // 阿片密売を阻止せよ
  [10, 4, 4, F, 1, 2], // 辻斬りを辻斬る
  [11, 4, 8, H], // 再起の望み
  // 2日目
  [12, 5, 0, P, 2, 0], // 欺きの代価
  [13, 5, 2, S, 2, 0], // 西洋医学お断り
  [14, 5, 3, S, 2, 0], // 病院廃業の企て
  [15, 5, 4, F, 2, 0], // 病院占拠事件
  [16, 5, 5, F, 2, 0], // 祝 病院開業
  [17, 5, 8, H], // 将の器
  [18, 5, 9, H], // 怒りの矛先
  [19, 6, 0, P, 2, 1], // 語学無用
  [20, 6, 1, P, 2, 1], // 講師を亡き者に
  [21, 6, 2, S, 2, 1], // 講師ご到着
  [22, 6, 3, S, 2, 1], // 語学所開設
  [23, 6, 4, F, 2, 1], // お団子物語
  [81, 6, 8, H], // 伯爵に刺激を
  [24, 6, 9, H], // 運命のルーレット
  [25, 7, 0, P, 2, 2], // カジノを破壊せよ
  [58, 7, 1, P, 2, 2], // カジノ再建断固阻止
  [26, 7, 2, S, 2, 2], // ガイジンとゲイシャ
  [27, 7, 4, F, 2, 2], // ライジングサン
  [28, 7, 5, F, 2, 2], // カジノ再建を急げ
  [29, 7, 8, H], // 闇討ち
  // 3日目
  [86, 8, 0, O], // 大老 鬼怒川怨仙
  [35, 8, 8, H], // 学問のすすめ
  [31, 9, 0, P, 3, 0], // 血で血を洗う戦い
  [33, 9, 2, S, 3, 0], // 魔鱗組の力
  [34, 9, 4, F, 3, 0], // 小公女と大老
  [32, 9, 6, O], // 白昼の激突
  [62, 10, 0, P, 3, 1], // 売国奴を斬れ
  [41, 10, 2, S, 3, 1], // 大老と三姉妹
  [38, 10, 4, F, 3, 1], // 小公女倒れる
  [36, 10, 8, H], // 刺激が欲しい
  [37, 10, 9, H], // 傷心の帰国船
  [72, 11, 0, P, 3, 2], // 夜の墓場で
  [71, 11, 1, P, 3, 2], // 真実
  [42, 11, 8, H], // 伯爵救出
  [76, 12, 0, P, 3, 2], // 仕組まれた襲撃
  [77, 12, 1, P, 3, 2], // 罠を破れ
  [63, 12, 2, S, 3, 2], // 剣術大会の準備
  [43, 12, 4, F, 3, 2], // 危険な賭け
  // 4日目以降
  [88, 13, 0, O], // 大老の大寄せ
  [45, 13, 8, H], // 人間湯通しの恐怖
  [44, 13, 10, H], // 大老暗殺計画
  [95, 14, 0, P], // 志士の刀
  [91, 14, 2, S], // 公儀の剣
  [93, 14, 4, F], // 東国の騎士
  [97, 14, 6, O], // 根無し草
  [98, 15, 0, O], // 剣術大会開催
  [102, 16, 0, O], // 覇者となる
  [46, 16, 5, O], // 最後通告
  [47, 16, 8, H], // ローラの決意
  [66, 18, 0, P], // 臆病風
  [65, 18, 2, S], // 闇黒の意志
  [50, 18, 4, F], // 願い虚しく
  [48, 18, 8, H], // 士魂は屈せず
  [110, 19, 0, P], // 同士救出
  [84, 19, 2, S], // 大老武断
  [85, 19, 3, S], // 憂国の士
  [64, 19, 4, F], // 鬼怒川の魔手
  [49, 19, 8, H], // ローラ奪還
  [105, 20, 0, P], // 領事館斬り込み
  [80, 20, 2, S], // 般若党壊滅
  [82, 20, 3, S], // 三匹で斬る
  [60, 20, 4, F], // 夕暮れの船上
  [51, 20, 8, H], // 鬼怒川を追え
  [103, 21, 0, P], // 武士の魂
  [111, 21, 2, S], // 黒船を我が手に
  [59, 21, 5, F], // 討ち入り
  [52, 21, 8, H], // 黒船の決闘
  [87, 22, 2, S], // 剣客 茂呂茂
  [112, 22, 3, S], // 武人 琴吹光
  // エンディング
  [96, 23, 0, P], // 攘夷の炎
  [94, 23, 1, P], // 熱き魂
  [99, 23, 2, S], // 破滅への道
  [101, 23, 3, S], // 変わり往く心
  [104, 23, 4, F], // 海外雄飛
  [106, 23, 5, F], // 侍一直線
  [107, 23, 6, O], // 魔鱗組として
  [108, 23, 7, O], // 釜茹で侍
  [92, 23, 8, H], // 希望の光
  [109, 23, 10, H], // 大老は生きていた
]

/** スクリーンショットに出ている枠（ノード番号の重複なし） */
export const CHART_BOXES: readonly ChartBox[] = ROWS.map(([node, col, row, kind, day, slot]) =>
  day === undefined ? { node, col, row, kind } : { node, col, row, kind, day, slot },
)

/** スクリーンショットの線。分岐の意味は docs/event.md のイベントチャート */
export const CHART_LINKS: readonly ChartLink[] = [
  // 1日目
  { from: [78], to: [83, 89] },
  { from: [83, 89], to: [2, 3, 4, 55, 56] },
  { from: [2, 3, 4, 55], to: [5, 6, 7] },
  { from: [5, 6, 7], to: [8, 9, 10] },
  // 2日目
  { from: [8, 9, 10], to: [12, 13, 14, 15, 16] },
  { from: [12, 13, 14, 15, 16], to: [19, 20, 21, 22, 23] },
  { from: [19, 20, 21, 22, 23], to: [25, 58, 26, 27, 28] },
  // 3日目
  { from: [25, 58, 26, 27, 28], to: [86] },
  { from: [86], to: [31, 33, 34, 32] },
  { from: [31, 33, 34, 32], to: [62, 41, 38] },
  { from: [62, 41, 38], to: [72, 71, 63, 43] },
  { from: [72, 71], to: [76, 77] },
  // 4日目以降
  { from: [76, 77, 63, 43], to: [88] },
  { from: [88], to: [95, 91, 93, 97] },
  { from: [95, 91, 93, 97], to: [98] },
  { from: [98], to: [102, 46] },
  { from: [98], to: [107] },
  { from: [102], to: [66, 65, 50] },
  { from: [102], to: [108] },
  // 攘夷
  { from: [66], to: [110] },
  { from: [110], to: [105] },
  { from: [105], to: [103, 94] },
  { from: [103], to: [96] },
  // 幕府
  { from: [65], to: [84, 85] },
  { from: [84], to: [80] },
  { from: [80], to: [111] },
  { from: [111], to: [87] },
  { from: [87], to: [99] },
  { from: [85], to: [82] },
  { from: [82], to: [112] },
  { from: [112], to: [101] },
  // 外国
  { from: [50], to: [64] },
  { from: [64], to: [60, 59] },
  { from: [60], to: [104] },
  { from: [59], to: [106] },
  // 真ルート
  { from: [56], to: [90] },
  { from: [90], to: [11] },
  { from: [11], to: [17, 18] },
  { from: [17, 18], to: [81, 24] },
  { from: [18], to: [44] },
  { from: [81, 24], to: [29] },
  { from: [29], to: [35] },
  { from: [35], to: [36, 37] },
  { from: [36], to: [42] },
  { from: [37], to: [44] },
  { from: [42], to: [45] },
  { from: [45], to: [47] },
  { from: [47], to: [48] },
  { from: [48], to: [49] },
  { from: [49], to: [51] },
  { from: [51], to: [52] },
  { from: [52], to: [92] },
  { from: [44], to: [109] },
]

/** ノード番号から、そのノードのイベントの通し番号（0x36A8 + n の n）。chart-nodes.ts にないノードは null */
export function boxEventId(box: ChartBox): number | null {
  return CHART_NODES[box.node]?.eventId ?? null
}

/** ノード番号から、チャートに出す名前 */
export function boxName(box: ChartBox): string {
  const node = CHART_NODES[box.node]
  return node ? chartNodeLabel(node) : `ノード ${box.node}`
}

/** 列の幅を 1 としたときの枠の幅（スクリーンショットでは列の間隔 約82px に対して枠 約68px） */
export const BOX_WIDTH = 0.83
/** 段の高さを 1 としたときの枠の高さ */
export const BOX_HEIGHT = 0.8

const boxByNode = new Map(CHART_BOXES.map((b) => [b.node, b]))

/** ノード番号から枠。CHART_BOXES にないノードは undefined */
export function chartBox(node: number): ChartBox | undefined {
  return boxByNode.get(node)
}

/** 線分1本（列・段の単位）。from・to は横の線がつなぐ枠のノード番号（縦の線は null） */
export type ChartSegment = { x1: number; y1: number; x2: number; y2: number; node: number | null }

/**
 * 線を線分に分ける（列・段の単位。y は段の中央）。
 * 出発の枠の右端 → 出発の列のすぐ右の縦の線 → 到着の枠の段で横に → 到着の枠の左端
 */
export function linkSegments(link: ChartLink): ChartSegment[] {
  const from = link.from.map((n) => boxByNode.get(n)).filter((b) => b !== undefined)
  const to = link.to.map((n) => boxByNode.get(n)).filter((b) => b !== undefined)
  if (!from.length || !to.length) return []
  const busX = Math.max(...from.map((b) => b.col)) + BOX_WIDTH + (1 - BOX_WIDTH) / 2
  const ys = [...from, ...to].map((b) => b.row + 0.5)
  const segments: ChartSegment[] = [
    { x1: busX, y1: Math.min(...ys), x2: busX, y2: Math.max(...ys), node: null },
  ]
  for (const b of from) segments.push({ x1: b.col + BOX_WIDTH, y1: b.row + 0.5, x2: busX, y2: b.row + 0.5, node: b.node })
  for (const b of to) segments.push({ x1: busX, y1: b.row + 0.5, x2: b.col, y2: b.row + 0.5, node: b.node })
  return segments
}
