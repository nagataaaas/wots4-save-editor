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
import { readU16, readU32, readU8, readSized, writeSized, recordCodec, type SizedField } from "./binary";
import { type EditOpts, type ViewStatus } from "./field";
import { validateKnownValue } from "./flags/byte-flag";
import { assertWritable, checkLayout } from "./layout";
import { DAY_RANGE, DATE_OFFSETS } from "./scenario-date";
import { NIGHT_VISIT_PARTNER_TABLE } from "./master/dataset/night-visit-partner";
import { NIGHT_VISIT_COUNT_TABLE } from "./master/dataset/night-visit-count";
import { NIGHT_VISIT_LAYOUT_TABLE } from "./master/dataset/night-visit-layout";
import { NIGHT_VISIT_PLACE_TABLE } from "./master/dataset/night-visit-place";
import { NPC_LOOK_TABLE } from "./master/dataset/npc-look";
import { labelOf, nameOf } from "./master/labels";
import { lookup } from "./master/lookup";
import { npcName } from "./master/npc-names";
import { characterStatusForPromise, CHARACTER_DEAD } from "./flags/characters";

export const PROMISE_OFFSET = 0x14038;
export const PROMISE_LENGTH = 0x2c;
export const PROMISE_EMPTY = 0xffffffff;

/** ✅ [U] 約束の画面の夜這い回数 */
export const YOBAI_TOTAL_OFFSET = 0x137ec;
/** 🟢 夜這いの段階と愛の証の回数 */
export const STAGE_OFFSET = 0x13e30;
/** 🟢 夜這いの段階の上限（chunks/night-visit）。 */
export const STAGE_MAX = 3;
export const LOVE_COUNT_OFFSET = 0x13e34;
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
  hidden?: boolean;
}[] = [
  {
    offset: YOBAI_TOTAL_OFFSET,
    size: 4,
    label: "夜這い回数",
    // ✅ 約束の画面の「夜這い回数」
    note: "約束の画面の「夜這い回数」。上限 9999。周回で消えない",
  },
  {
    offset: STAGE_OFFSET,
    hidden: true,
    size: 4,
    label: "段階",
    // 🟢
    note: "夜這い回数が 10・45・85 に届くたびに上がる。高いほど家の中の人が多い場所になりやすい",
  },
  {
    offset: LOVE_COUNT_OFFSET,
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

/** 🟢 特別な相手ごとの夜這い回数 0x13E38 + 4k（u32、上限 9999）。k は枠（slot）、npc は名前の表の ID。さよと町の人は数えない */
export const PARTNER_COUNTS_OFFSET = 0x13e38;
export const PARTNER_COUNT_NPCS: readonly { slot: number; npc: number; label: string }[] = Object.values(NIGHT_VISIT_COUNT_TABLE)
  .map(r => ({ slot: r.id_dec, npc: r.npc, label: nameOf.npc(r.npc) }));

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
  (r) => [r.id_dec, r.layout],
);

/**
 * 正しい（場所、配置）の組。🟢 の72組。場所・配置の順。
 * 通常モードではこの組だけを書ける（配置が合わないと布団が宙に浮いたり壁にめり込んだりする）。
 */
export const PLACE_LAYOUTS: readonly {
  place: number;
  layout: number;
}[] = GREEN_PLACE_LAYOUTS.flatMap(([place, layouts]) =>
  layouts.map((layout) => ({ place, layout })),
)
  .sort((a, b) => a.place - b.place || a.layout - b.layout);

/** 🟢 約束で使われる場所（PLACE_LAYOUTS に出てくる場所。小さい順） */
export const PROMISE_PLACES: readonly number[] = [...new Set(PLACE_LAYOUTS.map((p) => p.place))];

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
  const r = lookup(NIGHT_VISIT_LAYOUT_TABLE, layout);
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
  const r = lookup(NIGHT_VISIT_LAYOUT_TABLE, layout);
  return r ? r.name_ja : "不明な配置";
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

export type PromisePartner = {
  /** 相手の種類（約束の枠の +0x04） */
  type: number;
  label: string;
  kind: "special" | "town";
  sex: "m" | "f";
  /** 町の人の名前の候補（7＝7000 台、8＝8000 台）。名前のある相手は null */
  nameList: 7 | 8 | null;
  /** 名前のある相手の名前の ID */
  name: number | null;
  looks: readonly number[];
  age: number;
  ageRandom: boolean;
  /** 0＝1〜4 から選ぶ */
  blood: number;
  group: number;
  /** 名前のある相手の行 */
  row: number | null;
  note: string;
};

/**
 * 🟢 約束できる相手の種類（datatable/npc/night-visit-partner.csv）。種類の選択肢（KNOWN_TYPES）・死亡の警告・約束の作成はこの表から引く
 */
export const PROMISE_PARTNERS: readonly PromisePartner[] = Object.values(NIGHT_VISIT_PARTNER_TABLE).map((p) => ({
  type: p.id_dec,
  label: p.name_ja,
  kind: p.kind === "special" ? "special" : "town",
  sex: p.sex === "f" ? "f" : "m",
  nameList: p.name_list === 7 || p.name_list === 8 ? p.name_list : null,
  name: p.name,
  looks: p.looks,
  age: p.age,
  ageRandom: p.age_random === 1,
  blood: p.blood,
  group: p.group,
  row: p.row,
  note: p.note_ja,
}));

const PARTNER_BY_TYPE: ReadonlyMap<number, PromisePartner> = new Map(PROMISE_PARTNERS.map((p) => [p.type, p]));

export function promisePartner(type: number): PromisePartner | undefined {
  return PARTNER_BY_TYPE.get(type);
}

/**
 * 🟢 セリフと戦闘力の型（+0x04、町の人の種類）。約束できる相手の種類（PROMISE_PARTNERS）。
 * 通常モードではこれだけを書ける。名前・見た目とは別々に効く（✅ [U]）
 */
export const KNOWN_TYPES: readonly (KnownValue & { kind: TypeKind })[] = PROMISE_PARTNERS.map((p) => ({
  value: p.type,
  label: p.note ? `${p.label}（${p.note}）` : p.label,
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

/** 名前の表示。🟢 名前の表（npc-names）にない ID は「不明」 */
export function nameLabel(id: number): string {
  const entry = npcName(id);
  return entry ? labelOf({ kind: "npc", id: entry.labelId }) : "不明";
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
export const DAY_NORMAL_MAX = DAY_RANGE.normal.max - 1;

/**
 * group は約束の +0x02（🟢 町の人の種類ごとのまとまり。特別な相手 0、町の人 1〜3）。
 * 書き換えの効果が分からないので、上級者モードでだけ書ける（通常モードは今の値の書き戻しだけ）。
 * day は約束の +0x28（🟢 約束した日）・記録の +0x0C（🟢 夜這いした日）
 */
export type PersonField = "group" | "day" | "type" | "name" | "look" | "age" | "blood";
export type RecordField = Exclude<PersonField, "look" | "group">;

export const PROMISE_FIELDS: Record<PersonField, SizedField> = {
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
const PROMISE_PERSON_CODEC = recordCodec(PROMISE_FIELDS);

/**
 * 🟢 約束の作成・読み出し・編集・周回の初期化が使う共通のレコード定義。+0x26 は FFFF。
 * helpSeen（+0x2A）は初めての説明を見たかのビット。編集では書かず、周回の初期化でだけ 0 にする。
 */
export const PROMISE_CODEC = recordCodec({
  ...PROMISE_FIELDS,
  place: { rel: PROMISE_PLACE_REL, size: 2 },
  layout: { rel: PROMISE_LAYOUT_REL, size: 2 },
  reserved: { rel: 0x26, size: 2 },
  helpSeen: { rel: 0x2a, size: 1 },
});

const RECORD_FIELDS: Record<RecordField, SizedField> = {
  type: { rel: 0x00, size: 4 },
  name: { rel: 0x04, size: 4 },
  day: { rel: 0x0c, size: 2 },
  age: { rel: 0x0e, size: 1 },
  blood: { rel: 0x0f, size: 1 },
};
/** 🟢 記録の +0x08：入った建物の番号（0x20C〜0x228。同じ建物の扉は同じ番号）。表示だけ */
export const RECORD_BUILDING_REL = 0x08;
const RECORD_CODEC = recordCodec({ ...RECORD_FIELDS, building: { rel: RECORD_BUILDING_REL, size: 4 } });

export function promiseFieldOffset(field: PersonField): number {
  return PROMISE_CODEC.offset(PROMISE_OFFSET, field);
}

export function recordOffset(index: number): number {
  return RECORDS_OFFSET + index * RECORD_SIZE;
}

export function recordFieldOffset(index: number, field: RecordField): number {
  return recordOffset(index) + RECORD_FIELDS[field].rel;
}

/** problem は約束の枠の検証に落ちた理由 */
export type PromiseView = ViewStatus & {
  active: boolean;
  place: number;
  layout: number;
} & Record<PersonField, number>;

export type RecordView = { index: number; building: number } & Record<RecordField, number>;

/**
 * 名前のある相手が死んでいれば警告を返す（🟢 ゲームは約束を止めない）。
 * ❓ 死んだ相手が夜這いの場に出るかはゲーム内で確かめていないので、画面には約束が残ることだけを書く
 */
export function partnerDeathWarning(bytes: Uint8Array, type: number): string | null {
  const status = characterStatusForPromise(type);
  if (!status || readU8(bytes, status.offset) !== CHARACTER_DEAD) return null;
  const name = promisePartner(type)?.label ?? "相手";
  return `${name} は死亡しています。約束は消えずに残ります`;
}
export function currentStage(bytes: Uint8Array): number {
  return Math.min(readU32(bytes, STAGE_OFFSET), STAGE_MAX);
}
export function createProblem(bytes: Uint8Array): string | null {
  return checkLayout(bytes) ?? (PROMISE_CODEC.readField(bytes, PROMISE_OFFSET, 'type') !== PROMISE_EMPTY
    ? "すでに約束があります（空の枠にだけ作れます）" : null);
}
export type PromiseContext = {
  today: number; stage: number; createProblem: string | null; deathWarnings: ReadonlyMap<number, string>;
};
function readPromiseContext(bytes: Uint8Array): PromiseContext {
  const deathWarnings = new Map<number, string>();
  for (const partner of KNOWN_TYPES) {
    const warning = partnerDeathWarning(bytes, partner.value);
    if (warning) deathWarnings.set(partner.value, warning);
  }
  return { today: readU16(bytes, DATE_OFFSETS.dayIndex), stage: currentStage(bytes), createProblem: createProblem(bytes), deathWarnings };
}

export type YobaiView = ViewStatus & {
  context: PromiseContext;
  promise: PromiseView;
  /** 使用中の記録の数（先頭から続く空でない件） */
  count: number;
  records: RecordView[];
  counters: { offset: number; value: number; label: string; note: string }[];
  /** 🟢 特別な相手ごとの夜這い回数 */
  partners: { offset: number; npc: number; label: string; value: number }[];
  /** 記録の状態。problem があれば記録は読み取り専用 */
  recordsStatus: ViewStatus;
};

function isEmptyRecord(bytes: Uint8Array, index: number): boolean {
  const o = recordOffset(index);
  return RECORD_EMPTY_BYTES.every((v, i) => bytes[o + i] === v);
}

/**
 * 使用中の記録の数と、記録の検証に落ちた理由。
 * 🟢 記録は最初の空いている件に書かれるので、使用中の件は先頭から続く。途中に空きがあれば読み取り専用にする
 */
function readRecordsStatus(bytes: Uint8Array, layoutProblem: string | null): { count: number; problem: string | null } {
  let count = 0;
  while (count < RECORD_CAPACITY && !isEmptyRecord(bytes, count)) count++;
  if (layoutProblem) return { count, problem: layoutProblem };
  for (let i = count + 1; i < RECORD_CAPACITY; i++) {
    if (!isEmptyRecord(bytes, i))
      return { count, problem: `${count + 1}件目が空なのに、${i + 1}件目に値があります` };
  }
  return { count, problem: null };
}

export function readYobai(bytes: Uint8Array): YobaiView {
  if (bytes.byteLength < PROMISE_OFFSET + PROMISE_LENGTH)
    throw new RangeError("ファイルが小さすぎて夜這いの領域を読めません");
  const layoutProblem = checkLayout(bytes);

  const fields = PROMISE_PERSON_CODEC.read(bytes, PROMISE_OFFSET);
  const promise: PromiseView = {
    problem: layoutProblem,
    warnings: [],
    ...fields,
    active: fields.type !== PROMISE_EMPTY,
    place: PROMISE_CODEC.readField(bytes, PROMISE_OFFSET, 'place'),
    layout: PROMISE_CODEC.readField(bytes, PROMISE_OFFSET, 'layout'),
  };

  const { count, problem: recordsProblem } = readRecordsStatus(bytes, layoutProblem);
  const records = Array.from({ length: count }, (_, index): RecordView => {
    return { ...RECORD_CODEC.read(bytes, recordOffset(index)), index };
  });

  const counters = YOBAI_COUNTERS.map((c) => ({
    offset: c.offset,
    label: c.label,
    note: c.note,
    value: readSized(bytes, c.offset, c.size),
  }));
  const partners = PARTNER_COUNT_NPCS.map(({ slot, npc, label }) => {
    const offset = PARTNER_COUNTS_OFFSET + slot * 4;
    return { offset, npc, label, value: readU32(bytes, offset) };
  });

  return {
    context: readPromiseContext(bytes),
    problem: layoutProblem,
    warnings: [],
    promise,
    count,
    records,
    counters,
    partners,
    recordsStatus: { problem: recordsProblem, warnings: [] },
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
  opts: EditOpts,
): string | null {
  return validatePersonValue(field, value, { advanced: opts.advanced || value === current });
}

/** 新規の値を検証する。現在値の書き戻しを許す判断は編集側で行う。 */
export function validatePersonValue(
  field: PersonField,
  value: number,
  opts: EditOpts,
): string | null {
  const size = PROMISE_FIELDS[field].size;
  const max = size === 1 ? 0xff : size === 2 ? 0xffff : 0xffffffff;
  if (!Number.isInteger(value) || value < 0 || value > max) return "範囲外の値です";
  if (field === "type" && value === PROMISE_EMPTY) return "空きを表す値なので書けません";
  if (opts.advanced) return null;
  const known = knownList(field);
  if (known)
    return validateKnownValue(value, known, opts, max, "表にない値です（上級者モードで書けます）");
  if (field === "age")
    return value <= AGE_NORMAL_MAX || value === AGE_UNKNOWN
      ? null
      : `通常モードでは 0〜${AGE_NORMAL_MAX} か「？」を指定してください`;
  if (field === "name")
    return npcName(value) ? null : "名前の表にない名前です（上級者モードで書けます）";
  if (field === "day")
    return value <= DAY_NORMAL_MAX
      ? null
      : `通常モードでは 1〜${DAY_NORMAL_MAX + 1}日目を指定してください`;
  if (field === "group")
    return "書き換えの効果が分かっていない値なので、上級者モードでだけ書けます";
  return null;
}

/** 約束の枠に書けるか（readYobai の promise.problem と active と同じ条件だけを見る） */
function assertPromiseEditable(bytes: Uint8Array): void {
  const problem = checkLayout(bytes);
  if (problem) throw new RangeError(problem);
  if (PROMISE_CODEC.readField(bytes, PROMISE_OFFSET, "type") === PROMISE_EMPTY)
    throw new RangeError("約束がありません（空の枠には書きません）");
}

/** 約束の人物の項目を1つ書く。その項目のバイトだけを変える */
export function writePromiseField(
  bytes: Uint8Array,
  field: PersonField,
  value: number,
  opts: EditOpts,
): void {
  assertWritable(bytes);
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
  opts: EditOpts,
): string | null {
  for (const v of [place, layout])
    if (!Number.isInteger(v) || v < 0 || v > 0xffff) return "範囲外の値です";
  if (opts.advanced || (place === current.place && layout === current.layout)) return null;
  return PLACE_LAYOUTS.some((p) => p.place === place && p.layout === layout)
    ? null
    : "表にある場所と配置の組ではありません（上級者モードで書けます）";
}

export function writePromisePlace(
  bytes: Uint8Array,
  place: number,
  layout: number,
  opts: EditOpts,
): void {
  assertWritable(bytes);
  assertPromiseEditable(bytes);
  const current = {
    place: PROMISE_CODEC.readField(bytes, PROMISE_OFFSET, "place"),
    layout: PROMISE_CODEC.readField(bytes, PROMISE_OFFSET, "layout"),
  };
  const error = validatePlaceLayout(place, layout, current, opts);
  if (error) throw new RangeError(error);
  PROMISE_CODEC.writeField(bytes, PROMISE_OFFSET, "place", place);
  PROMISE_CODEC.writeField(bytes, PROMISE_OFFSET, "layout", layout);
}

/** 夜這いの記録の項目を1つ書く（使用中の件だけ）。その項目のバイトだけを変える */
export function writeRecordField(
  bytes: Uint8Array,
  index: number,
  field: RecordField,
  value: number,
  opts: EditOpts,
): void {
  assertWritable(bytes);
  const { count, problem } = readRecordsStatus(bytes, checkLayout(bytes));
  if (problem) throw new RangeError(problem);
  if (!Number.isInteger(index) || index < 0 || index >= count)
    throw new RangeError(`使用中の記録ではありません: ${index + 1}件目`);
  const { size } = RECORD_FIELDS[field];
  const offset = recordFieldOffset(index, field);
  const error = validatePersonField(field, value, readSized(bytes, offset, size), opts);
  if (error) throw new RangeError(error);
  writeSized(bytes, offset, size, value);
}
