// 画面：世界 / NPC の「NPCイベントフラグ」。配列ごとに見出しが1つ：
//   NPC_SMITH_FLAGS  鍛冶屋
//   NPC_DOJO_FLAGS   道場・先生
//   NPC_OTHER_FLAGS  その他
// 出典：docs/save_format/chunks/townsfolk（なりわいのフラグ 0x011C + 番号）・best-route（0x3799・0x379A）。
//
// なりわいのフラグ（0x011C + 番号、u8 × 64。townsfolk.ts）のうち、なりわいの画面（occupation.ts）で扱わない、意味の分かったもの。
// エリア移動・ロードで 0 に戻るもの（会話の回数 1〜3、開発用の 15）は、エディタで書いてもロードで消えるので載せない（🟢）。
//   0x0127  ✅ [U] 2026-10-06 鍛冶屋の後継者イベントと鍛冶屋の状態（SMITH_STATES。書き換えで確認）。
//   0x0132  ✅ [U] 2026-10-06 堂島が鍛冶屋を継いだフラグ。0x0127 が 70（堂島の説得に成功）になると 1 になる。
//              0 のまま周回すると、0x0127 が 81 でも鍛冶屋はおやじに戻った。1 にして周回すると堂島の鍛冶屋になった
//   そのほかの番号（10・13・16〜18・20・21・23・24）は 🟢。
// 0x3799・0x379A（🟢 chunks/best-route）：
//   0x3799  堂島が鍛冶屋に戻ると 1、死ぬと 0。0x379A 先生が道場の師範代になると 1、死ぬ・追い出す・道場を失うと 0。
//           どちらも周回をまたいで残る。町に出るかはなりわいのフラグ 22・21 が決める
//
// 文言は { ja, en } で書き、localizedFlag・flagValues で、読むたびに今の言語の文言を返す ByteFlag・FlagValue にする（型は string のまま）。
import type { Localized } from "@/lib/i18n";
import { npcLabelId } from "../master/label-types";
import { nameOf, npcLabel } from "../master/labels";
import { occupationFlagOffset } from "../townsfolk";
import { flagValues, localizedFlag, yesNo, type ByteFlag, type FlagValue } from "./byte-flag";

/** 🟢 堂島が鍛冶屋（u8）。周回をまたいで残る（周回の初期化でも残す。new-cycle.ts） */
export const DOJIMA_SMITH_OFFSET = 0x3799;
/** 🟢 先生が道場の師範代（u8）。周回をまたいで残る（周回の初期化でも残す。new-cycle.ts） */
export const SENSEI_DOJO_OFFSET = 0x379a;

/** 人物の英語の名前（人物の表の name_en） */
const en = (id: number): string => npcLabel(npcLabelId(id), "en");

/** 文言に入れる人物の名前（日本語・英語） */
const DOJIMA = { ja: nameOf.npc(14), en: en(14) };
const SENSEI = { ja: nameOf.npc(15), en: en(15) };
const SMITH = { ja: nameOf.npc(25), en: en(25) };
const OLD_FOSSIL = { ja: nameOf.npc(32), en: en(32) };
const HERO = { ja: nameOf.npc(59), en: en(59) };
const REVENGE_HORSE = { ja: nameOf.npc(92), en: en(92) };
const SWORDSWOMAN = { ja: nameOf.npc(93), en: en(93) };
const DUELIST = { ja: nameOf.npc(114), en: en(114) };
const PUPIL = { ja: nameOf.npc(156), en: en(156) };
const CHALLENGER = { ja: nameOf.npc(157), en: en(157) };
const PHOTOGRAPHER = { ja: nameOf.npc(159), en: en(159) };

const SUCCESSOR: Localized = { ja: "後継者イベント", en: "Successor event" };
const SMITH_STATE: Localized = { ja: "鍛冶屋の状態", en: "Smithy status" };

