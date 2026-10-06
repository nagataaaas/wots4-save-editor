// 重要人物の状態の候補 0x374E〜0x375C（15 B、u8 × 人数）を、生の値で編集する。出典：docs/save_format/chunks/characters（[U] 2026-10-06）。
//
// イベント状態 A（0x36A8〜0x374D）のすぐ後ろ。周回の始め（sample/S4-DATA_00 copy）は全部 0 で、
// 「生死フラグは周回ごとに初期化される」（chunks/characters）と合う。[U] の推定で、重要人物ごとの状態（生死など）の配列と考えている（🔶）。
//
//   0x374E  🔶 赤城。00＝生存（再起の望みの前のすべて）、01＝死亡（赤城が死んだ 01 copy 7・11・12、02 copy）、
//              03＝病院に送った（02）。差分からの推定で、書き換えの効果は ❓
//   0x374F  🔶 小暮。01＝死亡（怒りの矛先で小暮が死んだ 01 copy 12 だけ。[U] 2026-10-06 確認）。差分1回、書き換えの効果は ❓
//   0x3750  ✅ 朱美。[U] 2026-10-06：1 を書くと朱美が消えた（死亡扱いか ❓）
//   0x3751  ✅ 琴吹。0x3752 ✅ 茂呂。0x3753 ✅ マユ。0x3754 ✅ チカ。0x3755 ✅ ユリ（[U] 2026-10-06 の書き換えで確認）
//   0x3756  ✅ 鬼怒川怨仙（[U] 2026-10-06 の書き換えで確認）。値は [U] の推定で 🔶 0＝出現、1＝死亡、2＝まだ阿弥浜に来ていない。
//              阿弥浜港争乱のあとのすべてのセーブで 02、周回の始めだけ 00。大老の到着イベントの前に 0 にしても出現しなかった
//   0x3757  ✅ ローラ。[U] 2026-10-06：1 を書くとローラが消えた
//   0x3758  ✅ J.J.。[U] 2026-10-06：1 を書くと J.J. がいなくなった
//   0x3759  🔶 メリンダ。01＝死亡（[U] 2026-10-06：メリンダが死ぬと 1 になった。差分1回）。書き換えの効果は ❓
//   0x375A  🟢 堂島。0x375B 🟢 先生。0x375C 🟢 薬屋。すべてのセーブで 0、値の意味は ❓。
//              堂島は、町の人の状態の「堂島の死亡」（0x0264、townsfolk.ts）とは別のバイト（関係は ❓）
// 直後の 0x375D〜0x375F は施設（facility-flags.ts）。
// 値の意味（0 生存・1 死亡など）は人物ごとに確かめていないので、生の値の欄として出す（AGENTS.md「未確認データの扱い」）。
//
// ❓ U-1 判定待ちのため [TS] の固定オフセット（案A）の位置で読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU8, writeU8 } from "./binary";
import { checkLayout } from "./hero";

export const CHARACTER_START = 0x374e;
export const CHARACTER_END = 0x375c;
export const CHARACTER_LENGTH = CHARACTER_END - CHARACTER_START + 1;

/** 通常モードで書ける上限。実セーブで見た値は 0〜3 */
export const CHARACTER_NORMAL_MAX = 3;

/** 推定している人物と、見た値の説明 */
export const CHARACTER_NOTES: Readonly<Record<number, { name?: string; note: string }>> = {
  0x374e: {
    name: "赤城？",
    note: "🔶 00＝生存、01＝死亡（赤城が死んだセーブ）、03＝病院に送った。書き換えの効果は未確認",
  },
  0x374f: {
    name: "小暮？",
    note: "🔶 01＝死亡（怒りの矛先で小暮が死んだセーブ。1件だけ）。書き換えの効果は未確認",
  },
  0x3750: {
    name: "朱美",
    note: "1 を書くと朱美が消えた（確認済み）。1＝死亡・退場と推定",
  },
  0x3751: { name: "琴吹", note: "書き換えで確認済み。1＝死亡・退場と推定" },
  0x3752: { name: "茂呂", note: "書き換えで確認済み。1＝死亡・退場と推定" },
  0x3753: { name: "マユ", note: "書き換えで確認済み。1＝死亡・退場と推定" },
  0x3754: { name: "チカ", note: "書き換えで確認済み。1＝死亡・退場と推定" },
  0x3755: { name: "ユリ", note: "書き換えで確認済み。1＝死亡・退場と推定" },
  0x3756: {
    name: "鬼怒川怨仙",
    note: "書き換えで確認済み。🔶 0＝出現、1＝死亡、2＝まだ阿弥浜に来ていない（阿弥浜港争乱のあとは 2）。大老の到着イベントの前に 0 にしても出現しなかった",
  },
  0x3757: {
    name: "ローラ",
    note: "1 を書くとローラが消えた（確認済み）。1＝死亡・退場と推定",
  },
  0x3758: {
    name: "J.J.",
    note: "1 を書くと J.J. がいなくなった（確認済み）。1＝死亡・退場と推定",
  },
  0x3759: {
    name: "メリンダ？",
    note: "🔶 01＝死亡（メリンダが死ぬと 1 になった。1回だけ確認）。書き換えの効果は未確認",
  },
  // 🟢 人物 ／ ❓ 値
  0x375a: { name: "堂島", note: "すべてのセーブで 0。値の意味は未確認。町の人の状態の「堂島の死亡」とは別のバイト" },
  0x375b: { name: "先生", note: "すべてのセーブで 0。値の意味は未確認" },
  0x375c: { name: "薬屋", note: "すべてのセーブで 0。値の意味は未確認" },
};

export type CharactersView = {
  values: number[];
  /** 見たことのない値があれば理由。編集はできる */
  warning: string | null;
  problem: string | null;
};

export function readCharacters(bytes: Uint8Array): CharactersView {
  if (bytes.byteLength <= CHARACTER_END) throw new RangeError("ファイルが小さすぎて人物の状態を読めません");
  const values = Array.from({ length: CHARACTER_LENGTH }, (_, i) => readU8(bytes, CHARACTER_START + i));
  const bad = values.findIndex((v) => v > CHARACTER_NORMAL_MAX);
  const warning =
    bad >= 0
      ? `0x${(CHARACTER_START + bad).toString(16).toUpperCase()} に実セーブで見たことのない値があります（${values[bad]}）`
      : null;
  return { values, warning, problem: checkLayout(bytes) };
}

/** 通常モードは 0〜3、上級者モードは任意の u8。問題がなければ null */
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
