// 画面：世界 / イベント。
//   BEST_ROUTE_FLAG  イベントチャートの上の「ルート」
//   EVENT_FLAGS      「イベント関連フラグ」。位置の順に並べる
// 出典：docs/save_format/chunks/best-route・scenario-flags（[U] 2026-10-06 の比較と書き換え）。
//
// 真ルート 0x378E。✅ [U] 2026-10-06 の書き換え：
//   0x378E＝1 と三姉妹見参（イベント添字70）の成功（04）の両方がそろうと真ルート（お早い到着）に入る。どちらか一方では通常ルートのまま。
//   正規の真ルートで 0x378E を 0 にすると通常ルートに入る。
//   0x378D・0x379F・0x37AA・0x3799 を正規の真ルートと同じ値にしても、ルートは変わらず、チャートの真ルートの枠も出なかった。
//   🟢 2＝真ルートを外れた（大老暗殺計画の側へ）。再起の望みで小暮が死ぬ、怒りの矛先の成功、
//   小暮が死んでいるときに伯爵に刺激をの失敗・運命のルーレットで J.J が死ぬ、闇討ちの失敗、傷心の帰国船の成功で 2。戻らない。
//   大老暗殺計画の開始条件は「三姉妹見参の成功（0x36EE = 4）かつ 0x378E = 2 かつ大通り」
//
// 0x378D〜0x37AA のそのほかのバイト（🟢）。画面に出す位置：
//   0x378F〜0x3791  勢力の退場（faction-exit.ts）
//   0x3792〜0x3797  ローラ・朱美の好感度、三姉妹の拷問のポイント、メリンダの峰打ちの点数（yobai-points.ts、夜這いの画面）
//   0x3799・0x379A  堂島・先生の職（npc-events.ts）
//   0x37A1〜0x37A4・0x37A8  この EVENT_FLAGS
// 画面に出さないバイト：
//   0x378D  序章のあとの道筋。序章の終わり（阿弥浜港争乱の3連戦の終わりなど）で 1、三姉妹見参の成功で 2。
//           1〜3日目の通常の勢力イベントはどれも開始条件が「= 1」。2 になると周回中は戻らない（ユーザー判断 2026-10-10）
//   0x379B  朱美を送った印（真実・夜の墓場でで 1）。1 のあいだ居酒屋（地域 7）へ移動できない（同上）
//   0x379F  序章の大砲。阿弥浜港争乱で大砲の般若党を倒すと 1。0 だと三姉妹見参が起きない（同上）
//   0x37A0  欺きの代価の結果。一人で剣崎を倒すと 1 で、1 なら報酬が出る（同上）
//   0x37AA  チュートリアルの進み方。1＝チュートリアル（1周目は必ず）、2＝「口出し無用」、0＝「まとめて相手をしてやる」（同上）
//   0x3798・0x379C〜0x379E・0x37A5〜0x37A7・0x37A9  使われていない（0x37A9 は周回数ではない。周回数は 0x0B8C）。
//           0x379C・0x379D は 1 だと港のカジノ（地域 23）・居留地の病院（地域 12）へ移動できないが、1 にする場面はない
//
// 範囲の外のフラグ（chunks/scenario-flags）。どれも 🟢 1 になる場面（値）だけが分かっていて、書き換えたときのゲーム内の反映は要ゲーム内確認：
//   0x3760  1 だと士魂は屈せずでまだらに助け出され、鬼怒川を追えでまだらが味方につく。剣術大会の準備で 0 に戻る。
//           1 になる場面は見つかっていない（❓）
//   0x37C0  大老武断の終わりで 1。🔶 黒船の大砲を譲った印
//   0x37C6  1 のとき領事館の中へ移動できない（居留地全体ではない。外門 0x3764 とは別）。案内図・地図の入口の印も出ない。
//           大寄せで外国ルートに入れないと 1（0x3764 と一緒）。小公女倒れるで般若党と戦うときも 1。段階が変わると 0 に戻る。
//           移動を拒んだときの表示は要ゲーム内確認
// 画面に出さないバイト（ユーザー判断 2026-10-10）：
//   0x37AB  剣術大会で勝ち抜いた試合数（各試合に勝つと 1 → 2 → 3）
//   0x37F7  剣術大会（幕府・無所属）の3回戦でまだらに勝つと 1。1 のときの影響は ❓
//   0x37F8  剣術大会（攘夷）の3回戦でメリンダに勝つと 1。1 のときの影響は ❓
import { flagValues, localizedFlag, yesNo, type ByteFlag } from "./byte-flag";

const NONE = { ja: "なし", en: "None" };

/** 三姉妹見参のイベント添字。真ルートはこのイベントの成功と組で効く */
export const BEST_ROUTE_EVENT_INDEX = 70;