/**
 * 0x0127 の値。
 * ✅ [U] 2026-10-06：0・10・20・30・40・50・60・61・69・70・81・110・119 は書き換えで確認。
 * ✅ [U] 2026-10-16：おやじから踏み倒した直後に殺すと 109 のまま残る（実セーブ）。
 * 🟢 書かれる場面（docs/save_format/chunks/townsfolk「鍛冶屋の状態」）：
 *   1 周回後の堂島の鍛冶屋で初めて話した、27・28 墓場の堂島との会話の途中、80 説得のあとおやじにお礼を言われた、
 *   82・83 堂島の代でおやじが死んだ・堂島がそれを話した、90 説得のあと（70 以上）に堂島が死んだ、
 *   99 後継者の話を断った・堂島が先に死んでいた、109・119 踏み倒した直後、110・120 そのあと話して店をやめられた。
 *   120 は堂島の死亡ではない（堂島の死亡は 0x0264 で、ここには書かれない）🟢
 *   21〜26（墓場の堂島との雑談の途中、選択肢ごとに 1 ずつ進む 🟢）は選択肢に出さない（ユーザー判断 2026-10-16）
 */
export const SMITH_STATES: readonly FlagValue[] = flagValues([
  { value: 0, label: { ja: "未会話", en: "Not talked yet" }, group: SUCCESSOR },
  {
    value: 1,
    label: { ja: `${DOJIMA.ja}の鍛冶屋で${DOJIMA.ja}と初めて話した`, en: `Talked to ${DOJIMA.en} at his smithy for the first time` },
    group: SMITH_STATE,
  },
  { value: 10, label: { ja: "「そろそろやめる」という会話を聞いた", en: 'Heard him say he will quit soon' }, group: SUCCESSOR },
  { value: 20, label: { ja: `堂島を探してくる`, en: `Go find ${DOJIMA.en}` }, group: SUCCESSOR },
  {
    value: 27,
    label: { ja: `${DOJIMA.ja}に「親方が探していたぞ」と言った`, en: `Told ${DOJIMA.en} the smith was looking for him` },
    group: SUCCESSOR,
  },
  { value: 28, label: { ja: `${DOJIMA.ja}に「鍛冶屋を継げ」と言った`, en: `Told ${DOJIMA.en} to take over the smithy` }, group: SUCCESSOR },
  {
    value: 30,
    label: { ja: `鍛冶屋を継げ → 堂島の意志は固かった`, en: `Told him to take over the smithy → ${DOJIMA.en} would not budge` },
    group: SUCCESSOR,
  },
  { value: 40, label: { ja: "鍛冶屋の過去を知った", en: "Learned the smith's past" }, group: SUCCESSOR },
  { value: 50, label: { ja: `堂島が鍛冶屋を拒むわけを知った`, en: `Learned why ${DOJIMA.en} refuses the smithy` }, group: SUCCESSOR },
  { value: 60, label: { ja: `もう一度、堂島を説得してみよう`, en: `Try to persuade ${DOJIMA.en} once more` }, group: SUCCESSOR },
  { value: 61, label: { ja: `堂島はおとなしくなった`, en: `${DOJIMA.en} calmed down` }, group: SUCCESSOR },
  { value: 69, label: { ja: "夢があった（会話後）", en: "He had a dream (after the talk)" }, group: SUCCESSOR },
  {
    value: 70,
    label: { ja: `堂島の説得に成功した（堂島が鍛冶屋を継ぐ）`, en: `Persuaded ${DOJIMA.en} (${DOJIMA.en} takes over the smithy)` },
    group: SUCCESSOR,
  },
  {
    value: 80,
    label: { ja: `${SMITH.ja}のおやじにお礼を言われた（おやじは引退）`, en: `The old smith thanked you (he retires)` },
    group: SUCCESSOR,
  },
  {
    value: 90,
    label: { ja: `${DOJIMA.ja}が死に、おやじは店を続けられない`, en: `${DOJIMA.en} died; the old smith can't keep the shop` },
    group: SUCCESSOR,
  },
  {
    value: 99,
    label: { ja: "後継者の話を断った・終わった（おやじの鍛冶屋のまま）", en: "Turned down or ended the successor talk (the old smith keeps the shop)" },
    group: SUCCESSOR,
  },
  { value: 81, label: { ja: `鍛冶屋が${DOJIMA.ja}`, en: `${DOJIMA.en} runs the smithy` }, group: SMITH_STATE },
  {
    value: 82,
    label: { ja: `鍛冶屋が${DOJIMA.ja}・おやじが死んだ`, en: `${DOJIMA.en} runs the smithy; the old smith died` },
    group: SMITH_STATE,
  },
  {
    value: 83,
    label: { ja: `鍛冶屋が${DOJIMA.ja}・おやじの死を聞いた`, en: `${DOJIMA.en} runs the smithy; heard the old smith died` },
    group: SMITH_STATE,
  },
  {
    value: 109,
    label: { ja: `${SMITH.ja}のおやじから踏み倒した直後（おやじが怒っている）`, en: `Just skipped paying the old smith (he is angry)` },
    group: SMITH_STATE,
  },
  {
    value: 110,
    label: { ja: `踏み倒したため、おやじが店をやめた`, en: `The old smith quit the shop because you skipped paying` },
    group: SMITH_STATE,
  },
  {
    value: 119,
    label: { ja: `${DOJIMA.ja}から踏み倒した直後（${DOJIMA.ja}が怒っている）`, en: `Just skipped paying ${DOJIMA.en} (he is angry)` },
    group: SMITH_STATE,
  },
  {
    value: 120,
    label: { ja: `踏み倒したため、${DOJIMA.ja}が店をやめた`, en: `${DOJIMA.en} quit the shop because you skipped paying` },
    group: SMITH_STATE,
  },
]);

