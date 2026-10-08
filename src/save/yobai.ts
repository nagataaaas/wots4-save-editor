// 夜の約束と夜這いの記録。出典：docs/save_format/chunks/night-visit（[U] 2026-10-06、sample/S4-DATA_03 copy 5〜10、[U] 2026-10-07 sample/S4-DATA_02）。
//
// 約束の枠 0x14038〜（0x2C B）。約束すると値が入り、夜這いが終わると +0x00〜+0x23 が FF に戻る（年齢・血液型・+0x2A は前の値が残る）。
// 🟢 +0x00〜+0x1B は、約束の相手ごとに決まった値の組（+0x04 だけ相手ごとに変わる）。
//   +0x02 u16  ✅ [U] 2026-10-07 日付ではない（1日目に町の人と約束して 1、5日目に先生と約束して 0）。
//              🟢 特別な相手（さよ・先生）は 0、町の人は 1〜3。意味は ❓ なので書き換えない（group）
//   +0x04 u32  ✅ [U] しゃべり方と戦闘力の型（はるなを 0x031B にすると、台詞がさよの「・・・」になり、体力・攻撃力が高くなった）。
//              FFFFFFFF なら約束なし（空の枠）
//   +0x08 u16  ✅ [U] 約束の場所（夜這いに入る扉と、その先のマップ）。0x00〜0x22 の名前を書き換えで確認。0x23 以降は名前が空
//   +0x0A u16  ✅ [U] 位置 ／ 🔶 意味：行き先での人と布団の配置。場所と組で正しい値がある（0C＋07 は布団がおかしく、0C＋06 は正常）
//   +0x1C u32  ✅ [U] 名前（または NPC の ID）。はるなを 0xD7 にすると、名前がさよになった
//   +0x20 u32  ✅ [U] 見た目（モデル）と声。はるなを 0xF5 にすると、見た目と声がさよになった
//   +0x24 u8   ✅ [U] 年齢（0x30 で48歳）。FF は「？」（さよ）
//   +0x25 u8   ✅ [U] 血液型。1＝A、2＝B、3＝O、4＝AB（書き換えで確認）、5＝「？」（さよ）
//   +0x28 u16  🔶 約束した日（経過日数、1日目＝0）。8人（さよ・かえで・はるな・先生・メリンダ・三姉妹）で約束したセーブの 0x0BD8 と一致。
//              空の枠では FFFF。書き換えの効果は未確認（要ゲーム内確認）
//   +0x2A u16  ❓ 夜這い・約束のあとで増えていくビット（町の人の夜這いのあと 7、百合 0x20 → 万由 0x28 → 千佳 0x38）。空の枠でも残る
//   +0x00 は特別な相手で FFFF、町の人で 0〜3（🟢）。+0x0C〜+0x1B はいつも 0A 0B 0E 0F 0C 0D 1D 01（🟢）。
//   +0x00・+0x0C〜+0x1B・+0x26・+0x2A の意味は ❓（書き換えない）
// 名前 +0x1C の ID は master/npc-names.ts（datatable/npc/npc-name.csv、🟢）。
// [U] 2026-10-07：朱美と約束したあとはセーブできない（マップを移るとすっぽかしになる）ので、朱美の約束の実データはない。
//
// 夜這いの記録 0x137F0〜（16 B × 100件）。夜這いのたびに1件足される。
// 🔶 件数は 0x13E34。[U] 2026-10-07 sample/S4-DATA_02 copy → 01 copy 4（ローラとの夜這い）で、0x13E34 0 → 1・0x137EC 1 → 2 となり、
//    記録は1件目（0x137F0）に書かれた → 次に書く位置は 0x13E34。0x137EC は夜這い回数の表示（✅）で、記録の件数とずれることがある
//   +0x00 u32 型、+0x04 u32 名前、+0x08 u32 🟢 入った建物の番号（0x20C〜0x228。同じ建物の扉は同じ番号）、
//   +0x0C u16 🔶 約束した日（約束の枠の +0x28 と同じ値。さよ 0、かえで 1、ローラ 2 の3件で一致）、
//   +0x0E u8 年齢、+0x0F u8 血液型。
// ✅ [U] 2026-10-07：0x137EC を 16、0x13E34 を 48 にすると、約束の画面の夜這い回数は 16 になった → 表示は 0x137EC。
//   空の件は FFFFFFFF FFFFFFFF 00000000 FFFF0000。記録の書き換えがゲームに反映されるかは未確認（要ゲーム内確認）。
//
// 新しい約束や記録を作る・消す機能は持たない（❓ の領域を書かずに済ませるため）。
// ❓ U-1 判定待ちのため [TS] の固定オフセット（案A）の位置で読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU16, readU32, readU8, writeU16, writeU32, writeU8 } from "./binary";
import { checkLayout } from "./hero";
import { labelOf } from "./master/labels";
import { npcName } from "./master/npc-names";

