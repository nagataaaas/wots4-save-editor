// 町の人の状態 0x011C〜0x0B33（2,584 B）。出典：docs/save_format/chunks/townsfolk。
//
// 🟢 前半 0x011C〜0x015B は「なりわいのフラグ」u8 × 64（0x011C + 番号）。
//    0x0120（番号 4、【岡っ引き】野戸仏の連続なりわい）は書き換えで確認（✅ 2026-10-07）。
//    連続なりわいなどの番号（4〜9・25〜31）は OCCUPATION_FLAG_NOTES に値の表を持ち、なりわいの画面で編集する（4 以外は 🟢）。
//    0・12・14・32〜63 は使われていない 🟢。
//    1〜3（会話の回数）と 15（開発用）はエリア移動・ロードで 0 に戻る 🟢。エディタで書いてもロードで消えるので扱わない。
//    範囲の中で書くのは、意味の分かったフラグ（TOWNSFOLK_NOTES）と死亡のビット（writePersonDead）だけ。生のバイトの編集欄は出さない
// 🟢 後半 0x015C〜0x0B33 は町の人（人物番号 p、0〜209）ごとの 12 B のレコード（0x015C + 12 × p）。
//    使われているのは先頭の u32 のビット 0（死亡・町からいなくなった）だけ。ほかのビットと +0x04〜+0x0B は使われていない 🟢。
//    斬られたときのほか、引退（堂島が継いだあとのおやじ）や道場主を怒らせたときにも立つ。夜這いの場面で倒した相手には立たない。
//    周回の終わりにまとめて 0（全員が生き返る）。ビットだけを外しても生き返らない人物がいる（reviveNote）。
//    ✅ [U] 2026-10-06：堂島（p 22、0x0264）・寿司屋（p 30、0x02C4）・鍛冶屋のおやじ（p 62、0x0444）の死亡を差分で確認し、
//       寿司屋と鍛冶屋のおやじは 0 に戻すと生き返った。さよ（p 81、0x0528）は差分1回で死亡を見た（生き返りは要ゲーム内確認）
//
//   0x0127  ✅ [U] 2026-10-06 鍛冶屋の後継者イベントと鍛冶屋の状態（SMITH_STATES。書き換えで確認）。
//   0x0132  ✅ [U] 2026-10-06 堂島が鍛冶屋を継いだフラグ。0x0127 が 70（堂島の説得に成功）になると 1 になる。
//              0 のまま周回すると、0x0127 が 81 でも鍛冶屋はおやじに戻った。1 にして周回すると堂島の鍛冶屋になった
//
// 固定オフセットで読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU8, writeU8 } from "./binary";
import { checkLayout } from "./hero";
import { nameOf, occupationGroupLabel } from "./master/labels";
import { occupationGroupByKey } from "./master/occupation-names";

/** 🟢 主人公名（〜0x011B）の直後 */
export const TOWNSFOLK_START = 0x011c;
/** 🟢 人物のレコードの終わり（直後の 0x0B34〜 は侍評価） */
export const TOWNSFOLK_END = 0x0b33;
export const TOWNSFOLK_LENGTH = TOWNSFOLK_END - TOWNSFOLK_START + 1;

/** 通常モードで新しく書ける上限。0／1 のフラグとして扱う（今の値と同じ値の書き戻しは許す） */
export const TOWNSFOLK_NORMAL_MAX = 1;

/** ✅ [U] 鍛冶屋の後継者イベントと鍛冶屋の状態 */
export const SMITH_STATE_OFFSET = 0x0127;

