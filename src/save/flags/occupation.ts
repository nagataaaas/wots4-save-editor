// 画面：なりわい。配列ごとにカードが1つ：
//   OCCUPATION_SERIES_FLAGS    連続なりわい（番号 4〜7、四天王の話 25、最終なりわい 26）
//   OCCUPATION_DLC_FLAGS       DLC なりわい（汁部 27〜31）
//   OCCUPATION_SECURITY_FLAGS  治安なりわい（佐古津 8・女将 9）
// 出典：docs/save_format/chunks/townsfolk「なりわいのフラグ」（0x011C + 番号、townsfolk.ts）。
// 0x0120（番号 4、【岡っ引き】野戸仏の連続なりわい）は書き換えで確認（✅ 2026-10-07）。ほかは 🟢。
// 受注にあわせてこれらのフラグを書く規則は occupation-accept.ts。
//
// 表はモジュールの定数なので、ラベル・説明・見出しは getter にして、読むたびに今の言語で作る（lazyValue・lazyFlag）。
import { tr, type Localized } from "@/lib/i18n";
import { nameOf, npcLabel, occupationGroupLabel, occupationLabel } from "../master/labels";
import { npcLabelId, occupationLabelId } from "../master/label-types";
import { occupationById, occupationGroupByKey, type OccupationGroup, type OccupationGroupKey } from "../master/occupation-names";
import { OCCUPATION_SERIES, SHIRUBE_SERIES, seriesJobs, type SeriesGroupKey } from "../master/occupation-series";
import { occupationFlagOffset } from "../townsfolk";
import type { ByteFlag, FlagValue } from "./byte-flag";

export type OccupationFlag = ByteFlag & {
  /** なりわいのフラグの番号（offset − 0x011C） */
  number: number;
  /** 欄の下に並べる、その依頼主のなりわいの ID（受注の順） */
  jobs?: readonly number[];
};

/** 文言を作る関数。人物名・なりわい名を今の言語で入れるので、読むたびに呼ぶ */
type Text = () => Localized;

/** 今の言語の人物名（ID は表にある数値リテラル） */
const npc = (id: Parameters<typeof nameOf.npc>[0]): string => npcLabel(npcLabelId(id));
/** 今の言語のなりわい名（ID は表にある数値リテラル） */
const job = (id: Parameters<typeof nameOf.occupation>[0]): string => occupationLabel(occupationLabelId(id));

/** 値1つ。label・group は読むたびに今の言語で返す */
function lazyValue(value: number, label: Text, group?: Text): FlagValue {
  const out = { value } as FlagValue;
  Object.defineProperty(out, "label", { get: () => tr(label()), enumerable: true });
  if (group) Object.defineProperty(out, "group", { get: () => tr(group()), enumerable: true });
  return out;
}

/** フラグ1つ。label・note は読むたびに今の言語で返す */
function lazyFlag(
  base: Omit<OccupationFlag, "label" | "note" | "hint">,
  label: () => string,
  note?: Text,
): OccupationFlag {
  const out = { ...base } as OccupationFlag;
  Object.defineProperty(out, "label", { get: label, enumerable: true });
  if (note) Object.defineProperty(out, "note", { get: () => tr(note()), enumerable: true });
  return out;
}

/** from〜to のうち、表にあるなりわいの ID */
function jobRange(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i).filter((id) => occupationById(id));
}

function groupOf(key: OccupationGroupKey): OccupationGroup {
  const group = occupationGroupByKey(key);
  if (!group) throw new RangeError('なりわいのまとまりがありません');
  return group;
}

/** なりわいのまとまりの見出し（【岡っ引き】野戸仏 など）。なりわいの画面の絞り込みと同じ */
const groupTitle = (key: OccupationGroupKey) => (): string => occupationGroupLabel(groupOf(key));