/** ✅ [U] 0・1 は書き換えで確認。2 は 🟢（真ルートを外れた。周回中は戻らない） */
export const BEST_ROUTE_FLAG: ByteFlag = localizedFlag({
  offset: 0x378e,
  label: { ja: "ルート", en: "Route" },
  note: {
    ja: "「真ルート」にしただけでは通常ルートのまま。三姉妹見参の状態も成功にすると真ルート（お早い到着）に入る。「真ルートに入っていない」にすると通常ルートに戻る。「真ルートを外れた」は、再起の望みで小暮が死ぬ、怒りの矛先の成功、闇討ちの失敗、傷心の帰国船の成功などでなり、周回中は戻らない。この状態で大通りに行くと大老暗殺計画が起きる。真ルートを過去の周回で記録していないと、正規のプレイでもチャートに失敗したイベントや先のイベントの枠が出ない",
    en: "Setting \"True route\" alone keeps you on the normal route. If Meeting with the Three Sisters is also set to succeeded, you enter the true route (A Speedy Arrival). Setting \"Not on the true route\" returns you to the normal route. \"Left the true route\" happens when Kogure dies in Praying for Recovery, on success of The Sting of Hatred, on failure of Strike in the Dark, on success of The Sad Boat Home, etc., and doesn't revert during the playthrough. Going to the Main Plaza in this state starts Plot to Assassinate the Chief Minister. Unless the true route was recorded in a past playthrough, the chart won't show boxes for failed or later events even in normal play",
  },
  values: flagValues([
    { value: 0, label: { ja: "真ルートに入っていない", en: "Not on the true route" } },
    { value: 1, label: { ja: "真ルート", en: "True route" } },
    {
      value: 2,
      label: {
        ja: "真ルートを外れた（大老暗殺計画へ）",
        en: "Left the true route (to Plot to Assassinate the Chief Minister)",
      },
    },
  ]),
});

/** 🟢 隠しルートでまだらが味方につく（u8）。周回の初期化でも残る（new-cycle.ts）。❓ 1 になる場面は見つかっていない */
export const MADARA_ALLY_OFFSET = 0x3760;