/** ✅ [U] 2026-10-06：0x0127 の値（書き換えで確認） */
export const SMITH_STATES: readonly { value: number; label: string; group: string }[] = [
  { value: 0, label: "未会話", group: "後継者イベント" },
  { value: 10, label: "「そろそろやめる」という会話を聞いた", group: "後継者イベント" },
  { value: 20, label: `${nameOf.npc(14)}を探してくる`, group: "後継者イベント" },
  { value: 30, label: `鍛冶屋を継げ → ${nameOf.npc(14)}の意志は固かった`, group: "後継者イベント" },
  { value: 40, label: "鍛冶屋の過去を知った", group: "後継者イベント" },
  { value: 50, label: `${nameOf.npc(14)}が鍛冶屋を拒むわけを知った`, group: "後継者イベント" },
  { value: 60, label: `もう一度、${nameOf.npc(14)}を説得してみよう`, group: "後継者イベント" },
  { value: 61, label: `${nameOf.npc(14)}はおとなしくなった`, group: "後継者イベント" },
  { value: 69, label: "夢があった（会話後）", group: "後継者イベント" },
  { value: 70, label: `${nameOf.npc(14)}の説得に成功した（0x0132 が 1 になる）`, group: "後継者イベント" },
  { value: 81, label: `${nameOf.npc(14)}の鍛冶屋`, group: "鍛冶屋の状態" },
  { value: 110, label: `${nameOf.npc(25)}のおやじから踏み倒した`, group: "鍛冶屋の状態" },
  { value: 119, label: `${nameOf.npc(14)}から踏み倒した`, group: "鍛冶屋の状態" },
  { value: 120, label: `${nameOf.npc(14)}が死亡`, group: "鍛冶屋の状態" },
];

export type TownsfolkValue = { value: number; label: string; group?: string };

export type TownsfolkNote = {
  name?: string;
  note: string;
  values?: readonly TownsfolkValue[];
};

/** 🟢 なりわいのフラグ（0x011C + 番号、u8 × 64）の先頭 */
export const OCCUPATION_FLAG_START = 0x011c;
/** 🟢 なりわいのフラグの件数 */
export const OCCUPATION_FLAG_COUNT = 64;

export function occupationFlagOffset(n: number): number {
  return OCCUPATION_FLAG_START + n;
}

/**
 * 連続なりわい（番号 4〜7）の値。十の位が何件目か、一の位が 0＝依頼前・1＝依頼済み。100 で完了。
 * 「連続なりわい」は Wiki での呼び方（ゲーム内の文には呼び方がなく、開発用のメニューだけ「組合ミッション」）。
 * ✅ 番号 4（野戸仏）は 20＝2件目から始まる・100＝完了を書き換えで確認（2026-10-07）。番号 5〜7 は 🟢。
 * 90・91・97・99 の細かい違いは ❓
 */
export const SERIES_VALUES: readonly TownsfolkValue[] = [
  { value: 0, label: "依頼主に会う前" },
  ...Array.from({ length: 8 }, (_, i) => [
    { value: (i + 1) * 10, label: `${i + 1}件目を依頼する前`, group: `${i + 1}件目` },
    { value: (i + 1) * 10 + 1, label: `${i + 1}件目を依頼済み`, group: `${i + 1}件目` },
  ]).flat(),
  ...[90, 91, 97, 99].map((value) => ({ value, label: "最後の件の前後", group: "最後の件" })),
  { value: 100, label: "連続なりわいを終えた" },
];

/** 0／1 のフラグの値 */
const yesNo = (no: string, yes: string): TownsfolkValue[] => [
  { value: 0, label: no },
  { value: 1, label: yes },
];

/** 汁部（DLC）の 209〜212 それぞれの進み具合（🟢） */
const SHIRUBE_RESULT_VALUES: readonly TownsfolkValue[] = [
  { value: 0, label: "受注前" },
  { value: 1, label: "成功" },
  { value: 2, label: "成功……？（失敗を成功扱いにしてもらった）" },
];

/** 汁部（DLC）のなりわい 209〜212 の名前 */
export const SHIRUBE_JOBS = [
  nameOf.occupation(209),
  nameOf.occupation(210),
  nameOf.occupation(211),
  nameOf.occupation(212),
] as const;

/** なりわいのまとまりの見出し（【岡っ引き】野戸仏 など）。なりわいの画面の絞り込みと同じ */
const groupTitle = (key: string): string => occupationGroupLabel(occupationGroupByKey(key)!);

/**
 * なりわいのフラグのうち、なりわいの画面で扱う番号の説明（chunks/townsfolk「なりわいのフラグ」）。
 * 0x0120（番号 4）だけ ✅、ほかは 🟢
 */
