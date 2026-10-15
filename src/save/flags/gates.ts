// 画面：世界 / 阿弥浜の「門・柵の状態」。出典：docs/save_format/chunks/gates・scenario-flags
// （[U] 2026-10-05 のシナリオ差分、2026-10-06 の書き換え）。
//
// どれも通し番号（docs/save_format/README.md §3）の中に飛び飛びにある。
// 配列ごとに「門・柵の状態」の中の見出しが1つ：
//   GATE_RECRUIT_FLAGS  初日勧誘（1日目昼のみ影響）
//   GATE_CLOSE_FLAGS    閉鎖（1日目夕～大老の大寄せまで）
//   GATE_DOOR_FLAGS     見出しなし（建物の中の扉）
//
// 🟢 初期開放条件（序章〜1日目昼、段階 ≤100）：1＝開く、0＝閉じる。閉鎖条件が優先。chunks/gates の調査記録 2026-10-06_amihama-gates.md：
//   0x377D  ✅ [U] 代官所の門。書き換えで開閉が反映された（2026-10-06）。🟢 阿弥浜港争乱の結末（3連勝・琴吹に助太刀）と
//              三姉妹見参の成功で 1。そのあとで 1 になる場面はない。代官所の面々はこれが 1 のときだけ起きる。幕府からの勧誘を兼ねる
//   0x377E  ✅ [U] 居留地の門。書き換えで開閉が反映された（2026-10-06）。🟢 阿弥浜港争乱の結末（3連勝・4人に手間取る）と
//              三姉妹見参の成功で 1。小公女謁見はこれが 1 のときだけ起きる。外国からの勧誘を兼ねるかは 🔶
//   0x377F  ✅ [U] 神社入口の柵。🟢 洞窟内の柵にも共通の初期開放条件。🟢 志士との出会いの導入と三姉妹見参の成功で 1（阿弥浜港争乱では立たない）。
//              志士との出会い（イベント添字6）が 03 のまま 0 に戻すと柵は閉じ、近づいても導入は流れない。添字6 を FF に戻すと導入が流れて開く。
//              大寄せのあとに書き換えても柵は変わらない（0x37C3 が決める）
//
// 門・柵の閉鎖条件（1＝閉じる）。🟢 大寄せで、ルートに入れなかった勢力の門が 1 になる：
//   0x37FA  ✅ [U] 代官所の表門。🟢 大寄せで幕府ルートに入れないと 1（裏門 0x37FB と一緒）。
//              04 copy 11（代官所・領事館・神社の3つの門がすべて閉じている）で 0 にすると、代官所の門だけが開いた（2026-10-06）
//   0x37FB  🟢 代官所の裏門。0x37FA と同じ場面で同じ値になる。1＝閉じるは表門の値の動きからの推測（🔶）。
//              04 copy 11 で 0 にしても表の門は変わらなかった。裏門が開くかは ❓ 要ゲーム内確認
//   0x3764  ✅ [U] 居留地の門。04 copy 11 で 0 にすると開いた（2026-10-06）。
//              🟢 大寄せで外国ルートに入れないと 1。鬼怒川の魔手でローラが死んだとき・夕暮れの船上で断ったとき・傷心の帰国船の成功でも 1
//   0x37C3  ✅ [U] 神社入口の柵。04 copy 11 で 0 にすると開いた（2026-10-06）。
//              🟢 大寄せで攘夷ルートに入れないと 1。同士救出の成功・般若党壊滅の成功でも 1
//   0x3761  ✅ 神社の洞窟内の柵。1 で柵が降りて通行を塞ぐ。❓ 0 に戻したときの上昇・通行の回復は要ゲーム内確認
// ルート分岐を書き換えても、門が閉じたままだとそのルートに進めない（[U] 2026-10-05）。
// 🟢 閉鎖条件は大寄せ前にも有効。0 は閉鎖指定なしで、他の条件（初期開放・ルート・イベント）による閉鎖を打ち消さない。
//
// 代官所の拷問塔の扉（1 以上で閉じる）：
//   0x3762・0x3763  🟢 0x3762 が拷問部屋の扉、0x3763 が屋内から拷問塔の区画へ入る扉。
//              周回の始めに 1、大老と三姉妹の成功で 0 になり、通常のプレイでは2つは同じ値なので1つの欄にまとめて両方へ書く。
//              0 でも、1日目夕以降かつ大老と三姉妹（0x36C9）= 4 でなければ閉じたまま。扉の見た目は要ゲーム内確認
//
// 画面に出さないバイト（[U] 2026-10-06 の要望）：
//   0x377C  ❓ 神社の柵の候補だったが、初期開放条件は 0x377F だった。3件とも 0
//   0x37A2  🟢 大寄せで攘夷ルートに入れないと 2（般若党の本拠。イベント関連フラグ event-flags.ts に出す）
import { flagValues, localizedFlag, type ByteFlag, type FlagValue } from "./byte-flag";

