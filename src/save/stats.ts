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
import { NUM_TYPE_RANGE, readNum, writeNum, type NumType } from './binary'
import { validateRange, warningsOf, type EditOpts, type ViewStatus } from './field'
import { assertWritable, checkLayout } from './layout'
import { tr, type Localized } from '@/lib/i18n'

export type StatType = Extract<NumType, 'u16' | 'u32' | 'f32'>

export type StatField = {
  /** 一意の名前（UI の key） */
  key: string
  offset: number
  type: StatType
  label: Localized
  /** 画面のまとまり */
  group: StatGroupId
  /** 通常モードの上限（ゲームが値を増やすときの上限など） */
  max: number
  /** どんな値か・いつ増えるか（UI の丸ハテナ） */
  note: Localized
  /** 秒・距離など、値の見せ方 */
  unit?: 'seconds' | 'distance'
}

export type StatGroupId = 'evaluation' | 'actions' | 'titles' | 'time' | 'combat' | 'damage'

// note はカードの説明（画面に出す概要）。
// 侍度・分子・分母・得る侍点は評価のときに計算し直される。評価の結果画面の「不適切な行動」は行動の回数の最初の 4 項目の合計で、行動の回数は周回の終わりに 0。
// 称号の欄は評価のたびに 1 増え、周回をまたいで残る。移動距離・斬殺数の周回中の値は周回の終わりに 0、累計は残る
export const STAT_GROUPS: readonly { id: StatGroupId; label: Localized; note: Localized }[] = [
  {
    id: 'evaluation',
    label: { ja: '侍評価', en: 'Samurai Evaluation' },
    note: { ja: '周回の終わりの評価画面で使う値です。', en: 'Values used on the evaluation screen at the end of a playthrough.' },
  },
  {
    id: 'actions',
    label: { ja: '行動の回数', en: 'Action counts' },
    note: {
      ja: '侍度の計算に使う、侍らしい行動・恥ずかしい行動などの回数です。',
      en: 'Counts of samurai-like decisions, embarrassing decisions and other actions used to calculate the Samurai Level.',
    },
  },
  {
    id: 'titles',
    label: { ja: '称号ごとの獲得回数', en: 'Times each title was earned' },
    note: { ja: '評価でそれぞれの称号を得た回数です。', en: 'How many times each title was earned in an evaluation.' },
  },
  {
    id: 'time',
    label: { ja: 'プレイ時間', en: 'Play time' },
    note: { ja: '周回中・累計などのプレイ時間（秒）です。', en: 'Play time in seconds, for this playthrough, all-time and so on.' },
  },
  {
    id: 'combat',
    label: { ja: '移動距離・斬殺数', en: 'Distance traveled and kills' },
    note: { ja: '移動距離・斬殺数・連斬の記録です。', en: 'Records of distance traveled, kills and combos.' },
  },
  {
    id: 'damage',
    label: { ja: '人物ごとに与えた痛手', en: 'Damage dealt per character' },
    note: {
      ja: '人物の種類ごとに与えた痛手の合計です。いちばん多い人物が「不倶戴天の敵」になります。',
      en: 'Total damage dealt to each kind of character. The one with the most becomes your "Sworn Enemy".',
    },
  },
]

/** 🟢 行動の回数の上限 */
export const ACTION_COUNT_MAX = 9_999
/** 🟢 プレイ時間の上限（9999:59:59） */
export const PLAY_TIME_MAX = 35_999_999
/** 🟢 侍度の上限 */
export const SAMURAI_DEGREE_MAX = 120

/** 🟢 行動の回数の全16枠。未使用の枠も周回の終わりに消す（chunks/stats）。 */
export const ACTION_COUNTS_OFFSET = 0x0b4c
export const ACTION_COUNT_SLOTS = 16