export const OCCUPATION_FLAG_NOTES: Readonly<Record<number, TownsfolkNote>> = {
  [occupationFlagOffset(4)]: {
    name: groupTitle("police"),
    note: `代官所の同心 ${nameOf.npc(40)}新太郎の連続なりわい 171〜178。書き換えると${nameOf.npc(40)}の次の依頼が変わる（確認済み：20 で2件目「督促状」から、100 で完了）`,
    values: SERIES_VALUES,
  },
  [occupationFlagOffset(5)]: {
    name: groupTitle("gangster"),
    note: `🟢 町の極道者 ${nameOf.npc(45)}戒の連続なりわい 179〜186`,
    values: SERIES_VALUES,
  },
  [occupationFlagOffset(6)]: {
    name: groupTitle("thief"),
    note: `🟢 港の${nameOf.npc(169)}の連続なりわい 187〜194`,
    values: SERIES_VALUES,
  },
  [occupationFlagOffset(7)]: {
    name: groupTitle("homeless"),
    note: `🟢 居留地の${nameOf.npc(76)}の連続なりわい 195〜206`,
    values: SERIES_VALUES,
  },
  [occupationFlagOffset(8)]: {
    name: groupTitle("sakotsu"),
    note:
      `🟢 代官所の同心頭 ${nameOf.npc(37)}上武之介との話の段階。30 で治安なりわい 163〜166（賭場を偵察・訪問・襲撃・殲滅）を頼める。` +
      "連続ではなく、そのときの治安で受けられるなりわいが変わり、何回でも受けられる（[U] 2026-10-07）",
    values: [
      { value: 0, label: "まだ会っていない" },
      { value: 10, label: "名乗りを聞いた" },
      { value: 20, label: "人斬りに誘われた（断ると 20 のまま）" },
      { value: 30, label: "引き受けた（治安なりわいを頼める）" },
    ],
  },
  [occupationFlagOffset(9)]: {
    name: groupTitle("okami"),
    note:
      `🟢 賭場の${nameOf.npc(44)}の治安なりわい 167〜170（代官所を偵察・訪問・襲撃・殲滅）。` +
      "連続ではなく、そのときの治安で受けられるなりわいが変わり、何回でも受けられる（[U] 2026-10-07）。" +
      `${nameOf.npc(44)}は最終なりわい（阿弥浜八人衆 208）を始める人でもある。20 以上で${nameOf.npc(44)}は賭場に移る（🟢）`,
    values: [
      { value: 0, label: "まだ仕事を頼んでいない" },
      { value: 1, label: "仕事を頼んで怒られた" },
      { value: 10, label: `度胸を認められた（${nameOf.npc(45)}の連続なりわいが始まる）` },
      { value: 20, label: `${nameOf.npc(44)}の裏の顔を聞いた` },
      { value: 21, label: `${nameOf.npc(44)}に酒をおごってもらった` },
    ],
  },
  [occupationFlagOffset(25)]: {
    name: "四天王の話",
    note: `🟢 連続なりわい4つ（${nameOf.npc(40)}・${nameOf.npc(45)}・${nameOf.npc(169)}・${nameOf.npc(76)}）のどれかを終えたとき、ほかの3つがすべて 100 なら 1 になる`,
    values: [
      { value: 0, label: "始まる前" },
      { value: 1, label: "連続なりわい4つを全部終えた" },
      { value: 8, label: "「四天王の証」を受け取った" },
      { value: 99, label: "段階 99" },
      { value: 100, label: "段階 100" },
    ],
  },
  [occupationFlagOffset(26)]: {
    name: "最終なりわい",
    note:
      `🟢 なりわい 207・208 と、${nameOf.npc(73)}（${nameOf.npc(76)}）の病気の進み具合。10 以上が治療済み（${nameOf.npc(44)}が薬代を出した）。` +
      "43 以上で医者が「病み上がり」と言う（43 ちょうどを書く場面はなく、99・100 で当てはまる）。" +
      "99 以上で、連続なりわいを終えた依頼主から8件を選び直せる（99 未満だと新しい依頼が出ないことは確認済み）。" +
      "治療すると 12 以降に進み、四天王対四人組（207）から阿弥浜八人衆（208）に発展する。治療しないと 207 で終わる（🔶）",
    values: [
      { value: 0, label: "始まる前" },
      { value: 1, label: `${nameOf.npc(73)}が寝込んだ`, group: `${nameOf.npc(73)}の病気` },
      { value: 2, label: "医者に「薬代を出す金持ちを探せ」と言われた", group: `${nameOf.npc(73)}の病気` },
      { value: 10, label: `${nameOf.npc(44)}が薬代を出した（治療）`, group: `${nameOf.npc(73)}の病気` },
      { value: 11, label: "薬を投与した", group: `${nameOf.npc(73)}の病気` },
      { value: 12, label: "外国の軍団の話を聞いた（四天王の話も 60）", group: "阿弥浜八人衆" },
      { value: 15, label: "四人組が街道で迎え撃つ", group: "阿弥浜八人衆" },
      { value: 20, label: "阿弥浜八人衆を受注した", group: "阿弥浜八人衆" },
      { value: 99, label: "連続なりわいを選び直せる", group: "終わったあと" },
      {
        value: 100,
        label: "阿弥浜八人衆を終えた（連続なりわいを選び直せる）",
        group: "終わったあと",
      },
    ],
  },
  [occupationFlagOffset(27)]: {
    name: `${nameOf.npc(211)}（DLC）と知り合ったか`,
    note: `🟢 ${nameOf.npc(81)} ${nameOf.npc(211)}理人の誘いに乗って組むと 1。一度組むと 1 のまま`,
    values: yesNo("知り合う前（組んでいない）", "知り合った（組んでいる）"),
  },
  ...Object.fromEntries(
    SHIRUBE_JOBS.map((job, i) => [
      occupationFlagOffset(28 + i),
      {
        name: `${nameOf.npc(211)}の「${job}」`,
        note: `🟢 なりわい ${209 + i} の進み具合（破棄しても 0）。成功は残る。${nameOf.npc(211)}は 28〜31 のうち最初に 0 のものの仕事を頼む。0 がなく「成功……？」があれば「あきらめた仕事があるよな」と言い、頼み直すと 0 に戻る。すべて成功ならもう頼まない`,
        values: SHIRUBE_RESULT_VALUES,
      },
    ]),
  ),
};