export const PROMISE_OFFSET = 0x14038;
export const PROMISE_LENGTH = 0x2c;
export const PROMISE_EMPTY = 0xffffffff;

/** 🔶 記録の件数（次に書く位置） */
export const RECORD_COUNT_OFFSET = 0x13e34;
/** ✅ [U] 約束の画面の夜這い回数 */
export const YOBAI_TOTAL_OFFSET = 0x137ec;
export const RECORDS_OFFSET = 0x137f0;
export const RECORD_SIZE = 0x10;
export const RECORD_CAPACITY = 100;

/** 空の記録のバイト列（ゲームが書く値） */
export const RECORD_EMPTY_BYTES: readonly number[] = [
  0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00,
];

/**
 * 夜這いのたびに増えたカウンタ（どれも 1 → 2）。表示だけ。
 * ✅ [U] 2026-10-07 約束の画面の夜這い回数は 0x137EC。🔶 記録の件数は 0x13E34。
 * 0x13E4C はローラとの夜這いで 0 → 1（❓ 1回だけ）。
 * 0x37C8 は sample/S4-DATA_03 copy 10 で件数 1 なのに 2 だったので、夜這いの回数ではない（意味は ❓）
 */
export const YOBAI_COUNTERS: readonly { offset: number; size: 1 | 4; note: string }[] = [
  { offset: 0x137ec, size: 4, note: "約束の画面の「夜這い回数」はこの値（確認済み）。記録の件数とずれることがある" },
  { offset: 0x13e34, size: 4, note: "記録の件数（推定）。次の記録はこの位置に書かれる" },
  { offset: 0x13e4c, size: 4, note: "ローラとの夜這いで 0 → 1。意味は不明" },
  { offset: 0x37c8, size: 1, note: "フラグ列の中。夜這いの回数と合わないセーブがある" },
];

/** ✅ [U] 2026-10-06：約束の場所 +0x08（書き換えて、約束の画面に出る名前を見た） */
export const PLACES: readonly string[] = [
  "港　ほったて小屋",
  "港　寿司屋裏",
  "港　海運業者",
  "港　回船問屋",
  "港　質屋",
  "港　歯医者",
  "港　二階建ての洋館",
  "港　天板写真館",
  "港　灯台",
  "町　長屋",
  "町　長屋",
  "町　長屋",
  "町　長屋　稲荷前",
  "町　長屋　稲荷前",
  "町　長屋　稲荷前",
  "町　長屋　稲荷前",
  "町　お屋敷",
  "町　提灯の掛かった家",
  "町　めし屋の向かい",
  "町　提灯のかかった家の向かい",
  "居留地　病院の隣",
  "居留地　両替屋",
  "居留地　新聞社",
  "居留地　質屋",
  "大通り　呉服屋の向かい",
  "大通り　ワイン店",
  "大通り　ビール店",
  "町　鍛冶屋",
  "領事館　二階ローラの部屋",
  "代官所　離れ",
  "代官所　離れ",
  "居酒屋　二階",
  "黒船　ベッド脇の部屋",
  "港　骨董屋",
  "領事館　一階左の部屋",
];

/**
 * 🟢 約束で使われる（場所、配置）の組（候補75行の重なりを除いて72組。datatable/place/night-visit-place.csv の layout 列）。
 * 町の人の約束と特別な相手（さよ・先生・ローラ・メリンダ・三姉妹など）の約束の組
 */
