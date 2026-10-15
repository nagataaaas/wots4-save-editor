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
import { tr } from "@/lib/i18n";
import { readU8, writeU8 } from "./binary";
import { type ViewStatus } from "./field";
import { defineLocalized } from "./flags/byte-flag";
import { CHARACTER_STATUS, characterStatusForTown } from "./flags/characters";
import { assertWritable, checkLayout } from "./layout";
import { npcLabelId } from "./master/label-types";
import { npcLabel } from "./master/labels";
import { TOWNSFOLK_PERSON_TABLE } from "./master/dataset/townsfolk-person";

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

/** townsfolk-person.csv の区切り・後ろに付ける語・区分の英語 */
const PART_EN: Readonly<Record<string, string>> = {
  "": "",
  "（": " (",
  "（DLCの": " (DLC: ",
  "・": " / ",
  "）": ")",
  "（おやじ）": " (old man)",
  "（道場主）": " (dojo master)",
  重要人物: "Key characters",
  店主: "Shopkeepers",
  "依頼主・四天王など": "Clients, Four Samurai Lords, etc.",
  その他: "Others",
};

const partText = (ja: string) => tr({ ja, en: PART_EN[ja] ?? "" });
const npcName = (id: number) => npcLabel(npcLabelId(id));

/**
 * 🟢 人物番号と人物（chunks/townsfolk「人物のレコード」）。堂島・寿司屋・鍛冶屋のおやじは死亡の位置が ✅ [U]。
 * name・group は読むたびに今の言語で返す
 */
export const TOWNSFOLK_PEOPLE: readonly TownsfolkPerson[] = Object.values(TOWNSFOLK_PERSON_TABLE)
  .sort((a, b) => a.display_order - b.display_order)
  .map(r => {
    const out = { p: r.id_dec } as TownsfolkPerson;
    defineLocalized(
      out,
      "name",
      () =>
        `${npcName(r.npc)}${partText(r.separator)}${r.second_npc === null ? '' : npcName(r.second_npc)}${partText(r.suffix)}`,
    );
    defineLocalized(out, "group", () => partText(r.group));
    return out;
  });

const PERSON_BY_NUMBER = new Map(TOWNSFOLK_PEOPLE.map((x) => [x.p, x]));

/**
 * 🟢 ビットを外すだけでは生き返らない人物と、一緒に戻す値（chunks/townsfolk「生き返らせるとき」）。
 * 重要人物は町に出る条件に「人物の状態＝ 0」もある。状態は物語の進み具合も持つので、書き換えると物語と食い違う。
 * 要ゲーム内確認
 */
export function reviveNote(p: number): string | null {
  const status = characterStatusForTown(p);
  if (status && status !== CHARACTER_STATUS.sushi && status !== CHARACTER_STATUS.pharmacist) {
    return tr({
      ja: "「人物の状態」の同じ人物も生存にしないと町に出てこない",
      en: "Won't appear in town unless the same person is also set to alive in \"Character status\"",
    });
  }
  if (status === CHARACTER_STATUS.sushi)
    return tr({
      ja: "「人物の状態」の寿司屋も生存にしないと死んだ扱いのまま",
      en: "Still treated as dead unless Sushi-ya is also set to alive in \"Character status\"",
    });
  if (status === CHARACTER_STATUS.pharmacist)
    return tr({
      ja: "「人物の状態」の同じ人物も生存にしないと死んだ扱いのまま",
      en: "Still treated as dead unless the same person is also set to alive in \"Character status\"",
    });
  return null;
}

/** 人物番号の名前。表にない番号は「人物 p（空き）」 */
export function personName(p: number): string {
  return PERSON_BY_NUMBER.get(p)?.name ?? tr({ ja: `人物 ${p}（空き）`, en: `Person ${p} (empty)` });
}

export type TownsfolkView = ViewStatus & {
  values: number[];
};

/** 🟢 人物レコード先頭の死亡ビット。 */
export function isPersonDead(view: TownsfolkView, p: number): boolean {
  return (view.values[personOffset(p) - TOWNSFOLK_START] & 1) === 1;
}

export function readTownsfolk(bytes: Uint8Array): TownsfolkView {
  if (bytes.byteLength <= TOWNSFOLK_END)
    throw new RangeError(
      tr({ ja: "ファイルが小さすぎて町の人の状態を読めません", en: "The file is too small to read the townsfolk status" }),
    );
  const values = Array.from({ length: TOWNSFOLK_LENGTH }, (_, i) =>
    readU8(bytes, TOWNSFOLK_START + i),
  );
  return { warnings: [], values, problem: checkLayout(bytes) };
}

export type PersonState = TownsfolkPerson & {
  offset: number;
  dead: boolean;
  /** bit0 以外の使われていないビット・バイトが 0 でない */
  unusedBitsSet: boolean;
};

/** 🟢 名前の分かっている人物の死亡のビット */
export function readPeople(bytes: Uint8Array): PersonState[] {
  const view = readTownsfolk(bytes);
  return TOWNSFOLK_PEOPLE.map((x) => {
    const offset = personOffset(x.p);
    const rec = view.values.slice(
      offset - TOWNSFOLK_START,
      offset - TOWNSFOLK_START + PERSON_RECORD_SIZE,
    );
    return {
      ...x,
      offset,
      dead: isPersonDead(view, x.p),
      unusedBitsSet: (rec[0] & 0xfe) !== 0 || rec.slice(1).some((b) => b !== 0),
    };
  });
}

/** 人物 p（0〜209）の死亡のビット（+0x00 の bit0）だけを書く。ほかのビットは変えない */
export function writePersonDead(bytes: Uint8Array, p: number, dead: boolean): void {
  assertWritable(bytes);
  if (!Number.isInteger(p) || p < 0 || p >= PERSON_COUNT)
    throw new RangeError(tr({ ja: "人物の指定が正しくありません", en: "Invalid person" }));
  const offset = personOffset(p);
  const old = readU8(bytes, offset);
  writeU8(bytes, offset, dead ? old | 1 : old & 0xfe);
}
