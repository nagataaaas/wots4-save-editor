// 侍評価と活動記録。出典：docs/save_format/chunks/stats（0x0B34〜0x0C63、🟢）。
//
//   0x0B34 f32        侍度の最高値 🟢          0x0B38 f32  侍度（最後の評価）🟢（0〜120）
//   0x0B40 u32        今回の評価で得る侍点 🟢（結果画面で侍点 0x0B3C に足して 0 に戻す）
//   0x0B44・0x0B48    侍度の分子・分母 🟢（評価のときに計算し直す）
//   0x0B4C u32 × 16   行動の回数 🟢（i 1・2 の場面の細部は 🔶、i 8・11〜15 は使われていない）
//   0x0B90・0x0B94    プレイ時間（秒）周回中・累計 🟢
//   0x0B98 u32        死亡したときの段階 🟢
//   0x0B9C u16 × 15   称号ごとの獲得回数 🟢
//   0x0BBC u32        最短クリア時間（秒）🟢
//   0x0BC0・0x0BC4 f32 移動距離 周回中・累計 🟢
//   0x0BC8・0x0BCC    斬殺数 周回中・累計 🟢
//   0x0BD0・0x0BD4    最高連斬数 周回中・累計 🟢
//   0x0BDC・0x0C20 u32 × 17  人物の種類ごとに与えた痛手の合計 周回中・累計 🟢（15 暗闇脳天・16 魔鱗組）
//
// 侍点 0x0B3C は hero.ts、周回数 0x0B8C は cycle-counts.ts、経過日数 0x0BD8 は scenario-date.ts、
// 周回の終わり方 0x0BBA は new-cycle.ts が扱うので、ここには入れない。
// 上限はゲームが値を増やすときの上限（🟢）。通常モードはそこまで、上級者モードは型で書ける範囲まで受け付ける。
// 固定オフセットで読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readF32, readU16, readU32, writeF32, writeU16, writeU32 } from './binary'
import { checkLayout } from './hero'

export type StatType = 'u16' | 'u32' | 'f32'

export type StatField = {
  /** 一意の名前（UI の key） */
  key: string
  offset: number
  type: StatType
  label: string
  /** 画面のまとまり */
  group: StatGroupId
  /** 通常モードの上限（ゲームが値を増やすときの上限など） */
  max: number
  /** どんな値か・いつ増えるか（UI の丸ハテナ） */
  note: string
  /** 秒・距離など、値の見せ方 */
  unit?: 'seconds' | 'distance'
}

export type StatGroupId = 'evaluation' | 'actions' | 'titles' | 'time' | 'combat' | 'damage'

// note はカードの説明（画面に出す概要）。
// 侍度・分子・分母・得る侍点は評価のときに計算し直される。評価の結果画面の「不適切な行動」は行動の回数の最初の 4 項目の合計で、行動の回数は周回の終わりに 0。
// 称号の欄は評価のたびに 1 増え、周回をまたいで残る。移動距離・斬殺数の周回中の値は周回の終わりに 0、累計は残る
export const STAT_GROUPS: readonly { id: StatGroupId; label: string; note: string }[] = [
  { id: 'evaluation', label: '侍評価', note: '周回の終わりの評価画面で使う値です。' },
  { id: 'actions', label: '行動の回数', note: '侍度の計算に使う、侍らしい行動・恥ずかしい行動などの回数です。' },
  { id: 'titles', label: '称号ごとの獲得回数', note: '評価でそれぞれの称号を得た回数です。' },
  { id: 'time', label: 'プレイ時間', note: '周回中・累計などのプレイ時間（秒）です。' },
  { id: 'combat', label: '移動距離・斬殺数', note: '移動距離・斬殺数・連斬の記録です。' },
  {
    id: 'damage',
    label: '人物ごとに与えた痛手',
    note: '人物の種類ごとに与えた痛手の合計です。いちばん多い人物が「不倶戴天の敵」になります。',
  },
]

