// 夜の約束と夜這いの記録。出典：docs/save_format/chunks/night-visit（[U] 2026-10-06、sample/S4-DATA_03 copy 5〜10、[U] 2026-10-07 sample/S4-DATA_02）。
//
// 約束の枠 0x14038〜（0x2C B）。約束すると値が入り、夜這いが終わると +0x00〜+0x23 が FF に戻る（年齢・血液型・+0x2A は前の値が残る）。
// 🟢 +0x00〜+0x1B は、約束の相手ごとに決まった値の組（+0x04 だけ相手ごとに変わる）。
//   +0x00 u16  🟢 約束したときの段階（0x13E30）。特別な相手は FFFF。書き換えない
//   +0x02 u16  ✅ [U] 2026-10-07 日付ではない（1日目に町の人と約束して 1、5日目に先生と約束して 0）。
//              🟢 町の人の種類ごとのまとまり（特別な相手は 0、町の人は 1〜3）。書き換えの効果は未確認なので上級者モードだけ（group）
//   +0x04 u32  ✅ [U] セリフと戦闘力の型（はるなを 0x031B にすると、台詞がさよの「・・・」になり、体力・攻撃力が高くなった）。
//              FFFFFFFF なら約束なし（空の枠）
//   +0x08 u16  ✅ [U] 約束の場所（夜這いに入る扉と、その先のマップ）。0x00〜0x22 の名前を書き換えで確認。0x23 以降は名前が空
//   +0x0A u16  ✅ [U] 位置 ／ 🟢 意味：行き先の家の種類・家の人・布団と、その座標の組（datatable/place/night-visit-layout.csv）。
//              場所ごとに使える配置が決まっている（0C＋07 は布団がおかしく、0C＋06 は正常 [U]）
//   +0x1C u32  ✅ [U] 名前（または NPC の ID）。はるなを 0xD7 にすると、名前がさよになった
//   +0x20 u32  ✅ [U] 見た目（モデル）と声。はるなを 0xF5 にすると、見た目と声がさよになった
//   +0x24 u8   ✅ [U] 年齢（0x30 で48歳）。FF は「？」（さよ）
//   +0x25 u8   ✅ [U] 血液型。1＝A、2＝B、3＝O、4＝AB（書き換えで確認）、5＝「？」（さよ）
//   +0x28 u16  🟢 約束した日（経過日数 0x0BD8、1日目＝0）。8人（さよ・かえで・はるな・先生・メリンダ・三姉妹）の約束で一致。
//              🟢 場面が変わるたびに今日の経過日数と比べ、違うと「すっぽかし」で枠が消える。空の枠では FFFF。
//              画面では今日にするかどうかだけを選ぶ（ほかの値を書く意味はない）
//   +0x02 は画面では書かない（夜這いの場では読まれない 🟢）
//   +0x2A u8   🟢 初めての説明を見たかのビット（bit0〜2 夜這い、bit3〜5 拷問）。空の枠でも残る。書き換えない
//   +0x26 は使われていない（🟢）。+0x0C〜+0x1B はいつも 0A 0B 0E 0F 0C 0D 1D 01（🟢、意味は ❓）。どれも書き換えない
// 名前 +0x1C の ID は master/npc-names.ts（datatable/npc/npc-name.csv、🟢）。
// [U] 2026-10-07：朱美と約束すると、そのあとの場面の移動で必ず昼になり、日付が変わったのと同じくすっぽかしで枠が消える
//   （[U] 2026-10-10 補足）。セーブする機会がないので、朱美の約束の実データはない。
//
// 夜這いの記録 0x137F0〜0x13E2F（16 B × 100件）。夜這いのたびに1件足される（失敗した夜這いは記録しない）。
// 🟢 記録は最初の空いている件に書かれる。件数を数える値はない。100件埋まっていると1件ずつ前に詰めて最後の件に書く。
//    記録が消えるのは周回の始めだけ（全部）なので、使用中の件は先頭から続く。
//    [U] 2026-10-07 ローラとの夜這いで記録が1件目に書かれ、0x137EC 1 → 2・0x13E34 0 → 1・0x13E4C 0 → 1 となったのと合う
//    （0x137EC は周回で消えないので、記録の数より多いことがある）
//   +0x00 u32 型、+0x04 u32 名前、+0x08 u32 🟢 入った建物の番号（0x20C〜0x228。同じ建物の扉は同じ番号）、
//   +0x0C u16 🟢 夜這いした日（約束した日と同じ日になる。さよ 0、かえで 1、ローラ 2 の3件で一致）、
//   +0x0E u8 年齢、+0x0F u8 血液型。
// ✅ [U] 2026-10-07：0x137EC を 16、0x13E34 を 48 にすると、約束の画面の夜這い回数は 16 になった → 表示は 0x137EC。
//   空の件は FFFFFFFF FFFFFFFF 00000000 FFFF0000。記録の書き換えがゲームに反映されるかは未確認（要ゲーム内確認）。
//
// 🟢 0x13E30 段階（0〜3。夜這い回数 10・45・85 で上がる）、0x13E34 「愛の証をもらった」回数、
//    0x13E38〜0x13E6F 特別な相手14人ごとの夜這い回数（u32）、0x37C8 褒美の順番（1〜50）。どれも表示だけ
//
// 空の枠に新しく約束を作るのは yobai-create.ts。記録を作る・消す機能は持たない。
// [TS] の固定オフセットで読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU16, readU32, readU8, writeU16, writeU32, writeU8 } from "./binary";
import { checkLayout } from "./hero";
import { NIGHT_VISIT_PARTNER_TABLE } from "./master/dataset/night-visit-partner";
import { NIGHT_VISIT_LAYOUT_TABLE } from "./master/dataset/night-visit-layout";
import { NIGHT_VISIT_PLACE_TABLE } from "./master/dataset/night-visit-place";
import { NPC_LOOK_TABLE } from "./master/dataset/npc-look";
import { labelOf, nameOf } from "./master/labels";
import { npcName } from "./master/npc-names";

