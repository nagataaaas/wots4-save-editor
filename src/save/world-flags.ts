// 門・柵の開閉フラグと、そのほかの意味の分かったフラグ。出典：docs/save_format/chunks/gates・scenario-flags
// （[U] 2026-10-05 のシナリオ差分、2026-10-06 の書き換え）。
//
// どれも通し番号（docs/save_format/README.md §3）の中に飛び飛びにある。
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
// ルート分岐を書き換えても、門が閉じたままだとそのルートに進めない（[U] 2026-10-05）。
// 🟢 閉鎖条件は大寄せ前にも有効。0は閉鎖指定なしで、他の条件による閉鎖を打ち消さない。
//
// 代官所の拷問塔の扉（1 以上で閉じる）：
//   0x3762・0x3763  🟢 0x3762 が拷問部屋の扉、0x3763 が屋内から拷問塔の区画へ入る扉。
//              周回の始めに 1、大老と三姉妹の成功で 0 になり、通常のプレイでは2つは同じ値なので1つの欄にまとめて両方へ書く。
//              0 でも、1日目夕以降かつ大老と三姉妹（0x36C9）= 4 でなければ閉じたまま。扉の見た目は要ゲーム内確認
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
// UI に出さないバイト（[U] 2026-10-06 の要望）：
//   0x377C  ❓ 神社の柵の候補だったが、初期開放条件は 0x377F だった。3件とも 0
//   0x37A2  🟢 大寄せで攘夷ルートに入れないと 2（chunks/best-route の範囲。route-candidates.ts で生の値を出す）
//
// [TS] の固定オフセットで読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU8, writeU8 } from "./binary";
import { checkLayout } from "./hero";

/** 1 の意味。close＝1 で閉じる、open＝1 で開く */
export type WorldFlagMeaning = "close" | "open";

/** 画面での分け方。recruit＝初日勧誘、close＝閉鎖（大寄せまで）、door＝建物の中の扉 */
export type WorldFlagGroup = "recruit" | "close" | "door";

export type WorldFlag = {
  offset: number;
  /** 同じ値を一緒に書くバイト。通常のプレイで offset と必ず同じ値になるもの */
  pairedOffset?: number;
  label: string;
  note: string;
  /** 欄の下に常に出す注意 */
  hint?: string;
  meaning: WorldFlagMeaning;
  group: WorldFlagGroup;
};

/** 通常の値は 0・1。洞窟内の柵は1で下降・通行不可のみ✅、0での回復は未確認。 */
export const WORLD_FLAGS: readonly WorldFlag[] = [
  {
    offset: 0x37fa,
    label: "代官所の表門",
    // 🟢 1 になる場面
    note: "大寄せで幕府ルートに入れないと閉じる（根無し草では閉じ、幕府ルートでは閉じない）。裏門とそろえる",
    meaning: "close",
    group: "close",
  },
  {
    offset: 0x37fb,
    label: "代官所の裏門",
    // 🟢 表門と同じ場面で同じ値。🔶 1 で閉じる。❓ 0 にして裏門が開くか（要ゲーム内確認）
    note: "表門と同じ場面で同じ状態になる。表門とそろえる",
    meaning: "close",
    group: "close",
  },
  {
    offset: 0x3764,
    label: "居留地の外門",
    // 🟢 1 になる場面
    note: "大寄せで外国ルートに入れないと閉じる。鬼怒川の魔手でローラが死んだとき・夕暮れの船上で断ったとき・傷心の帰国船の成功でも閉じる",
    meaning: "close",
    group: "close",
  },
  {
    offset: 0x37c3,
    label: "神社入口の柵",
    // 🟢 1 になる場面
    note: "大寄せで攘夷ルートに入れないと閉じる。同士救出の成功・般若党壊滅の成功でも閉じる",
    meaning: "close",
    group: "close",
  },
  {
    offset: 0x377d,
    label: "代官所の門",
    // 🟢 1 になる場面
    note: "阿弥浜港争乱の結末（3連勝・琴吹に助太刀）と三姉妹見参の成功で開く。代官所の面々は開いているときだけ起きる。幕府からの勧誘のフラグを兼ねる",
    meaning: "open",
    group: "recruit",
  },
  {
    offset: 0x377e,
    label: "居留地の門",
    // 🟢 1 になる場面。🔶 外国からの勧誘のフラグを兼ねる
    note: "阿弥浜港争乱の結末（3連勝・4人に手間取る）と三姉妹見参の成功で開く。小公女謁見は開いているときだけ起きる。外国からの勧誘のフラグを兼ねる",
    meaning: "open",
    group: "recruit",
  },
  {
    offset: 0x377f,
    label: "神社入口の柵",
    // ✅ 入口の柵。🟢 開放条件と 1 になる場面
    note: "序章〜1日目昼の開放条件で、洞窟内の柵にも共通。志士との出会いの導入と三姉妹見参の成功で開く。導入を見たあとに閉じた状態にすると、近づいても開かない",
    meaning: "open",
    group: "recruit",
  },
  {
    offset: 0x3761,
    label: "神社の洞窟内の柵",
    // ✅ 1 で柵が降りて通行を塞ぐ。❓ 0 に戻したときの上昇・通行の回復は要ゲーム内確認。🟢 1 になる場面
    note: "閉じると柵が降り、洞窟の通行を塞ぐ（入口の柵を開けた状態と併用）。大寄せで攘夷ルートに入れないと閉じる。同士救出・般若党壊滅の成功でも閉じる",
    meaning: "close",
    group: "close",
  },
  {
    offset: 0x3762,
    pairedOffset: 0x3763,
    label: "代官所 拷問部屋の扉",
    // 🟢 ❓ 扉の見た目は要ゲーム内確認
    note: "拷問部屋の扉と、屋内から拷問塔の区画へ入る扉の2つをまとめて書く。周回の始めは閉じていて、大老と三姉妹の成功で開く",
    hint: "1日目昼または「大老と三姉妹」が成功していない場合はフラグに関わらず閉じます",
    meaning: "close",
    group: "door",
  },
];