/** 1 で開く門・柵 */
const OPEN_VALUES: readonly FlagValue[] = flagValues([
  { value: 0, label: { ja: "閉じている", en: "Closed" } },
  { value: 1, label: { ja: "開いている", en: "Open" } },
]);

/** 1 で閉じる門・柵。🟢 0 はほかの条件による閉鎖を打ち消さない */
const CLOSE_VALUES: readonly FlagValue[] = flagValues([
  { value: 0, label: { ja: "閉鎖指定なし", en: "Not set to close" } },
  { value: 1, label: { ja: "閉じる", en: "Close" } },
]);

/** 初日勧誘（1日目昼のみ影響）。🟢 1 になる場面 */
export const GATE_RECRUIT_FLAGS: readonly ByteFlag[] = [
  localizedFlag({
    offset: 0x377d,
    label: { ja: "代官所の門", en: "Magistrate's Office gate" },
    note: {
      ja: "阿弥浜港争乱の結末（3連勝・琴吹に助太刀）と三姉妹見参の成功で開く。代官所の面々は開いているときだけ起きる。幕府からの勧誘のフラグを兼ねる",
      en: "Opens at the end of Amihama Harbor Skirmish (three wins in a row, or helping Kotobuki) and on success of Meeting with the Three Sisters. The Magistrate's Offices happens only while it is open. Also serves as the Shogunate's invitation",
    },
    values: OPEN_VALUES,
  }),
  localizedFlag({
    offset: 0x377e,
    label: { ja: "居留地の門", en: "Little Britain gate" },
    // 🔶 外国からの勧誘のフラグを兼ねる
    note: {
      ja: "阿弥浜港争乱の結末（3連勝・4人に手間取る）と三姉妹見参の成功で開く。小公女謁見は開いているときだけ起きる。外国からの勧誘のフラグを兼ねる",
      en: "Opens at the end of Amihama Harbor Skirmish (three wins in a row, or struggling against the four) and on success of Meeting with the Three Sisters. Audience with the Littlest Public Servant happens only while it is open. Also serves as the Foreigners' invitation",
    },
    values: OPEN_VALUES,
  }),
  localizedFlag({
    offset: 0x377f,
    label: { ja: "神社入口の柵", en: "Shrine entrance fence" },
    // ✅ 入口の柵
    note: {
      ja: "序章〜1日目昼の開放条件で、洞窟内の柵にも共通。志士との出会いの導入と三姉妹見参の成功で開く。導入を見たあとに閉じた状態にすると、近づいても開かない",
      en: "Opening condition from the prologue to Day 1 daytime, shared with the fence inside the cave. Opens at the start of Encounter with the \"Patriots\" and on success of Meeting with the Three Sisters. If set to closed after seeing that start, it won't open when you approach",
    },
    values: OPEN_VALUES,
  }),
];