/** 🟢 行動の回数 0x0B4C + 4 × i。使われていない i（8・11〜15）は載せない */
export const ACTION_COUNTS: readonly { index: number; label: Localized; note: Localized }[] = [
  {
    index: 0,
    label: { ja: '人が落とした持ち物を拾った', en: 'Picked up items people dropped' },
    note: {
      ja: '主人公が拾ったときだけ数える。不適切な行動に数える',
      en: 'Counted only when the player character picks it up. Counts as Unsuitable Conduct',
    },
  },
  {
    index: 1,
    label: { ja: '主人公の体が人に当たった', en: 'Bumped into people' },
    // 🔶 どの動作で数えるかは未確認
    note: {
      ja: '主人公の体が当たる動作で人に当たると、持ち物を落とさせようとして数える。落ちなくても数える。不適切な行動に数える',
      en: 'Counted when the player character bumps into someone with a move that can knock their belongings loose, even if nothing drops. Counts as Unsuitable Conduct',
    },
  },
  {
    index: 2,
    label: { ja: '戦わない町の人を倒した', en: 'Struck down non-fighting townsfolk' },
    // 🔶 戦わない町の人とみられる属性
    note: {
      ja: '戦わない町の人の属性の人を倒したとき。イベント中は数えない。寿司屋の店主を殺して +1 した。不適切な行動に数える',
      en: 'Counted when you defeat townsfolk who do not fight. Not counted during events. Killing the sushi shop owner adds 1. Counts as Unsuitable Conduct',
    },
  },
  {
    index: 3,
    label: { ja: '代金を踏み倒した', en: 'Skipped out on a bill' },
    note: {
      ja: '治安 −10 と同時に増える。不適切な行動に数える',
      en: 'Increases together with a public order drop of 10. Counts as Unsuitable Conduct',
    },
  },
  {
    index: 4,
    label: { ja: '侍らしい選択', en: 'Samurai-Like Decisions' },
    note: { ja: '侍度の分子と分母に 10 ずつ入る', en: 'Each adds 10 to both the numerator and denominator of the Samurai Level' },
  },
  {
    index: 5,
    label: { ja: '恥ずかしい選択', en: 'Embarrassing Decisions' },
    note: { ja: '侍度の分母に 10 ずつ入る', en: 'Each adds 10 to the denominator of the Samurai Level' },
  },
  {
    index: 6,
    label: { ja: 'イベント中に抜刀したまま相手に近づいた', en: 'Approached someone with a drawn weapon during an event' },
    note: {
      ja: 'イベントの途中で、抜刀していると話が変わる場面で数える。侍度の分子と分母に 1 ずつ入る。結果画面には出ない',
      en: 'Counted in event scenes where having your weapon drawn changes the story. Each adds 1 to both the numerator and denominator of the Samurai Level. Not shown on the results screen',
    },
  },
  {
    index: 7,
    label: { ja: 'イベント中に相手に攻撃を当てた', en: 'Hit someone during an event' },
    note: {
      ja: 'イベントの途中で、攻撃すると話が変わる場面で数える。侍度の分母に 1 ずつ入る。結果画面には出ない',
      en: 'Counted in event scenes where attacking changes the story. Each adds 1 to the denominator of the Samurai Level. Not shown on the results screen',
    },
  },
  {
    index: 9,
    label: { ja: '善良ななりわいを成功', en: 'Successes in Virtuous Tasks' },
    note: { ja: '侍度の分子に 3 ずつ入る', en: 'Each adds 3 to the numerator of the Samurai Level' },
  },
  {
    index: 10,
    label: { ja: '悪質ななりわいを成功', en: 'Successes in Seedy Tasks' },
    note: { ja: '侍度の分母に 3 ずつ入る', en: 'Each adds 3 to the denominator of the Samurai Level' },
  },
]

/** 🟢 称号（0x0B9C + 2 × 番号）。侍度が高い順 */
export const TITLES: readonly Localized[] = [
  { ja: '侍王', en: 'Samurai Lord' },
  { ja: '真の侍', en: 'True Samurai' },
  { ja: '優れた侍', en: 'Great Samurai' },
  { ja: '立派な侍', en: 'Splendid Samurai' },
  { ja: 'もうすぐ侍', en: 'Almost Samurai' },
  { ja: '侍もどき', en: 'Pseudo-Samurai' },
  { ja: '見習い', en: 'Apprentice' },
  { ja: '半端者', en: 'Incompetent' },
  { ja: '馬の骨', en: 'Drifter' },
  { ja: 'ろくでなし', en: 'Good-For-Nothing' },
  { ja: 'ちんぴら', en: 'Delinquent' },
  { ja: '恥知らず', en: 'Shameless' },
  { ja: '人で無し', en: 'Miscreant' },
  { ja: '腐れ外道', en: 'Foul Heretic' },
  { ja: '鬼畜王', en: 'Lord of the Damned' },
]