const GREEN_PLACE_LAYOUTS: readonly (readonly [number, readonly number[]])[] = [
  [0x00, [0x03]],
  [0x01, [0x07, 0x09, 0x26]],
  [0x02, [0x0a, 0x29, 0x38]],
  [0x03, [0x11, 0x13, 0x30]],
  [0x04, [0x0c, 0x0d]],
  [0x05, [0x0d, 0x36]],
  [0x06, [0x0e, 0x10, 0x2d]],
  [0x07, [0x12, 0x31]],
  [0x08, [0x33, 0x3c]],
  [0x09, [0x21]],
  [0x0a, [0x05, 0x24, 0x32]],
  [0x0b, [0x04, 0x22]],
  [0x0c, [0x06]],
  [0x0d, [0x03]],
  [0x0e, [0x06, 0x23, 0x3b]],
  [0x0f, [0x04]],
  [0x10, [0x11, 0x13, 0x3d]],
  [0x11, [0x0a, 0x0b, 0x20, 0x35]],
  [0x12, [0x2a]],
  [0x13, [0x0f, 0x2e]],
  [0x14, [0x0e, 0x10]],
  [0x15, [0x0b, 0x28, 0x37]],
  [0x16, [0x2b, 0x39]],
  [0x17, [0x12, 0x2f]],
  [0x18, [0x08, 0x25, 0x27]],
  [0x19, [0x0f, 0x2c]],
  [0x1a, [0x0c]],
  [0x1b, [0x1f]],
  [0x1c, [0x3a]],
  [0x1d, [0x19, 0x1a, 0x1b, 0x1c]],
  [0x1e, [0x17, 0x18]],
  [0x1f, [0x14, 0x15, 0x16]],
  [0x20, [0x1e]],
  [0x21, [0x34]],
  [0x22, [0x1d]],
];

/**
 * ✅ [U] 約束の実データで見た組の注記。すべて 🟢 の組の中にある。
 * 2026-10-06 の 1D＋01 は操作ミスとみられる（[U] 2026-10-07。配置 00〜02 は同心・岡っ引きがいる配置で、🟢 の組に出てこない）ので外した
 */
const SEEN_PLACE_LAYOUTS: readonly { place: number; layout: number; note?: string }[] = [
  { place: 0x00, layout: 0x03 },
  { place: 0x09, layout: 0x21 },
  { place: 0x0a, layout: 0x05 },
  { place: 0x0b, layout: 0x22 },
  { place: 0x0c, layout: 0x06, note: "かえで・はるな" },
  { place: 0x0e, layout: 0x23 },
  { place: 0x10, layout: 0x3d, note: "さよ" },
  { place: 0x11, layout: 0x20, note: "先生" },
  { place: 0x18, layout: 0x25 },
  { place: 0x1c, layout: 0x3a, note: "ローラ" },
  { place: 0x1d, layout: 0x19, note: "万由" },
  { place: 0x1d, layout: 0x1a, note: "千佳" },
  { place: 0x1d, layout: 0x1b, note: "百合" },
  { place: 0x20, layout: 0x1e, note: "メリンダ" },
];

/**
 * 正しい（場所、配置）の組。🟢 の72組。場所・配置の順。
 * 通常モードではこの組だけを書ける（配置が合わないと布団が宙に浮いたり壁にめり込んだりする）。
 * seen は実データで見た組、note はそのときの相手
 */
export const PLACE_LAYOUTS: readonly { place: number; layout: number; seen: boolean; note?: string }[] = GREEN_PLACE_LAYOUTS.flatMap(
  ([place, layouts]) => layouts.map((layout) => ({ place, layout })),
)
  .map(({ place, layout }) => {
    const seen = SEEN_PLACE_LAYOUTS.find((s) => s.place === place && s.layout === layout);
    return { place, layout, seen: seen !== undefined, note: seen?.note };
  })
  .sort((a, b) => a.place - b.place || a.layout - b.layout);

export type KnownValue = { value: number; label: string };

/**
 * 実セーブで見た人物の値（さよ・かえで・はるな・先生・メリンダ・三姉妹）。通常モードではこれだけを書ける。
 * 朱美 442 は 🟢（約束の実データはない。朱美は約束のあとセーブできない [U]）。ローラ 454 は 🟢 の値を [U] 2026-10-07 の実データで確認
 */