/** 鍛冶屋 */
export const NPC_SMITH_FLAGS: readonly ByteFlag[] = [
  localizedFlag({
    offset: 0x0127,
    label: { ja: "鍛冶屋の後継者イベント・鍛冶屋の状態", en: "Smithy successor event & smithy status" },
    // ✅ 書き換えで確認済み
    note: {
      ja: "踏み倒しの回数も増える。周回後に誰が鍛冶屋になるかは「堂島が鍛冶屋」が決める",
      en: `Skipping payment also increases the skipped-payment count. Who runs the smithy after a new playthrough is decided by "${DOJIMA.en} is the smith"`,
    },
    values: SMITH_STATES,
  }),
  localizedFlag({
    offset: 0x0132,
    label: { ja: `${DOJIMA.ja}が鍛冶屋`, en: `${DOJIMA.en} is the smith` },
    note: {
      ja: `${DOJIMA.ja}の説得に成功すると継いだ状態になる。周回をまたいで、誰が鍛冶屋になるかを決める（継いでいないまま周回するとおやじに戻り、継いでいると${DOJIMA.ja}になる）`,
      en: `Becomes "took over" when you persuade ${DOJIMA.en}. Decides who runs the smithy across playthroughs (without it the old smith returns; with it ${DOJIMA.en} runs it)`,
    },
    values: flagValues([
      { value: 0, label: { ja: `継いでいない（${SMITH.ja}のおやじ）`, en: `Not taken over (the old smith)` } },
      { value: 1, label: { ja: `継いだ（${DOJIMA.ja}の鍛冶屋）`, en: `Taken over (${DOJIMA.en}'s smithy)` } },
    ]),
  }),
  localizedFlag({
    offset: DOJIMA_SMITH_OFFSET,
    label: { ja: "堂島が鍛冶屋（イベント判定用）", en: `${DOJIMA.en} is the smith (for events)` },
    // 🟢
    note: {
      ja: "堂島の説得に成功すると鍛冶屋で働く状態になり、死ぬと戻る。周回をまたいで残る。町に出るかはなりわいが決める",
      en: `Set when you persuade ${DOJIMA.en} to work at the smithy, and cleared when he dies. Carries over between playthroughs. Whether he appears in town is decided by missions`,
    },
    hint: {
      ja: "鍛冶屋だと剣術大会・病院占拠事件・結末に堂島が出ず、簀巻き日和で助けに来ない（ゲームオーバー）。最後のなりわいに堂島が加わる。普段の堂島の居場所には関係がない",
      en: `As the smith, ${DOJIMA.en} does not appear in the Battle Tournament, OWH (Occupy Western Hospital) or the ending, and does not come to help in All Wrapped Up (game over). He joins the final mission. Does not affect where ${DOJIMA.en} usually is`,
    },
    values: yesNo({ ja: "鍛冶屋ではない", en: "Not the smith" }, { ja: "堂島が鍛冶屋", en: `${DOJIMA.en} is the smith` }),
  }),
];