/** まとまりの範囲のうち、表にあるなりわいの ID */
const groupJobs = (key: OccupationGroupKey): number[] => {
  const { from, to } = groupOf(key);
  return jobRange(from, to);
};

/**
 * 連続なりわい（番号 4〜7）の値。十の位が何件目か、一の位が 0＝依頼前・1＝依頼済み。100 で完了。
 * 「連続なりわい」は Wiki での呼び方（ゲーム内の文には呼び方がなく、開発用のメニューだけ「組合ミッション」）。
 * ✅ 番号 4（野戸仏）は 20＝2件目から始まる・100＝完了を書き換えで確認（2026-10-07）。番号 5〜7 は 🟢。
 * 8件目のあとの値（90 番台・100〜102）は依頼主ごとに違う 🟢。ラベルはその値になる会話の内容
 */
const ordinal = (n: number) => (n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`);
const stepGroup = (n: number): Text => () => ({ ja: `${n}件目`, en: `${ordinal(n)} mission` });
const SERIES_STEPS: readonly FlagValue[] = [
  lazyValue(0, () => ({ ja: "依頼主に会う前", en: "Before meeting the client" })),
  ...Array.from({ length: 8 }, (_, i) => [
    lazyValue(
      (i + 1) * 10,
      () => ({ ja: `${i + 1}件目を依頼する前`, en: `Before being offered the ${ordinal(i + 1)} mission` }),
      stepGroup(i + 1),
    ),
    lazyValue(
      (i + 1) * 10 + 1,
      () => ({ ja: `${i + 1}件目を依頼済み`, en: `Offered the ${ordinal(i + 1)} mission` }),
      stepGroup(i + 1),
    ),
  ]).flat(),
];

const SERIES_DONE: Text = () => ({ ja: "すべて終えた", en: "All done" });
const afterLast = (id: Parameters<typeof nameOf.occupation>[0]): Text => () => ({
  ja: `「${job(id)}」のあと`,
  en: `After "${job(id)}"`,
});

/** 🟢 野戸仏（番号 4） */
export const POLICE_SERIES_VALUES: readonly FlagValue[] = [
  ...SERIES_STEPS,
  lazyValue(
    90,
    () => ({
      ja: `「${job(178)}」を果たした（${npc(48)}に逃げられ、浪人は馬小屋のまま）`,
      en: `Completed "${job(178)}" (${npc(48)} escaped and the ronin is still in the stable)`,
    }),
    afterLast(178),
  ),
  lazyValue(
    91,
    () => ({
      ja: `浪人の身代わりに${npc(37)}が馬小屋に入った`,
      en: `${npc(37)} went into the stable in place of the ronin`,
    }),
    afterLast(178),
  ),
  lazyValue(
    97,
    () => ({
      ja: `出された浪人（${npc(68)}）に礼を言われた（${npc(40)}の話はまだ）`,
      en: `Thanked by the released ronin (${npc(68)}) (${npc(40)} has not talked yet)`,
    }),
    afterLast(178),
  ),
  lazyValue(
    99,
    () => ({
      ja: `${npc(40)}に「丸くおさまった」と言われた（${npc(68)}の礼はまだ）`,
      en: `${npc(40)} said things worked out (${npc(68)} has not thanked you yet)`,
    }),
    afterLast(178),
  ),
  lazyValue(
    100,
    () => ({
      ja: `${npc(40)}の話も${npc(68)}の礼も済み、岡っ引きの仕事をやり遂げた`,
      en: `Talked with ${npc(40)}, thanked by ${npc(68)}, and finished the thief-taker's work`,
    }),
    SERIES_DONE,
  ),
  lazyValue(
    101,
    () => ({
      ja: `${npc(68)}に合言葉「根の葉の根」を伝えた（侍四天王の招集）。最終決戦のあとにもなる`,
      en: `Told ${npc(68)} the password (gathering the Four Samurai Lords). Also set after the final battle`,
    }),
    SERIES_DONE,
  ),
  lazyValue(102, () => ({ ja: `${npc(73)}が亡くなった`, en: `${npc(73)} died` }), SERIES_DONE),
];