/** なりわいの画面で扱うオフセット（町の人の状態の画面では入力欄を並べない） */
export const OCCUPATION_FLAG_OFFSETS: readonly number[] =
  Object.keys(OCCUPATION_FLAG_NOTES).map(Number);

/**
 * 🟢 なりわいの画面で扱わない、意味の分かったなりわいのフラグ（chunks/townsfolk）。
 * エリア移動・ロードで 0 に戻るもの（会話の回数 1〜3、開発用の 15）は、エディタで書いてもロードで消えるので載せない
 */
const OTHER_FLAG_NOTES: Readonly<Record<number, TownsfolkNote>> = {
  [occupationFlagOffset(13)]: {
    name: `${nameOf.npc(32)}との話の段階`,
    note: `🟢 道場の師範への任命と、東急流剣術の上達に応じて聞いた話の記録。値は会話を聞いたあとの状態で、流派の段そのものではない。0 でないときだけ${nameOf.npc(157)}が来る。この欄だけを変えても目録の入手や技の習得は反映されない。周回の終わりに 0（🔶 100 は通常の会話をしない値だが、使われる場面は未確認）`,
    values: [
      { value: 0, label: "師範でない" },
      { value: 1, label: "師範に任命された" },
      { value: 10, label: "東急流剣術の目録を受け取った" },
      { value: 20, label: "道場破りを倒すと技を覚える話を聞いた", group: "東急流剣術の上達後の会話" },
      { value: 30, label: "東急流の由来（天奈の伝説の侍とその末裔）を聞いた", group: "東急流剣術の上達後の会話" },
      { value: 40, label: "道場破りに見知った者がいる話を聞いた", group: "東急流剣術の上達後の会話" },
      { value: 50, label: "かつて大勢いた門下生がいなくなった話を聞いた", group: "東急流剣術の上達後の会話" },
      { value: 60, label: "東急流を究め、道場破りが元弟子だったと聞いた", group: "東急流剣術の上達後の会話" },
      { value: 70, label: "皆伝後に「まだ弟子はいる、油断するな」と言われた", group: "東急流剣術の上達後の会話" },
    ],
  },
  [occupationFlagOffset(16)]: {
    name: `${nameOf.npc(159)}の初回の説明を聞いた`,
    note: "🟢 周回をまたいで残る",
    values: yesNo("聞いていない", "聞いた"),
  },
  [occupationFlagOffset(17)]: {
    name: `${nameOf.npc(157)}で${nameOf.npc(156)}が一度倒れた`,
    note: `🟢 1 のときにもう一度倒れると${nameOf.npc(156)}が死ぬ。${nameOf.npc(157)}が来ると決まったとき・終わったときに 0`,
    values: yesNo("倒れていない", "一度倒れた"),
  },
  [occupationFlagOffset(18)]: {
    name: `${nameOf.npc(32)}が授業料で買った物の話`,
    note: "🟢 道場の評判（☆0〜5）が上がるたびに、次の買い物の話に進む（☆5 で 99）。周回の終わりに 0",
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
  [occupationFlagOffset(20)]: {
    name: "師範になったことがある",
    note: `🟢 ${nameOf.npc(32)}が死ぬなどで道場を失うと 0。周回の始めに 1 なら、3000文か${nameOf.npc(15)}との勝負で師範に戻れる。周回をまたいで残る`,
    values: yesNo("なっていない", "なったことがある"),
  },
  [occupationFlagOffset(21)]: {
    name: `${nameOf.npc(15)}と道場`,
    note: `🟢 ${nameOf.npc(15)}が追い出される・死ぬ、${nameOf.npc(32)}が死ぬと 0。周回をまたいで残る`,
    values: [
      { value: 0, label: "なし" },
      { value: 1, label: `${nameOf.npc(15)}が師範代` },
      {
        value: 2,
        label: `師範でない${nameOf.npc(59)}が道場の${nameOf.npc(15)}を倒した（${nameOf.npc(32)}に話すと師範になる）`,
      },
    ],
  },
  [occupationFlagOffset(23)]: {
    name: `${nameOf.npc(114)}と${nameOf.npc(92)}`,
    note: `🟢 クリア・立ち去りで周回を終えると 0（死亡では残る）。🔶 ${nameOf.npc(114)}が出るたびに 1 を書くので、2・3 は次に${nameOf.npc(114)}が出ると 1 に戻るとみられる`,
    values: [
      { value: 0, label: "なし" },
      { value: 1, label: `${nameOf.npc(114)}が出た` },
      { value: 2, label: "馬の頼みを引き受けた" },
      { value: 3, label: `引き受けたあと${nameOf.npc(114)}を倒した` },
    ],
  },
  [occupationFlagOffset(24)]: {
    name: "夜這い仲間の初回の説明を聞いた",
    note: "🟢 周回の終わりに 0",
    values: yesNo("聞いていない", "聞いた"),
  },
};

/** 🟢 使われていないなりわいのフラグの番号 */
export const UNUSED_OCCUPATION_FLAGS: readonly number[] = [
  0,
  12,
  14,
  ...Array.from({ length: 32 }, (_, i) => 32 + i),
];

/** 🟢 町の人のレコード（人物番号 p、0x015C + 12 × p）の先頭・幅・件数 */
export const PERSON_RECORDS_START = 0x015c;
export const PERSON_RECORD_SIZE = 12;
export const PERSON_COUNT = 210;

export function personOffset(p: number): number {
  return PERSON_RECORDS_START + PERSON_RECORD_SIZE * p;
}

export type TownsfolkPerson = { p: number; name: string; group: string; certainty: "✅" | "🟢" };

/** 🟢 人物番号と人物（chunks/townsfolk「人物のレコード」）。堂島・寿司屋・鍛冶屋のおやじは死亡の位置が ✅ [U] */
export const TOWNSFOLK_PEOPLE: readonly TownsfolkPerson[] = [
  ...(
    [
      [10, nameOf.npc(1)],
      [11, nameOf.npc(2)],
      [12, `${nameOf.npc(3)}・${nameOf.npc(10)}`],
      [13, nameOf.npc(4)],
      [14, nameOf.npc(5)],
      [15, nameOf.npc(6)],
      [16, nameOf.npc(7)],
      [17, nameOf.npc(8)],
      [18, nameOf.npc(9)],
      [19, nameOf.npc(11)],
      [20, nameOf.npc(12)],
      [21, nameOf.npc(13)],
      [22, nameOf.npc(14)],
      [23, `${nameOf.npc(15)}（${nameOf.npc(93)}）`],
    ] as const
  ).map(([p, name]) => ({ p, name, group: "重要人物" })),
  ...(
    [
      [30, nameOf.npc(137)],
      [31, nameOf.npc(138)],
      [32, nameOf.npc(139)],
      [33, nameOf.npc(140)],
      [34, nameOf.npc(141)],
      [35, nameOf.npc(142)],
      [36, nameOf.npc(143)],
      [37, nameOf.npc(158)],
      [38, nameOf.npc(90)],
      [39, nameOf.npc(79)],
      [40, `${nameOf.npc(145)}（DLCの${nameOf.npc(207)}）`],
      [50, nameOf.npc(144)],
      [51, nameOf.npc(145)],
      [52, nameOf.npc(146)],
      [53, nameOf.npc(147)],
      [54, nameOf.npc(148)],
      [55, nameOf.npc(149)],
      [56, nameOf.npc(150)],
      [57, nameOf.npc(151)],
      [58, nameOf.npc(152)],
      [59, nameOf.npc(153)],
      [60, nameOf.npc(154)],
      [61, nameOf.npc(155)],
      [62, `${nameOf.npc(25)}（おやじ）`],
    ] as const
  ).map(([p, name]) => ({ p, name, group: "店主" })),
  ...(
    [
      [100, nameOf.npc(37)],
      [101, `${nameOf.npc(162)}・${nameOf.npc(44)}`],
      [102, nameOf.npc(40)],
      [103, nameOf.npc(45)],
      [104, `${nameOf.npc(169)}・${nameOf.npc(69)}`],
      [105, `${nameOf.npc(76)}・${nameOf.npc(73)}`],
      [106, `${nameOf.npc(168)}・${nameOf.npc(68)}`],
      [107, nameOf.npc(61)],
      [108, nameOf.npc(48)],
      [109, nameOf.npc(51)],
      [110, `${nameOf.npc(56)}・${nameOf.npc(57)}`],
      [111, nameOf.npc(164)],
    ] as const
  ).map(([p, name]) => ({ p, name, group: "依頼主・四天王など" })),
  ...(
    [
      [70, `${nameOf.npc(32)}（道場主）`],
      [72, nameOf.npc(16)],
      [80, nameOf.npc(211)],
      [81, nameOf.npc(215)],
    ] as const
  ).map(([p, name]) => ({ p, name, group: "その他" })),
  ...(
    [
      [200, nameOf.npc(97)],
      [201, nameOf.npc(94)],
    ] as const
  ).map(([p, name]) => ({ p, name, group: "重要人物" })),
].map((x) => ({ ...x, certainty: [22, 30, 62].includes(x.p) ? "✅" : "🟢" }) as TownsfolkPerson);

const PERSON_BY_NUMBER = new Map(TOWNSFOLK_PEOPLE.map((x) => [x.p, x]));

/**
 * 🟢 ビットを外すだけでは生き返らない人物と、一緒に戻す値（chunks/townsfolk「生き返らせるとき」）。
 * 重要人物（p 10〜23）は町に出る条件に「人物の状態（0x3744 + p）＝ 0」もある。状態は物語の進み具合も持つので、書き換えると物語と食い違う。
 * 要ゲーム内確認
 */
export function reviveNote(p: number): string | null {
  if (p >= 10 && p <= 23) {
    const extra =
      p === 22
        ? "。鍛冶屋に戻すには職（0x3799）となりわいのフラグ 22 も戻す"
        : p === 23
          ? "。道場に戻すには職（0x379A）となりわいのフラグ 21 も戻す"
          : "";
    return `人物の状態（0x${(0x3744 + p).toString(16).toUpperCase()}）も 0 にしないと町に出てこない${extra}`;
  }
  if (p === 30) return "町には出るが、店とイベントは 0x37F9 も 0 にしないと死んだ扱いのまま";
  if (p === 55) return "町には出るが、店とイベントは 0x375C も 0 にしないと死んだ扱いのまま";
  return null;
}

/** 人物番号の名前。表にない番号は「人物 p（空き）」 */
export function personName(p: number): string {
  return PERSON_BY_NUMBER.get(p)?.name ?? `人物 ${p}（空き）`;
}

/**
 * 意味の分かっているなりわいのフラグ。画面に入力欄を出し、値の表から選ぶ（通常モードでは表の値だけ書ける）。
 * 人物のレコードは死亡のビット（writePersonDead）だけを扱う
 */
export const TOWNSFOLK_NOTES: Readonly<Record<number, TownsfolkNote>> = {
  ...OCCUPATION_FLAG_NOTES,
  ...OTHER_FLAG_NOTES,
  0x0127: {
    name: "鍛冶屋の後継者イベント・鍛冶屋の状態",
    note: "書き換えで確認済み。踏み倒しの回数は 0x0B58（u32、この範囲の外）も +1 になった。周回後に誰が鍛冶屋になるかは 0x0132 が決める",
    values: SMITH_STATES,
  },
  0x0132: {
    name: `${nameOf.npc(14)}が鍛冶屋を継いだ`,
    note: `${nameOf.npc(14)}の説得に成功する（0x0127＝70）と 1 になる。周回をまたいで、誰が鍛冶屋になるかを決める（確認済み：0 のまま周回するとおやじに戻り、1 だと${nameOf.npc(14)}になった）`,
    values: [
      { value: 0, label: `継いでいない（${nameOf.npc(25)}のおやじ）` },
      { value: 1, label: `継いだ（${nameOf.npc(14)}の鍛冶屋）` },
    ],
  },
};

export type TownsfolkView = {
  values: number[];
  problem: string | null;
};

export function readTownsfolk(bytes: Uint8Array): TownsfolkView {
  if (bytes.byteLength <= TOWNSFOLK_END)
    throw new RangeError("ファイルが小さすぎて町の人の状態を読めません");
  const values = Array.from({ length: TOWNSFOLK_LENGTH }, (_, i) =>
    readU8(bytes, TOWNSFOLK_START + i),
  );
  return { values, problem: checkLayout(bytes) };
}

/**
 * 通常モードは 0・1 と、今の値と同じ値（書き戻し）だけ。値の表があるバイト（0x0127 など）は表の値だけ書ける。
 * 上級者モードは任意の u8。問題がなければ null
 */
export function validateTownsfolk(
  offset: number,
  value: number,
  current: number,
  opts: { advanced: boolean },
): string | null {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) return `u8 の範囲外です: ${value}`;
  if (opts.advanced || value === current) return null;
  const info = TOWNSFOLK_NOTES[offset];
  if (info?.values)
    return info.values.some((s) => s.value === value)
      ? null
      : `確認済みの値ではありません: ${value}`;
  if (value > TOWNSFOLK_NORMAL_MAX) return `通常モードでは 0 か 1 を指定してください: ${value}`;
  return null;
}