/** 閉鎖（1日目夕～大老の大寄せまで）。🟢 1 になる場面 */
export const GATE_CLOSE_FLAGS: readonly ByteFlag[] = [
  localizedFlag({
    offset: 0x37fa,
    label: { ja: "代官所の表門", en: "Magistrate's Office front gate" },
    note: {
      ja: "大寄せで幕府ルートに入れないと閉じる（根無し草では閉じ、幕府ルートでは閉じない）。裏門とそろえる",
      en: "Closes if you don't enter the Shogunate route in The Chief Minister's Big Move (closes in Idle Chatter, not on the Shogunate route). Keep it the same as the back gate",
    },
    values: CLOSE_VALUES,
  }),
  localizedFlag({
    offset: 0x37fb,
    label: { ja: "代官所の裏門", en: "Magistrate's Office back gate" },
    // 🔶 1 で閉じる。❓ 0 にして裏門が開くか（要ゲーム内確認）
    note: {
      ja: "表門と同じ場面で同じ状態になる。表門とそろえる",
      en: "Changes together with the front gate. Keep it the same as the front gate",
    },
    values: CLOSE_VALUES,
  }),
  localizedFlag({
    offset: 0x3764,
    label: { ja: "居留地の外門", en: "Little Britain outer gate" },
    note: {
      ja: "大寄せで外国ルートに入れないと閉じる。鬼怒川の魔手でローラが死んだとき・夕暮れの船上で断ったとき・傷心の帰国船の成功でも閉じる",
      en: "Closes if you don't enter the Foreigners route in The Chief Minister's Big Move. Also closes when Laura dies in Kinugawa's Evil Influence, when you refuse in Twilight On Board, and on success of The Sad Boat Home",
    },
    values: CLOSE_VALUES,
  }),
  localizedFlag({
    offset: 0x37c3,
    label: { ja: "神社入口の柵", en: "Shrine entrance fence" },
    note: {
      ja: "大寄せで攘夷ルートに入れないと閉じる。同士救出の成功・般若党壊滅の成功でも閉じる",
      en: "Closes if you don't enter the Prajna route in The Chief Minister's Big Move. Also closes on success of Mutual Rescue or Annihilation of the Prajnas",
    },
    values: CLOSE_VALUES,
  }),
  localizedFlag({
    offset: 0x3761,
    label: { ja: "神社の洞窟内の柵", en: "Shrine cave fence" },
    // ✅ 1 で柵が降りて通行を塞ぐ。❓ 0 に戻したときの上昇・通行の回復は要ゲーム内確認
    note: {
      ja: "閉じると柵が降り、洞窟の通行を塞ぐ（入口の柵を開けた状態と併用）。大寄せで攘夷ルートに入れないと閉じる。同士救出・般若党壊滅の成功でも閉じる",
      en: "When closed, the fence comes down and blocks the cave (works together with the entrance fence being open). Closes if you don't enter the Prajna route in The Chief Minister's Big Move. Also closes on success of Mutual Rescue or Annihilation of the Prajnas",
    },
    values: CLOSE_VALUES,
  }),
];

/** 建物の中の扉 */
export const GATE_DOOR_FLAGS: readonly ByteFlag[] = [
  localizedFlag({
    offset: 0x3762,
    alsoAt: [0x3763],
    label: { ja: "代官所 拷問部屋の扉", en: "Magistrate's Office torture room door" },
    // 🟢 ❓ 扉の見た目は要ゲーム内確認
    note: {
      ja: "拷問部屋の扉と、屋内から拷問塔の区画へ入る扉の2つをまとめて書く。周回の始めは閉じていて、大老と三姉妹の成功で開く",
      en: "Sets both the torture room door and the indoor door into the torture tower. Closed at the start of a playthrough; opens on success of The Chief Minister & The Three Sisters",
    },
    hint: {
      ja: "1日目昼または「大老と三姉妹」が成功していない場合はフラグに関わらず閉じます",
      en: "Stays closed regardless of this on Day 1 daytime or while \"The Chief Minister & The Three Sisters\" hasn't succeeded",
    },
    values: CLOSE_VALUES,
  }),
];