/** 🟢 小鳩（番号 5） */
export const GANGSTER_SERIES_VALUES: readonly FlagValue[] = [
  ...SERIES_STEPS,
  lazyValue(
    90,
    () => ({
      ja: `「${job(186)}」を果たした（${npc(45)}の礼はまだ）`,
      en: `Completed "${job(186)}" (${npc(45)} has not thanked you yet)`,
    }),
    afterLast(186),
  ),
  lazyValue(
    91,
    () => ({
      ja: "「ひとりで菩殺会を片付けた」と礼を言われた（会話の途中。続きを聞くと完了）",
      en: "Thanked for wiping out the Bodhislaughtva alone (mid-conversation; hearing the rest completes it)",
    }),
    afterLast(186),
  ),
  lazyValue(
    100,
    () => ({
      ja: "親分や四人組に引き合わせると言われ、極道の仕事をやり遂げた",
      en: "Promised an introduction to the boss and the Yakuza Quartet, and finished the scoundrel's work",
    }),
    SERIES_DONE,
  ),
  lazyValue(
    101,
    () => ({
      ja: `${npc(44)}に「${npc(188)}から余計な事を聞かなかったか」と口止めされた`,
      en: `${npc(44)} asked whether ${npc(188)} told you anything unnecessary, and swore you to silence`,
    }),
    SERIES_DONE,
  ),
];

/** 🟢 泥棒さん（番号 6） */
export const THIEF_SERIES_VALUES: readonly FlagValue[] = [
  ...SERIES_STEPS,
  lazyValue(
    90,
    () => ({
      ja: `「${job(194)}」を果たした（お宝はまだ渡していない）`,
      en: `Completed "${job(194)}" (the treasure has not been handed over yet)`,
    }),
    afterLast(194),
  ),
  lazyValue(
    91,
    () => ({
      ja: "最後のお宝を渡した（会話の途中。続きを聞くと次へ進む）",
      en: "Handed over the last treasure (mid-conversation; hearing the rest moves on)",
    }),
    afterLast(194),
  ),
  lazyValue(
    92,
    () => ({
      ja: "「四天王の証」を見て記憶が戻り、身投げは自殺だったと知った",
      en: "Seeing the Four Lords' proof brought his memory back, and he learned the drowning was a suicide",
    }),
    afterLast(194),
  ),
  lazyValue(
    100,
    () => ({
      ja: `${npc(69)}以蔵と名乗られ、泥棒の仕事をやり遂げた`,
      en: `He introduced himself as Izo ${npc(69)}, and the thief's work was finished`,
    }),
    SERIES_DONE,
  ),
  lazyValue(
    101,
    () => ({
      ja: `合言葉「根の葉の根」を伝え、${npc(61)}の待つ街道へ行かせた（侍四天王の招集）`,
      en: `Told him the password and sent him to the highway where ${npc(61)} waits (gathering the Four Samurai Lords)`,
    }),
    SERIES_DONE,
  ),
  lazyValue(102, () => ({ ja: `${npc(73)}が亡くなった`, en: `${npc(73)} died` }), SERIES_DONE),
];

/** 🟢 おっつぁん（番号 7） */
const LID_AFTER: Text = () => ({ ja: "「くさい物にふた」のあと", en: 'After "A Lid On Something Stinky"' });
export const HOMELESS_SERIES_VALUES: readonly FlagValue[] = [
  ...SERIES_STEPS,
  lazyValue(
    90,
    () => ({
      ja: "「くさい物にふた」を果たした（高架下は守られた）",
      en: 'Completed "A Lid On Something Stinky" (the place under the bridge was protected)',
    }),
    LID_AFTER,
  ),
  lazyValue(
    91,
    () => ({
      ja: "「よく助けに戻ってくれた」と礼を言われた（会話の途中。続きを聞くと完了）",
      en: "Thanked for coming back to help (mid-conversation; hearing the rest completes it)",
    }),
    LID_AFTER,
  ),
  lazyValue(
    100,
    () => ({
      ja: "「さぶらう」の教えを受け、宿無しの仕事をやり遂げた",
      en: 'Learned what "to serve" means, and finished the vagabond\'s work',
    }),
    SERIES_DONE,
  ),
];

