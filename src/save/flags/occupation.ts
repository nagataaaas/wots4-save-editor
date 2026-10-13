// 画面：なりわい。配列ごとにカードが1つ：
//   OCCUPATION_SERIES_FLAGS    連続なりわい（番号 4〜7、四天王の話 25、最終なりわい 26）
//   OCCUPATION_DLC_FLAGS       DLC なりわい（汁部 27〜31）
//   OCCUPATION_SECURITY_FLAGS  治安なりわい（佐古津 8・女将 9）
// 出典：docs/save_format/chunks/townsfolk「なりわいのフラグ」（0x011C + 番号、townsfolk.ts）。
// 0x0120（番号 4、【岡っ引き】野戸仏の連続なりわい）は書き換えで確認（✅ 2026-10-07）。ほかは 🟢。
// 受注にあわせてこれらのフラグを書く規則は occupation-accept.ts。
import { nameOf, occupationGroupLabel } from "../master/labels";
import { occupationById, occupationGroupByKey, type OccupationGroupKey } from "../master/occupation-names";
import { OCCUPATION_SERIES, SHIRUBE_SERIES, seriesJobs } from "../master/occupation-series";
import { occupationFlagOffset } from "../townsfolk";
import { yesNo, type ByteFlag, type FlagValue } from "./byte-flag";

export type OccupationFlag = ByteFlag & {
  /** なりわいのフラグの番号（offset − 0x011C） */
  number: number;
  /** 欄の下に並べる、その依頼主のなりわいの ID（受注の順） */
  jobs?: readonly number[];
};

/** from〜to のうち、表にあるなりわいの ID */
function jobRange(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i).filter((id) => occupationById(id));
}

/** なりわいのまとまりの見出し（【岡っ引き】野戸仏 など）。なりわいの画面の絞り込みと同じ */
const groupTitle = (key: OccupationGroupKey): string => {
  const group = occupationGroupByKey(key);
  if (!group) throw new RangeError('なりわいのまとまりがありません');
  return occupationGroupLabel(group);
};

/**
 * 連続なりわい（番号 4〜7）の値。十の位が何件目か、一の位が 0＝依頼前・1＝依頼済み。100 で完了。
 * 「連続なりわい」は Wiki での呼び方（ゲーム内の文には呼び方がなく、開発用のメニューだけ「組合ミッション」）。
 * ✅ 番号 4（野戸仏）は 20＝2件目から始まる・100＝完了を書き換えで確認（2026-10-07）。番号 5〜7 は 🟢。
 * 8件目のあとの値（90 番台・100〜102）は依頼主ごとに違う 🟢。ラベルはその値になる会話の内容
 */
const SERIES_STEPS: readonly FlagValue[] = [
  { value: 0, label: "依頼主に会う前" },
  ...Array.from({ length: 8 }, (_, i) => [
    { value: (i + 1) * 10, label: `${i + 1}件目を依頼する前`, group: `${i + 1}件目` },
    { value: (i + 1) * 10 + 1, label: `${i + 1}件目を依頼済み`, group: `${i + 1}件目` },
  ]).flat(),
];

const SERIES_DONE = "すべて終えた";
const afterLast = (name: string) => `「${name}」のあと`;

/** 🟢 野戸仏（番号 4） */
export const POLICE_SERIES_VALUES: readonly FlagValue[] = [
  ...SERIES_STEPS,
  {
    value: 90,
    label: `「${nameOf.occupation(178)}」を果たした（${nameOf.npc(48)}に逃げられ、浪人は馬小屋のまま）`,
    group: afterLast(nameOf.occupation(178)),
  },
  {
    value: 91,
    label: `浪人の身代わりに${nameOf.npc(37)}が馬小屋に入った`,
    group: afterLast(nameOf.occupation(178)),
  },
  {
    value: 97,
    label: `出された浪人（${nameOf.npc(68)}）に礼を言われた（${nameOf.npc(40)}の話はまだ）`,
    group: afterLast(nameOf.occupation(178)),
  },
  {
    value: 99,
    label: `${nameOf.npc(40)}に「丸くおさまった」と言われた（${nameOf.npc(68)}の礼はまだ）`,
    group: afterLast(nameOf.occupation(178)),
  },
  {
    value: 100,
    label: `${nameOf.npc(40)}の話も${nameOf.npc(68)}の礼も済み、岡っ引きの仕事をやり遂げた`,
    group: SERIES_DONE,
  },
  {
    value: 101,
    label: `${nameOf.npc(68)}に合言葉「根の葉の根」を伝えた（侍四天王の招集）。最終決戦のあとにもなる`,
    group: SERIES_DONE,
  },
  { value: 102, label: `${nameOf.npc(73)}が亡くなった`, group: SERIES_DONE },
];