export const KNOWN_TYPES: readonly KnownValue[] = [
  { value: 0x031b, label: "さよ（台詞は「・・・」。体力・攻撃力が高い）" },
  { value: 0x25, label: "かえで" },
  { value: 0x49, label: "はるな" },
  { value: 0x0250, label: "先生" },
  { value: 0x0314, label: "メリンダ" },
  { value: 0x01c0, label: "万由" },
  { value: 0x01c1, label: "千佳" },
  { value: 0x01c2, label: "百合" },
  { value: 0x01ba, label: "朱美" },
  { value: 0x01c6, label: "ローラ" },
];
export const KNOWN_LOOKS: readonly KnownValue[] = [
  { value: 0xf5, label: "さよ" },
  { value: 0x1c, label: "かえで" },
  { value: 0x5d, label: "はるな" },
  { value: 0x57, label: "先生" },
  { value: 0x42, label: "メリンダ" },
  { value: 0x58, label: "万由" },
  { value: 0x04, label: "千佳" },
  { value: 0x06, label: "百合" },
  { value: 0x1d, label: "ローラ" },
];

/** 名前の表示。🟢 名前の表（npc-names）にない ID は 16進数 */
export function nameLabel(id: number): string {
  const entry = npcName(id);
  return entry ? labelOf({ kind: "npc", id: entry.labelId }) : `0x${id.toString(16).toUpperCase()}`;
}

/** ✅ [U] 血液型（1〜4 は書き換えで確認。5 はさよの「？」） */
export const BLOOD_TYPES: readonly KnownValue[] = [
  { value: 1, label: "A" },
  { value: 2, label: "B" },
  { value: 3, label: "O" },
  { value: 4, label: "AB" },
  { value: 5, label: "？" },
];

/** 年齢の「？」（さよ） */
export const AGE_UNKNOWN = 0xff;
/** 通常モードの年齢の上限（と AGE_UNKNOWN） */
export const AGE_NORMAL_MAX = 99;
/** 通常モードの約束した日（経過日数）の上限。scenario-date の DAY_RANGE.normal（99日目）に合わせる */
export const DAY_NORMAL_MAX = 98;

/**
 * group は約束の +0x02（❓ 日付ではない。特別な相手 0、町の人 1〜3）。
 * 意味が分からないので、上級者モードでだけ書ける（通常モードは今の値の書き戻しだけ）。
 * day は約束の +0x28・記録の +0x0C（🔶 約束した日）
 */
export type PersonField = "group" | "day" | "type" | "name" | "look" | "age" | "blood";
export type RecordField = Exclude<PersonField, "look" | "group">;

type FieldSpec = { rel: number; size: 1 | 2 | 4 };

const PROMISE_FIELDS: Record<PersonField, FieldSpec> = {
  group: { rel: 0x02, size: 2 },
  day: { rel: 0x28, size: 2 },
  type: { rel: 0x04, size: 4 },
  name: { rel: 0x1c, size: 4 },
  look: { rel: 0x20, size: 4 },
  age: { rel: 0x24, size: 1 },
  blood: { rel: 0x25, size: 1 },
};
export const PROMISE_PLACE_REL = 0x08;
export const PROMISE_LAYOUT_REL = 0x0a;

const RECORD_FIELDS: Record<RecordField, FieldSpec> = {
  type: { rel: 0x00, size: 4 },
  name: { rel: 0x04, size: 4 },
  day: { rel: 0x0c, size: 2 },
  age: { rel: 0x0e, size: 1 },
  blood: { rel: 0x0f, size: 1 },
};
/** 🟢 記録の +0x08：入った建物の番号（0x20C〜0x228。同じ建物の扉は同じ番号）。表示だけ */
export const RECORD_BUILDING_REL = 0x08;

export function promiseFieldOffset(field: PersonField): number {
  return PROMISE_OFFSET + PROMISE_FIELDS[field].rel;
}

export function recordOffset(index: number): number {
  return RECORDS_OFFSET + index * RECORD_SIZE;
}

export function recordFieldOffset(index: number, field: RecordField): number {
  return recordOffset(index) + RECORD_FIELDS[field].rel;
}

function readSized(bytes: Uint8Array, offset: number, size: 1 | 2 | 4): number {
  return size === 1 ? readU8(bytes, offset) : size === 2 ? readU16(bytes, offset) : readU32(bytes, offset);
}

function writeSized(bytes: Uint8Array, offset: number, size: 1 | 2 | 4, value: number): void {
  if (size === 1) writeU8(bytes, offset, value);
  else if (size === 2) writeU16(bytes, offset, value);
  else writeU32(bytes, offset, value);
}