export type WorldFlagsView = {
  values: number[];
  /** pairedOffset の値。pairedOffset のないフラグは null */
  paired: (number | null)[];
  problem: string | null;
};

export function readWorldFlags(bytes: Uint8Array): WorldFlagsView {
  if (bytes.byteLength < 0x3800) throw new RangeError("ファイルが小さすぎてフラグを読めません");
  const layoutProblem = checkLayout(bytes);
  const values = WORLD_FLAGS.map((f) => readU8(bytes, f.offset));
  const paired = WORLD_FLAGS.map((f) =>
    f.pairedOffset === undefined ? null : readU8(bytes, f.pairedOffset),
  );
  const bad = WORLD_FLAGS.findIndex((_, i) => values[i] > 1 || (paired[i] ?? 0) > 1);
  const problem =
    bad >= 0
      ? `${WORLD_FLAGS[bad].label}が開閉のどちらでもない状態になっています`
      : null;
  return { values, paired, problem: layoutProblem ?? problem };
}

/**
 * index 番目のフラグの1バイト（pairedOffset があればそのバイトにも同じ値）を書く。
 * 通常モードでは 0・1 だけ、上級者モードでは任意の u8
 */
export function writeWorldFlag(
  bytes: Uint8Array,
  index: number,
  value: number,
  opts: { advanced: boolean },
): void {
  const view = readWorldFlags(bytes);
  if (view.problem) throw new RangeError(view.problem);
  const flag = WORLD_FLAGS[index];
  if (!flag) throw new RangeError(`フラグの番号が範囲外です: ${index}`);
  if (!Number.isInteger(value) || value < 0 || value > 0xff)
    throw new RangeError(`値が範囲外です: ${value}`);
  if (!opts.advanced && value > 1)
    throw new RangeError("通常モードでは開閉のどちらかを指定してください");
  writeU8(bytes, flag.offset, value);
  if (flag.pairedOffset !== undefined) writeU8(bytes, flag.pairedOffset, value);
}