/** 🟢 小鳩（番号 5） */
export const GANGSTER_SERIES_VALUES: readonly FlagValue[] = [
  ...SERIES_STEPS,
  {
    value: 90,
    label: `「${nameOf.occupation(186)}」を果たした（${nameOf.npc(45)}の礼はまだ）`,
    group: afterLast(nameOf.occupation(186)),
  },
  {
    value: 91,
    label: "「ひとりで菩殺会を片付けた」と礼を言われた（会話の途中。続きを聞くと完了）",
    group: afterLast(nameOf.occupation(186)),
  },
  {
    value: 100,
    label: "親分や四人組に引き合わせると言われ、極道の仕事をやり遂げた",
    group: SERIES_DONE,
  },
  {
    value: 101,
    label: `${nameOf.npc(44)}に「${nameOf.npc(188)}から余計な事を聞かなかったか」と口止めされた`,
    group: SERIES_DONE,
  },
];

/** 🟢 泥棒さん（番号 6） */
export const THIEF_SERIES_VALUES: readonly FlagValue[] = [
  ...SERIES_STEPS,
  {
    value: 90,
    label: `「${nameOf.occupation(194)}」を果たした（お宝はまだ渡していない）`,
    group: afterLast(nameOf.occupation(194)),
  },
  {
    value: 91,
    label: "最後のお宝を渡した（会話の途中。続きを聞くと次へ進む）",
    group: afterLast(nameOf.occupation(194)),
  },
  {
    value: 92,
    label: "「四天王の証」を見て記憶が戻り、身投げは自殺だったと知った",
    group: afterLast(nameOf.occupation(194)),
  },
  {
    value: 100,
    label: `${nameOf.npc(69)}以蔵と名乗られ、泥棒の仕事をやり遂げた`,
    group: SERIES_DONE,
  },
  {
    value: 101,
    label: `合言葉「根の葉の根」を伝え、${nameOf.npc(61)}の待つ街道へ行かせた（侍四天王の招集）`,
    group: SERIES_DONE,
  },
  { value: 102, label: `${nameOf.npc(73)}が亡くなった`, group: SERIES_DONE },
];

/** 🟢 おっつぁん（番号 7） */
export const HOMELESS_SERIES_VALUES: readonly FlagValue[] = [
  ...SERIES_STEPS,
  {
    value: 90,
    label: "「くさい物にふた」を果たした（高架下は守られた）",
    group: "「くさい物にふた」のあと",
  },
  {
    value: 91,
    label: "「よく助けに戻ってくれた」と礼を言われた（会話の途中。続きを聞くと完了）",
    group: "「くさい物にふた」のあと",
  },
  { value: 100, label: "「さぶらう」の教えを受け、宿無しの仕事をやり遂げた", group: SERIES_DONE },
];

/** 番号 n のフラグ */
const at = (n: number) => ({ number: n, offset: occupationFlagOffset(n) });

