// イベントチャートのノードのマスターデータ。次のイベントのヒント 0x3900 の値（ノード番号）と、そのノードのイベント。
// 出典：docs/save_format/datatable/event/chart-node.csv（全行 🟢）。CSV を直したら、この表も同じ内容に直す。
//
// - 0〜118 の番号で、イベントの通し番号（chunks/event-chart）とは別 🟢
// - 1つのイベントが複数のノードを持つことがある（大老暗殺計画は7つ、大老 鬼怒川怨仙は4つ、小公女倒れる（通し番号 34）は町の薬師を含めて3つ）🟢
// - イベントに当たらないノード（0・1・53・113・114・118）は名前と通し番号が null 🟢
// ほかのモジュールに依存しない。

export type ChartNodeEntry = {
  id: number;
  /** null はイベントに当たらないノード */
  ja: string | null;
  en: string | null;
  /** イベントの通し番号（0x36A8 + n の n）。null はイベントに当たらないノード */
  eventId: number | null;
};

const ROWS: readonly (readonly [number, string, string, number] | readonly [number])[] = [
  [0],
  [1],
  [2, "志士との出会い", 'Encounter with the "Patriots"', 6],
  [3, "代官所の面々", "The Magistrate's Offices", 4],
  [4, "小公女謁見", "Audience with the Littlest Public Servant", 5],
  [5, "海兵隊の横暴", "Violent Behavior of the Marine Corps", 9],
  [6, "琴吹光探検隊", "Hikaru Kotobuki's Explorer's Club", 7],
  [7, "電信あり", "The Telegraph", 8],
  [8, "代官所潜入", "Sneaking into the Magistrate's Office", 12],
  [9, "阿片密売を阻止せよ", "Stop the Opium Smugglers", 10],
  [10, "辻斬りを辻斬る", "Killing Casual Killing", 11],
  [11, "再起の望み", "Praying for Recovery", 72],
  [12, "欺きの代価", "A Deceptive Price", 17],
  [13, "西洋医学お断り", "Denying Western Medicine", 13],
  [14, "病院廃業の企て", "Plan to Shut Down the Hospital", 14],
  [15, "病院占拠事件", "OWH (Occupy Western Hospital)", 15],
  [16, "祝 病院開業", "Hooray! The Hospital's Grand Opening", 16],
  [17, "将の器", "Ability to Lead", 73],
  [18, "怒りの矛先", "The Sting of Hatred", 74],
  [19, "語学無用", "We Don't Need No Stinkin' Language School!", 21],
  [20, "講師を亡き者に", "The Lecturer Is a Dead Man", 22],
  [21, "講師ご到着", "The Lecturer Arrives", 18],
  [22, "語学所開設", "The Language School Opens", 19],
  [23, "お団子物語", "A Dumpling Tale", 20],
  [24, "運命のルーレット", "Dice of Destiny", 76],
  [25, "カジノを破壊せよ", "Destroy the Casino", 26],
  [26, "ガイジンとゲイシャ", "Gaijin & Geisha", 23],
  [27, "ライジングサン", "Rising Sun", 24],
  [28, "カジノ再建を急げ", "Hurrying to Rebuild the Casino", 25],
  [29, "闇討ち", "Strike in the Dark", 77],
  [30, "闇討ち ～小暮捜索", "Surprise Attack - In Search of Kogure", 77],
  [31, "血で血を洗う戦い", "Washing Blood With Blood", 31],
  [32, "白昼の激突", "Clash At Midday", 32],
  [33, "魔鱗組の力", "The Might of the Demonscales", 29],
  [34, "小公女と大老", "The Little Public Servant & The Big Minister", 30],
  [35, "学問のすすめ", "Pursuit of Knowledge", 78],
  [36, "刺激が欲しい", "In Need of Encouragement", 79],
  [37, "傷心の帰国船", "The Sad Boat Home", 80],
  [38, "小公女倒れる", "The Ambassador Collapses", 34],
  [39, "町の薬師", "The Town Doctor", 34],
  [40, "小公女倒れる", "The Ambassador Collapses", 34],
  [41, "大老と三姉妹", "The Chief Minister & The Three Sisters", 33],
  [42, "伯爵救出", "Rescuing the Count", 81],
  [43, "危険な賭け", "A Risky Gamble", 37],
  [44, "大老暗殺計画", "Plot to Assassinate the Chief Minister", 83],
  [45, "人間湯通しの恐怖", "A Day at the Spa", 82],
  [46, "最後通告", "Final Warning", 52],
  [47, "ローラの決意", "Laura's Determination", 85],
  [48, "士魂は屈せず", "The Fighting Spirit Never Dies", 86],
  [49, "ローラ奪還", "Rescuing Laura", 87],
  [50, "願い虚しく", "Wasted Wish", 56],
  [51, "鬼怒川を追え", "In Pursuit of Kinugawa", 88],
  [52, "黒船の決闘", "Black Ship Battle", 89],
  [53],
  [54, "悲しみのローラ", "Grief-Stricken Laura", 67],
  [55, "簀巻き日和", "All Wrapped Up", 2],
  [56, "三姉妹見参", "Meeting with the Three Sisters", 70],
  [57, "大老暗殺計画", "Plot to Assassinate the Chief Minister", 83],
  [58, "カジノ再建断固阻止", "Put an End to the Casino's Reconstruction", 27],
  [59, "討ち入り", "The Raid", 69],
  [60, "夕暮れの船上", "Twilight On Board", 68],
  [61, "大老暗殺計画", "Plot to Assassinate the Chief Minister", 83],
  [62, "売国奴を斬れ", "Kill the Traitor", 35],
  [63, "剣術大会の準備", "Preparing for the Battle Tournament", 36],
  [64, "鬼怒川の魔手", "Kinugawa's Evil Influence", 61],
  [65, "闇黒の意志", "A Dark Will", 53],
  [66, "臆病風", "Loss of Nerve", 57],
  [67, "大老暗殺計画", "Plot to Assassinate the Chief Minister", 83],
  [68, "大老暗殺計画", "Plot to Assassinate the Chief Minister", 83],
  [69, "大老暗殺計画", "Plot to Assassinate the Chief Minister", 83],
  [70, "大老暗殺計画", "Plot to Assassinate the Chief Minister", 83],
  [71, "真実", "The Truth", 38],
  [72, "夜の墓場で", "At the Cemetery, In the Night", 116],
  [73, "大老　鬼怒川怨仙", "Chief Minister Onsen Kinugawa", 28],
  [74, "大老　鬼怒川怨仙", "Chief Minister Onsen Kinugawa", 28],
  [75, "士魂は屈せず", "The Fighting Spirit Never Dies", 86],
  [76, "仕組まれた襲撃", "Planned Raid", 39],
  [77, "罠を破れ", "Break the Snare", 40],
  [78, "船上の侍", "Samurai On Board", 0],
  [79, "討ち入り", "The Raid", 69],
  [80, "般若党壊滅", "Annihilation of the Prajnas", 59],
  [81, "伯爵に刺激を", "Down for the Count", 75],
  [82, "三匹で斬る", "The Three Kataneers", 64],
  [83, "阿弥浜港争乱", "Amihama Harbor Skirmish", 1],
  [84, "大老武断", "Chief Minister At War", 54],
  [85, "憂国の士", "Patriots", 55],
  [86, "大老　鬼怒川怨仙", "Chief Minister Onsen Kinugawa", 28],
  [87, "剣客 茂呂茂", "Shigeru Moro, Swordsman", 65],
  [88, "大老の大寄せ", "The Chief Minister's Big Move", 41],
  [89, "嵐のあと", "After the Storm", 3],
  [90, "お早い到着", "A Speedy Arrival", 71],
  [91, "公儀の剣", "Imperial Sword", 42],
  [92, "希望の光", "The Light of Hope", 90],
  [93, "東国の騎士", "The Eastern Knight", 43],
  [94, "熱き魂", "Fevered Spirits", 91],
  [95, "志士の刀", "Blades of the Patriots", 44],
  [96, "攘夷の炎", "The Flames of Prajna", 92],
  [97, "根無し草", "Idle Chatter", 45],
  [98, "剣術大会開催", "Battle Tournament Opens", 46],
  [99, "破滅への道", "Road to Ruin", 93],
  [100, "願い虚しく", "Wasted Wish", 56],
  [101, "変わり往く心", "A Change of Heart", 94],
  [102, "覇者となる", "We Are the Champions", 51],
  [103, "武士の魂", "The Samurai Spirit", 63],
  [104, "海外雄飛", "Setting Off to Foreign Lands", 95],
  [105, "領事館斬り込み", "Raiding the Consulate", 62],
  [106, "侍一直線", "Samurai Straight", 96],
  [107, "魔鱗組として", "As a Demonscale", 97],
  [108, "釜茹で侍", "Boiled Samurai", 98],
  [109, "大老は生きていた", "The Chief Minister Lived", 99],
  [110, "同士救出", "Mutual Rescue", 58],
  [111, "黒船を我が手に", "Black Ship In Hand", 60],
  [112, "武人 琴吹光", "Hikaru Kotobuki, Military Man", 66],
  [113],
  [114],
  [115, "大老　鬼怒川怨仙", "Chief Minister Onsen Kinugawa", 28],
  [116, "願い虚しく", "Wasted Wish", 56],
  [117, "学問のすすめ", "Pursuit of Knowledge", 78],
  [118],
];

/** 🟢 ノード 0〜118（ID 昇順、欠番なし） */
export const CHART_NODES: readonly ChartNodeEntry[] = ROWS.map((r) =>
  r.length === 1
    ? { id: r[0], ja: null, en: null, eventId: null }
    : { id: r[0], ja: r[1], en: r[2], eventId: r[3] },
);

/** 🟢 ノード番号の最大値 */
export const CHART_NODE_MAX = 118;

/** ノード番号からノードを引く。表にない値は undefined */
export function chartNode(id: number): ChartNodeEntry | undefined {
  return Number.isInteger(id) && id >= 0 && id <= CHART_NODE_MAX ? CHART_NODES[id] : undefined;
}