/** 🟢 人物ごとの痛手（u32 × DAMAGE_KINDS）。周回中は周回の終わりに 0 にする（chunks/stats） */
export const DAMAGE_CYCLE_OFFSET = 0x0bdc
export const DAMAGE_TOTAL_OFFSET = 0x0c20

/** 🟢 人物の種類（0x0BDC・0x0C20 の添字）。まだらは朱美の姿のときは数えない */
export const DAMAGE_KINDS: readonly Localized[] = [
  { ja: 'J.J', en: 'J.J.' },
  { ja: '琴吹', en: 'Kotobuki' },
  { ja: '茂呂', en: 'Moro' },
  { ja: '鬼怒川', en: 'Kinugawa' },
  { ja: '赤城', en: 'Akagi' },
  { ja: '小暮', en: 'Kogure' },
  { ja: '堂島', en: 'Dojima' },
  { ja: '万由', en: 'Mayu' },
  { ja: '千佳', en: 'Chika' },
  { ja: '百合', en: 'Yuri' },
  { ja: 'メリンダ', en: 'Melinda' },
  { ja: 'まだら', en: 'Madara' },
  { ja: '先生', en: 'Sensei' },
  { ja: 'とぐろ', en: 'Toguro' },
  { ja: 'チャールズ', en: 'Charles' },
  { ja: '暗闇脳天', en: 'Black Mask' },
  { ja: '魔鱗組', en: 'Demonscale Clan' },
]

/** 痛手の合計の通常モードの上限。❓ ゲームの上限は見つかっていないので、エディタの目安 */
export const DAMAGE_MAX = 999_999_999

