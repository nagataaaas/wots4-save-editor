// 重要人物の状態 0x374E〜0x375C（15 B、u8 × 人数）を、生の値で編集する。出典：docs/save_format/chunks/characters。
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
// 直後の 0x375D〜0x375F は施設（facility-flags.ts）。
// 範囲の外の 0x37F9（🟢 寿司屋の状態、chunks/scenario-flags）も、人物の状態として同じ欄に並べる（CHARACTER_OFFSETS の末尾）。
//   寿司屋の店主を殺すと 0 → 1。伯爵に刺激を・傷心の帰国船の開始条件。町の人の死亡のビット（0x02C4）とは別のバイト
// UI は値の意味から選ぶドロップダウン。基本は 0＝生存・1＝死亡（CHARACTER_DEFAULT_VALUES）で、
// それと違う人物だけ CHARACTER_NOTES の values に書く。書き換えの効果は人物ごとに要ゲーム内確認。
//
// [TS] の固定オフセットで読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU8, writeU8 } from "./binary";
import { checkLayout } from "./hero";
import { nameOf } from "./master/labels";

export const CHARACTER_START = 0x374e;
export const CHARACTER_END = 0x375c;
export const CHARACTER_LENGTH = CHARACTER_END - CHARACTER_START + 1;

/** 🟢 寿司屋の状態（chunks/scenario-flags、通し番号 337）。0＝生存、1＝死亡 */
export const SUSHI_STATUS_OFFSET = 0x37f9;

/** 人物の状態として扱う位置。0x374E〜0x375C と、寿司屋の 0x37F9 */
export const CHARACTER_OFFSETS: readonly number[] = [
  ...Array.from({ length: CHARACTER_LENGTH }, (_, i) => CHARACTER_START + i),
  SUSHI_STATUS_OFFSET,
];

/** 通常モードで書ける上限。🟢 どの人物でも 0〜5（J.J. の 5 まで）の値しか取らない */
export const CHARACTER_NORMAL_MAX = 5;

export type CharacterValue = { value: number; label: string };

/** 基本の値の意味。🟢 赤城・小暮・茂呂・メリンダなど多くの人物は 0＝生存、1＝死亡 */
export const CHARACTER_DEFAULT_VALUES: readonly CharacterValue[] = [
  { value: 0, label: "生存" },
  { value: 1, label: "死亡" },
];

/** 人物と、値の説明。values は基本（0＝生存、1＝死亡）と違う人物だけに書く */
export const CHARACTER_NOTES: Readonly<
  Record<number, { name?: string; note?: string; values?: readonly CharacterValue[] }>
