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
import { nameOf } from "../master/labels";
import { occupationFlagOffset } from "../townsfolk";
import { yesNo, type ByteFlag, type FlagValue } from "./byte-flag";

/** 🟢 堂島が鍛冶屋（u8）。周回をまたいで残る（周回の初期化でも残す。new-cycle.ts） */
export const DOJIMA_SMITH_OFFSET = 0x3799;
/** 🟢 先生が道場の師範代（u8）。周回をまたいで残る（周回の初期化でも残す。new-cycle.ts） */
export const SENSEI_DOJO_OFFSET = 0x379a;

/** ✅ [U] 2026-10-06：0x0127 の値（書き換えで確認） */
export const SMITH_STATES: readonly FlagValue[] = [
  { value: 0, label: "未会話", group: "後継者イベント" },
  { value: 10, label: "「そろそろやめる」という会話を聞いた", group: "後継者イベント" },
  { value: 20, label: `堂島を探してくる`, group: "後継者イベント" },
  { value: 30, label: `鍛冶屋を継げ → 堂島の意志は固かった`, group: "後継者イベント" },
  { value: 40, label: "鍛冶屋の過去を知った", group: "後継者イベント" },
  { value: 50, label: `堂島が鍛冶屋を拒むわけを知った`, group: "後継者イベント" },
  { value: 60, label: `もう一度、堂島を説得してみよう`, group: "後継者イベント" },
  { value: 61, label: `堂島はおとなしくなった`, group: "後継者イベント" },
  { value: 69, label: "夢があった（会話後）", group: "後継者イベント" },
  {
    value: 70,
    label: `堂島の説得に成功した（堂島が鍛冶屋を継ぐ）`,
    group: "後継者イベント",
  },
  { value: 81, label: `鍛冶屋が${nameOf.npc(14)}`, group: "鍛冶屋の状態" },
  { value: 110, label: `${nameOf.npc(25)}のおやじから踏み倒した`, group: "鍛冶屋の状態" },
  { value: 119, label: `${nameOf.npc(14)}から踏み倒した`, group: "鍛冶屋の状態" },
  { value: 120, label: `${nameOf.npc(14)}が死亡`, group: "鍛冶屋の状態" },
];

/** 鍛冶屋 */
export const NPC_SMITH_FLAGS: readonly ByteFlag[] = [
  {
    offset: 0x0127,
    label: "鍛冶屋の後継者イベント・鍛冶屋の状態",
    // ✅ 書き換えで確認済み
    note: "踏み倒しの回数も増える。周回後に誰が鍛冶屋になるかは「堂島が鍛冶屋」が決める",
    values: SMITH_STATES,
  },
  {
    offset: 0x0132,
    label: `${nameOf.npc(14)}が鍛冶屋`,
    note: `${nameOf.npc(14)}の説得に成功すると継いだ状態になる。周回をまたいで、誰が鍛冶屋になるかを決める（継いでいないまま周回するとおやじに戻り、継いでいると${nameOf.npc(14)}になる）`,
    values: [
      { value: 0, label: `継いでいない（${nameOf.npc(25)}のおやじ）` },
      { value: 1, label: `継いだ（${nameOf.npc(14)}の鍛冶屋）` },
    ],
  },
  {
    offset: DOJIMA_SMITH_OFFSET,
    label: "堂島が鍛冶屋（イベント判定用）",
    // 🟢
    note: "堂島の説得に成功すると鍛冶屋で働く状態になり、死ぬと戻る。周回をまたいで残る。町に出るかはなりわいが決める",
    hint: "鍛冶屋だと剣術大会・病院占拠事件・結末に堂島が出ず、簀巻き日和で助けに来ない（ゲームオーバー）。最後のなりわいに堂島が加わる。普段の堂島の居場所には関係がない",
    values: yesNo("鍛冶屋ではない", "堂島が鍛冶屋"),
  },
];

