// 画面：世界 / NPC の「人物の状態」。重要人物の状態 0x374E〜0x375C（u8 × 15）と寿司屋の 0x37F9。
// 出典：docs/save_format/chunks/characters・scenario-flags。
//
// イベント状態 A（0x36A8〜0x374D）のすぐ後ろ。周回の始めは全部 0（🔶 生死は周回ごとに初期化される）。
// 人物ごとの値の意味（🟢 は場面から読み取った値。✅ は [U] 2026-10-06 の書き換えで人物を確認）：
//
//   0x374E  🟢 赤城。0＝生存、1＝死亡（再起の望みで死ぬ・怒りの矛先）、3＝病院に運ばれて助かった（再起の望みの成功）。
//              将の器は 3、怒りの矛先は 1 のときに起きる。ローラ奪還で赤城が駆けつける場面で 0
//   0x374F  🟢 小暮。0＝生存、1＝死亡（再起の望み・将の器・怒りの矛先・闇討ち）。願い虚しくは 0 のとき小暮本人が敵。
//              剣術大会で斬っても変わらない（🟢、要ゲーム内確認）
//   0x3750  ✅ 朱美。🟢 真実でまだら（朱美）に勝つと 1
//   0x3751  ✅ 琴吹。🟢 1 になる場面はない（武人 琴吹光で死んでも変わらない）
//   0x3752  ✅ 茂呂。🟢 0＝生存、1＝死亡（剣術大会の準備を断って保留量 10 以上、仕組まれた襲撃・罠を破れ・真実・夜の墓場で・
//              危険な賭け・闇討ち）。剣術大会の準備を引き受けると 0。1 だと剣術大会の準備で建築現場にいない。幕府ルートの条件
//   0x3753〜0x3755  ✅ 万由・千佳・百合（鬼怒川の娘、三姉妹）。0＝生存、1＝死亡（✅ ユーザー判断 2026-10-11）
//   0x3756  ✅ 鬼怒川怨仙。🟢 船上の侍（周回の始め）で 2、大老暗殺計画で倒すと 0。1 になる場面はない
//   0x3757  ✅ ローラ。🟢 1＝死亡（鬼怒川の魔手でローラが倒れる）。2＝領事館を出て代官所（鬼怒川のもと）へ向かった
//              （ローラの決意の導入、イベント 84）。ふだんの場所（領事館）に出るのは 0 のときだけ
//   0x3758  ✅ J.J.。🟢 1＝死亡、3＝伯爵救出の成功（療養中）、4＝打ち解けた（伯爵に刺激をの成功）、
//              5＝逮捕された（刺激が欲しいの成功）。ローラ奪還で 0。値の意味は ✅（ユーザー判断 2026-10-11）
//   0x3759  🟢 メリンダ。0＝生存、1＝死亡（講師ご到着・祝 病院開業・傷心の帰国船の戦闘）。魔鱗組として（表彰式）でも 1
//   0x375A  🟢 堂島。表彰式でほかの優勝者として並ぶと 1（堂島 0 かつ堂島の職 0x3799 が 0 のとき）。
//              1＝釜茹でになった（✅ ユーザー判断 2026-10-11）。
//              町の人の状態の「堂島の死亡」（0x0264、townsfolk.ts）とは別のバイト（関係は ❓）
//   0x375B  🟢 先生。通常のプレイで変わる場面はない
//   0x375C  🟢 薬屋。変わる場面はない。小公女倒れるで 0 でないと町に入った時点で失敗
// 直後の 0x375D〜0x375F は施設（facilities.ts）。
//   0x37F9  🟢 寿司屋の状態（chunks/scenario-flags、通し番号 337）。寿司屋の店主を殺すと 0 → 1。
//           伯爵に刺激を・傷心の帰国船の開始条件。町の人の死亡のビット（0x02C4）とは別のバイト
// 書き換えの効果は人物ごとに要ゲーム内確認（朱美・ローラ・J.J. に 1 を書くといなくなるのは ✅）。
import { npcLabelId } from "../master/label-types";
import { npcLabel } from "../master/labels";
import { ALIVE_DEAD, flagValue, flagValues, localizedFlag, type ByteFlag } from "./byte-flag";

/** 人物の名前（今の言語） */
const npc = (id: number) => () => npcLabel(npcLabelId(id));

const NORMAL = { ja: "通常", en: "Normal" };
const DEAD = { ja: "死亡", en: "Dead" };