/** 🟢 行動の回数の上限 */
export const ACTION_COUNT_MAX = 9_999
/** 🟢 プレイ時間の上限（9999:59:59） */
export const PLAY_TIME_MAX = 35_999_999
/** 🟢 侍度の上限 */
export const SAMURAI_DEGREE_MAX = 120

/** 🟢 行動の回数 0x0B4C + 4 × i。使われていない i（8・11〜15）は載せない */
export const ACTION_COUNTS: readonly { index: number; label: string; note: string }[] = [
  { index: 0, label: '人が落とした持ち物を拾った', note: '主人公が拾ったときだけ数える。不適切な行動に数える' },
  {
    index: 1,
    label: '主人公の体が人に当たった',
    // 🔶 どの動作で数えるかは未確認
    note: '主人公の体が当たる動作で人に当たると、持ち物を落とさせようとして数える。落ちなくても数える。不適切な行動に数える',
  },
  {
    index: 2,
    label: '戦わない町の人を倒した',
    // 🔶 戦わない町の人とみられる属性
    note: '戦わない町の人の属性の人を倒したとき。イベント中は数えない。寿司屋の店主を殺して +1 した。不適切な行動に数える',
  },
  { index: 3, label: '代金を踏み倒した', note: '治安 −10 と同時に増える。不適切な行動に数える' },
  { index: 4, label: '侍らしい選択', note: '侍度の分子と分母に 10 ずつ入る' },
  { index: 5, label: '恥ずかしい選択', note: '侍度の分母に 10 ずつ入る' },
  {
    index: 6,
    label: 'イベント中に抜刀したまま相手に近づいた',
    note: 'イベントの途中で、抜刀していると話が変わる場面で数える。侍度の分子と分母に 1 ずつ入る。結果画面には出ない',
  },
  {
    index: 7,
    label: 'イベント中に相手に攻撃を当てた',
    note: 'イベントの途中で、攻撃すると話が変わる場面で数える。侍度の分母に 1 ずつ入る。結果画面には出ない',
  },
  { index: 9, label: '善良ななりわいを成功', note: '侍度の分子に 3 ずつ入る' },
  { index: 10, label: '悪質ななりわいを成功', note: '侍度の分母に 3 ずつ入る' },
]

/** 🟢 称号（0x0B9C + 2 × 番号）。侍度が高い順 */
export const TITLES = [
  '侍王',
  '真の侍',
  '優れた侍',
  '立派な侍',
  'もうすぐ侍',
  '侍もどき',
  '見習い',
  '半端者',
  '馬の骨',
  'ろくでなし',
  'ちんぴら',
  '恥知らず',
  '人で無し',
  '腐れ外道',
  '鬼畜王',
] as const

/** 🟢 人物の種類（0x0BDC・0x0C20 の添字）。まだらは朱美の姿のときは数えない */
export const DAMAGE_KINDS = [
  'J.J',
  '琴吹',
  '茂呂',
  '鬼怒川',
  '赤城',
  '小暮',
  '堂島',
  '万由',
  '千佳',
  '百合',
  'メリンダ',
  'まだら',
  '先生',
  'とぐろ',
  'チャールズ',
  '暗闇脳天',
  '魔鱗組',
] as const

/** 痛手の合計の通常モードの上限。❓ ゲームの上限は見つかっていないので、エディタの目安 */
export const DAMAGE_MAX = 999_999_999

