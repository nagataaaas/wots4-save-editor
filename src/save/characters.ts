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
//   0x3753〜0x3755  ✅ 万由・千佳・百合（鬼怒川の娘、三姉妹）。値の意味は ❓
//   0x3756  ✅ 鬼怒川怨仙。🟢 船上の侍（周回の始め）で 2、大老暗殺計画で倒すと 0。1 になる場面はない
//   0x3757  ✅ ローラ。🟢 1＝死亡（鬼怒川の魔手でローラが倒れる）。2＝ローラの決意の導入（イベント 84）を見た（🔶 意味）
//   0x3758  ✅ J.J.。🟢 1＝死亡、3＝伯爵救出の成功（🔶 療養中）、4＝打ち解けた（伯爵に刺激をの成功）、
//              5＝逮捕された（刺激が欲しいの成功）。ローラ奪還で 0
//   0x3759  🟢 メリンダ。0＝生存、1＝死亡（講師ご到着・祝 病院開業・傷心の帰国船の戦闘）。魔鱗組として（表彰式）でも 1
//   0x375A  🟢 堂島。表彰式でほかの優勝者として並ぶと 1（堂島 0 かつ堂島の職 0x3799 が 0 のとき）。🔶 釜茹でになった。
//              町の人の状態の「堂島の死亡」（0x0264、townsfolk.ts）とは別のバイト（関係は ❓）
//   0x375B  🟢 先生。通常のプレイで変わる場面はない
//   0x375C  🟢 薬屋。変わる場面はない。小公女倒れるで 0 でないと町に入った時点で失敗
// 直後の 0x375D〜0x375F は施設（facility-flags.ts）。
// 選択 UI にはせず、生の値の欄として出す（AGENTS.md「未確認データの扱い」。書き換えの効果は人物ごとに要ゲーム内確認）。
//
// ❓ U-1 判定待ちのため [TS] の固定オフセット（案A）の位置で読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU8, writeU8 } from "./binary";
import { checkLayout } from "./hero";

export const CHARACTER_START = 0x374e;
export const CHARACTER_END = 0x375c;
export const CHARACTER_LENGTH = CHARACTER_END - CHARACTER_START + 1;

/** 通常モードで書ける上限。🟢 どの人物でも 0〜5（J.J. の 5 まで）の値しか取らない */
export const CHARACTER_NORMAL_MAX = 5;

/** 人物と、値の説明 */
export const CHARACTER_NOTES: Readonly<Record<number, { name?: string; note: string }>> = {
  0x374e: {
    name: "赤城",
    note: "🟢 0＝生存、1＝死亡、3＝病院に運ばれて助かった（再起の望みの成功）。将の器は 3、怒りの矛先は 1 で起きる",
  },
  0x374f: {
    name: "小暮",
    note: "🟢 0＝生存、1＝死亡。願い虚しくは 0 のとき小暮本人が敵になる",
  },
  0x3750: {
    name: "朱美",
    note: "🟢 真実でまだら（朱美）に勝つと 1。1 を書くと朱美が消えた（確認済み）",
  },
  0x3751: { name: "琴吹", note: "🟢 1 になる場面はない（武人 琴吹光で死んでも変わらない）" },
  0x3752: {
    name: "茂呂",
    note: "🟢 0＝生存、1＝死亡。1 だと剣術大会の準備で建築現場にいない。大寄せで幕府ルートに入るには 1 でないことが要る",
  },
  0x3753: { name: "万由", note: "0＝生存、1＝死亡" },
  0x3754: { name: "千佳", note: "0＝生存、1＝死亡" },
  0x3755: { name: "百合", note: "0＝生存、1＝死亡" },
  0x3756: {
    name: "鬼怒川怨仙",
    note: "🟢 船上の侍（周回の始め）で 2、大老暗殺計画で倒すと 0。1 になる場面はない",
  },
  0x3757: {
    name: "ローラ",
    note: "🟢 1＝死亡（鬼怒川の魔手）。2＝ローラの決意の導入を見た（🔶 意味）",
  },
  0x3758: {
    name: "J.J.",
    note: "🟢 1＝死亡、3＝伯爵救出の成功（🔶 療養中）、4＝打ち解けた、5＝逮捕された（刺激が欲しいの成功）。ローラ奪還で 0",
  },
  0x3759: {
    name: "メリンダ",
    note: "🟢 0＝生存、1＝死亡（講師ご到着・祝 病院開業・傷心の帰国船の戦闘、魔鱗組として）",
  },
  0x375a: {
    name: "堂島",
    note: "🟢 表彰式でほかの優勝者として並ぶと 1（🔶 釜茹で）。町の人の状態の「堂島の死亡」とは別のバイト",
  },
  0x375b: { name: "先生", note: "🟢 通常のプレイで変わる場面はない" },
  0x375c: {
    name: "薬屋",
    note: "🟢 変わる場面はない。小公女倒れるで 0 でないと町に入った時点で失敗",
  },
};

export type CharactersView = {
  values: number[];
  /** 見たことのない値があれば理由。編集はできる */
  warning: string | null;
  problem: string | null;
};

export function readCharacters(bytes: Uint8Array): CharactersView {
  if (bytes.byteLength <= CHARACTER_END)
    throw new RangeError("ファイルが小さすぎて人物の状態を読めません");
  const values = Array.from({ length: CHARACTER_LENGTH }, (_, i) =>
    readU8(bytes, CHARACTER_START + i),
  );
  const bad = values.findIndex((v) => v > CHARACTER_NORMAL_MAX);
  const warning =
    bad >= 0
      ? `0x${(CHARACTER_START + bad).toString(16).toUpperCase()} に通常のプレイでは取らない値があります（${values[bad]}）`
      : null;
  return { values, warning, problem: checkLayout(bytes) };
}

/** 通常モードは 0〜5、上級者モードは任意の u8。問題がなければ null */
export function validateCharacter(value: number, opts: { advanced: boolean }): string | null {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) return `u8 の範囲外です: ${value}`;
  if (!opts.advanced && value > CHARACTER_NORMAL_MAX)
    return `通常モードでは 0〜${CHARACTER_NORMAL_MAX} を指定してください: ${value}`;
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
  if (offset < CHARACTER_START || offset > CHARACTER_END)
    throw new RangeError(`範囲外のオフセットです: 0x${offset.toString(16)}`);
  const error = validateCharacter(value, opts);
  if (error) throw new RangeError(error);
  writeU8(bytes, offset, value);
}