/** 番号 n のフラグ */
const at = (n: number) => ({ number: n, offset: occupationFlagOffset(n) });

/** 連続なりわい4つ（番号 4〜7）の欄の説明と値 */
const SERIES_FIELDS: readonly { key: SeriesGroupKey; note: Text; values: readonly FlagValue[] }[] = [
  {
    key: "police",
    note: () => ({
      ja: `代官所の同心 ${npc(40)}新太郎の連続なりわい。書き換えると${npc(40)}の次の依頼が変わる（2件目「督促状」から始める、完了にする、など）`,
      en: `The mission chain of Constable Shintaro ${npc(40)} at the Magistrate's Office. Changing it changes ${npc(40)}'s next request (start from the 2nd mission, mark it done, and so on)`,
    }),
    values: POLICE_SERIES_VALUES,
  },
  // 🟢
  {
    key: "gangster",
    note: () => ({ ja: `町の極道者 ${npc(45)}戒の連続なりわい`, en: `The mission chain of the town scoundrel Kai ${npc(45)}` }),
    values: GANGSTER_SERIES_VALUES,
  },
  // 🟢
  {
    key: "thief",
    note: () => ({ ja: `港の${npc(169)}の連続なりわい`, en: `The mission chain of the ${npc(169)} at the port` }),
    values: THIEF_SERIES_VALUES,
  },
  // 🟢
  {
    key: "homeless",
    note: () => ({ ja: `居留地の${npc(76)}の連続なりわい`, en: `The mission chain of ${npc(76)} in the settlement` }),
    values: HOMELESS_SERIES_VALUES,
  },
];

const KIRIZAME_TALK: Text = () => ({ ja: `${npc(61)}との話`, en: `Talks with ${npc(61)}` });
const GATHER_LORDS: Text = () => ({ ja: "四天王を集める", en: "Gathering the Four Lords" });
const QUARTET_BATTLE: Text = () => ({ ja: "四人組との戦", en: "Battle with the Yakuza Quartet" });
const AFTER_END: Text = () => ({ ja: "終わったあと", en: "After the end" });
const KUMAGAMI_ILLNESS: Text = () => ({ ja: `${npc(73)}の病気`, en: `${npc(73)}'s illness` });
const FINAL_JOB: Text = () => ({ ja: job(208), en: job(208) });