export type PromiseView = {
  active: boolean;
  place: number;
  layout: number;
} & Record<PersonField, number>;

export type RecordView = { index: number; building: number } & Record<RecordField, number>;

export type YobaiView = {
  promise: PromiseView;
  /** 0x13E34 の記録の件数 */
  count: number;
  records: RecordView[];
  counters: { offset: number; value: number; note: string }[];
  /** 約束の枠の検証に落ちた理由。null なら編集可能 */
  promiseProblem: string | null;
  /** 記録の検証に落ちた理由。null なら編集可能 */
  recordsProblem: string | null;
};

function isEmptyRecord(bytes: Uint8Array, index: number): boolean {
  const o = recordOffset(index);
  return RECORD_EMPTY_BYTES.every((v, i) => bytes[o + i] === v);
}

export function readYobai(bytes: Uint8Array): YobaiView {
  if (bytes.byteLength < PROMISE_OFFSET + PROMISE_LENGTH) throw new RangeError("ファイルが小さすぎて夜這いの領域を読めません");
  const layoutProblem = checkLayout(bytes);

  const fields = Object.fromEntries(
    (Object.keys(PROMISE_FIELDS) as PersonField[]).map((f) => [f, readSized(bytes, promiseFieldOffset(f), PROMISE_FIELDS[f].size)]),
  ) as Record<PersonField, number>;
  const promise: PromiseView = {
    ...fields,
    active: fields.type !== PROMISE_EMPTY,
    place: readU16(bytes, PROMISE_OFFSET + PROMISE_PLACE_REL),
    layout: readU16(bytes, PROMISE_OFFSET + PROMISE_LAYOUT_REL),
  };

  const count = readU32(bytes, RECORD_COUNT_OFFSET);
  let recordsProblem = layoutProblem;
  if (!recordsProblem && count > RECORD_CAPACITY) recordsProblem = `記録の件数（0x13E34）が ${count} で、枠の数 ${RECORD_CAPACITY} を超えています`;
  const shown = Math.min(count, RECORD_CAPACITY);
  if (!recordsProblem) {
    // 件数までの枠は使用中、その先は空、という並びのときだけ編集を許す
    for (let i = 0; i < RECORD_CAPACITY; i++) {
      const empty = isEmptyRecord(bytes, i);
      if (i < shown && empty) recordsProblem = `${i + 1}件目が空なのに、件数（0x13E34）は ${count} です`;
      else if (i >= shown && !empty) recordsProblem = `件数（0x13E34）は ${count} なのに、${i + 1}件目に値があります`;
      if (recordsProblem) break;
    }
  }
  const records = Array.from({ length: shown }, (_, index): RecordView => {
    const r = Object.fromEntries(
      (Object.keys(RECORD_FIELDS) as RecordField[]).map((f) => [f, readSized(bytes, recordFieldOffset(index, f), RECORD_FIELDS[f].size)]),
    ) as Record<RecordField, number>;
    return { ...r, index, building: readU32(bytes, recordOffset(index) + RECORD_BUILDING_REL) };
  });

  const counters = YOBAI_COUNTERS.map((c) => ({ offset: c.offset, note: c.note, value: readSized(bytes, c.offset, c.size) }));

  return { promise, count, records, counters, promiseProblem: layoutProblem, recordsProblem };
}

function knownList(field: PersonField): readonly KnownValue[] | null {
  if (field === "type") return KNOWN_TYPES;
  if (field === "look") return KNOWN_LOOKS;
  if (field === "blood") return BLOOD_TYPES;
  return null;
}

/**
 * 人物の項目（約束・記録で共通）の検証。今の値と同じ値の書き戻しは許す。問題がなければ null。
 * 通常モード：型・見た目・血液型は確認済みの値だけ、名前は名前の表（🟢）にある ID だけ、年齢は 0〜99 か 255（？）、
 * 約束した日は 0〜98（1〜99日目）、group（❓）は書けない。
 * 上級者モード：型の大きさの範囲で任意（型の 0xFFFFFFFF は空きの印なので書かない）
 */