/** offset の1バイトだけを書く */
export function writeTownsfolk(
  bytes: Uint8Array,
  offset: number,
  value: number,
  opts: { advanced: boolean },
): void {
  const view = readTownsfolk(bytes);
  if (view.problem) throw new RangeError(view.problem);
  if (!Number.isInteger(offset) || offset < TOWNSFOLK_START || offset > TOWNSFOLK_END)
    throw new RangeError(`範囲外のオフセットです: 0x${offset.toString(16)}`);
  const error = validateTownsfolk(offset, value, readU8(bytes, offset), opts);
  if (error) throw new RangeError(error);
  writeU8(bytes, offset, value);
}

export type PersonState = TownsfolkPerson & {
  offset: number;
  dead: boolean;
  /** bit0 以外の使われていないビット・バイトが 0 でない */
  unusedBitsSet: boolean;
};

/** 🟢 名前の分かっている人物の死亡のビット */
export function readPeople(bytes: Uint8Array): PersonState[] {
  const { values } = readTownsfolk(bytes);
  return TOWNSFOLK_PEOPLE.map((x) => {
    const offset = personOffset(x.p);
    const rec = values.slice(
      offset - TOWNSFOLK_START,
      offset - TOWNSFOLK_START + PERSON_RECORD_SIZE,
    );
    return {
      ...x,
      offset,
      dead: (rec[0] & 1) === 1,
      unusedBitsSet: (rec[0] & 0xfe) !== 0 || rec.slice(1).some((b) => b !== 0),
    };
  });
}

/** 人物 p（0〜209）の死亡のビット（+0x00 の bit0）だけを書く。ほかのビットは変えない */
export function writePersonDead(bytes: Uint8Array, p: number, dead: boolean): void {
  const problem = checkLayout(bytes);
  if (problem) throw new RangeError(problem);
  if (!Number.isInteger(p) || p < 0 || p >= PERSON_COUNT)
    throw new RangeError(`人物番号の範囲外です: ${p}`);
  const offset = personOffset(p);
  const old = readU8(bytes, offset);
  writeU8(bytes, offset, dead ? old | 1 : old & 0xfe);
}