// ---------------------------------------------------------------------------
// そのほかの意味の分かったフラグ（chunks/scenario-flags・gates）。
// どれも 🟢 1 になる場面（値）だけが分かっていて、書き換えたときのゲーム内の反映は確かめていない（要ゲーム内確認）。
// 未確認データの扱い（AGENTS.md）に従い「生の値＋候補」で出す。通常モードは候補の値だけ、上級者モードは任意の u8。
//   0x3761 は ✅ 神社の洞窟内の柵、0x3762・0x3763 は 🟢 代官所の拷問塔の扉として WORLD_FLAGS に置く。
//   0x37C6  🟢 1 のとき領事館の中へ移動できない（居留地全体ではない。外門 0x3764 とは別）。案内図・地図の入口の印も出ない。
//              大寄せで外国ルートに入れないと 1（0x3764 と一緒）。小公女倒れるで般若党と戦うときも 1。段階が変わると 0 に戻る。
//              移動を拒んだときの表示は要ゲーム内確認
//   0x3760  🟢 1 だと士魂は屈せずでまだらに助け出され、鬼怒川を追えでまだらが味方につく。剣術大会の準備で 0 に戻る。
//              1 になる場面は見つかっていない（❓）
//   0x37C0  🟢 大老武断の終わりで 1。🔶 黒船の大砲を譲った印
// 画面に出さないバイト（ユーザー判断 2026-10-10）：
//   0x37AB  🟢 剣術大会で勝ち抜いた試合数（各試合に勝つと 1 → 2 → 3）
//   0x37F7  🟢 剣術大会（幕府・無所属）の3回戦でまだらに勝つと 1。1 のときの影響は ❓
//   0x37F8  🟢 剣術大会（攘夷）の3回戦でメリンダに勝つと 1。1 のときの影響は ❓

export type ScenarioFlagValue = { value: number; label: string };

export type ScenarioFlag = {
  offset: number;
  label: string;
  note: string;
  /** 通常モードで選べる値。🟢 の場面で現れる値だけ */
  values: readonly ScenarioFlagValue[];
};

const OFF_ON = (on: string): readonly ScenarioFlagValue[] => [
  { value: 0, label: "なし" },
  { value: 1, label: on },
];

export const SCENARIO_FLAGS: readonly ScenarioFlag[] = [
  {
    offset: 0x37c6,
    label: "領事館の中に入れない",
    // 🟢 ❓ 移動を拒んだときの表示は要ゲーム内確認
    note: "入れないとき、領事館の中へ移動できず、案内図・地図にも入口の印が出ない（居留地の外門とは別）。大寄せで外国ルートに入れないと外門と一緒に入れなくなり、小公女倒れるで般若党と戦うときも入れない。段階が変わると入れる状態に戻る",
    values: [
      { value: 0, label: "入れる" },
      { value: 1, label: "入れない" },
    ],
  },
  {
    offset: 0x3760,
    label: "隠しルートでまだらが味方につく",
    // 🟢 ❓ 何が変わるかの全体は分かっていない
    note: "味方につく状態だと、士魂は屈せずでまだらに助け出され（拷問・戦闘なし）、鬼怒川を追えで三姉妹ととぐろが相手になり、まだらが味方につく。剣術大会の準備でなしに戻る。未実装要素のため、各種ムービーのアニメーションが存在しない。また、三姉妹に取り上げられた荷物が帰ってこなくなるため注意",
    values: OFF_ON("味方につく"),
  },
  {
    offset: 0x37c0,
    label: "黒船の大砲を譲った",
    // 🟢 1 になる場面。🔶 意味に推測が入る
    note: "大老武断の終わりで譲った状態になる。譲った場合、黒船から大砲が消える",
    values: OFF_ON("譲った"),
  },
];

export type ScenarioFlagsView = {
  values: number[];
  /** レイアウトの検証に落ちた理由。あれば読み取り専用 */
  problem: string | null;
};

/** 生の値を読む。候補にない値でも読み取り専用にはしない（生の値として表示する） */
export function readScenarioFlags(bytes: Uint8Array): ScenarioFlagsView {
  if (bytes.byteLength < 0x3800) throw new RangeError("ファイルが小さすぎてフラグを読めません");
  return {
    values: SCENARIO_FLAGS.map((f) => readU8(bytes, f.offset)),
    problem: checkLayout(bytes),
  };
}

/** index 番目のフラグの1バイトだけを書く。通常モードでは候補の値だけ、上級者モードでは任意の u8 */
export function writeScenarioFlag(
  bytes: Uint8Array,
  index: number,
  value: number,
  opts: { advanced: boolean },
): void {
  const view = readScenarioFlags(bytes);
  if (view.problem) throw new RangeError(view.problem);
  const flag = SCENARIO_FLAGS[index];
  if (!flag) throw new RangeError(`フラグの番号が範囲外です: ${index}`);
  if (!Number.isInteger(value) || value < 0 || value > 0xff)
    throw new RangeError(`値が範囲外です: ${value}`);
  if (!opts.advanced && !flag.values.some((v) => v.value === value))
    throw new RangeError(`通常モードでは ${flag.label} に指定できない値です`);
  writeU8(bytes, flag.offset, value);
}