export const STAT_FIELDS: readonly StatField[] = [
  {
    key: 'degreeBest',
    offset: 0x0b34,
    type: 'f32',
    label: { ja: '侍度の最高値', en: 'Best Samurai Level' },
    group: 'evaluation',
    max: SAMURAI_DEGREE_MAX,
    note: {
      ja: '評価のたびに大きいほうを残す。周回をまたいで残る',
      en: 'Keeps the higher value at each evaluation. Carries over between playthroughs',
    },
  },
  {
    key: 'degreeLast',
    offset: 0x0b38,
    type: 'f32',
    label: { ja: '侍度（最後の評価）', en: 'Samurai Level (last evaluation)' },
    group: 'evaluation',
    max: SAMURAI_DEGREE_MAX,
    note: { ja: '0〜120。称号はこの値で決まる', en: '0 to 120. Your title is decided by this value' },
  },
  {
    key: 'pointsEarned',
    offset: 0x0b40,
    type: 'u32',
    label: { ja: '今回の評価で得る侍点', en: 'Samurai Pts from this evaluation' },
    group: 'evaluation',
    max: 999_999,
    note: {
      ja: '評価の結果画面で侍点に足して 0 に戻す',
      en: 'Added to your Samurai Points on the results screen, then reset to 0',
    },
  },
  {
    key: 'degreeNumerator',
    offset: 0x0b44,
    type: 'u32',
    label: { ja: '侍度の分子', en: 'Samurai Level numerator' },
    group: 'evaluation',
    max: ACTION_COUNT_MAX,
    note: {
      ja: '評価のときに行動の回数から計算し直す。周回の終わりに 0',
      en: 'Recalculated from the action counts at each evaluation. Reset to 0 at the end of a playthrough',
    },
  },
  {
    key: 'degreeDenominator',
    offset: 0x0b48,
    type: 'u32',
    label: { ja: '侍度の分母', en: 'Samurai Level denominator' },
    group: 'evaluation',
    max: ACTION_COUNT_MAX,
    note: {
      ja: '評価のときに行動の回数から計算し直す。周回の終わりに 0',
      en: 'Recalculated from the action counts at each evaluation. Reset to 0 at the end of a playthrough',
    },
  },
  {
    key: 'deathStage',
    offset: 0x0b98,
    type: 'u32',
    label: { ja: '死亡したときの段階', en: 'Stage at death' },
    group: 'evaluation',
    max: 999,
    note: {
      ja: '死亡で周回を終えたときに、そのときの段階を写す。死亡の侍度の係数に使う。周回の終わりに 0',
      en: 'Records the story stage when a playthrough ends in death. Used as a factor for the Samurai Level on death. Reset to 0 at the end of a playthrough',
    },
  },
  ...ACTION_COUNTS.map(
    (a): StatField => ({
      key: `action${a.index}`,
      offset: ACTION_COUNTS_OFFSET + 4 * a.index,
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
      note: { ja: `称号「${name.ja}」を得た回数`, en: `Times the title "${name.en}" was earned` },
    }),
  ),
  {
    key: 'playTimeCycle',
    offset: 0x0b90,
    type: 'u32',
    label: { ja: 'プレイ時間（周回中）', en: 'Play time (this playthrough)' },
    group: 'time',
    max: PLAY_TIME_MAX,
    note: {
      ja: 'メニュー画面にいる間も進む。周回の終わりに 0',
      en: 'Keeps counting while in menus. Reset to 0 at the end of a playthrough',
    },
    unit: 'seconds',
  },
  {
    key: 'playTimeTotal',
    offset: 0x0b94,
    type: 'u32',
    label: { ja: 'プレイ時間（累計）', en: 'Total Play Time (all-time)' },
    group: 'time',
    max: PLAY_TIME_MAX,
    note: { ja: '周回中のプレイ時間と同じだけ増える', en: 'Increases by the same amount as the play time for this playthrough' },
    unit: 'seconds',
  },
  {
    key: 'fastestClear',
    offset: 0x0bbc,
    type: 'u32',
    label: { ja: '最短クリア時間', en: 'Shortest Clear Time' },
    group: 'time',
    max: PLAY_TIME_MAX,
    note: {
      ja: 'クリアしたとき、0 か今回のプレイ時間より大きければ書き換える',
      en: 'On clearing the game, replaced if it is 0 or longer than this play time',
    },
    unit: 'seconds',
  },
  {
    key: 'distanceCycle',
    offset: 0x0bc0,
    type: 'f32',
    label: { ja: '移動距離（周回中）', en: 'Distance traveled (this playthrough)' },
    group: 'combat',
    max: 9_999_999,
    note: { ja: '記録の画面では km で表示される', en: 'Shown in km on the Records screen' },
    unit: 'distance',
  },
  {
    key: 'distanceTotal',
    offset: 0x0bc4,
    type: 'f32',
    label: { ja: '総移動距離（累計）', en: 'Distance Traveled (all-time)' },
    group: 'combat',
    max: 9_999_999,
    note: { ja: '記録の画面では km で表示される', en: 'Shown in km on the Records screen' },
    unit: 'distance',
  },
  {
    key: 'killsCycle',
    offset: 0x0bc8,
    type: 'u32',
    label: { ja: '斬殺数（周回中）', en: 'Kills (this playthrough)' },
    group: 'combat',
    max: 9_999_999,
    note: { ja: '主人公がとどめを刺すと +1', en: '+1 when the player character finishes someone off' },
  },
  {
    key: 'killsTotal',
    offset: 0x0bcc,
    type: 'u32',
    label: { ja: '総斬殺数（累計）', en: 'Total Kills (all-time)' },
    group: 'combat',
    max: 9_999_999,
    note: { ja: '主人公がとどめを刺すと +1', en: '+1 when the player character finishes someone off' },
  },
  {
    key: 'comboCycle',
    offset: 0x0bd0,
    type: 'u32',
    label: { ja: '最高連斬数（周回中）', en: 'Highest Combo (this playthrough)' },
    group: 'combat',
    max: 999,
    note: { ja: '連斬が終わったときに大きいほうを残す', en: 'Keeps the higher value when a combo ends' },
  },
  {
    key: 'comboTotal',
    offset: 0x0bd4,
    type: 'u32',
    label: { ja: '最高連斬数（累計）', en: 'Highest Combo (all-time)' },
    group: 'combat',
    max: 999,
    note: { ja: '連斬が終わったときに大きいほうを残す', en: 'Keeps the higher value when a combo ends' },
  },
  ...DAMAGE_KINDS.flatMap((who, c): StatField[] => {
    return [
      {
        key: `damageCycle${c}`,
        offset: DAMAGE_CYCLE_OFFSET + 4 * c,
        type: 'u32',
        label: { ja: `${who.ja}（周回中）`, en: `${who.en} (this playthrough)` },
        group: 'damage',
        max: DAMAGE_MAX,
        note: {
          ja: `${who.ja}に与えた痛手の合計。周回の終わりに 0。上限はエディタの目安`,
          en: `Total damage dealt to ${who.en}. Reset to 0 at the end of a playthrough. The limit is an editor guideline`,
        },
      },
      {
        key: `damageTotal${c}`,
        offset: DAMAGE_TOTAL_OFFSET + 4 * c,
        type: 'u32',
        label: { ja: `${who.ja}（累計）`, en: `${who.en} (all-time)` },
        group: 'damage',
        max: DAMAGE_MAX,
        note: {
          ja: `${who.ja}に与えた痛手の合計。周回をまたいで残る。上限はエディタの目安`,
          en: `Total damage dealt to ${who.en}. Carries over between playthroughs. The limit is an editor guideline`,
        },
      },
    ]
  }),
]