/** 🟢 note は 1 になる場面。値の意味に推測が入るものはコメントに書く */
export const EVENT_FLAGS: readonly ByteFlag[] = [
  localizedFlag({
    offset: MADARA_ALLY_OFFSET,
    label: { ja: "隠しルートでまだらが味方につく", en: "Madara joins you on the hidden route" },
    // ❓ 何が変わるかの全体は分かっていない。1 になる場面は見つかっていない
    note: {
      ja: "味方につく状態だと、士魂は屈せずでまだらに助け出され（拷問・戦闘なし）、鬼怒川を追えで三姉妹ととぐろが相手になり、まだらが味方につく。剣術大会の準備でなしに戻る。未実装要素のため、各種ムービーのアニメーションが存在しない。また、三姉妹に取り上げられた荷物が帰ってこなくなるため注意",
      en: "When set, Madara rescues you in The Fighting Spirit Never Dies (no torture or battle), and in In Pursuit of Kinugawa you face the three sisters and Toguro with Madara on your side. Resets in Preparing for the Battle Tournament. This is unfinished content, so many cutscenes have no animation. Also note that the belongings the three sisters took from you will not be returned",
    },
    values: yesNo(NONE, { ja: "味方につく", en: "Joins you" }),
  }),
  localizedFlag({
    offset: 0x37a1,
    label: { ja: "小公女の薬", en: "Medicine for Laura" },
    note: {
      ja: "小公女倒れるで薬を持っている。町の薬屋で持つ状態になり、小公女倒れるの成功で持っていない状態に戻る",
      en: "Whether you have the medicine in The Ambassador Collapses. You get it at the town Pharmacy, and it resets on success of The Ambassador Collapses",
    },
    hint: { ja: "小公女倒れるで薬を渡せるか", en: "Whether you can hand over the medicine in The Ambassador Collapses" },
    values: yesNo({ ja: "持っていない", en: "Don't have" }, { ja: "持っている", en: "Have" }),
  }),
  localizedFlag({
    offset: 0x37a2,
    label: { ja: "般若党の本拠", en: "Prajna base" },
    // 🟢 2＝離散した（闇討ちの開始条件の1つ）、1＝剣術大会以降に片付いた。1 を読む場面はなく、効果は 2 と同じ。
    // 1 と 2 を書き分ける意図は 🔶
    note: {
      ja:
        "片付いた＝剣術大会以降の同士救出・般若党壊滅・三匹で斬るの成功。" +
        "離散した＝再起の望みで赤城が死ぬ・将の器の成功・怒りの矛先の成功・大寄せで攘夷ルートに入れない・志士の刀で戦闘・願い虚しくで手紙を託される・臆病風。" +
        "片付いたと離散したの効果は同じで、離散したのときだけ真ルートの闇討ちの条件になる",
      en:
        "Wiped out = success of Mutual Rescue, Annihilation of the Prajnas or The Three Kataneers after the Battle Tournament. " +
        "Scattered = Akagi dies in Praying for Recovery, success of Ability to Lead or The Sting of Hatred, not entering the Prajna route in The Chief Minister's Big Move, fighting in Blades of the Patriots, being entrusted with the letter in Wasted Wish, or Loss of Nerve. " +
        "Both have the same effect; only Scattered is a condition for Strike in the Dark on the true route",
    },
    hint: {
      ja: "神社にいる以外だと、神社の般若党・赤城・小暮・雑貨屋と、居酒屋の朱美・客が町に出なくなる",
      en: "Unless at the Shrine, the Prajna Members, Akagi, Kogure and the Emporium at the Shrine, and Akemi and her customers at the Bar no longer appear",
    },
    values: flagValues([
      { value: 0, label: { ja: "神社にいる", en: "At the Shrine" } },
      { value: 1, label: { ja: "片付いた", en: "Wiped out" } },
      { value: 2, label: { ja: "離散した", en: "Scattered" } },
    ]),
  }),
  localizedFlag({
    offset: 0x37a3,
    label: { ja: "会談の手紙", en: "Meeting letter" },
    // 🟢 持ち物の手紙は見ない
    note: {
      ja:
        "ローラから預かった状態と、神社の般若党の門番に渡した状態がある（渡すと領事館でローラへの報告の場面になる）。" +
        "話はこの状態だけで進み、持ち物の会談の手紙（重要品の画面）は見ない",
      en:
        "Either received from Laura, or handed to the Prajna gatekeeper at the Shrine (after handing it over, you report to Laura at the consulate). " +
        "The story follows only this state, not the meeting letter in your inventory (Key items screen)",
    },
    values: flagValues([
      { value: 0, label: NONE },
      { value: 1, label: { ja: "ローラから預かった", en: "Received from Laura" } },
      { value: 2, label: { ja: "門番に渡した", en: "Handed to the gatekeeper" } },
    ]),
  }),
  localizedFlag({
    offset: 0x37a4,
    label: { ja: "黒船", en: "Black Ship" },
    note: {
      ja:
        "幕府が借り受けるのは黒船を我が手にの成功のとき。" +
        "去るのは傷心の帰国船・鬼怒川の魔手・夕暮れの船上・破滅への道のとき",
      en:
        "The Shogunate borrows it on success of Black Ship In Hand. " +
        "It leaves in The Sad Boat Home, Kinugawa's Evil Influence, Twilight On Board and Road to Ruin",
    },
    hint: {
      ja: "幕府が借り受けると甲板に乗組員・写真家が出ない。去ると甲板へ移動できない",
      en: "If borrowed by the Shogunate, the crew and the Photographer don't appear on deck. If it has left, you can't go to the deck",
    },
    values: flagValues([
      { value: 0, label: { ja: "外国の船のまま", en: "Still a foreign ship" } },
      { value: 1, label: { ja: "幕府が借り受けた", en: "Borrowed by the Shogunate" } },
      { value: 2, label: { ja: "去った", en: "Left" } },
    ]),
  }),
  localizedFlag({
    offset: 0x37a8,
    label: { ja: "最後通告に逆らった", en: "Defied the Final Warning" },
    note: { ja: "最後通告に逆らうとこの状態になる", en: "Set when you defy the Final Warning" },
    hint: {
      ja: "逆らったあいだ、夜に町へ出る雑魚が暗闇脳天になる",
      en: "While defied, the small fry that roam the town at night become Black Masks",
    },
    values: yesNo({ ja: "逆らっていない", en: "Not defied" }, { ja: "逆らった", en: "Defied" }),
  }),
  localizedFlag({
    offset: 0x37c0,
    label: { ja: "黒船の大砲を譲った", en: "Handed over the Black Ship's cannon" },
    // 🔶 意味に推測が入る
    note: {
      ja: "大老武断の終わりで譲った状態になる。譲った場合、黒船から大砲が消える",
      en: "Set at the end of Chief Minister At War. When handed over, the cannon disappears from the Black Ship",
    },
    values: yesNo(NONE, { ja: "譲った", en: "Handed over" }),
  }),
  localizedFlag({
    offset: 0x37c6,
    label: { ja: "領事館の中に入れない", en: "Can't enter the consulate" },
    // ❓ 移動を拒んだときの表示は要ゲーム内確認
    note: {
      ja: "入れないとき、領事館の中へ移動できず、案内図・地図にも入口の印が出ない（居留地の外門とは別）。大寄せで外国ルートに入れないと外門と一緒に入れなくなり、小公女倒れるで般若党と戦うときも入れない。段階が変わると入れる状態に戻る",
      en: "When set, you can't go inside the consulate and its entrance mark doesn't appear on the guide or map (separate from the Little Britain outer gate). Set together with the outer gate if you don't enter the Foreigners route in The Chief Minister's Big Move, and also while fighting the Prajnas in The Ambassador Collapses. Resets when the story stage changes",
    },
    values: flagValues([
      { value: 0, label: { ja: "入れる", en: "Can enter" } },
      { value: 1, label: { ja: "入れない", en: "Can't enter" } },
    ]),
  }),
];