/** 連続なりわい、四天王の話、最終なりわい */
export const OCCUPATION_SERIES_FLAGS: readonly OccupationFlag[] = [
  ...SERIES_FIELDS.map(({ key, note, values }) =>
    lazyFlag(
      {
        ...at(OCCUPATION_SERIES[key].flag),
        values,
        jobs: seriesJobs(key).filter(id => occupationById(id)),
      },
      groupTitle(key),
      note,
    ),
  ),
  lazyFlag(
    {
      ...at(25),
      values: [
        lazyValue(0, () => ({
          ja: "始まる前（連続なりわい4つがまだ終わっていない）",
          en: "Not started (the four mission chains are not all done)",
        })),
        lazyValue(
          1,
          () => ({
            ja: `連続なりわい4つを終え、街道に${npc(61)}が現れた`,
            en: `Finished the four mission chains, and ${npc(61)} appeared on the highway`,
          }),
          KIRIZAME_TALK,
        ),
        lazyValue(
          2,
          () => ({
            ja: `${npc(61)}の身の上話に「ふ～ん」と返し、「さらばだ」と去られた`,
            en: `Shrugged off ${npc(61)}'s life story, and he said farewell and left`,
          }),
          KIRIZAME_TALK,
        ),
        lazyValue(
          3,
          () => ({
            ja: `${npc(61)}が侍四天王の${npc(61)}善鬼だと名乗った`,
            en: `${npc(61)} revealed himself as Zenki ${npc(61)} of the Four Samurai Lords`,
          }),
          KIRIZAME_TALK,
        ),
        lazyValue(
          4,
          () => ({
            ja: `${npc(61)}に「侍の名が泣くぞ」と迫った`,
            en: `Pressed ${npc(61)}, saying he was a disgrace to the name of samurai`,
          }),
          KIRIZAME_TALK,
        ),
        lazyValue(
          5,
          () => ({
            ja: `${npc(61)}が「逃げるのはもうやめだ」と戦う決意をした`,
            en: `${npc(61)} decided to stop running and fight`,
          }),
          KIRIZAME_TALK,
        ),
        lazyValue(
          6,
          () => ({
            ja: `${npc(61)}に「残りの四天王を探してくれ」と頼まれた`,
            en: `${npc(61)} asked you to find the rest of the Four Lords`,
          }),
          KIRIZAME_TALK,
        ),
        lazyValue(
          7,
          () => ({
            ja: `${npc(61)}から合言葉「根の葉の根」を教わった`,
            en: `Learned the password from ${npc(61)}`,
          }),
          KIRIZAME_TALK,
        ),
        lazyValue(
          8,
          () => ({
            ja: `${npc(68)}と${npc(69)}の両方に合言葉を伝えた（${npc(73)}が寝込む）`,
            en: `Told the password to both ${npc(68)} and ${npc(69)} (${npc(73)} falls ill)`,
          }),
          GATHER_LORDS,
        ),
        lazyValue(
          10,
          () => ({
            ja: `${npc(73)}十兵衛から「四天王の証」を受け取り、後を継いだ`,
            en: `Received the Four Lords' proof from Jubei ${npc(73)} and took his place`,
          }),
          GATHER_LORDS,
        ),
        lazyValue(
          11,
          () => ({
            ja: `${npc(61)}たちに、${npc(73)}は前から病気だったと伝えた`,
            en: `Told ${npc(61)} and the others that ${npc(73)} had long been ill`,
          }),
          GATHER_LORDS,
        ),
        lazyValue(
          12,
          () => ({
            ja: `三人が${npc(73)}に気づいてやれなかったことを悔やんだ`,
            en: `The three regretted not noticing ${npc(73)}'s condition`,
          }),
          GATHER_LORDS,
        ),
        lazyValue(
          13,
          () => ({
            ja: "「四天王の証」を見せ、新たな侍四天王と認められた",
            en: "Showed the Four Lords' proof and was accepted as a new member of the Four Samurai Lords",
          }),
          GATHER_LORDS,
        ),
        lazyValue(
          14,
          () => ({
            ja: `墓場での四人組との戦を持ちかけられた（「${job(207)}」）`,
            en: `Proposed a battle with the Yakuza Quartet at the graveyard ("${job(207)}")`,
          }),
          GATHER_LORDS,
        ),
        lazyValue(
          50,
          () => ({
            ja: `「${job(207)}」で四人組を4人とも倒した（${npc(44)}は来ない）`,
            en: `Defeated all four of the Yakuza Quartet in "${job(207)}" (${npc(44)} does not come)`,
          }),
          QUARTET_BATTLE,
        ),
        lazyValue(
          60,
          () => ({
            ja: `墓場の戦に${npc(44)}が乱入した（${npc(73)}を治療した場合）`,
            en: `${npc(44)} burst into the graveyard battle (if ${npc(73)} was treated)`,
          }),
          QUARTET_BATTLE,
        ),
        lazyValue(
          99,
          () => ({
            ja: "四天王の誰かを斬り殺したか、何度も斬りつけて敵に回した",
            en: "Killed one of the Four Lords, or attacked them repeatedly and turned them hostile",
          }),
          AFTER_END,
        ),
        lazyValue(
          100,
          () => ({
            ja: `${npc(73)}が息を引き取った（直前の段階のあと）か、「${job(208)}」を終えた`,
            en: `${npc(73)} passed away (after the previous stage), or "${job(208)}" was finished`,
          }),
          AFTER_END,
        ),
      ],
    },
    () => tr({ ja: "四天王の話", en: "Four Samurai Lords story" }),
    // 🟢
    () => ({
      ja:
        `連続なりわい4つ（${npc(40)}・${npc(45)}・${npc(169)}・${npc(76)}）のどれかを終えたとき、ほかの3つがすべて完了していれば話が始まり、街道に${npc(61)}が現れる。` +
        `侍四天王（${npc(61)}・${npc(68)}・${npc(69)}・${npc(73)}）を集める話`,
      en:
        `When you finish one of the four mission chains (${npc(40)}, ${npc(45)}, ${npc(169)}, ${npc(76)}) and the other three are all done, the story starts and ${npc(61)} appears on the highway. ` +
        `It is the story of gathering the Four Samurai Lords (${npc(61)}, ${npc(68)}, ${npc(69)}, ${npc(73)})`,
    }),
  ),
  lazyFlag(
    {
      ...at(26),
      values: [
        lazyValue(0, () => ({
          ja: `始まる前（${npc(73)}はまだ病院に運ばれていない）`,
          en: `Not started (${npc(73)} has not been taken to the hospital yet)`,
        })),
        lazyValue(
          1,
          () => ({
            ja: `${npc(73)}が病に倒れ、病院に担ぎ込まれた`,
            en: `${npc(73)} collapsed from illness and was carried to the hospital`,
          }),
          KUMAGAMI_ILLNESS,
        ),
        lazyValue(
          2,
          () => ({
            ja: "医者に「祖国の薬がある。薬代を出す金持ちを探せ」と言われた",
            en: "The doctor said there is medicine from his homeland, and to find someone rich to pay for it",
          }),
          KUMAGAMI_ILLNESS,
        ),
        lazyValue(
          10,
          () => ({
            ja: `${npc(44)}に${npc(73)}のことを話し、薬代を引き受けてもらった`,
            en: `Told ${npc(44)} about ${npc(73)}, and she agreed to pay for the medicine`,
          }),
          KUMAGAMI_ILLNESS,
        ),
        lazyValue(
          11,
          () => ({
            ja: `墓場で四人組と向き合った（${npc(44)}が薬を医者に届け、投与された）`,
            en: `Faced the Yakuza Quartet at the graveyard (${npc(44)} delivered the medicine to the doctor and it was given)`,
          }),
          KUMAGAMI_ILLNESS,
        ),
        lazyValue(
          12,
          () => ({
            ja: `墓場の戦に${npc(44)}（鳥葬会の親分）が現れた（四天王の話も同じ場面）`,
            en: `${npc(44)} (the Deathbringer boss) appeared at the graveyard battle (the same scene as in the Four Lords story)`,
          }),
          FINAL_JOB,
        ),
        lazyValue(
          15,
          () => ({
            ja: `${npc(44)}から「外国人の軍団が来る。四人組は街道で迎え撃つ」と聞いた`,
            en: `Heard from ${npc(44)} that a foreign army is coming and the Yakuza Quartet will meet it on the highway`,
          }),
          FINAL_JOB,
        ),
        lazyValue(
          20,
          () => ({
            ja: `${npc(44)}から「${job(208)}」を受けた（「侍四天王、いざ出陣！」）`,
            en: `Accepted "${job(208)}" from ${npc(44)}`,
          }),
          FINAL_JOB,
        ),
        lazyValue(
          99,
          () => ({
            ja: `四人組・四天王・${npc(73)}を何度も斬りつけて敵に回した（連続なりわいを選び直せる）`,
            en: `Attacked the Yakuza Quartet, the Four Lords, or ${npc(73)} repeatedly and turned them hostile (mission chains can be chosen again)`,
          }),
          AFTER_END,
        ),
        lazyValue(
          100,
          () => ({
            ja: `「${job(208)}」で侵略者の指揮官を倒した（連続なりわいを選び直せる）`,
            en: `Defeated the invaders' commander in "${job(208)}" (mission chains can be chosen again)`,
          }),
          AFTER_END,
        ),
      ],
      jobs: groupJobs("final"),
    },
    () => tr({ ja: "最終なりわい", en: "Final missions" }),
    // 🟢
    () => ({
      ja:
        `最終なりわい（四天王対四人組・阿弥浜八人衆）と、${npc(73)}（${npc(76)}）の病気の進み具合。治療済みなら${npc(44)}が薬代を出している。` +
        "病み上がりと医者が言うのは終盤の状態。" +
        "終盤の状態では、連続なりわいを終えた依頼主から8件を選び直せる（それより前だと新しい依頼が出ない）。" +
        // 🔶 治療しないと四天王対四人組（207）で終わる
        "治療すると、四天王対四人組から阿弥浜八人衆に発展する。治療しないと四天王対四人組で終わる",
      en:
        `Progress of the final missions (${job(207)}, ${job(208)}) and of ${npc(73)} (${npc(76)})'s illness. If he was treated, ${npc(44)} paid for the medicine. ` +
        "The doctor calling him recovering means the late stages. " +
        "In the late stages, you can choose again from the 8 missions of clients whose chains are done (before that, no new requests appear). " +
        `If he is treated, "${job(207)}" leads on to "${job(208)}". If not, it ends with "${job(207)}"`,
    }),
  ),
];

