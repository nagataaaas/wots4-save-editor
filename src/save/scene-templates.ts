// 場面のテンプレ：決まった戦いの直前（ロードしてその場所へ行けばイベントが始まる状態）に、周回の進み具合を書き換える。
// 出典：docs/events（剣術大会開催・大老の大寄せ・公儀の剣・東国の騎士・志士の刀・根無し草の開始条件と書く値）、
// chunks/event-chart・scenario-flags・factions・gates・best-route・date-location。
//
// 書き方（ユーザー判断 2026-10-16）：周回の進み具合を一度初期化してから、その場面までの決まった道筋を書く。
// 武器・道具・お金・主人公・町の人・なりわい・夜這いには触れない。
//
// 剣術大会直前（幕府・外国・攘夷・根無し草）：
//   ✅ [U] 2026-10-16 書き込んだセーブをロードし、会場で剣術大会が始まった（4つとも同じ書き方）
//   🟢 開始条件：剣術大会開催（46）が未到達、大寄せ（41）≥ 4、0x378D = 1、段階 400、会場にいる。
//      どの勢力の大会になるかは 42〜45 のどれが 04 か（42 → 43 → 44 → 45 の順に見る）
import { writeU16, writeU8 } from './binary'
import { assertWritable } from './layout'
import { HERO_OFFSETS } from './hero'
import { DATE_OFFSETS, DAY_TIME_AFTER_DAY3 } from './scenario-date'
import { EVENT_COUNT, EVENT_RECORD_OFFSET, EVENT_STATE_OFFSET, EVENT_STATE_VALUES } from './scenario-events'
import { FACTION_TABLE_OFFSET, ROUTE_JUDGE_OFFSET, ROUTE_NONE_OFFSET, ROUTE_THRESHOLD } from './factions'
import { NEW_CYCLE_KEEP_FLAGS } from './new-cycle'
import type { Localized } from '@/lib/i18n'

/** 🟢 シナリオのフラグ（通し番号 166〜399） */
const SCENARIO_FLAGS = { start: EVENT_STATE_OFFSET + EVENT_COUNT, end: EVENT_RECORD_OFFSET - 1 } as const

/** 🟢 イベント状態 A の添字（datatable/event） */
const EVENT = {
  samuraiOnBoard: 0,
  harborSkirmish: 1,
  /** 大老 鬼怒川怨仙。大寄せの開始条件が ≥ 3 */
  kinugawa: 28,
  /** 大老の大寄せ */
  bigMove: 41,
  imperialSword: 42,
  easternKnight: 43,
  bladesOfPatriots: 44,
  idleChatter: 45,
} as const

/** 🟢 シナリオのフラグの位置（chunks/scenario-flags・gates・best-route） */
const FLAG = {
  /** 神社の洞窟内の柵。大寄せで攘夷ルートに入れないと 1 */
  shrineCaveFence: 0x3761,
  /** 拷問部屋の扉・拷問塔の区画の扉。周回の始めに 1、大老と三姉妹の成功で 0 */
  tortureDoors: [0x3762, 0x3763],
  /** 居留地の門。大寄せで外国ルートに入れないと 1 */
  settlementGate: 0x3764,
  /** 序章のあとの道筋。序章の終わりで 1 */
  afterPrologue: 0x378d,
  /** 般若党の本拠。大寄せで攘夷ルートに入れないと 2 */
  prajnaBase: 0x37a2,
  /** チュートリアルの進み方。2＝助言なし */
  tutorial: 0x37aa,
  /** 神社入口の柵。大寄せで攘夷ルートに入れないと 1 */
  shrineGate: 0x37c3,
  /** 領事館の中へ移動できない印。大寄せで外国ルートに入れないと 1 */
  consulateClosed: 0x37c6,
  /** 代官所の表門・裏門。大寄せで幕府ルートに入れないと 1 */
  magistrateGates: [0x37fa, 0x37fb],
} as const

/** 🟢 ルート分岐の値（chunks/factions） */
const ROUTE = { open: 1, closed: 2 } as const
/** 🟢 チュートリアルの進み方：助言なしで1人ずつ（2周目以降の「口出し無用」） */
const TUTORIAL_NO_ADVICE = 2
/** ✅ 開始地点 大通り（datatable/place/start-location.csv） */
const LOCATION_MAIN_PLAZA = 0x0d
/** ✅ 経過日数 3＝4日目（1日目＝0） */
const DAY_INDEX_DAY4 = 3
/** ✅ 時間帯 昼 */
const SLOT_DAY = 0

export type TournamentSide = 'shogunate' | 'foreigners' | 'prajnas' | 'independent'

/** 勢力ごとの4日目のイベントと、大寄せの結果（幕府・外国・攘夷のどれに入れるか。null は無所属） */
const TOURNAMENT_SIDES: Record<TournamentSide, { event: number; faction: number | null }> = {
  shogunate: { event: EVENT.imperialSword, faction: 0 },
  foreigners: { event: EVENT.easternKnight, faction: 1 },
  prajnas: { event: EVENT.bladesOfPatriots, faction: 2 },
  independent: { event: EVENT.idleChatter, faction: null },
}

export type SceneTemplate = {
  id: string
  label: Localized
  apply: (bytes: Uint8Array) => void
}