export function validatePersonField(
  field: PersonField,
  value: number,
  current: number,
  opts: { advanced: boolean },
): string | null {
  const size = PROMISE_FIELDS[field].size;
  const max = size === 1 ? 0xff : size === 2 ? 0xffff : 0xffffffff;
  if (!Number.isInteger(value) || value < 0 || value > max) return `範囲外の値です: ${value}`;
  if (field === "type" && value === PROMISE_EMPTY) return "0xFFFFFFFF は空きの印なので書けません";
  if (opts.advanced || value === current) return null;
  const known = knownList(field);
  if (known) return known.some((k) => k.value === value) ? null : `確認済みの値ではありません（上級者モードで書けます）: ${value}`;
  if (field === "age")
    return value <= AGE_NORMAL_MAX || value === AGE_UNKNOWN ? null : `通常モードでは 0〜${AGE_NORMAL_MAX} か 255（？）を指定してください: ${value}`;
  if (field === "name") return npcName(value) ? null : `名前の表にない ID です（上級者モードで書けます）: ${value}`;
  if (field === "day") return value <= DAY_NORMAL_MAX ? null : `通常モードでは 1〜${DAY_NORMAL_MAX + 1}日目を指定してください`;
  if (field === "group") return "意味が分かっていない値なので、上級者モードでだけ書けます";
  return null;
}

function assertPromiseEditable(bytes: Uint8Array): void {
  const view = readYobai(bytes);
  if (view.promiseProblem) throw new RangeError(view.promiseProblem);
  if (!view.promise.active) throw new RangeError("約束がありません（空の枠には書きません）");
}

/** 約束の人物の項目を1つ書く。その項目のバイトだけを変える */
export function writePromiseField(bytes: Uint8Array, field: PersonField, value: number, opts: { advanced: boolean }): void {
  assertPromiseEditable(bytes);
  const { size } = PROMISE_FIELDS[field];
  const offset = promiseFieldOffset(field);
  const error = validatePersonField(field, value, readSized(bytes, offset, size), opts);
  if (error) throw new RangeError(error);
  writeSized(bytes, offset, size, value);
}

/**
 * 約束の場所と配置を組で書く（+0x08・+0x0A の4バイトだけ）。
 * 通常モードは PLACE_LAYOUTS の組（と今の組の書き戻し）だけ。上級者モードは任意の u16 の組
 */
export function validatePlaceLayout(
  place: number,
  layout: number,
  current: { place: number; layout: number },
  opts: { advanced: boolean },
): string | null {
  for (const v of [place, layout]) if (!Number.isInteger(v) || v < 0 || v > 0xffff) return `u16 の範囲外です: ${v}`;
  if (opts.advanced || (place === current.place && layout === current.layout)) return null;
  return PLACE_LAYOUTS.some((p) => p.place === place && p.layout === layout)
    ? null
    : `確認済みの場所と配置の組ではありません（上級者モードで書けます）: 0x${place.toString(16)}・0x${layout.toString(16)}`;
}

export function writePromisePlace(bytes: Uint8Array, place: number, layout: number, opts: { advanced: boolean }): void {
  assertPromiseEditable(bytes);
  const current = {
    place: readU16(bytes, PROMISE_OFFSET + PROMISE_PLACE_REL),
    layout: readU16(bytes, PROMISE_OFFSET + PROMISE_LAYOUT_REL),
  };
  const error = validatePlaceLayout(place, layout, current, opts);
  if (error) throw new RangeError(error);
  writeU16(bytes, PROMISE_OFFSET + PROMISE_PLACE_REL, place);
  writeU16(bytes, PROMISE_OFFSET + PROMISE_LAYOUT_REL, layout);
}

/** 夜這いの記録の項目を1つ書く（使用中の件だけ）。その項目のバイトだけを変える */
export function writeRecordField(
  bytes: Uint8Array,
  index: number,
  field: RecordField,
  value: number,
  opts: { advanced: boolean },
): void {
  const view = readYobai(bytes);
  if (view.recordsProblem) throw new RangeError(view.recordsProblem);
  if (!Number.isInteger(index) || index < 0 || index >= view.records.length)
    throw new RangeError(`使用中の記録ではありません: ${index + 1}件目`);
  const { size } = RECORD_FIELDS[field];
  const offset = recordFieldOffset(index, field);
  const error = validatePersonField(field, value, readSized(bytes, offset, size), opts);
  if (error) throw new RangeError(error);
  writeSized(bytes, offset, size, value);
}