const MEETING: Localized = { ja: "出会い", en: "Meeting" };
const KIMONO_SHOP: Localized = { ja: "呉服屋", en: "Clothing Store" };
const SUSHI: Localized = { ja: "寿司屋", en: "Sushi-ya" };
const GAMBLING_GUARD: Localized = { ja: "賭場の用心棒", en: "Gambling Den bodyguard" };
const LANGUAGE_SCHOOL: Localized = { ja: "語学所", en: "Language School" };
const DOJO: Localized = { ja: "道場", en: "Dojo" };
const DUEL: Localized = { ja: "手合わせ", en: "Sparring" };
const AFTER: Localized = { ja: "終わったあと", en: "Afterward" };
const RECOMMENDED: Localized = { ja: "紹介した", en: "Recommended her" };
const NO_MANAGER: Localized = { ja: "店長がいない", en: "No manager" };
const TOKYU = "Tokyu Fighting Style";
const TOKYU_TALK: Localized = { ja: "東急流剣術の上達後の会話", en: `Talks after progress in ${TOKYU}` };

/** 道場・先生 */
export const NPC_DOJO_FLAGS: readonly ByteFlag[] = [
  localizedFlag({
    offset: occupationFlagOffset(10),
    label: { ja: `${SENSEI.ja}の段階（仕事探し・道場）`, en: `${SENSEI.en}'s progress (job hunting & dojo)` },
    note: {
      // 🟢
      ja:
        `${SWORDSWOMAN.ja}に働き口を紹介し、道場の師範代にして手合わせするまでの進み具合。値ごとに${SENSEI.ja}の居場所が変わる` +
        `（紹介先は呉服屋・寿司屋・賭場・語学所、そのあと道場、手合わせのときは街道）。` +
        `${SENSEI.ja}と道場の状態によっては、会う前や出会いの段階なら街道に出る。` +
        `「紹介した」は紹介を選んだときに書き、その店で${SENSEI.ja}に話すと「店員になった」など（店長が死んでいれば「店長がいない」）に上書きされる。` +
        `セーブに残り、ロードやエリア移動では消えない。周回の終わりに会っていない状態に戻る。` +
        `ゲームが読むだけで書く場面が見つからない段階は載せていない`,
      en:
        `Progress from finding the swordswoman a job, to making her the dojo's acting master and sparring with her. ${SENSEI.en}'s location changes with each value ` +
        `(the job is at the Clothing Store, Sushi-ya, Gambling Den or Language School, then the dojo; the highway when sparring). ` +
        `Based on the state of ${SENSEI.en} and the dojo, she appears on the highway before meeting or during the meeting stage. ` +
        `"Recommended her" is set when you choose a job, and becomes "Became a clerk" etc. when you talk to ${SENSEI.en} at that shop ("No manager" if the manager is dead). ` +
        `Kept in the save; not cleared by loading or changing areas. Returns to "Not met" at the end of a playthrough. ` +
        `Stages the game never sets are not listed`,
    },
    values: flagValues([
      { value: 0, label: { ja: "会っていない", en: "Not met" } },
      { value: 1, label: { ja: `人斬りを討った${SWORDSWOMAN.ja}に会った`, en: "Met the swordswoman who slew the murderer" }, group: MEETING },
      { value: 2, label: { ja: "「大丈夫か？」と声をかけた", en: 'Asked "Are you all right?"' }, group: MEETING },
      { value: 3, label: { ja: "弟を探していると聞き、働き口を頼まれた", en: "Heard she is looking for her brother; she asked for a job" }, group: MEETING },
      {
        value: 9,
        label: {
          ja: `「すぐに阿弥浜を出ろ」と言った（周回後の道場では、師範代として支えると言われた）`,
          en: `Told her "Leave Amihama at once" (at the dojo after a new playthrough: she offered to support you as acting master)`,
        },
        group: MEETING,
      },
      { value: 10, label: RECOMMENDED, group: KIMONO_SHOP },
      { value: 11, label: { ja: "店員になった", en: "Became a clerk" }, group: KIMONO_SHOP },
      { value: 19, label: NO_MANAGER, group: KIMONO_SHOP },
      { value: 20, label: RECOMMENDED, group: SUSHI },
      { value: 21, label: { ja: "看板娘になった", en: "Became the shop's poster girl" }, group: SUSHI },
      { value: 29, label: NO_MANAGER, group: SUSHI },
      { value: 30, label: RECOMMENDED, group: GAMBLING_GUARD },
      { value: 31, label: { ja: "用心棒になった", en: "Became a bodyguard" }, group: GAMBLING_GUARD },
      { value: 40, label: RECOMMENDED, group: LANGUAGE_SCHOOL },
      { value: 41, label: { ja: "子供の送り迎えをしている", en: "Escorting children to and from school" }, group: LANGUAGE_SCHOOL },
      { value: 49, label: { ja: "語学所が開いていない", en: "The Language School is not open" }, group: LANGUAGE_SCHOOL },
      { value: 50, label: { ja: "道場の師範代を引き受けた", en: "Agreed to be the dojo's acting master" }, group: DOJO },
      { value: 60, label: { ja: "道場に来た", en: "Came to the dojo" }, group: DOJO },
      { value: 70, label: { ja: "手合わせの約束をした（街道で待つ）", en: "Promised to spar (waits on the highway)" }, group: DUEL },
      { value: 71, label: { ja: "賭けをせずに手合わせする", en: "Spar without a wager" }, group: DUEL },
      { value: 72, label: { ja: "賭けで「一夜を共にする」を選んだ", en: 'Chose "Spend the night together" as the wager' }, group: DUEL },
      { value: 73, label: { ja: "賭けで「ごほうび」を選んだ", en: 'Chose "A reward" as the wager' }, group: DUEL },
      { value: 75, label: { ja: "峰打ちで勝った", en: "Won with the back of the blade" }, group: DUEL },
      {
        value: 76,
        label: {
          ja: "「一夜を共にする」の賭けで勝った（話すと夜這いの約束）",
          en: 'Won the "Spend the night together" wager (talk to her for a night crawling appointment)',
        },
        group: DUEL,
      },
      {
        value: 77,
        label: { ja: "「ごほうび」の賭けで勝った（話すと品をもらう）", en: 'Won the "A reward" wager (talk to her to get an item)' },
        group: DUEL,
      },
      { value: 79, label: { ja: "ごほうびをもらった", en: "Received the reward" }, group: DUEL },
      {
        value: 80,
        label: {
          ja: "手合わせを終えた（周回後の道場では、あいさつを済ませた）",
          en: "Finished sparring (at the dojo after a new playthrough: greeted her)",
        },
        group: DUEL,
      },
      {
        value: 99,
        label: {
          ja: `別れた（黒幕を名乗って斬りかかられた、または${OLD_FOSSIL.ja}がいなくなり道場を去った）`,
          en: `Parted ways (she attacked you after you claimed to be the mastermind, or she left the dojo after ${OLD_FOSSIL.en} was gone)`,
        },
        group: AFTER,
      },
    ]),
  }),
  localizedFlag({
    offset: occupationFlagOffset(13),
    label: { ja: `${OLD_FOSSIL.ja}との話の段階`, en: `Talks with ${OLD_FOSSIL.en}` },
    // 🟢
    // 🔶 値 100 は通常の会話をしない値だが、使われる場面は未確認
    note: {
      ja: `道場の師範への任命と、東急流剣術の上達に応じて聞いた話の記録。会話を聞いたあとの状態で、流派の段そのものではない。師範でない状態以外のときだけ${CHALLENGER.ja}が来る。この欄だけを変えても目録の入手や技の習得は反映されない。周回の終わりに師範でない状態に戻る`,
      en: `Records your appointment as dojo master and the talks heard as you progress in ${TOKYU}. This is the state after each talk, not the style's rank itself. ${CHALLENGER.en}s come only when you are the master. Changing only this does not give you the style book or moves. Returns to "Not the master" at the end of a playthrough`,
    },
    values: flagValues([
      { value: 0, label: { ja: "師範でない", en: "Not the master" } },
      { value: 1, label: { ja: "師範に任命された", en: "Appointed master" } },
      { value: 10, label: { ja: "東急流剣術の目録を受け取った", en: `Received the ${TOKYU} book` } },
      {
        value: 20,
        label: { ja: "道場破りを倒すと技を覚える話を聞いた", en: "Heard that defeating challengers teaches moves" },
        group: TOKYU_TALK,
      },
      {
        value: 30,
        label: {
          ja: "東急流の由来（天奈の伝説の侍とその末裔）を聞いた",
          en: "Heard the origin of the Tokyu style (Amana's legendary samurai and his descendants)",
        },
        group: TOKYU_TALK,
      },
      {
        value: 40,
        label: { ja: "道場破りに見知った者がいる話を聞いた", en: "Heard that a familiar face is among the challengers" },
        group: TOKYU_TALK,
      },
      {
        value: 50,
        label: { ja: "かつて大勢いた門下生がいなくなった話を聞いた", en: "Heard how the dojo's many former students left" },
        group: TOKYU_TALK,
      },
      {
        value: 60,
        label: { ja: "東急流を究め、道場破りが元弟子だったと聞いた", en: "Mastered the Tokyu style and heard the challengers were former pupils" },
        group: TOKYU_TALK,
      },
      {
        value: 70,
        label: {
          ja: "皆伝後に「まだ弟子はいる、油断するな」と言われた",
          en: `After full mastery, was told "There are still pupils out there. Stay on guard"`,
        },
        group: TOKYU_TALK,
      },
    ]),
  }),
  localizedFlag({
    offset: occupationFlagOffset(17),
    label: { ja: `${CHALLENGER.ja}で${PUPIL.ja}が一度倒れた`, en: `${PUPIL.en} fell once to a ${CHALLENGER.en}` },
    // 🟢
    note: {
      ja: `一度倒れた状態でもう一度倒れると${PUPIL.ja}が死ぬ。${CHALLENGER.ja}が来ると決まったとき・終わったときに倒れていない状態に戻る`,
      en: `If the ${PUPIL.en} falls again while in this state, the ${PUPIL.en} dies. Returns to "Has not fallen" when a ${CHALLENGER.en} is decided to come and when it ends`,
    },
    hint: {
      ja: `一度倒れた状態だと、${CHALLENGER.ja}で${PUPIL.ja}がもう一度倒れたときに死ぬ`,
      en: `In this state, the ${PUPIL.en} dies if they fall again to a ${CHALLENGER.en}`,
    },
    values: yesNo({ ja: "倒れていない", en: "Has not fallen" }, { ja: "一度倒れた", en: "Fell once" }),
  }),
  localizedFlag({
    offset: occupationFlagOffset(18),
    label: { ja: `${OLD_FOSSIL.ja}が授業料で買った物の話`, en: `What ${OLD_FOSSIL.en} bought with the tuition` },
    // 🟢
    note: {
      ja: "道場の評判（☆0〜5）が上がるたびに、次の買い物の話に進む（☆5 で土地をもらう）。周回の終わりに始まる前に戻る",
      en: 'Moves on to the next purchase each time the dojo reputation (☆0–5) rises (at ☆5 you get land). Returns to "Not started" at the end of a playthrough',
    },
    values: flagValues([
      { value: 0, label: { ja: "始まる前", en: "Not started" } },
      { value: 19, label: { ja: "パイプ", en: "Pipe" } },
      { value: 29, label: { ja: "杖", en: "Cane" } },
      { value: 39, label: { ja: "シルクハット", en: "Silk Hat" } },
      { value: 49, label: { ja: "写真機", en: "Camera" } },
      { value: 59, label: { ja: "騎士の称号", en: "Knighthood" } },
      { value: 99, label: { ja: "土地をもらった", en: "Received land" } },
    ]),
  }),
  localizedFlag({
    offset: occupationFlagOffset(20),
    label: { ja: "師範になったことがある", en: "Has been the dojo master" },
    // 🟢
    note: {
      ja: `${OLD_FOSSIL.ja}が死ぬなどで道場を失うとなっていない状態に戻る。周回の始めになったことがあるなら、3000文か${SENSEI.ja}との勝負で師範に戻れる。周回をまたいで残る`,
      en: `Returns to "Never" when you lose the dojo, such as when ${OLD_FOSSIL.en} dies. If set at the start of a playthrough, you can become master again for 3000 mon or by beating ${SENSEI.en}. Carries over between playthroughs`,
    },
    hint: {
      ja: `話しかけただけで道場がもらえるか（なっていないならもらえる。なったことがあると3000文か${SENSEI.ja}との勝負が要る）。${OLD_FOSSIL.ja}が死ぬとリセット`,
      en: `Whether just talking gets you the dojo (you do if never; otherwise 3000 mon or a match with ${SENSEI.en} is needed). Reset when ${OLD_FOSSIL.en} dies`,
    },
    values: yesNo({ ja: "なっていない", en: "Never" }, { ja: "なったことがある", en: "Has been" }),
  }),
  localizedFlag({
    offset: occupationFlagOffset(21),
    label: { ja: `${SENSEI.ja}が道場の師範代`, en: `${SENSEI.en} is the dojo's acting master` },
    // 🟢
    note: {
      ja: `${SENSEI.ja}が追い出される・死ぬ、${OLD_FOSSIL.ja}が死ぬと師範代でなくなる。周回をまたいで残る`,
      en: `Cleared when ${SENSEI.en} is thrown out or dies, or when ${OLD_FOSSIL.en} dies. Carries over between playthroughs`,
    },
    values: flagValues([
      { value: 0, label: { ja: "師範代ではない", en: "Not acting master" } },
      { value: 1, label: { ja: `${SENSEI.ja}が師範代`, en: `${SENSEI.en} is acting master` } },
      {
        value: 2,
        label: {
          ja: `師範でない${HERO.ja}が道場の${SENSEI.ja}を倒した（${OLD_FOSSIL.ja}に話すと師範になる）`,
          en: `You defeated ${SENSEI.en} at the dojo while not the master (talk to ${OLD_FOSSIL.en} to become master)`,
        },
      },
    ]),
  }),
  localizedFlag({
    offset: SENSEI_DOJO_OFFSET,
    label: { ja: "先生が道場の師範代（イベント判定用）", en: `${SENSEI.en} is the dojo's acting master (for events)` },
    // 🟢
    note: {
      ja: "先生が主人公の道場の師範代になる状態で、死ぬ・追い出す・道場を失うと戻る。周回をまたいで残る。町に出るかはなりわいが決める",
      en: `Set while ${SENSEI.en} is acting master of your dojo; cleared when she dies, is thrown out, or you lose the dojo. Carries over between playthroughs. Whether she appears in town is decided by missions`,
    },
    hint: {
      ja: "師範代だと無所属の剣術大会で先生が相手に出ず、道場破りを先生が 80% で追い払う。最後のなりわいに先生が加わる。普段の先生の居場所には関係がない",
      en: `As acting master, ${SENSEI.en} is not an opponent in Battle Tournament (Independent), and drives off challengers 80% of the time. She joins the final mission. Does not affect where ${SENSEI.en} usually is`,
    },
    values: yesNo({ ja: "師範代ではない", en: "Not acting master" }, { ja: "道場の師範代", en: "Acting master of the dojo" }),
  }),
];