const FIELD_BY_KEY = new Map(STAT_FIELDS.map((f) => [f.key, f]))

export function statField(key: string): StatField {
  const f = FIELD_BY_KEY.get(key)
  if (!f) throw new RangeError(tr({ ja: `未知の項目です: ${key}`, en: `Unknown field: ${key}` }))
  return f
}

export type StatValue = {
  field: StatField
  value: number
  /** 通常の上限を超えているなど、編集はできるが注意が必要な理由 */
  warnings: string[]
}

export type StatsView = ViewStatus & {
  values: readonly StatValue[]
}

export function readStats(bytes: Uint8Array): StatsView {
  if (bytes.byteLength < 0x0c64)
    throw new RangeError(tr({ ja: 'ファイルが小さすぎて記録を読めません', en: 'The file is too small to read the records' }))
  return {
    warnings: [],
    values: STAT_FIELDS.map((field) => {
      const value = readNum(bytes, field.offset, field.type)
      const warning = !Number.isFinite(value)
        ? tr({ ja: '数値ではない値が入っています', en: 'The stored value is not a number' })
        : value < 0 || value > field.max
          ? tr({
              ja: `現在の値（${value.toLocaleString()}）は通常の範囲（0〜${field.max.toLocaleString()}）の外です`,
              en: `The current value (${value.toLocaleString()}) is outside the normal range (0 to ${field.max.toLocaleString()})`,
            })
          : null
      return { field, value, warnings: warningsOf(warning) }
    }),
    problem: checkLayout(bytes),
  }
}

/** 通常モードは 0〜上限、上級者モードは型で書ける範囲。問題がなければ null */
export function validateStat(field: StatField, value: number, opts: EditOpts): string | null {
  // 上級者モードでは型で書ける範囲まで（f32 は負の値も書ける）
  const range = NUM_TYPE_RANGE[field.type]
  return validateRange(
    value,
    { systemMin: range.min, systemMax: range.max, normalMax: field.max, integer: field.type !== 'f32' },
    opts,
  )
}

/** 1項目の幅（2 B か 4 B）だけを書く */
export function writeStat(bytes: Uint8Array, key: string, value: number, opts: EditOpts): void {
  assertWritable(bytes)
  const field = statField(key)
  const error = validateStat(field, value, opts)
  if (error) throw new RangeError(error)
  writeNum(bytes, field.offset, field.type, value)
}

/** 秒を「時:分:秒」にする（プレイ時間の表示） */
export function formatSeconds(seconds: number): string {
  const s = Math.floor(seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