/** 連続なりわい、四天王の話、最終なりわい */
export const OCCUPATION_SERIES_FLAGS: readonly OccupationFlag[] = [
  {
    ...at(OCCUPATION_SERIES.police.flag),
    label: groupTitle("police"),
    note: `代官所の同心 ${nameOf.npc(40)}新太郎の連続なりわい。書き換えると${nameOf.npc(40)}の次の依頼が変わる（2件目「督促状」から始める、完了にする、など）`,
    values: POLICE_SERIES_VALUES,
    jobs: seriesJobs('police').filter(id => occupationById(id)),
  },
  {
    ...at(OCCUPATION_SERIES.gangster.flag),
    label: groupTitle("gangster"),
    // 🟢
    note: `町の極道者 ${nameOf.npc(45)}戒の連続なりわい`,
    values: GANGSTER_SERIES_VALUES,
    jobs: seriesJobs('gangster').filter(id => occupationById(id)),
  },
  {
    ...at(OCCUPATION_SERIES.thief.flag),
    label: groupTitle("thief"),
    // 🟢
    note: `港の${nameOf.npc(169)}の連続なりわい`,
    values: THIEF_SERIES_VALUES,
    jobs: seriesJobs('thief').filter(id => occupationById(id)),
  },
  {
    ...at(OCCUPATION_SERIES.homeless.flag),
    label: groupTitle("homeless"),
    // 🟢
    note: `居留地の${nameOf.npc(76)}の連続なりわい`,
    values: HOMELESS_SERIES_VALUES,
    jobs: seriesJobs('homeless').filter(id => occupationById(id)),
  },
  {
    ...at(25),
    label: "四天王の話",
    note:
      // 🟢
      `連続なりわい4つ（${nameOf.npc(40)}・${nameOf.npc(45)}・${nameOf.npc(169)}・${nameOf.npc(76)}）のどれかを終えたとき、ほかの3つがすべて完了していれば話が始まり、街道に${nameOf.npc(61)}が現れる。` +
      `侍四天王（${nameOf.npc(61)}・${nameOf.npc(68)}・${nameOf.npc(69)}・${nameOf.npc(73)}）を集める話`,
    values: [
      { value: 0, label: "始まる前（連続なりわい4つがまだ終わっていない）" },
      {
        value: 1,
        label: `連続なりわい4つを終え、街道に${nameOf.npc(61)}が現れた`,
        group: `${nameOf.npc(61)}との話`,
      },
      {
        value: 2,
        label: `${nameOf.npc(61)}の身の上話に「ふ～ん」と返し、「さらばだ」と去られた`,
        group: `${nameOf.npc(61)}との話`,
      },
      {
        value: 3,
        label: `${nameOf.npc(61)}が侍四天王の${nameOf.npc(61)}善鬼だと名乗った`,
        group: `${nameOf.npc(61)}との話`,
      },
      {
        value: 4,
        label: `${nameOf.npc(61)}に「侍の名が泣くぞ」と迫った`,
        group: `${nameOf.npc(61)}との話`,
      },
      {
        value: 5,
        label: `${nameOf.npc(61)}が「逃げるのはもうやめだ」と戦う決意をした`,
        group: `${nameOf.npc(61)}との話`,
      },
      {
        value: 6,
        label: `${nameOf.npc(61)}に「残りの四天王を探してくれ」と頼まれた`,
        group: `${nameOf.npc(61)}との話`,
      },
      {
        value: 7,
        label: `${nameOf.npc(61)}から合言葉「根の葉の根」を教わった`,
        group: `${nameOf.npc(61)}との話`,
      },
      {
        value: 8,
        label: `${nameOf.npc(68)}と${nameOf.npc(69)}の両方に合言葉を伝えた（${nameOf.npc(73)}が寝込む）`,
        group: "四天王を集める",
      },
      {
        value: 10,
        label: `${nameOf.npc(73)}十兵衛から「四天王の証」を受け取り、後を継いだ`,
        group: "四天王を集める",
      },
      {
        value: 11,
        label: `${nameOf.npc(61)}たちに、${nameOf.npc(73)}は前から病気だったと伝えた`,
        group: "四天王を集める",
      },
      {
        value: 12,
        label: `三人が${nameOf.npc(73)}に気づいてやれなかったことを悔やんだ`,
        group: "四天王を集める",
      },
      {
        value: 13,
        label: "「四天王の証」を見せ、新たな侍四天王と認められた",
        group: "四天王を集める",
      },
      {
        value: 14,
        label: `墓場での四人組との戦を持ちかけられた（「${nameOf.occupation(207)}」）`,
        group: "四天王を集める",
      },
      {
        value: 50,
        label: `「${nameOf.occupation(207)}」で四人組を4人とも倒した（${nameOf.npc(44)}は来ない）`,
        group: "四人組との戦",
      },
      {
        value: 60,
        label: `墓場の戦に${nameOf.npc(44)}が乱入した（${nameOf.npc(73)}を治療した場合）`,
        group: "四人組との戦",
      },
      {
        value: 99,
        label: "四天王の誰かを斬り殺したか、何度も斬りつけて敵に回した",
        group: "終わったあと",
      },
      {
        value: 100,
        label: `${nameOf.npc(73)}が息を引き取った（直前の段階のあと）か、「${nameOf.occupation(208)}」を終えた`,
        group: "終わったあと",
      },
    ],
  },
  {
    ...at(26),
    label: "最終なりわい",
    note:
      // 🟢
      `最終なりわい（四天王対四人組・阿弥浜八人衆）と、${nameOf.npc(73)}（${nameOf.npc(76)}）の病気の進み具合。治療済みなら${nameOf.npc(44)}が薬代を出している。` +
      "病み上がりと医者が言うのは終盤の状態。" +
      "終盤の状態では、連続なりわいを終えた依頼主から8件を選び直せる（それより前だと新しい依頼が出ない）。" +
      // 🔶 治療しないと四天王対四人組（207）で終わる
      "治療すると、四天王対四人組から阿弥浜八人衆に発展する。治療しないと四天王対四人組で終わる",
    values: [
      { value: 0, label: `始まる前（${nameOf.npc(73)}はまだ病院に運ばれていない）` },
      {
        value: 1,
        label: `${nameOf.npc(73)}が病に倒れ、病院に担ぎ込まれた`,
        group: `${nameOf.npc(73)}の病気`,
      },
      {
        value: 2,
        label: "医者に「祖国の薬がある。薬代を出す金持ちを探せ」と言われた",
        group: `${nameOf.npc(73)}の病気`,
      },
      {
        value: 10,
        label: `${nameOf.npc(44)}に${nameOf.npc(73)}のことを話し、薬代を引き受けてもらった`,
        group: `${nameOf.npc(73)}の病気`,
      },
      {
        value: 11,
        label: `墓場で四人組と向き合った（${nameOf.npc(44)}が薬を医者に届け、投与された）`,
        group: `${nameOf.npc(73)}の病気`,
      },
      {
        value: 12,
        label: `墓場の戦に${nameOf.npc(44)}（鳥葬会の親分）が現れた（四天王の話も同じ場面）`,
        group: nameOf.occupation(208),
      },
      {
        value: 15,
        label: `${nameOf.npc(44)}から「外国人の軍団が来る。四人組は街道で迎え撃つ」と聞いた`,
        group: nameOf.occupation(208),
      },
      {
        value: 20,
        label: `${nameOf.npc(44)}から「${nameOf.occupation(208)}」を受けた（「侍四天王、いざ出陣！」）`,
        group: nameOf.occupation(208),
      },
      {
        value: 99,
        label: `四人組・四天王・${nameOf.npc(73)}を何度も斬りつけて敵に回した（連続なりわいを選び直せる）`,
        group: "終わったあと",
      },
      {
        value: 100,
        label: `「${nameOf.occupation(208)}」で侵略者の指揮官を倒した（連続なりわいを選び直せる）`,
        group: "終わったあと",
      },
    ],
    jobs: [207, 208],
  },
];