export const PROMISE_OFFSET = 0x14038;
export const PROMISE_LENGTH = 0x2c;
export const PROMISE_EMPTY = 0xffffffff;

/** ✅ [U] 約束の画面の夜這い回数 */
export const YOBAI_TOTAL_OFFSET = 0x137ec;
export const RECORDS_OFFSET = 0x137f0;
export const RECORD_SIZE = 0x10;
export const RECORD_CAPACITY = 100;

/** 空の記録のバイト列（ゲームが書く値） */
export const RECORD_EMPTY_BYTES: readonly number[] = [
  0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00,
];

/** 夜這いの回数など。表示だけ */
export const YOBAI_COUNTERS: readonly {
  offset: number;
  size: 1 | 4;
  label: string;
  note: string;
}[] = [
  {
    offset: 0x137ec,
    size: 4,
    label: "夜這い回数",
    // ✅ 約束の画面の「夜這い回数」
    note: "約束の画面の「夜這い回数」。上限 9999。周回で消えない",
  },
  {
    offset: 0x13e30,
    size: 4,
    label: "段階",
    // 🟢
    note: "0〜3。夜這い回数 10・45・85 で上がる。高いほど家の中の人が多い場所になりやすい",
  },
  {
    offset: 0x13e34,
    size: 4,
    label: "愛の証の回数",
    // 🟢
    note: "「愛の証をもらった」で終わった夜這いの回数",
  },
  {
    offset: 0x37c8,
    size: 1,
    label: "褒美の順番",
    // 🟢
    note: "1〜50 を回る。5 回ごとに決まった品、50 回目は緋緋色金",
  },
];