/** 🟢 人物の状態と、町の人の番号・夜の約束の種類との対応（chunks/characters・townsfolk・night-visit）。 */
export const CHARACTER_STATUS = {
  akagi: { offset: 0x374e, town: 10, promiseTypes: [46, 425] },
  kogure: { offset: 0x374f, town: 11, promiseTypes: [69] },
  akemi: { offset: 0x3750, town: 12, promiseTypes: [442] },
  kotobuki: { offset: 0x3751, town: 13, promiseTypes: [] },
  moro: { offset: 0x3752, town: 14, promiseTypes: [65] },
  mayu: { offset: 0x3753, town: 15, promiseTypes: [448] },
  chika: { offset: 0x3754, town: 16, promiseTypes: [449] },
  yuri: { offset: 0x3755, town: 17, promiseTypes: [450] },
  kinugawa: { offset: 0x3756, town: 18, promiseTypes: [] },
  laura: { offset: 0x3757, town: 19, promiseTypes: [454] },
  jj: { offset: 0x3758, town: 20, promiseTypes: [44, 456] },
  melinda: { offset: 0x3759, town: 21, promiseTypes: [788] },
  dojima: { offset: 0x375a, town: 22, promiseTypes: [] },
  teacher: { offset: 0x375b, town: 23, promiseTypes: [] },
  pharmacist: { offset: 0x375c, town: 55, promiseTypes: [] },
  sushi: { offset: 0x37f9, town: 30, promiseTypes: [] },
} satisfies Record<string, { offset: number; town: number; promiseTypes: number[] }>;

/** 🟢 死亡を表す値。鬼怒川・堂島の特殊な状態には使わない。 */
export const CHARACTER_DEAD = 1;

export function characterStatusForPromise(type: number) {
  return Object.values(CHARACTER_STATUS).find(s => s.promiseTypes.some(t => t === type));
}

export function characterStatusForTown(person: number) {
  return Object.values(CHARACTER_STATUS).find(s => s.town === person);
}