/** 汁部（DLC）のなりわい 209〜212 の名前 */
export const SHIRUBE_JOBS = SHIRUBE_SERIES.ids.map(id => nameOf.occupation(id));

/** 汁部（DLC）の 209〜212 それぞれの進み具合（🟢） */
const SHIRUBE_RESULT_VALUES: readonly FlagValue[] = [
  { value: 0, label: "受注前" },
  { value: 1, label: "成功" },
  { value: 2, label: "成功……？（失敗を成功扱いにしてもらった）" },
];

/** 汁部（DLC）：知り合ったか（27）と、209〜212 の進み具合（28〜31）🟢 */
export const OCCUPATION_DLC_FLAGS: readonly OccupationFlag[] = [
  {
    ...at(SHIRUBE_SERIES.flag),
    label: `${nameOf.npc(211)}（DLC）と知り合ったか`,
    // 🟢
    note: `${nameOf.npc(81)} ${nameOf.npc(211)}理人の誘いに乗って組むと知り合った状態になり、一度組むとそのまま`,
    values: yesNo("知り合う前（組んでいない）", "知り合った（組んでいる）"),
  },
  ...SHIRUBE_JOBS.map((job, i) => ({
    ...at(SHIRUBE_SERIES.resultFlags[i]),
    label: `${nameOf.npc(211)}の「${job}」`,
    // 🟢
    note: `なりわいの進み具合（破棄すると受注前に戻る）。成功は残る。${nameOf.npc(211)}は4つの仕事のうち最初に受注前のものを頼む。受注前がなく「成功……？」があれば「あきらめた仕事があるよな」と言い、頼み直すと受注前に戻る。すべて成功ならもう頼まない`,
    values: SHIRUBE_RESULT_VALUES,
  })),
];