/** 汁部（DLC）の 209〜212 それぞれの進み具合（🟢） */
const SHIRUBE_RESULT_VALUES: readonly FlagValue[] = [
  lazyValue(0, () => ({ ja: "受注前", en: "Not accepted" })),
  lazyValue(1, () => ({ ja: "成功", en: "Succeeded" })),
  lazyValue(2, () => ({
    ja: "成功……？（失敗を成功扱いにしてもらった）",
    en: "Succeeded...? (a failure counted as a success)",
  })),
];

/** 汁部（DLC）：知り合ったか（27）と、209〜212 の進み具合（28〜31）🟢 */
export const OCCUPATION_DLC_FLAGS: readonly OccupationFlag[] = [
  lazyFlag(
    {
      ...at(SHIRUBE_SERIES.flag),
      values: [
        lazyValue(0, () => ({ ja: "知り合う前（組んでいない）", en: "Not met (not partnered)" })),
        lazyValue(1, () => ({ ja: "知り合った（組んでいる）", en: "Met (partnered)" })),
      ],
    },
    () => tr({ ja: `${npc(211)}（DLC）と知り合ったか`, en: `Met ${npc(211)} (DLC)` }),
    // 🟢
    () => ({
      ja: `${npc(81)} ${npc(211)}理人の誘いに乗って組むと知り合った状態になり、一度組むとそのまま`,
      en: `Accepting the offer of ${npc(81)} Rihito ${npc(211)} and partnering with him counts as having met him, and it stays that way once partnered`,
    }),
  ),
  ...SHIRUBE_SERIES.ids.map((id, i) =>
    lazyFlag(
      { ...at(SHIRUBE_SERIES.resultFlags[i]), values: SHIRUBE_RESULT_VALUES },
      () => {
        const name = occupationLabel(occupationLabelId(id));
        return tr({ ja: `${npc(211)}の「${name}」`, en: `${npc(211)}: "${name}"` });
      },
      // 🟢
      () => ({
        ja: `なりわいの進み具合（破棄すると受注前に戻る）。成功は残る。${npc(211)}は4つの仕事のうち最初に受注前のものを頼む。受注前がなく「成功……？」があれば「あきらめた仕事があるよな」と言い、頼み直すと受注前に戻る。すべて成功ならもう頼まない`,
        en: `Mission progress (abandoning it returns it to not accepted). Success is kept. ${npc(211)} offers the first of the four jobs that is not accepted. If none are left but one is "Succeeded...?", he mentions a job you gave up on, and offering it again returns it to not accepted. If all succeeded, he offers no more`,
      }),
    ),
  ),
];

