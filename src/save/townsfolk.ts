// 町の人の状態 0x011C〜0x0B33（2,584 B）。出典：docs/save_format/chunks/townsfolk。
//
// 🟢 前半 0x011C〜0x015B は「なりわいのフラグ」u8 × 64（0x011C + 番号）。
//    意味の分かった番号は、画面のブロックごとの配列（src/save/flags/）で編集する：
//      4〜9・25〜31  なりわいの画面（flags/occupation.ts）
//      10・13・16〜18・20・21・23・24、0x0127（番号 11）・0x0132（番号 22）  NPCイベントフラグ（flags/npc-events.ts）
//    0・12・14・32〜63 は使われていない 🟢。
//    1〜3（会話の回数）と 15（開発用）はエリア移動・ロードで 0 に戻る 🟢。エディタで書いてもロードで消えるので扱わない。
//    範囲の中で書くのは、上の配列のフラグと死亡のビット（writePersonDead）だけ。生のバイトの編集欄は出さない
// 🟢 後半 0x015C〜0x0B33 は町の人（人物番号 p、0〜209）ごとの 12 B のレコード（0x015C + 12 × p）。
//    使われているのは先頭の u32 のビット 0（死亡・町からいなくなった）だけ。ほかのビットと +0x04〜+0x0B は使われていない 🟢。
//    斬られたときのほか、引退（堂島が継いだあとのおやじ）や道場主を怒らせたときにも立つ。夜這いの場面で倒した相手には立たない。
//    周回の終わりにまとめて 0（全員が生き返る）。ビットだけを外しても生き返らない人物がいる（reviveNote）。
//    ✅ [U] 2026-10-06：堂島（p 22、0x0264）・寿司屋（p 30、0x02C4）・鍛冶屋のおやじ（p 62、0x0444）の死亡を差分で確認し、
//       寿司屋と鍛冶屋のおやじは 0 に戻すと生き返った。さよ（p 81、0x0528）は差分1回で死亡を見た（生き返りは要ゲーム内確認）
//
// 固定オフセットで読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU8, writeU8 } from "./binary";
import { CHARACTER_STATUS, characterStatusForTown } from "./flags/characters";
import { checkLayout } from "./hero";
import { nameOf } from "./master/labels";

/** 🟢 主人公名（〜0x011B）の直後 */
export const TOWNSFOLK_START = 0x011c;
/** 🟢 人物のレコードの終わり（直後の 0x0B34〜 は侍評価） */
export const TOWNSFOLK_END = 0x0b33;
export const TOWNSFOLK_LENGTH = TOWNSFOLK_END - TOWNSFOLK_START + 1;

/** 🟢 なりわいのフラグ（0x011C + 番号、u8 × 64）の先頭 */
export const OCCUPATION_FLAG_START = 0x011c;
/** 🟢 なりわいのフラグの件数 */
export const OCCUPATION_FLAG_COUNT = 64;

export function occupationFlagOffset(n: number): number {
  return OCCUPATION_FLAG_START + n;
}

/** 🟢 使われていないなりわいのフラグの番号 */
export const UNUSED_OCCUPATION_FLAGS: readonly number[] = [
  0,
  12,
  14,
  ...Array.from({ length: 32 }, (_, i) => 32 + i),
];

/** 🟢 町の人のレコード（人物番号 p、0x015C + 12 × p）の先頭・幅・件数 */
export const PERSON_RECORDS_START = 0x015c;
export const PERSON_RECORD_SIZE = 12;
export const PERSON_COUNT = 210;

export function personOffset(p: number): number {
  return PERSON_RECORDS_START + PERSON_RECORD_SIZE * p;
}

export type TownsfolkPerson = { p: number; name: string; group: string };