/** 道場・先生 */
export const NPC_DOJO_FLAGS: readonly ByteFlag[] = [
  {
    offset: occupationFlagOffset(10),
    label: `${nameOf.npc(15)}の段階（仕事探し・道場）`,
    note:
      // 🟢
      `${nameOf.npc(93)}に働き口を紹介し、道場の師範代にして手合わせするまでの進み具合。値ごとに${nameOf.npc(15)}の居場所が変わる` +
      `（紹介先は呉服屋・寿司屋・賭場・語学所、そのあと道場、手合わせのときは街道）。` +
      `${nameOf.npc(15)}と道場の状態によっては、会う前や出会いの段階なら街道に出る。` +
      `「紹介した」は紹介を選んだときに書き、その店で${nameOf.npc(15)}に話すと「店員になった」など（店長が死んでいれば「店長がいない」）に上書きされる。` +
      `セーブに残り、ロードやエリア移動では消えない。周回の終わりに会っていない状態に戻る。` +
      `ゲームが読むだけで書く場面が見つからない段階は載せていない`,
    values: [
      { value: 0, label: "会っていない" },
      { value: 1, label: `人斬りを討った${nameOf.npc(93)}に会った`, group: "出会い" },
      { value: 2, label: "「大丈夫か？」と声をかけた", group: "出会い" },
      { value: 3, label: "弟を探していると聞き、働き口を頼まれた", group: "出会い" },
      {
        value: 9,
        label: `「すぐに阿弥浜を出ろ」と言った（周回後の道場では、師範代として支えると言われた）`,
        group: "出会い",
      },
      { value: 10, label: "紹介した", group: "呉服屋" },
      { value: 11, label: "店員になった", group: "呉服屋" },
      { value: 19, label: "店長がいない", group: "呉服屋" },
      { value: 20, label: "紹介した", group: "寿司屋" },
      { value: 21, label: "看板娘になった", group: "寿司屋" },
      { value: 29, label: "店長がいない", group: "寿司屋" },
      { value: 30, label: "紹介した", group: "賭場の用心棒" },
      { value: 31, label: "用心棒になった", group: "賭場の用心棒" },
      { value: 40, label: "紹介した", group: "語学所" },
      { value: 41, label: "子供の送り迎えをしている", group: "語学所" },
      { value: 49, label: "語学所が開いていない", group: "語学所" },
      { value: 50, label: "道場の師範代を引き受けた", group: "道場" },
      { value: 60, label: "道場に来た", group: "道場" },
      { value: 70, label: "手合わせの約束をした（街道で待つ）", group: "手合わせ" },
      { value: 71, label: "賭けをせずに手合わせする", group: "手合わせ" },
      { value: 72, label: "賭けで「一夜を共にする」を選んだ", group: "手合わせ" },
      { value: 73, label: "賭けで「ごほうび」を選んだ", group: "手合わせ" },
      { value: 75, label: "峰打ちで勝った", group: "手合わせ" },
      {
        value: 76,
        label: "「一夜を共にする」の賭けで勝った（話すと夜這いの約束）",
        group: "手合わせ",
      },
      { value: 77, label: "「ごほうび」の賭けで勝った（話すと品をもらう）", group: "手合わせ" },
      { value: 79, label: "ごほうびをもらった", group: "手合わせ" },
      {
        value: 80,
        label: "手合わせを終えた（周回後の道場では、あいさつを済ませた）",
        group: "手合わせ",
      },
      {
        value: 99,
        label: `別れた（黒幕を名乗って斬りかかられた、または${nameOf.npc(32)}がいなくなり道場を去った）`,
        group: "終わったあと",
      },
    ],
  },
  {
    offset: occupationFlagOffset(13),
    label: `${nameOf.npc(32)}との話の段階`,
    // 🟢
    // 🔶 値 100 は通常の会話をしない値だが、使われる場面は未確認
    note: `道場の師範への任命と、東急流剣術の上達に応じて聞いた話の記録。会話を聞いたあとの状態で、流派の段そのものではない。師範でない状態以外のときだけ${nameOf.npc(157)}が来る。この欄だけを変えても目録の入手や技の習得は反映されない。周回の終わりに師範でない状態に戻る`,
    values: [
      { value: 0, label: "師範でない" },
      { value: 1, label: "師範に任命された" },
      { value: 10, label: "東急流剣術の目録を受け取った" },
      {
        value: 20,
        label: "道場破りを倒すと技を覚える話を聞いた",
        group: "東急流剣術の上達後の会話",
      },
      {
        value: 30,
        label: "東急流の由来（天奈の伝説の侍とその末裔）を聞いた",
        group: "東急流剣術の上達後の会話",
      },
      {
        value: 40,
        label: "道場破りに見知った者がいる話を聞いた",
        group: "東急流剣術の上達後の会話",
      },
      {
        value: 50,
        label: "かつて大勢いた門下生がいなくなった話を聞いた",
        group: "東急流剣術の上達後の会話",
      },
      {
        value: 60,
        label: "東急流を究め、道場破りが元弟子だったと聞いた",
        group: "東急流剣術の上達後の会話",
      },
      {
        value: 70,
        label: "皆伝後に「まだ弟子はいる、油断するな」と言われた",
        group: "東急流剣術の上達後の会話",
      },
    ],
  },
  {
    offset: occupationFlagOffset(17),
    label: `${nameOf.npc(157)}で${nameOf.npc(156)}が一度倒れた`,
    // 🟢
    note: `一度倒れた状態でもう一度倒れると${nameOf.npc(156)}が死ぬ。${nameOf.npc(157)}が来ると決まったとき・終わったときに倒れていない状態に戻る`,
    hint: `一度倒れた状態だと、${nameOf.npc(157)}で${nameOf.npc(156)}がもう一度倒れたときに死ぬ`,
    values: yesNo("倒れていない", "一度倒れた"),
  },
  {
    offset: occupationFlagOffset(18),
    label: `${nameOf.npc(32)}が授業料で買った物の話`,
    // 🟢
    note: "道場の評判（☆0〜5）が上がるたびに、次の買い物の話に進む（☆5 で土地をもらう）。周回の終わりに始まる前に戻る",
    values: [
      { value: 0, label: "始まる前" },
      { value: 19, label: "パイプ" },
      { value: 29, label: "杖" },
      { value: 39, label: "シルクハット" },
      { value: 49, label: "写真機" },
      { value: 59, label: "騎士の称号" },
      { value: 99, label: "土地をもらった" },
    ],
  },
  {
    offset: occupationFlagOffset(20),
    label: "師範になったことがある",
    // 🟢
    note: `${nameOf.npc(32)}が死ぬなどで道場を失うとなっていない状態に戻る。周回の始めになったことがあるなら、3000文か${nameOf.npc(15)}との勝負で師範に戻れる。周回をまたいで残る`,
    hint: `話しかけただけで道場がもらえるか（なっていないならもらえる。なったことがあると3000文か${nameOf.npc(15)}との勝負が要る）。${nameOf.npc(32)}が死ぬとリセット`,
    values: yesNo("なっていない", "なったことがある"),
  },
  {
    offset: occupationFlagOffset(21),
    label: `${nameOf.npc(15)}が道場の師範代`,
    // 🟢
    note: `${nameOf.npc(15)}が追い出される・死ぬ、${nameOf.npc(32)}が死ぬと師範代でなくなる。周回をまたいで残る`,
    values: [
      { value: 0, label: "師範代ではない" },
      { value: 1, label: `${nameOf.npc(15)}が師範代` },
      {
        value: 2,
        label: `師範でない${nameOf.npc(59)}が道場の${nameOf.npc(15)}を倒した（${nameOf.npc(32)}に話すと師範になる）`,
      },
    ],
  },
  {
    offset: SENSEI_DOJO_OFFSET,
    label: "先生が道場の師範代（イベント判定用）",
    // 🟢
    note: "先生が主人公の道場の師範代になる状態で、死ぬ・追い出す・道場を失うと戻る。周回をまたいで残る。町に出るかはなりわいが決める",
    hint: "師範代だと無所属の剣術大会で先生が相手に出ず、道場破りを先生が 80% で追い払う。最後のなりわいに先生が加わる。普段の先生の居場所には関係がない",
    values: yesNo("師範代ではない", "道場の師範代"),
  },
];