/** 🟢 特別な相手ごとの夜這い回数 0x13E38 + 4k（u32、上限 9999）。npc は名前の表の ID。さよと町の人は数えない */
export const PARTNER_COUNTS_OFFSET = 0x13e38;
export const PARTNER_COUNT_NPCS: readonly { npc: number; label: string }[] = [
  { npc: 6, label: nameOf.npc(6) }, // 万由
  { npc: 7, label: nameOf.npc(7) }, // 千佳
  { npc: 8, label: nameOf.npc(8) }, // 百合
  { npc: 13, label: nameOf.npc(13) }, // メリンダ
  { npc: 3, label: nameOf.npc(3) }, // 朱美
  { npc: 11, label: nameOf.npc(11) }, // ローラ
  { npc: 15, label: nameOf.npc(15) }, // 先生
  { npc: 5, label: nameOf.npc(5) }, // 茂呂
  { npc: 1, label: nameOf.npc(1) }, // 赤城
  { npc: 12, label: nameOf.npc(12) }, // J.J
  { npc: 2, label: nameOf.npc(2) }, // 小暮
  { npc: 4, label: nameOf.npc(4) }, // 琴吹
  { npc: 14, label: nameOf.npc(14) }, // 堂島
  { npc: 9, label: nameOf.npc(9) }, // 鬼怒川
];

const PLACE_ROWS = Object.values(NIGHT_VISIT_PLACE_TABLE);

/**
 * ✅ [U] 2026-10-06：約束の場所 +0x08（書き換えて、約束の画面に出る名前を見た）。
 * datatable/place/night-visit-place.csv の name_ja（添字＝場所の値）
 */
export const PLACES: readonly string[] = PLACE_ROWS.map((r) => r.name_ja);

/**
 * 🟢 約束で使われる（場所、配置）の組（候補75行の重なりを除いて72組。datatable/place/night-visit-place.csv の layout 列）。
 * 町の人の約束と特別な相手（さよ・先生・ローラ・メリンダ・三姉妹など）の約束の組
 */
const GREEN_PLACE_LAYOUTS: readonly (readonly [number, readonly number[]])[] = PLACE_ROWS.map(
  (r) => [r.id_dec, r.layout.split(";").map((s) => parseInt(s, 16))],
);

/**
 * ✅ [U] 約束の実データで見た組の注記。すべて 🟢 の組の中にある。
 * 2026-10-06 の 1D＋01 は操作ミスとみられる（[U] 2026-10-07。配置 00〜02 は 🟢 の組に出てこない）ので外した
 */