/** 0x374E〜0x375C の人物と、寿司屋 */
export const CHARACTER_FLAGS: readonly ByteFlag[] = [
  localizedFlag({
    offset: CHARACTER_STATUS.akagi.offset,
    label: npc(1),
    // 🟢
    note: {
      ja: "将の器は病院に運ばれて助かった状態、怒りの矛先は死亡の状態のときに起きる",
      en: "Ability to Lead happens when he was saved at the hospital, and The Sting of Hatred when he is dead",
    },
    values: [...ALIVE_DEAD, flagValue({ value: 3, label: { ja: "病院に運ばれて助かった", en: "Saved at the hospital" } })],
  }),
  localizedFlag({
    offset: CHARACTER_STATUS.kogure.offset,
    label: npc(2),
    // 🟢
    note: {
      ja: "願い虚しくは、生存のとき小暮本人が敵になる",
      en: "In Wasted Wish, Kogure himself is the enemy while he is alive",
    },
    values: ALIVE_DEAD,
  }),
  localizedFlag({
    offset: CHARACTER_STATUS.akemi.offset,
    label: npc(3),
    // 🟢
    note: { ja: "真実でまだら（朱美）に勝つと死亡する", en: "Dies when you defeat Madara (Akemi) in The Truth" },
    values: flagValues([
      { value: 0, label: NORMAL },
      { value: 1, label: DEAD },
    ]),
  }),
  localizedFlag({
    offset: CHARACTER_STATUS.kotobuki.offset,
    label: npc(4),
    // 🟢
    note: {
      ja: "死亡になる場面はない（武人 琴吹光で死んでも変わらない）",
      en: "Never becomes dead in play (not even when he dies in Hikaru Kotobuki, Military Man)",
    },
    values: ALIVE_DEAD,
  }),
  localizedFlag({
    offset: CHARACTER_STATUS.moro.offset,
    label: npc(5),
    // 🟢
    note: {
      ja: "死亡だと剣術大会の準備で建築現場にいない。大寄せで幕府ルートに入るには生存していることが要る",
      en: "When dead, he is not at the construction site in Preparing for the Battle Tournament. He must be alive to enter the Shogunate route in The Chief Minister's Big Move",
    },
    values: ALIVE_DEAD,
  }),
  localizedFlag({ offset: CHARACTER_STATUS.mayu.offset, label: npc(6), values: ALIVE_DEAD }),
  localizedFlag({ offset: CHARACTER_STATUS.chika.offset, label: npc(7), values: ALIVE_DEAD }),
  localizedFlag({ offset: CHARACTER_STATUS.yuri.offset, label: npc(8), values: ALIVE_DEAD }),
  localizedFlag({
    offset: CHARACTER_STATUS.kinugawa.offset,
    label: { ja: "鬼怒川怨仙", en: "Onsen Kinugawa" },
    // 🟢
    note: {
      ja: "船上の侍（周回の始め）で生存の状態になり、大老暗殺計画で倒すと偽物が死亡の状態になる",
      en: "Becomes alive in Samurai On Board (start of a playthrough). Defeating him in Plot to Assassinate the Chief Minister sets it to the impostor being dead",
    },
    values: flagValues([
      { value: 0, label: { ja: "偽物が死亡", en: "Impostor dead" } },
      { value: 2, label: { ja: "生存", en: "Alive" } },
    ]),
  }),
  localizedFlag({
    offset: CHARACTER_STATUS.laura.offset,
    label: npc(11),
    // 🟢
    note: {
      ja: "鬼怒川の魔手で死亡する。ローラの決意の導入で、領事館を出て代官所（鬼怒川のもと）へ向かう。領事館に出るのは生存のときだけ",
      en: "Dies in Kinugawa's Evil Influence. At the start of Laura's Determination she leaves the consulate for the Magistrate's Office (to Kinugawa). She appears at the consulate only while alive",
    },
    values: [
      ...ALIVE_DEAD,
      flagValue({ value: 2, label: { ja: "代官所へ向かった", en: "Left for the Magistrate's Office" } }),
    ],
  }),
  localizedFlag({
    offset: CHARACTER_STATUS.jj.offset,
    label: { ja: "J.J.", en: "J.J." },
    // 🟢
    note: {
      ja: "伯爵救出の成功で療養中、伯爵に刺激をの成功で打ち解け、刺激が欲しいの成功で逮捕される。ローラ奪還で通常に戻る",
      en: "Recovering after success in Rescuing the Count, friendly after success in Down for the Count, and arrested after success in In Need of Encouragement. Returns to normal in Rescuing Laura",
    },
    values: flagValues([
      { value: 0, label: NORMAL },
      { value: 1, label: DEAD },
      { value: 3, label: { ja: "伯爵救出に成功（療養中）", en: "Rescued (recovering)" } },
      { value: 4, label: { ja: "打ち解けた", en: "Friendly" } },
      { value: 5, label: { ja: "逮捕された", en: "Arrested" } },
    ]),
  }),
  localizedFlag({
    offset: CHARACTER_STATUS.melinda.offset,
    label: npc(13),
    // 🟢
    note: {
      ja: "講師ご到着・祝 病院開業・傷心の帰国船の戦闘、魔鱗組としてで死亡する",
      en: "Dies in the battles of The Lecturer Arrives, Hooray! The Hospital's Grand Opening and The Sad Boat Home, and in As a Demonscale",
    },
    values: ALIVE_DEAD,
  }),
  localizedFlag({
    offset: CHARACTER_STATUS.dojima.offset,
    label: npc(14),
    // 🟢
    note: {
      ja: "表彰式でほかの優勝者として並ぶと釜茹でになる。町の人の生死の「堂島」とは別の欄",
      en: "Gets boiled when he lines up as another victor at the award ceremony. Separate from \"Dojima\" in the townsfolk alive/dead list",
    },
    values: flagValues([
      { value: 0, label: NORMAL },
      { value: 1, label: { ja: "表彰式で釜茹でになった", en: "Boiled at the award ceremony" } },
    ]),
  }),
  localizedFlag({
    offset: CHARACTER_STATUS.teacher.offset,
    label: npc(15),
    // 🟢
    note: { ja: "通常のプレイで変わる場面はない", en: "Never changes in normal play" },
    values: ALIVE_DEAD,
  }),
  localizedFlag({
    offset: CHARACTER_STATUS.pharmacist.offset,
    label: { ja: "薬屋", en: "Pharmacy" },
    // 🟢
    note: {
      ja: "変わる場面はない。小公女倒れるで生存でないと町に入った時点で失敗",
      en: "Never changes in play. If not alive, The Ambassador Collapses fails as soon as you enter town",
    },
    values: ALIVE_DEAD,
  }),
  localizedFlag({
    offset: CHARACTER_STATUS.sushi.offset,
    label: { ja: "寿司屋", en: "Sushi-ya" },
    // 🟢
    note: {
      ja: "寿司屋の店主を殺すと死亡になる。伯爵に刺激を・傷心の帰国船の開始条件に関わる。町の人の生死の「寿司屋」とは別の欄で、両方を生存にしないと店とイベントは死んだ扱いのまま",
      en: "Becomes dead when you kill the Sushi-ya owner. Affects the start conditions of Down for the Count and The Sad Boat Home. Separate from \"Sushi-ya\" in the townsfolk alive/dead list; unless both are alive, the shop and events treat him as dead",
    },
    values: ALIVE_DEAD,
  }),
];