/** その他 */
export const NPC_OTHER_FLAGS: readonly ByteFlag[] = [
  localizedFlag({
    offset: occupationFlagOffset(16),
    label: { ja: `${PHOTOGRAPHER.ja}の初回の説明を聞いた`, en: `Heard the ${PHOTOGRAPHER.en}'s first explanation` },
    // 🟢
    note: { ja: "周回をまたいで残る", en: "Carries over between playthroughs" },
    values: yesNo({ ja: "聞いていない", en: "Not heard" }, { ja: "聞いた", en: "Heard" }),
  }),
  localizedFlag({
    offset: occupationFlagOffset(23),
    label: { ja: `${DUELIST.ja}と${REVENGE_HORSE.ja}`, en: `${DUELIST.en} and ${REVENGE_HORSE.en}` },
    // 🟢
    // 🔶 2・3 は次に出ると 1 に戻る
    note: {
      ja: `クリア・立ち去りで周回を終えるとなしに戻る（死亡では残る）。${DUELIST.ja}が出るたびに「出た」になるので、頼みを引き受けた状態は次に${DUELIST.ja}が出ると「出た」に戻る`,
      en: `Returns to "None" when a playthrough ends by clearing or leaving (kept on death). It becomes "Appeared" each time the ${DUELIST.en} appears, so the accepted-request state returns to "Appeared" the next time the ${DUELIST.en} appears`,
    },
    values: flagValues([
      { value: 0, label: { ja: "なし", en: "None" } },
      { value: 1, label: { ja: `${DUELIST.ja}が出た`, en: `The ${DUELIST.en} appeared` } },
      { value: 2, label: { ja: "馬の頼みを引き受けた", en: "Accepted the horse's request" } },
      { value: 3, label: { ja: `引き受けたあと${DUELIST.ja}を倒した`, en: `Defeated the ${DUELIST.en} after accepting` } },
    ]),
  }),
  localizedFlag({
    offset: occupationFlagOffset(24),
    label: { ja: "夜這い仲間の初回の説明を聞いた", en: "Heard the night crawling partner's first explanation" },
    // 🟢
    note: { ja: "周回の終わりに聞いていない状態に戻る", en: 'Returns to "Not heard" at the end of a playthrough' },
    values: yesNo({ ja: "聞いていない", en: "Not heard" }, { ja: "聞いた", en: "Heard" }),
  }),
];