/** 治安なりわい（佐古津 8・女将 9） */
export const OCCUPATION_SECURITY_FLAGS: readonly OccupationFlag[] = [
  {
    ...at(8),
    label: groupTitle("sakotsu"),
    note:
      // 🟢
      `代官所の同心頭 ${nameOf.npc(37)}上武之介との話の段階。引き受けると治安なりわい（賭場を偵察・訪問・襲撃・殲滅）を頼める。` +
      "連続ではなく、そのときの治安で受けられるなりわいが変わり、何回でも受けられる（[U] 2026-10-07）",
    values: [
      { value: 0, label: "まだ会っていない" },
      { value: 10, label: "名乗りを聞いた" },
      { value: 20, label: "人斬りに誘われた（断ってもこのまま）" },
      { value: 30, label: "引き受けた（治安なりわいを頼める）" },
    ],
    jobs: jobRange(163, 166),
  },
  {
    ...at(9),
    label: groupTitle("okami"),
    note:
      // 🟢
      `賭場の${nameOf.npc(44)}の治安なりわい（代官所を偵察・訪問・襲撃・殲滅）。` +
      "連続ではなく、そのときの治安で受けられるなりわいが変わり、何回でも受けられる（[U] 2026-10-07）。" +
      `${nameOf.npc(44)}は最終なりわい（阿弥浜八人衆）を始める人でもある。裏の顔を聞いたあとは賭場に移る`,
    values: [
      { value: 0, label: "まだ仕事を頼んでいない" },
      { value: 1, label: "仕事を頼んで怒られた" },
      { value: 10, label: `度胸を認められた（${nameOf.npc(45)}の連続なりわいが始まる）` },
      { value: 20, label: `${nameOf.npc(44)}の裏の顔を聞いた` },
      { value: 21, label: `${nameOf.npc(44)}に酒をおごってもらった` },
    ],
    jobs: [167, 168, 169, 170],
  },
];

/** なりわいの画面で扱うフラグ（3つのカードの全部） */
export const OCCUPATION_FLAGS: readonly OccupationFlag[] = [
  ...OCCUPATION_SERIES_FLAGS,
  ...OCCUPATION_DLC_FLAGS,
  ...OCCUPATION_SECURITY_FLAGS,
];

/** 番号 n のなりわいのフラグ。なりわいの画面で扱わない番号なら RangeError */
export function occupationFlag(n: number): OccupationFlag {
  const flag = OCCUPATION_FLAGS.find((f) => f.number === n);
  if (!flag) throw new RangeError(`なりわいの画面で扱わないフラグです: ${n}`);
  return flag;
}
