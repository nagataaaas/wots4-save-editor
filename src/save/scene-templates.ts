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
//
// なりわい（四天王 対 四人組・阿弥浜八人衆・阿弥浜八人衆の最終戦）：
//   ✅ [U] 2026-10-19 3つとも、書き込んだセーブをロードして戦いが始まった（指揮官は変数 0＝21・1＝40・2＝2 の書き方）。
//   物語の進み具合には触れず、なりわいの値だけを書く。
//   🟢 戦いの相手はなりわいの標的としてだけ出る。地域に入ったとき、受注中の表のうち、なりわいの場所＝今の地域のものを1つ選んで出す。
//      同じ地域のなりわいを複数受けていると1つしか選ばれないので、受注中の表は 207／208 の1件だけにする。
//      戦いの処理は連続なりわいのフラグ 4〜7・9 を読まない（話の流れに合わせて終えた値にする）。段階・期限の条件はない。
//   現在地は戦いの場所にする（ユーザー判断 2026-10-16。✅ [U] 2026-10-19 その場から始めて戦いになった）
//   ❓ 標的が死亡のビットを見るか（確かめていない）。戦いに出る人の死亡のビットは 0 にする
import { readU16, writeU16, writeU8 } from './binary'
import { assertWritable } from './layout'
import { HERO_OFFSETS } from './hero'
import { DATE_OFFSETS, DAY_TIME_AFTER_DAY3, readDate } from './scenario-date'
import {
  OCCUPATION_ACCEPTED_OFFSET,
  OCCUPATION_ACCEPTED_TABLE_END,
  OCCUPATION_NOT_APPEARED,
  occupationStateOffset,
} from './occupation'
import { occupationFlagOffset, personOffset } from './townsfolk'
import { EVENT_COUNT, EVENT_RECORD_OFFSET, EVENT_STATE_OFFSET, EVENT_STATE_VALUES } from './scenario-events'
import { FACTION_TABLE_OFFSET, ROUTE_JUDGE_OFFSET, ROUTE_NONE_OFFSET, ROUTE_THRESHOLD } from './factions'
import { NEW_CYCLE_KEEP_FLAGS } from './new-cycle'
import { MADARA_ALLY_OFFSET } from './flags/event-flags'
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
  /** 当てたあとゲームで何をすればよいか */
  note: Localized
  /** 遊ぶときの注意（起きることと、その避け方） */
  caution?: { text: Localized; link?: { href: string; label: Localized } }
  apply: (bytes: Uint8Array) => void
}