export const STAT_FIELDS: readonly StatField[] = [
  {
    key: 'degreeBest',
    offset: 0x0b34,
    type: 'f32',
    label: '侍度の最高値',
    group: 'evaluation',
    max: SAMURAI_DEGREE_MAX,
    note: '評価のたびに大きいほうを残す。周回をまたいで残る',
  },
  {
    key: 'degreeLast',
    offset: 0x0b38,
    type: 'f32',
    label: '侍度（最後の評価）',
    group: 'evaluation',
    max: SAMURAI_DEGREE_MAX,
    note: '0〜120。称号はこの値で決まる',
  },
  {
    key: 'pointsEarned',
    offset: 0x0b40,
    type: 'u32',
    label: '今回の評価で得る侍点',
    group: 'evaluation',
    max: 999_999,
    note: '評価の結果画面で侍点に足して 0 に戻す',
  },
  {
    key: 'degreeNumerator',
    offset: 0x0b44,
    type: 'u32',
    label: '侍度の分子',
    group: 'evaluation',
    max: ACTION_COUNT_MAX,
    note: '評価のときに行動の回数から計算し直す。周回の終わりに 0',
  },
  {
    key: 'degreeDenominator',
    offset: 0x0b48,
    type: 'u32',
    label: '侍度の分母',
    group: 'evaluation',
    max: ACTION_COUNT_MAX,
    note: '評価のときに行動の回数から計算し直す。周回の終わりに 0',
  },
  {
    key: 'deathStage',
    offset: 0x0b98,
    type: 'u32',
    label: '死亡したときの段階',
    group: 'evaluation',
    max: 999,
    note: '死亡で周回を終えたときに、そのときの段階を写す。死亡の侍度の係数に使う。周回の終わりに 0',
  },
  ...ACTION_COUNTS.map(
    (a): StatField => ({
      key: `action${a.index}`,
      offset: 0x0b4c + 4 * a.index,
      type: 'u32',
      label: a.label,
      group: 'actions',
      max: ACTION_COUNT_MAX,
      note: a.note,
    }),
  ),
  ...TITLES.map(
    (name, i): StatField => ({
      key: `title${i}`,
      offset: 0x0b9c + 2 * i,
      type: 'u16',
      label: name,
      group: 'titles',
      max: 999,
      note: `称号「${name}」を得た回数`,
    }),
  ),
  {
    key: 'playTimeCycle',
    offset: 0x0b90,
    type: 'u32',
    label: 'プレイ時間（周回中）',
    group: 'time',
    max: PLAY_TIME_MAX,
    note: 'メニュー画面にいる間も進む。周回の終わりに 0',
    unit: 'seconds',
  },
  {
    key: 'playTimeTotal',
    offset: 0x0b94,
    type: 'u32',
    label: 'プレイ時間（累計）',
    group: 'time',
    max: PLAY_TIME_MAX,
    note: '周回中のプレイ時間と同じだけ増える',
    unit: 'seconds',
  },
  {
    key: 'fastestClear',
    offset: 0x0bbc,
    type: 'u32',
    label: '最短クリア時間',
    group: 'time',
    max: PLAY_TIME_MAX,
    note: 'クリアしたとき、0 か今回のプレイ時間より大きければ書き換える',
    unit: 'seconds',
  },
  {
    key: 'distanceCycle',
    offset: 0x0bc0,
    type: 'f32',
    label: '移動距離（周回中）',
    group: 'combat',
    max: 9_999_999,
    note: '記録の画面では km で表示される',
    unit: 'distance',
  },
  {
    key: 'distanceTotal',
    offset: 0x0bc4,
    type: 'f32',
    label: '総移動距離（累計）',
    group: 'combat',
    max: 9_999_999,
    note: '記録の画面では km で表示される',
    unit: 'distance',
  },
  {
    key: 'killsCycle',
    offset: 0x0bc8,
    type: 'u32',
    label: '斬殺数（周回中）',
    group: 'combat',
    max: 9_999_999,
    note: '主人公がとどめを刺すと +1',
  },
  {
    key: 'killsTotal',
    offset: 0x0bcc,
    type: 'u32',
    label: '総斬殺数（累計）',
    group: 'combat',
    max: 9_999_999,
    note: '主人公がとどめを刺すと +1',
  },
  {
    key: 'comboCycle',
    offset: 0x0bd0,
    type: 'u32',
    label: '最高連斬数（周回中）',
    group: 'combat',
    max: 999,
    note: '連斬が終わったときに大きいほうを残す',
  },
  {
    key: 'comboTotal',
    offset: 0x0bd4,
    type: 'u32',
    label: '最高連斬数（累計）',
    group: 'combat',
    max: 999,
    note: '連斬が終わったときに大きいほうを残す',
  },
  ...DAMAGE_KINDS.flatMap((who, c): StatField[] => {
    return [
      {
        key: `damageCycle${c}`,
        offset: 0x0bdc + 4 * c,
        type: 'u32',
        label: `${who}（周回中）`,
        group: 'damage',
        max: DAMAGE_MAX,
        note: `${who}に与えた痛手の合計。周回の終わりに 0。上限はエディタの目安`,
      },
      {
        key: `damageTotal${c}`,
        offset: 0x0c20 + 4 * c,
        type: 'u32',
        label: `${who}（累計）`,
        group: 'damage',
        max: DAMAGE_MAX,
        note: `${who}に与えた痛手の合計。周回をまたいで残る。上限はエディタの目安`,
      },
    ]
  }),
]