export type SceneTemplateGroup = {
  id: string
  label: Localized
  note: Localized
  templates: readonly SceneTemplate[]
}

/**
 * 周回の進み具合の初期化：イベント状態 A を全部 00、シナリオのフラグを 0（新しい周回と同じく NEW_CYCLE_KEEP_FLAGS は残す）。
 * 拷問塔の扉は周回の始めの値 1 にする（🟢）。
 * A の FF も 00 にする（✅ [U] 2026-10-16 この書き方で確かめた）。開始条件「≤ 0」が FF をどう見るかは分かっていないので、FF を残さない
 */
function resetProgress(bytes: Uint8Array): void {
  bytes.fill(0, EVENT_STATE_OFFSET, EVENT_STATE_OFFSET + EVENT_COUNT)
  const keep = new Set(NEW_CYCLE_KEEP_FLAGS)
  for (let p = SCENARIO_FLAGS.start; p <= SCENARIO_FLAGS.end; p++) if (!keep.has(p)) writeU8(bytes, p, 0)
  for (const p of FLAG.tortureDoors) writeU8(bytes, p, 1)
}

const succeed = (bytes: Uint8Array, index: number) => writeU8(bytes, EVENT_STATE_OFFSET + index, EVENT_STATE_VALUES.success)

/**
 * 剣術大会直前：序章・大老 鬼怒川怨仙・大老の大寄せと、勢力の4日目のイベントを成功にし、4日目の昼に大通りから始める。
 * 大寄せで書かれる値（ルート分岐・入れない勢力の門と柵）は、選んだ勢力の友好度だけが 3 のときの判定の結果にそろえる（🟢）
 */
export function applyTournamentEve(bytes: Uint8Array, side: TournamentSide): void {
  assertWritable(bytes)
  const { event, faction } = TOURNAMENT_SIDES[side]
  resetProgress(bytes)

  // 序章の終わり（🟢 どの結末でも 0x378D = 1）
  succeed(bytes, EVENT.samuraiOnBoard)
  succeed(bytes, EVENT.harborSkirmish)
  writeU8(bytes, FLAG.afterPrologue, 1)
  writeU8(bytes, FLAG.tutorial, TUTORIAL_NO_ADVICE)
  succeed(bytes, EVENT.kinugawa)

  // 大老の大寄せ：友好度（行0 − 行1）が 3 以上の勢力のルートが 1、ほかは 2。どれも 2 なら無所属 1
  if (faction !== null) writeU8(bytes, FACTION_TABLE_OFFSET + faction, ROUTE_THRESHOLD)
  for (let col = 0; col < 3; col++) writeU8(bytes, ROUTE_JUDGE_OFFSET + col, col === faction ? ROUTE.open : ROUTE.closed)
  writeU8(bytes, ROUTE_NONE_OFFSET, faction === null ? 1 : 0)
  if (faction !== 0) for (const p of FLAG.magistrateGates) writeU8(bytes, p, 1)
  if (faction !== 1) {
    writeU8(bytes, FLAG.settlementGate, 1)
    writeU8(bytes, FLAG.consulateClosed, 1)
  }
  if (faction !== 2) {
    writeU8(bytes, FLAG.shrineGate, 1)
    writeU8(bytes, FLAG.shrineCaveFence, 1)
    writeU8(bytes, FLAG.prajnaBase, 2)
  }
  succeed(bytes, EVENT.bigMove)
  // 4日目のイベントの成功（🟢 ほかの勢力のルート分岐を 2 にするが、大寄せの結果ですでに 2）
  succeed(bytes, event)

  writeU16(bytes, DATE_OFFSETS.dayTime, DAY_TIME_AFTER_DAY3)
  writeU8(bytes, DATE_OFFSETS.pending, 0)
  writeU8(bytes, DATE_OFFSETS.slot, SLOT_DAY)
  writeU16(bytes, DATE_OFFSETS.dayIndex, DAY_INDEX_DAY4)
  writeU8(bytes, HERO_OFFSETS.location, LOCATION_MAIN_PLAZA)
}

/** 画面に出すテンプレ。ゲームで確かめたものだけを載せる */
export const SCENE_TEMPLATE_GROUPS: readonly SceneTemplateGroup[] = [
  {
    id: 'tournament',
    label: { ja: '剣術大会直前', en: 'Right before the Battle Tournament' },
    note: {
      ja: '4日目の昼、大通りから始まります。剣術大会の会場の受付で参加を選ぶと、選んだ側の剣術大会が始まります。',
      en: 'You start on the Main Plaza at midday on day 4. Choose to enter at the tournament grounds reception, and the Battle Tournament for the chosen side begins.',
    },
    templates: [
      { id: 'tournament-shogunate', label: { ja: '幕府', en: 'Shogunate' }, apply: (b) => applyTournamentEve(b, 'shogunate') },
      { id: 'tournament-foreigners', label: { ja: '外国', en: 'Foreigners' }, apply: (b) => applyTournamentEve(b, 'foreigners') },
      { id: 'tournament-prajnas', label: { ja: '攘夷', en: 'Prajnas' }, apply: (b) => applyTournamentEve(b, 'prajnas') },
      { id: 'tournament-independent', label: { ja: '根無し草', en: 'Independent' }, apply: (b) => applyTournamentEve(b, 'independent') },
    ],
  },
]