/** 治安なりわい（佐古津 8・女将 9） */
export const OCCUPATION_SECURITY_FLAGS: readonly OccupationFlag[] = [
  lazyFlag(
    {
      ...at(8),
      values: [
        lazyValue(0, () => ({ ja: "まだ会っていない", en: "Not met yet" })),
        lazyValue(10, () => ({ ja: "名乗りを聞いた", en: "Heard his introduction" })),
        lazyValue(20, () => ({ ja: "人斬りに誘われた（断ってもこのまま）", en: "Invited to be an assassin (stays even if refused)" })),
        lazyValue(30, () => ({ ja: "引き受けた（治安なりわいを頼める）", en: "Accepted (public order missions available)" })),
      ],
      jobs: groupJobs("sakotsu"),
    },
    groupTitle("sakotsu"),
    // 🟢（何回でも受けられることは [U] 2026-10-07）
    () => ({
      ja:
        `代官所の同心頭 ${npc(37)}上武之介との話の段階。引き受けると治安なりわい（賭場を偵察・訪問・襲撃・殲滅）を頼める。` +
        "連続ではなく、そのときの治安で受けられるなりわいが変わり、何回でも受けられる",
      en:
        `Stage of the talks with Head Constable Joubunosuke ${npc(37)} at the Magistrate's Office. Once you accept, he offers public order missions (scouting, visiting, raiding, and wiping out the gambling den). ` +
        "They are not a chain: the available mission depends on the public order at the time, and they can be taken any number of times",
    }),
  ),
  lazyFlag(
    {
      ...at(9),
      values: [
        lazyValue(0, () => ({ ja: "まだ仕事を頼んでいない", en: "Has not asked for work yet" })),
        lazyValue(1, () => ({ ja: "仕事を頼んで怒られた", en: "Asked for work and was scolded" })),
        lazyValue(10, () => ({
          ja: `度胸を認められた（${npc(45)}の連続なりわいが始まる）`,
          en: `Courage recognized (${npc(45)}'s mission chain begins)`,
        })),
        lazyValue(20, () => ({ ja: `${npc(44)}の裏の顔を聞いた`, en: `Learned ${npc(44)}'s hidden side` })),
        lazyValue(21, () => ({ ja: `${npc(44)}に酒をおごってもらった`, en: `${npc(44)} treated you to a drink` })),
      ],
      jobs: groupJobs("okami"),
    },
    groupTitle("okami"),
    // 🟢（何回でも受けられることは [U] 2026-10-07）
    () => ({
      ja:
        `賭場の${npc(44)}の治安なりわい（代官所を偵察・訪問・襲撃・殲滅）。` +
        "連続ではなく、そのときの治安で受けられるなりわいが変わり、何回でも受けられる。" +
        `${npc(44)}は最終なりわい（阿弥浜八人衆）を始める人でもある。裏の顔を聞いたあとは賭場に移る`,
      en:
        `Public order missions from the ${npc(44)} of the gambling den (scouting, visiting, raiding, and wiping out the Magistrate's Office). ` +
        "They are not a chain: the available mission depends on the public order at the time, and they can be taken any number of times. " +
        `${npc(44)} also starts the final mission ("${job(208)}"). After you learn her hidden side, she moves to the gambling den`,
    }),
  ),
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