export type SceneTemplateGroup = {
  id: string
  label: Localized
  /** 何を書き換え、何を残すか */
  description: Localized
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

/** 🟢 なりわいの ID（datatable/occupation） */
export const MISSION = {
  /** 四天王 対 四人組（場所：墓場） */
  lordsVsQuartet: 207,
  /** 阿弥浜八人衆（場所：街道） */
  amihamaEight: 208,
} as const

/** 🟢 なりわいのフラグの番号（chunks/townsfolk） */
const OCC_FLAG = {
  /** 連続なりわい 野戸仏・小鳩・泥棒さん・おっつぁん。終えた値（101＝虎鉄・大蛇に合言葉を伝えた、100＝終えた） */
  series: [
    { flag: 4, value: 101 },
    { flag: 5, value: 100 },
    { flag: 6, value: 101 },
    { flag: 7, value: 100 },
  ],
  /** 四天王の話 */
  lords: 25,
  /** 最終なりわいと熊神の病気 */
  final: 26,
} as const

/** 🟢 四天王の話・最終なりわいの値 */
const LORDS_OFFERED_207 = 14
const LORDS_OKAMI_CAME = 60
/** 治療していない（10 未満なら女将が来ず、四人組と戦う） */
const FINAL_UNTREATED = 2
const FINAL_ACCEPTED_208 = 20

/** 🟢 戦いに出る人の人物番号：親分（女将）・小鳩・泥棒さん（大蛇）・熊神・虎鉄・霧鮫・緋横・鈴目・百舌・指揮官 */
const MISSION_PEOPLE: readonly number[] = [101, 103, 104, 105, 106, 107, 108, 109, 110, 111]

/** 🟢 受注中のなりわいの表の1件（16 B）：+0 ID、+4 受注した日、+6 時間帯、+7 期限の日数（FF なし）、+8〜+15 なりわいの変数 0〜7 */
const ACCEPTED_ENTRY = { id: 0, day: 4, slot: 6, deadline: 7, vars: 8 } as const
/** 🟢 207・208 は期限なし */
const NO_DEADLINE = 0xff

/** ✅ 開始地点（datatable/place/start-location.csv） */
const LOCATION_CEMETERY = 0x15
const LOCATION_BACK_ROADS = 0x10

/**
 * 208 の変数 0〜2（🟢）。変数 0 は場面の進み具合、変数 1 はその段で倒した数、変数 2 は段（0〜2、40人で次の段）。
 * start：合流の前（0〜2 なら霧鮫の「四人組と合流せよ！」から。3 にすると侵略者の場面を飛ばすので使わない）
 * commander：240人を倒し終え、全員が指揮官の前に集まった（変数 0＝21）。✅ [U] 2026-10-19 指揮官に話しかけて一騎打ちになった
 */
const AMIHAMA_EIGHT_VARS = { start: [0, 0, 0], commander: [21, 40, 2] } as const

export type MissionScene = 'lords-vs-quartet' | 'amihama-eight' | 'amihama-eight-commander'

/**
 * なりわいの戦いの直前：連続なりわいを終えた値にし、四天王の話・最終なりわいの値、戦いに出る人の生死、
 * 受注中の表（このなりわい1件だけ）、状態の表（FFFF のときだけ 0）、現在地（戦いの場所）を書く
 */
export function applyMissionEve(bytes: Uint8Array, scene: MissionScene): void {
  assertWritable(bytes)
  const date = readDate(bytes)
  if (date.problem) throw new RangeError(date.problem)
  const isLords = scene === 'lords-vs-quartet'
  const id = isLords ? MISSION.lordsVsQuartet : MISSION.amihamaEight

  for (const { flag, value } of OCC_FLAG.series) writeU8(bytes, occupationFlagOffset(flag), value)
  writeU8(bytes, occupationFlagOffset(OCC_FLAG.lords), isLords ? LORDS_OFFERED_207 : LORDS_OKAMI_CAME)
  writeU8(bytes, occupationFlagOffset(OCC_FLAG.final), isLords ? FINAL_UNTREATED : FINAL_ACCEPTED_208)
  // 🟢 人物のレコードはビット0（死亡）だけが使われる
  for (const p of MISSION_PEOPLE) writeU8(bytes, personOffset(p), 0)

  bytes.fill(0, OCCUPATION_ACCEPTED_OFFSET, OCCUPATION_ACCEPTED_TABLE_END)
  const at = OCCUPATION_ACCEPTED_OFFSET
  writeU16(bytes, at + ACCEPTED_ENTRY.id, id)
  // 受注した日・時間帯は今の値（ゲームの受注と同じ）。期限がないので戦いには関わらない
  writeU16(bytes, at + ACCEPTED_ENTRY.day, date.dayIndex)
  writeU8(bytes, at + ACCEPTED_ENTRY.slot, date.slot)
  writeU8(bytes, at + ACCEPTED_ENTRY.deadline, NO_DEADLINE)
  if (!isLords) {
    const vars = scene === 'amihama-eight-commander' ? AMIHAMA_EIGHT_VARS.commander : AMIHAMA_EIGHT_VARS.start
    vars.forEach((v, i) => writeU8(bytes, at + ACCEPTED_ENTRY.vars + i, v))
  }
  // 状態の表は周回をまたぐクリア回数なので、FFFF（まだ出ていない）のときだけ 0 にする
  const state = occupationStateOffset(id)
  if (readU16(bytes, state) === OCCUPATION_NOT_APPEARED) writeU16(bytes, state, 0)

  writeU8(bytes, HERO_OFFSETS.location, isLords ? LOCATION_CEMETERY : LOCATION_BACK_ROADS)
}

/**
 * 真ルート（ローラの決意・士魂は屈せず）。🔶 書き込んだセーブをゲームで確かめていない。
 * 🟢 三姉妹との戦いは士魂は屈せず（86）の後半（拷問3回と処刑台の場面のあと、丸腰で戦い、茂呂・小暮が加わる）。
 *    ローラの決意（85）から三姉妹戦まで続けて起き、間にセーブできる時点がないので、直前はローラの決意の開始前にする。
 * 🟢 直後は 86 = 4・夜・段階 420・代官所の牢屋（地域 20）。ここでだけ茂呂・小暮がついてくる場面が始まり、出口へ進むとローラ奪還（87）へ続く。
 * 🟢 三姉妹見参（70）から 84 までの正規の道筋（赤城が死なず、カジノの開いていない筋）を書く。起きないイベント（74・76・80・83、
 *    28・41）は 00。勢力のルート分岐と大寄せの門・柵は 0、拷問塔の扉は周回の始めの 1 のまま。
 * 施設（病院・カジノ）は周回をまたいで残る値なので書かない（ユーザー判断 2026-10-19）。85〜87 は読まない（🟢）
 */
const TRUE_ROUTE = {
  /** 🟢 序章の大砲。三姉妹見参の前提 */
  prologueCannon: 0x379f,
  /** 🟢 真ルート（1）。85・86 の開始条件 */
  trueRoute: 0x378e,
  /** 🟢 三姉妹見参が書く（黒船・甲板に入れない） */
  blackShipClosed: 0x376b,
  /** 🟢 三姉妹見参が書く（大寄せの前の門） */
  earlyGates: [0x377d, 0x377e, 0x377f],
  /** 🟢 伯爵に刺激をが書く（❓ 意味） */
  afterCountTease: 0x3769,
  /** 🟢 再起の望みが書く（❓ 意味） */
  afterRevival: [0x37b2, 0x37b3, 0x37c7],
  /** 🟢 まだらが味方。1 だと三姉妹との戦いがなくなるので 0 にする（周回をまたいで残る値で、resetProgress では消えない） */
  madaraAlly: MADARA_ALLY_OFFSET,
  /** 🟢 拷問の回数。3回目のあとの値は 2（このあと読まれない） */
  tortureCount: 0x37ae,
} as const

/** 🟢 イベント状態 A の添字：三姉妹見参・お早い到着・再起の望み・将の器・伯爵に刺激を・闇討ち・学問のすすめ・刺激が欲しい・伯爵救出・人間湯通しの恐怖・84 */
const TRUE_ROUTE_EVENTS: readonly number[] = [70, 71, 72, 73, 75, 77, 78, 79, 81, 82, 84]
const EVENT_LAURA = 85
const EVENT_SPIRIT = 86

/** 🟢 人物の状態：赤城 3（療養中）、ローラ 2（代官所へ向かった）、J.J 3（療養中）。ローラ奪還で赤城・J.J は 0 に戻る */
const TRUE_ROUTE_PEOPLE: readonly (readonly [number, number])[] = [
  [0x374e, 3],
  [0x3757, 2],
  [0x3758, 3],
]

/** 🟢 段階 410（ローラの決意）・420（ローラの決意の成功から） */
const STAGE_LAURA = 410
const STAGE_SPIRIT = 420
/** ✅ 時間帯 夕・夜 */
const SLOT_EVENING = 1
const SLOT_NIGHT = 2
/** ✅ 開始地点（datatable/place/start-location.csv）：代官所・門の外（地域 18）、代官所・牢屋（地域 20） */
const LOCATION_MAGISTRATE_GATE = 0x12
const LOCATION_MAGISTRATE_JAIL = 0x14

export type TrueRouteScene = 'laura-determination' | 'after-sisters'

/** 🟢 牢屋から再開すると、真ルートの結末（鬼怒川を倒した直後）で落ちる。非公式パッチで直る */
const UNOFFICIAL_PATCH_URL = 'https://github.com/nagataaaas/wots4-unofficial-patch'

/**
 * 真ルートの場面：ローラの決意の開始前（代官所の門の外、4日目の夕）か、三姉妹を倒した直後（代官所の牢屋、4日目の夜）。
 * 🔶 経過日数は寄り道しない場合の 4日目（開始条件に日数はない）
 */
export function applyTrueRouteEve(bytes: Uint8Array, scene: TrueRouteScene): void {
  assertWritable(bytes)
  const after = scene === 'after-sisters'
  resetProgress(bytes)

  // 序章の終わり（🟢 三姉妹見参で 0x378D = 2 になり、通常の 1〜3日目のイベントが出なくなる）
  succeed(bytes, EVENT.samuraiOnBoard)
  succeed(bytes, EVENT.harborSkirmish)
  writeU8(bytes, TRUE_ROUTE.prologueCannon, 1)
  writeU8(bytes, FLAG.afterPrologue, 2)
  writeU8(bytes, FLAG.tutorial, TUTORIAL_NO_ADVICE)
  writeU8(bytes, TRUE_ROUTE.trueRoute, 1)
  writeU8(bytes, TRUE_ROUTE.blackShipClosed, 1)
  for (const p of TRUE_ROUTE.earlyGates) writeU8(bytes, p, 1)

  for (const n of TRUE_ROUTE_EVENTS) succeed(bytes, n)
  for (const [p, v] of TRUE_ROUTE_PEOPLE) writeU8(bytes, p, v)
  writeU8(bytes, TRUE_ROUTE.afterCountTease, 1)
  for (const p of TRUE_ROUTE.afterRevival) writeU8(bytes, p, 1)
  // 将の器が書く（🟢 般若党が町に出ない）
  writeU8(bytes, FLAG.prajnaBase, 2)
  writeU8(bytes, TRUE_ROUTE.madaraAlly, 0)

  if (after) {
    succeed(bytes, EVENT_LAURA)
    succeed(bytes, EVENT_SPIRIT)
    writeU8(bytes, TRUE_ROUTE.tortureCount, 2)
  }

  writeU16(bytes, DATE_OFFSETS.dayTime, after ? STAGE_SPIRIT : STAGE_LAURA)
  writeU8(bytes, DATE_OFFSETS.pending, 0)
  writeU8(bytes, DATE_OFFSETS.slot, after ? SLOT_NIGHT : SLOT_EVENING)
  writeU16(bytes, DATE_OFFSETS.dayIndex, DAY_INDEX_DAY4)
  writeU8(bytes, HERO_OFFSETS.location, after ? LOCATION_MAGISTRATE_JAIL : LOCATION_MAGISTRATE_GATE)
}

/** 画面に出すテンプレ */
export const SCENE_TEMPLATE_GROUPS: readonly SceneTemplateGroup[] = [
  {
    id: 'tournament',
    label: { ja: '剣術大会直前', en: 'Right before the Battle Tournament' },
    description: {
      ja: '今の周回のイベントの進み具合・勢力の状態・門や柵・人物の生死・日付・現在地を、剣術大会までの決まった道筋に置き換えます。武器・道具・お金・主人公・町の人・なりわい・夜這いはそのままです。',
      en: "Replaces this playthrough's event progress, faction status, gates and fences, who is alive, the date and the location with a set path up to the Battle Tournament. Weapons, items, money, your character, townsfolk, missions and night crawling are left as they are.",
    },
    templates: (
      [
        ['shogunate', { ja: '幕府', en: 'Shogunate' }],
        ['foreigners', { ja: '外国', en: 'Foreigners' }],
        ['prajnas', { ja: '攘夷', en: 'Prajnas' }],
        ['independent', { ja: '根無し草', en: 'Independent' }],
      ] as const
    ).map(([side, label]) => ({
      id: `tournament-${side}`,
      label,
      note: {
        ja: `4日目の昼、大通りから始まります。剣術大会の会場の受付で参加を選ぶと、${label.ja}の側で剣術大会が始まります。`,
        en: `You start on the Main Plaza at midday on day 4. Choose to enter at the tournament grounds reception, and the Battle Tournament begins on the ${label.en} side.`,
      },
      apply: (b: Uint8Array) => applyTournamentEve(b, side),
    })),
  },
  {
    id: 'missions',
    label: { ja: 'なりわい', en: 'Missions' },
    description: {
      ja: '連続なりわいを4つとも終えた状態にし、侍四天王の話を進め、なりわいをそれ1つだけ受けた状態にします。ほかに受けているなりわいは外れます。戦いに出る人は生きている状態にします。物語の進み具合・日付はそのままです。',
      en: 'Marks all four mission series as finished, advances the Four Samurai Lords story, and leaves only this mission accepted. Any other accepted missions are dropped. The people in the fight are set as alive. Story progress and the date are left as they are.',
    },
    templates: [
      {
        id: 'mission-lords-vs-quartet',
        label: { ja: '四天王 対 四人組', en: 'Four Samurai Lords vs. Yakuza Quartet' },
        note: {
          ja: '墓場から始まります。小鳩に話しかけ、百舌が来たらもう一度話しかけて「いざ尋常に！」を選ぶと、四人組との戦いになります。熊神は治療していない状態です。',
          en: 'You start at the Cemetery. Talk to Kobato, and when Mozu arrives, talk to him again and choose to fight to begin the battle with the Yakuza Quartet. Kumagami has not been treated.',
        },
        apply: (b) => applyMissionEve(b, 'lords-vs-quartet'),
      },
      {
        id: 'mission-amihama-eight',
        label: { ja: '阿弥浜八人衆', en: 'The Amihama Eight' },
        note: {
          ja: '街道から始まります。霧鮫の「四人組と合流せよ！」のあと、小鳩に2回話しかけて「準備はよろしいか」を選ぶと、侵略者との戦いになります。先生・堂島は、師範代・鍛冶屋になっていて生きていれば加わります。',
          en: 'You start on the Back Roads. After Kirizame says "Link up with the Yakuza Quartet!", talk to Kobato twice and choose "Prepare yourselves!" to begin the battle with the invaders. Sensei and Dojima join if they are alive and have become the acting master of your dojo and the smith.',
        },
        apply: (b) => applyMissionEve(b, 'amihama-eight'),
      },
      {
        id: 'mission-amihama-eight-commander',
        label: { ja: '阿弥浜八人衆（指揮官との一騎打ち）', en: 'The Amihama Eight (duel with the commander)' },
        note: {
          ja: '街道から始まります。侵略者を倒し終え、全員が指揮官の前に集まった状態です。指揮官に話しかけると一騎打ちになります。',
          en: 'You start on the Back Roads, with the invaders already defeated and everyone gathered in front of the commander. Talk to the commander to begin the duel.',
        },
        apply: (b) => applyMissionEve(b, 'amihama-eight-commander'),
      },
    ],
  },
  {
    id: 'true-route',
    label: { ja: '真ルート', en: 'True route' },
    description: {
      ja: '今の周回のイベントの進み具合・人物の状態・門や柵・日付・現在地を、三姉妹見参から真ルートを進んだ決まった道筋に置き換えます。武器・道具・お金・主人公・町の人・なりわい・夜這い・施設はそのままです。',
      en: "Replaces this playthrough's event progress, character status, gates and fences, the date and the location with a set path along the true route from Meeting with the Three Sisters. Weapons, items, money, your character, townsfolk, missions, night crawling and facilities are left as they are.",
    },
    templates: [
      {
        id: 'true-route-laura-determination',
        label: { ja: 'ローラの決意の前', en: "Before Laura's Determination" },
        note: {
          ja: '三姉妹と戦うイベントが始まる前の状態です。4日目の夕方、代官所の門の外から始まります。門の前のローラに近づき「一緒に行こう」を選ぶと、代官所の中での戦い・拷問のあとに、三姉妹との戦いになります。途中でセーブはできません。',
          en: "The state before the event with the fight against the three sisters begins. You start outside the Magistrate's Office gate on the evening of day 4. Approach Laura in front of the gate and choose to go with her; after a fight inside the office and the torture, you fight the three sisters. You cannot save along the way.",
        },
        apply: (b) => applyTrueRouteEve(b, 'laura-determination'),
      },
      {
        id: 'true-route-after-sisters',
        label: { ja: '三姉妹戦の直後', en: 'Right after the fight with the three sisters' },
        note: {
          ja: '三姉妹を倒した直後、4日目の夜、代官所の牢屋から始まります。茂呂・小暮がついてきます。出口の方へ進むと、ローラ奪還が始まります。',
          en: "You start in the Magistrate's Office jail on the night of day 4, right after defeating the three sisters. Moro and Kogure follow you. Head toward the exit to begin Rescuing Laura.",
        },
        caution: {
          text: {
            ja: '牢屋から始めたセーブでは、真ルートの結末（鬼怒川を倒した直後）でゲームが落ちます。非公式パッチ（unofficial_patch）を入れると落ちなくなります。',
            en: 'With a save that starts in the jail, the game crashes at the true-route ending (right after defeating Kinugawa). Installing the unofficial patch (unofficial_patch) fixes this.',
          },
          link: { href: UNOFFICIAL_PATCH_URL, label: { ja: '非公式パッチ（GitHub）', en: 'Unofficial patch (GitHub)' } },
        },
        apply: (b) => applyTrueRouteEve(b, 'after-sisters'),
      },
    ],
  },
]
