// 勢力の退場：1 にすると、その勢力の人物が町から消える。出典：docs/save_format/chunks/best-route
//
//   0x378F  幕府。✅ [U] 2026-10-09：1 にすると、同心・岡っ引き・魔鱗組・武士（港・大通り・街道など）、
//           代官所の門の外の茂呂・佐古津・野戸仏・疑惑の浪人・道具屋、代官所・牢屋の琴吹・三姉妹・鬼怒川・武士、
//           治安が高いときに湧く取り締まり役、夜の暗闇脳天の巡回が消えた。
//           🟢 通常のプレイで 1 になる場面はない。
//   0x3790  外国。✅ [U] 2026-10-09：1 にすると、外国人・外国商人・海兵隊・船乗り・貴婦人・パツキン隊、
//           領事館のローラ・J.J・メリンダ、居留地・病院・語学所・カジノ・レストラン・黒船の人が消えた。
//           🟢 鬼怒川の魔手（ローラが死んだとき）・夕暮れの船上（断ったとき）・傷心の帰国船で 1。
//   0x3791  攘夷。✅ [U] 2026-10-09：1 にすると、般若党（神社・港・大通り・街道など）、神社の赤城・小暮・雑貨屋、朱美と客が消えた。
//           🟢 再起の望み（赤城が死んだとき）・般若党壊滅・三匹で斬るの成功で 1。
// どれも周回の始めに 0 になる（🟢）。
//
// [TS] の固定オフセットで読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU8, writeU8 } from "./binary";
import { checkLayout } from "./hero";

export type FactionExitFlag = {
  offset: number;
  /** 勢力の名前 */
  label: string;
  note: string;
  /** 書き換えたときにゲームで消えることを確かめたか */
  confirmed: boolean;
};

export const FACTION_EXIT_FLAGS: readonly FactionExitFlag[] = [
  {
    offset: 0x378f,
    label: "幕府",
    note: "1 で同心・岡っ引き・魔鱗組・武士、代官所の門の外と牢屋の人物（茂呂・佐古津・野戸仏・琴吹・三姉妹・鬼怒川など）、治安が高いときの取り締まり役、夜の暗闇脳天の巡回が消える（書き換えで確認済み）。🟢 通常のプレイで 1 になる場面はない",
    confirmed: true,
  },
  {
    offset: 0x3790,
    label: "外国",
    note: "1 で外国人・外国商人・海兵隊・船乗り・貴婦人・パツキン隊、領事館のローラ・J.J・メリンダ、居留地・病院・語学所・カジノ・レストラン・黒船の人が消える（書き換えで確認済み）。🟢 鬼怒川の魔手（ローラが死んだとき）・夕暮れの船上（断ったとき）・傷心の帰国船で 1",
    confirmed: true,
  },
  {
    offset: 0x3791,
    label: "攘夷",
    note: "1 で般若党（神社・港・大通り・街道など）、神社の赤城・小暮・雑貨屋、朱美と客が消える（書き換えで確認済み）。🟢 再起の望み（赤城が死んだとき）・般若党壊滅・三匹で斬るの成功で 1",
    confirmed: true,
  },
];

export type FactionExitView = {
  values: number[];
  /** レイアウトの検証に落ちた理由。あれば読み取り専用 */
  problem: string | null;
};

/** 生の値を読む。0・1 以外の値もそのまま返す（画面で生の値として出す） */
export function readFactionExit(bytes: Uint8Array): FactionExitView {
  if (bytes.byteLength < 0x3800) throw new RangeError("ファイルが小さすぎてフラグを読めません");
  return {
    values: FACTION_EXIT_FLAGS.map((f) => readU8(bytes, f.offset)),
    problem: checkLayout(bytes),
  };
}

/** index 番目のフラグの1バイトだけを書く。通常モードでは 0・1 だけ、上級者モードでは任意の u8 */
export function writeFactionExit(
  bytes: Uint8Array,
  index: number,
  value: number,
  opts: { advanced: boolean },
): void {
  const view = readFactionExit(bytes);
  if (view.problem) throw new RangeError(view.problem);
  const flag = FACTION_EXIT_FLAGS[index];
  if (!flag) throw new RangeError(`フラグの番号が範囲外です: ${index}`);
  if (!Number.isInteger(value) || value < 0 || value > 0xff)
    throw new RangeError(`u8 の範囲外です: ${value}`);
  if (!opts.advanced && value > 1) throw new RangeError(`0 か 1 を指定してください: ${value}`);
  writeU8(bytes, flag.offset, value);
}