> = {
  0x374e: {
    name: nameOf.npc(1),
    // 🟢
    note: "将の器は病院に運ばれて助かった状態、怒りの矛先は死亡の状態のときに起きる",
    values: [
      { value: 0, label: "生存" },
      { value: 1, label: "死亡" },
      { value: 3, label: "病院に運ばれて助かった" },
    ],
  },
  0x374f: {
    name: nameOf.npc(2),
    // 🟢
    note: "願い虚しくは、生存のとき小暮本人が敵になる",
  },
  0x3750: {
    name: nameOf.npc(3),
    // 🟢
    note: "真実でまだら（朱美）に勝つと死亡する",
    values: [
      { value: 0, label: "通常" },
      { value: 1, label: "死亡" },
    ],
  },
  // 🟢
  0x3751: { name: nameOf.npc(4), note: "死亡になる場面はない（武人 琴吹光で死んでも変わらない）" },
  0x3752: {
    name: nameOf.npc(5),
    // 🟢
    note: "死亡だと剣術大会の準備で建築現場にいない。大寄せで幕府ルートに入るには生存していることが要る",
  },
  0x3753: { name: nameOf.npc(6) },
  0x3754: { name: nameOf.npc(7) },
  0x3755: { name: nameOf.npc(8) },
  0x3756: {
    name: "鬼怒川怨仙",
    // 🟢
    note: "船上の侍（周回の始め）で生存の状態になり、大老暗殺計画で倒すと偽物が死亡の状態になる",
    values: [
      { value: 0, label: "偽物が死亡" },
      { value: 2, label: "生存" },
    ],
  },
  0x3757: {
    name: nameOf.npc(11),
    // 🟢
    note: "鬼怒川の魔手で死亡する。ローラの決意の導入で、領事館を出て代官所（鬼怒川のもと）へ向かう。領事館に出るのは生存のときだけ",
    values: [
      { value: 0, label: "生存" },
      { value: 1, label: "死亡" },
      { value: 2, label: "代官所へ向かった" },
    ],
  },
  0x3758: {
    name: "J.J.",
    // 🟢
    note: "伯爵救出の成功で療養中、伯爵に刺激をの成功で打ち解け、刺激が欲しいの成功で逮捕される。ローラ奪還で通常に戻る",
    values: [
      { value: 0, label: "通常" },
      { value: 1, label: "死亡" },
      { value: 3, label: "伯爵救出に成功（療養中）" },
      { value: 4, label: "打ち解けた" },
      { value: 5, label: "逮捕された" },
    ],
  },
  0x3759: {
    name: nameOf.npc(13),
    // 🟢
    note: "講師ご到着・祝 病院開業・傷心の帰国船の戦闘、魔鱗組としてで死亡する",
  },
  0x375a: {
    name: nameOf.npc(14),
    // 🟢
    note: "表彰式でほかの優勝者として並ぶと釜茹でになる。町の人の生死の「堂島」とは別の欄",
    values: [
      { value: 0, label: "通常" },
      { value: 1, label: "表彰式で釜茹でになった" },
    ],
  },
  // 🟢
  0x375b: { name: nameOf.npc(15), note: "通常のプレイで変わる場面はない" },
  0x375c: {
    name: "薬屋",
    // 🟢
    note: "変わる場面はない。小公女倒れるで 0 でないと町に入った時点で失敗",
  },
  [SUSHI_STATUS_OFFSET]: {
    name: "寿司屋",
    // 🟢
    note: "寿司屋の店主を殺すと死亡になる。伯爵に刺激を・傷心の帰国船の開始条件に関わる。町の人の生死の「寿司屋」とは別の欄で、両方を生存にしないと店とイベントは死んだ扱いのまま",
  },
};

/** offset の人物の値の選択肢 */
export function characterValues(offset: number): readonly CharacterValue[] {
  return CHARACTER_NOTES[offset]?.values ?? CHARACTER_DEFAULT_VALUES;
}

export type CharactersView = {
  /** CHARACTER_OFFSETS の順 */
  values: number[];
  /** 見たことのない値があれば理由。編集はできる */
  warning: string | null;
  problem: string | null;
};

export function readCharacters(bytes: Uint8Array): CharactersView {
  if (bytes.byteLength <= SUSHI_STATUS_OFFSET)
    throw new RangeError("ファイルが小さすぎて人物の状態を読めません");
  const values = CHARACTER_OFFSETS.map((o) => readU8(bytes, o));
  const bad = values.findIndex((v) => v > CHARACTER_NORMAL_MAX);
  const warning =
    bad >= 0
      ? `${CHARACTER_NOTES[CHARACTER_OFFSETS[bad]]?.name ?? "人物"}に通常のプレイでは取らない状態があります`
      : null;
  return { values, warning, problem: checkLayout(bytes) };
}

/** 通常モードは 0〜5、上級者モードは任意の u8。問題がなければ null */
export function validateCharacter(value: number, opts: { advanced: boolean }): string | null {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) return `値が範囲外です: ${value}`;
  if (!opts.advanced && value > CHARACTER_NORMAL_MAX)
    return "通常モードでは指定できない状態です";
  return null;
}

/** offset の1バイトだけを書く */
export function writeCharacter(
  bytes: Uint8Array,
  offset: number,
  value: number,
  opts: { advanced: boolean },
): void {
  const view = readCharacters(bytes);
  if (view.problem) throw new RangeError(view.problem);
  if (!CHARACTER_OFFSETS.includes(offset))
    throw new RangeError(`範囲外のオフセットです: 0x${offset.toString(16)}`);
  const error = validateCharacter(value, opts);
  if (error) throw new RangeError(error);
  writeU8(bytes, offset, value);
}