const SEEN_PLACE_LAYOUTS: readonly { place: number; layout: number; note?: string }[] = [
  { place: 0x00, layout: 0x03 },
  { place: 0x09, layout: 0x21 },
  { place: 0x0a, layout: 0x05 },
  { place: 0x0b, layout: 0x22 },
  { place: 0x0c, layout: 0x06, note: "女中・娘" },
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
export const PLACE_LAYOUTS: readonly {
  place: number;
  layout: number;
  seen: boolean;
  note?: string;
}[] = GREEN_PLACE_LAYOUTS.flatMap(([place, layouts]) =>
  layouts.map((layout) => ({ place, layout })),
)
  .map(({ place, layout }) => {
    const seen = SEEN_PLACE_LAYOUTS.find((s) => s.place === place && s.layout === layout);
    return { place, layout, seen: seen !== undefined, note: seen?.note };
  })
  .sort((a, b) => a.place - b.place || a.layout - b.layout);

export type LayoutInfo = {
  /** 家の種類（町人の家・外国人の家・般若党の家・侍の家）。使われない配置は空 */
  house: string;
  /** いつもいる家の人 */
  people: number;
  /** 確率で出る家の人 */
  peopleMaybe: number;
  dog: number;
  /** 布団の枚数（12 枚まで） */
  futon: number;
  /** ライバルが出る確率（%）。出ないなら null */
  rival: number | null;
  /** 夜這いに失敗したときに出てくる同心・岡っ引き */
  doshin: number;
  okappiki: number;
};

/**
 * 🟢 配置ごとの夜這いの場の中身（datatable/place/night-visit-layout.csv）。家の中の人は配置だけで決まる。
 * 同心・岡っ引きは家の中にいる人ではなく、失敗したときに出てくる捕り方
 */
export function layoutInfo(layout: number): LayoutInfo | null {
  const r = NIGHT_VISIT_LAYOUT_TABLE[layout as keyof typeof NIGHT_VISIT_LAYOUT_TABLE];
  if (!r) return null;
  return {
    house: r.house,
    people: r.people,
    peopleMaybe: r.people_maybe,
    dog: r.dog,
    futon: r.futon,
    rival: r.rival,
    doshin: r.doshin,
    okappiki: r.okappiki,
  };
}

/** 配置の表示（「町人の家・家の人2人・布団2枚」）。表にない値は 16進数 */
export function layoutLabel(layout: number): string {
  const r = NIGHT_VISIT_LAYOUT_TABLE[layout as keyof typeof NIGHT_VISIT_LAYOUT_TABLE];
  return r ? r.name_ja : `配置 0x${layout.toString(16).toUpperCase()}`;
}

/** 家の人の数（並べ替え用） */
export function layoutHeadcount(layout: number): number {
  const p = layoutInfo(layout);
  return p ? p.people + p.peopleMaybe : Number.POSITIVE_INFINITY;
}

/** その場所で正しい配置（PLACE_LAYOUTS）。家の中の人が少ない順 */
export function layoutsForPlace(place: number): number[] {
  return PLACE_LAYOUTS.filter((p) => p.place === place)
    .map((p) => p.layout)
    .sort((a, b) => layoutHeadcount(a) - layoutHeadcount(b) || a - b);
}

export type KnownValue = { value: number; label: string };

/** 相手の種類の区分（選択肢の見出し） */
export type TypeKind = "名前のある相手" | "町の人（女性）" | "町の人（男性）";

/**
 * 🟢 セリフと戦闘力の型（+0x04、町の人の種類）。約束できる相手の種類（datatable/npc/night-visit-partner.csv）。
 * 通常モードではこれだけを書ける。名前・見た目とは別々に効く（✅ [U]）
 */
export const KNOWN_TYPES: readonly (KnownValue & { kind: TypeKind })[] = Object.values(
  NIGHT_VISIT_PARTNER_TABLE,
).map((p) => ({
  value: p.id_dec,
  label: p.note_ja ? `${p.name_ja}（${p.note_ja}）` : p.name_ja,
  kind:
    p.kind === "special" ? "名前のある相手" : p.sex === "f" ? "町の人（女性）" : "町の人（男性）",
}));

/**
 * 🟢 見た目（モデル）と声（+0x20）。datatable/npc/npc-look.csv の222件。番号は人物（容姿、appearance/person.csv）と同じ。
 * 通常モードではこれだけを書ける。型・名前とは別々に効く（✅ [U]）。usedBy はその見た目を使う町の人の種類
 */
export const KNOWN_LOOKS: readonly (KnownValue & { sex: "f" | "m"; usedBy: string })[] =
  Object.values(NPC_LOOK_TABLE).map((l) => ({
    value: l.id_dec,
    label: l.name_ja,
    sex: l.sex === "f" ? "f" : "m",
    usedBy: l.used_by,
  }));

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
 * group は約束の +0x02（🟢 町の人の種類ごとのまとまり。特別な相手 0、町の人 1〜3）。
 * 書き換えの効果が分からないので、上級者モードでだけ書ける（通常モードは今の値の書き戻しだけ）。
 * day は約束の +0x28（🟢 約束した日）・記録の +0x0C（🟢 夜這いした日）
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
  return size === 1
    ? readU8(bytes, offset)
    : size === 2
      ? readU16(bytes, offset)
      : readU32(bytes, offset);
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
  /** 使用中の記録の数（先頭から続く空でない件） */
  count: number;
  records: RecordView[];
  counters: { offset: number; value: number; label: string; note: string }[];
  /** 🟢 特別な相手ごとの夜這い回数 */
  partners: { offset: number; npc: number; label: string; value: number }[];
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
  if (bytes.byteLength < PROMISE_OFFSET + PROMISE_LENGTH)
    throw new RangeError("ファイルが小さすぎて夜這いの領域を読めません");
  const layoutProblem = checkLayout(bytes);

  const fields = Object.fromEntries(
    (Object.keys(PROMISE_FIELDS) as PersonField[]).map((f) => [
      f,
      readSized(bytes, promiseFieldOffset(f), PROMISE_FIELDS[f].size),
    ]),
  ) as Record<PersonField, number>;
  const promise: PromiseView = {
    ...fields,
    active: fields.type !== PROMISE_EMPTY,
    place: readU16(bytes, PROMISE_OFFSET + PROMISE_PLACE_REL),
    layout: readU16(bytes, PROMISE_OFFSET + PROMISE_LAYOUT_REL),
  };

  // 🟢 記録は最初の空いている件に書かれるので、使用中の件は先頭から続く。途中に空きがあれば読み取り専用にする
  let count = 0;
  while (count < RECORD_CAPACITY && !isEmptyRecord(bytes, count)) count++;
  let recordsProblem = layoutProblem;
  if (!recordsProblem) {
    for (let i = count + 1; i < RECORD_CAPACITY; i++) {
      if (!isEmptyRecord(bytes, i)) {
        recordsProblem = `${count + 1}件目が空なのに、${i + 1}件目に値があります`;
        break;
      }
    }
  }
  const records = Array.from({ length: count }, (_, index): RecordView => {
    const r = Object.fromEntries(
      (Object.keys(RECORD_FIELDS) as RecordField[]).map((f) => [
        f,
        readSized(bytes, recordFieldOffset(index, f), RECORD_FIELDS[f].size),
      ]),
    ) as Record<RecordField, number>;
    return { ...r, index, building: readU32(bytes, recordOffset(index) + RECORD_BUILDING_REL) };
  });

  const counters = YOBAI_COUNTERS.map((c) => ({
    offset: c.offset,
    label: c.label,
    note: c.note,
    value: readSized(bytes, c.offset, c.size),
  }));
  const partners = PARTNER_COUNT_NPCS.map(({ npc, label }, k) => {
    const offset = PARTNER_COUNTS_OFFSET + k * 4;
    return { offset, npc, label, value: readU32(bytes, offset) };
  });

  return {
    promise,
    count,
    records,
    counters,
    partners,
    promiseProblem: layoutProblem,
    recordsProblem,
  };
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
 * 約束した日は 0〜98（1〜99日目）、group（書き換えの効果が未確認）は書けない。
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
  if (known)
    return known.some((k) => k.value === value)
      ? null
      : `表にない値です（上級者モードで書けます）: ${value}`;
  if (field === "age")
    return value <= AGE_NORMAL_MAX || value === AGE_UNKNOWN
      ? null
      : `通常モードでは 0〜${AGE_NORMAL_MAX} か 255（？）を指定してください: ${value}`;
  if (field === "name")
    return npcName(value) ? null : `名前の表にない ID です（上級者モードで書けます）: ${value}`;
  if (field === "day")
    return value <= DAY_NORMAL_MAX
      ? null
      : `通常モードでは 1〜${DAY_NORMAL_MAX + 1}日目を指定してください`;
  if (field === "group")
    return "書き換えの効果が分かっていない値なので、上級者モードでだけ書けます";
  return null;
}

function assertPromiseEditable(bytes: Uint8Array): void {
  const view = readYobai(bytes);
  if (view.promiseProblem) throw new RangeError(view.promiseProblem);
  if (!view.promise.active) throw new RangeError("約束がありません（空の枠には書きません）");
}

/** 約束の人物の項目を1つ書く。その項目のバイトだけを変える */
export function writePromiseField(
  bytes: Uint8Array,
  field: PersonField,
  value: number,
  opts: { advanced: boolean },
): void {
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
  for (const v of [place, layout])
    if (!Number.isInteger(v) || v < 0 || v > 0xffff) return `u16 の範囲外です: ${v}`;
  if (opts.advanced || (place === current.place && layout === current.layout)) return null;
  return PLACE_LAYOUTS.some((p) => p.place === place && p.layout === layout)
    ? null
    : `表にある場所と配置の組ではありません（上級者モードで書けます）: 0x${place.toString(16)}・0x${layout.toString(16)}`;
}

export function writePromisePlace(
  bytes: Uint8Array,
  place: number,
  layout: number,
  opts: { advanced: boolean },
): void {
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