/** 🟢 人物番号と人物（chunks/townsfolk「人物のレコード」）。堂島・寿司屋・鍛冶屋のおやじは死亡の位置が ✅ [U] */
export const TOWNSFOLK_PEOPLE: readonly TownsfolkPerson[] = [
  ...(
    [
      [10, nameOf.npc(1)],
      [11, nameOf.npc(2)],
      [12, `${nameOf.npc(3)}・${nameOf.npc(10)}`],
      [13, nameOf.npc(4)],
      [14, nameOf.npc(5)],
      [15, nameOf.npc(6)],
      [16, nameOf.npc(7)],
      [17, nameOf.npc(8)],
      [18, nameOf.npc(9)],
      [19, nameOf.npc(11)],
      [20, nameOf.npc(12)],
      [21, nameOf.npc(13)],
      [22, nameOf.npc(14)],
      [23, `${nameOf.npc(15)}（${nameOf.npc(93)}）`],
    ] as const
  ).map(([p, name]) => ({ p, name, group: "重要人物" })),
  ...(
    [
      [30, nameOf.npc(137)],
      [31, nameOf.npc(138)],
      [32, nameOf.npc(139)],
      [33, nameOf.npc(140)],
      [34, nameOf.npc(141)],
      [35, nameOf.npc(142)],
      [36, nameOf.npc(143)],
      [37, nameOf.npc(158)],
      [38, nameOf.npc(90)],
      [39, nameOf.npc(79)],
      [40, `${nameOf.npc(145)}（DLCの${nameOf.npc(207)}）`],
      [50, nameOf.npc(144)],
      [51, nameOf.npc(145)],
      [52, nameOf.npc(146)],
      [53, nameOf.npc(147)],
      [54, nameOf.npc(148)],
      [55, nameOf.npc(149)],
      [56, nameOf.npc(150)],
      [57, nameOf.npc(151)],
      [58, nameOf.npc(152)],
      [59, nameOf.npc(153)],
      [60, nameOf.npc(154)],
      [61, nameOf.npc(155)],
      [62, `${nameOf.npc(25)}（おやじ）`],
    ] as const
  ).map(([p, name]) => ({ p, name, group: "店主" })),
  ...(
    [
      [100, nameOf.npc(37)],
      [101, `${nameOf.npc(162)}・${nameOf.npc(44)}`],
      [102, nameOf.npc(40)],
      [103, nameOf.npc(45)],
      [104, `${nameOf.npc(169)}・${nameOf.npc(69)}`],
      [105, `${nameOf.npc(76)}・${nameOf.npc(73)}`],
      [106, `${nameOf.npc(168)}・${nameOf.npc(68)}`],
      [107, nameOf.npc(61)],
      [108, nameOf.npc(48)],
      [109, nameOf.npc(51)],
      [110, `${nameOf.npc(56)}・${nameOf.npc(57)}`],
      [111, nameOf.npc(164)],
    ] as const
  ).map(([p, name]) => ({ p, name, group: "依頼主・四天王など" })),
  ...(
    [
      [70, `${nameOf.npc(32)}（道場主）`],
      [72, nameOf.npc(16)],
      [80, nameOf.npc(211)],
      [81, nameOf.npc(215)],
      [200, nameOf.npc(97)],
    ] as const
  ).map(([p, name]) => ({ p, name, group: "その他" })),
  ...([[201, nameOf.npc(94)]] as const).map(([p, name]) => ({ p, name, group: "重要人物" })),
];

const PERSON_BY_NUMBER = new Map(TOWNSFOLK_PEOPLE.map((x) => [x.p, x]));

/**
 * 🟢 ビットを外すだけでは生き返らない人物と、一緒に戻す値（chunks/townsfolk「生き返らせるとき」）。
 * 重要人物は町に出る条件に「人物の状態＝ 0」もある。状態は物語の進み具合も持つので、書き換えると物語と食い違う。
 * 要ゲーム内確認
 */
export function reviveNote(p: number): string | null {
  const status = characterStatusForTown(p);
  if (status && status !== CHARACTER_STATUS.sushi && status !== CHARACTER_STATUS.pharmacist) {
    return "「人物の状態」の同じ人物も生存にしないと町に出てこない";
  }
  if (status === CHARACTER_STATUS.sushi) return "「人物の状態」の寿司屋も生存にしないと死んだ扱いのまま";
  if (status === CHARACTER_STATUS.pharmacist) return "「人物の状態」の同じ人物も生存にしないと死んだ扱いのまま";
  return null;
}

/** 人物番号の名前。表にない番号は「人物 p（空き）」 */
export function personName(p: number): string {
  return PERSON_BY_NUMBER.get(p)?.name ?? `人物 ${p}（空き）`;
}

export type TownsfolkView = {
  values: number[];
  problem: string | null;
};

export function readTownsfolk(bytes: Uint8Array): TownsfolkView {
  if (bytes.byteLength <= TOWNSFOLK_END)
    throw new RangeError("ファイルが小さすぎて町の人の状態を読めません");
  const values = Array.from({ length: TOWNSFOLK_LENGTH }, (_, i) =>
    readU8(bytes, TOWNSFOLK_START + i),
  );
  return { values, problem: checkLayout(bytes) };
}

export type PersonState = TownsfolkPerson & {
  offset: number;
  dead: boolean;
  /** bit0 以外の使われていないビット・バイトが 0 でない */
  unusedBitsSet: boolean;
};

/** 🟢 名前の分かっている人物の死亡のビット */
export function readPeople(bytes: Uint8Array): PersonState[] {
  const { values } = readTownsfolk(bytes);
  return TOWNSFOLK_PEOPLE.map((x) => {
    const offset = personOffset(x.p);
    const rec = values.slice(
      offset - TOWNSFOLK_START,
      offset - TOWNSFOLK_START + PERSON_RECORD_SIZE,
    );
    return {
      ...x,
      offset,
      dead: (rec[0] & 1) === 1,
      unusedBitsSet: (rec[0] & 0xfe) !== 0 || rec.slice(1).some((b) => b !== 0),
    };
  });
}

/** 人物 p（0〜209）の死亡のビット（+0x00 の bit0）だけを書く。ほかのビットは変えない */
export function writePersonDead(bytes: Uint8Array, p: number, dead: boolean): void {
  const problem = checkLayout(bytes);
  if (problem) throw new RangeError(problem);
  if (!Number.isInteger(p) || p < 0 || p >= PERSON_COUNT)
    throw new RangeError("人物の指定が正しくありません");
  const offset = personOffset(p);
  const old = readU8(bytes, offset);
  writeU8(bytes, offset, dead ? old | 1 : old & 0xfe);
}