/** その他 */
export const NPC_OTHER_FLAGS: readonly ByteFlag[] = [
  {
    offset: occupationFlagOffset(16),
    label: `${nameOf.npc(159)}の初回の説明を聞いた`,
    // 🟢
    note: "周回をまたいで残る",
    values: yesNo("聞いていない", "聞いた"),
  },
  {
    offset: occupationFlagOffset(23),
    label: `${nameOf.npc(114)}と${nameOf.npc(92)}`,
    // 🟢
    // 🔶 2・3 は次に出ると 1 に戻る
    note: `クリア・立ち去りで周回を終えるとなしに戻る（死亡では残る）。${nameOf.npc(114)}が出るたびに「出た」になるので、頼みを引き受けた状態は次に${nameOf.npc(114)}が出ると「出た」に戻る`,
    values: [
      { value: 0, label: "なし" },
      { value: 1, label: `${nameOf.npc(114)}が出た` },
      { value: 2, label: "馬の頼みを引き受けた" },
      { value: 3, label: `引き受けたあと${nameOf.npc(114)}を倒した` },
    ],
  },
  {
    offset: occupationFlagOffset(24),
    label: "夜這い仲間の初回の説明を聞いた",
    // 🟢
    note: "周回の終わりに聞いていない状態に戻る",
    values: yesNo("聞いていない", "聞いた"),
  },
];