const FIELD_BY_KEY = new Map(STAT_FIELDS.map((f) => [f.key, f]))

export function statField(key: string): StatField {
  const f = FIELD_BY_KEY.get(key)
  if (!f) throw new RangeError(`未知の項目です: ${key}`)
  return f
}

const TYPE_MAX: Record<Exclude<StatType, 'f32'>, number> = { u16: 0xffff, u32: 0xffff_ffff }
/** float32 で表せるいちばん大きな有限の値 */
const F32_MAX = 3.4028234663852886e38

export type StatValue = {
  field: StatField
  value: number
  /** 通常の上限を超えているなど、編集はできるが注意が必要な理由 */
  warning: string | null
}

export type StatsView = {
  values: readonly StatValue[]
  /** 妥当性検証に落ちた理由。null なら編集可能 */
  problem: string | null
}

function readField(bytes: Uint8Array, f: StatField): number {
  if (f.type === 'u16') return readU16(bytes, f.offset)
  if (f.type === 'u32') return readU32(bytes, f.offset)
  return readF32(bytes, f.offset)
}

export function readStats(bytes: Uint8Array): StatsView {
  if (bytes.byteLength < 0x0c64) throw new RangeError('ファイルが小さすぎて記録を読めません')
  return {
    values: STAT_FIELDS.map((field) => {
      const value = readField(bytes, field)
      const warning = !Number.isFinite(value)
        ? '数値ではない値が入っています'
        : value < 0 || value > field.max
          ? `現在の値（${value.toLocaleString()}）は通常の範囲（0〜${field.max.toLocaleString()}）の外です`
          : null
      return { field, value, warning }
    }),
    problem: checkLayout(bytes),
  }
}

/** 通常モードは 0〜上限、上級者モードは型で書ける範囲。問題がなければ null */
export function validateStat(field: StatField, value: number, opts: { advanced: boolean }): string | null {
  if (field.type === 'f32') {
    if (!Number.isFinite(value) || Math.abs(value) > F32_MAX) return '数値を入力してください'
    if (opts.advanced) return null
  } else {
    if (!Number.isInteger(value) || value < 0 || value > TYPE_MAX[field.type])
      return `この項目に書ける範囲を超えています: ${value}`
    if (opts.advanced) return null
  }
  if (value < 0 || value > field.max)
    return `通常モードでは 0〜${field.max.toLocaleString()} を指定してください: ${value}`
  return null
}

/** 1項目の幅（2 B か 4 B）だけを書く */
export function writeStat(bytes: Uint8Array, key: string, value: number, opts: { advanced: boolean }): void {
  const problem = checkLayout(bytes)
  if (problem) throw new RangeError(problem)
  const field = statField(key)
  const error = validateStat(field, value, opts)
  if (error) throw new RangeError(error)
  if (field.type === 'u16') writeU16(bytes, field.offset, value)
  else if (field.type === 'u32') writeU32(bytes, field.offset, value)
  else writeF32(bytes, field.offset, value)
}

/** 秒を「時:分:秒」にする（プレイ時間の表示） */
export function formatSeconds(seconds: number): string {
  const s = Math.floor(seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
