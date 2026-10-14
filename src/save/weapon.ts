// 武器レコード（0xA0 B 固定長）。帯刀・武器袋・武器箪笥で共通の構造。
// 出典：docs/save_format/chunks/weapon-record（[TS][I-2][I-3]）の魅力・銘（[U][TS][I-3]）、パーツ（U-3：読みは [TS] の 3 B 値で照合、書きは 2 B×4。刃は ID と X、鍔・柄は ID だけ。ユーザー指摘 2026-10-05）。
//
// 🟢 レコードの先頭は完成武器ID の位置（[TS] の配置の +0x06）。このファイルの位置はすべて本当の先頭からの位置で、
// [TS] の配置での位置は +0x06 を足したもの（chunks/weapon-record の表の [TS] 列）。
//
// 書き込みは各フィールドのバイトだけを上書きする。次の領域は書き換えない：
//   - +0x70〜+0x7F（🟢 半角 16 文字の文字列）、+0x8E、+0x94、+0x9A〜+0x9F：❓ 意味が分からない。編集機能は持たない
//   - +0x0A〜+0x0F（固有武器の6バイト）、+0x1A、+0x1C、+0x6C〜+0x6F：完成武器ごとに決まる値。指定武器に変更する（writeCompleteWeapon）ときだけ書く
// 0x1A6B2 付近の帯刀と同じ並び（chunks/belt-copy。🟢 帯刀のコピーではなく別の記録）は書き換えない。
import {
  NUM_TYPE_RANGE,
  readU16,
  readU8,
  readUtf16Fixed,
  recordCodec,
  writeU16,
  writeU8,
  writeUtf16Fixed,
  type TypedField,
} from "./binary";
import { CHARM_TABLE } from "./master/dataset/charm";
import { TITLE_TABLE } from "./master/dataset/title";
import {
  BLADES,
  GRIPS,
  GUARDS,
  NO_SHEATH,
  SHEATHS,
  SPECIAL_BLADES,
  WEAPON_IDS,
  partName,
  sheathName,
  weaponIdName,
  type PartOption,
  type WeaponBuild,
  type WeaponIdOption,
} from "./weapon-ids";
import {
  fixedStringProblem,
  NORMAL_EDIT_OPTS,
  validateText,
  warningsOf,
  type EditOpts,
  type Field,
  type ViewStatus,
} from "./field";
import { assertWritable } from "./layout";

export const WEAPON_RECORD_BYTES = 0xa0;

/**
 * 数値として編集する欄（chunks/weapon-record の構造）。型から読み書きの幅・符号と、システム上の範囲（WEAPON_NUMBER_RANGES の system）を決める
 */
const NUMBER_FIELD_SPECS = {
  attack: { rel: 0x10, type: "i16" }, // ✅（符号付き。ユーザー確認 2026-10-05）
  durabilityMax: { rel: 0x12, type: "i16" }, // ✅ 最大耐久（符号付き。ユーザー確認 2026-10-05）
  durability: { rel: 0x8c, type: "i16" }, // ✅ 現在の耐久（符号付き。ユーザー確認 2026-10-05）。🟢 0 以下ならロード時に折れた武器になる
  quality: { rel: 0x14, type: "i16" }, // ✅（符号付き。ユーザー確認 2026-10-05）
  qualityMax: { rel: 0x16, type: "i16" }, // ✅（符号付き。ユーザー確認 2026-10-05）
  kills: { rel: 0x96, type: "u16" }, // ✅ 斬殺数（65535 から1人斬ると 0 に戻った。[U] 2026-10-05）
  tsumaKills: { rel: 0x98, type: "u16" }, // ✅位置 ／ 🟢 u16 つま斬り数
  /** ✅ 耐久回復の累積値 */
  durabilityRecovery: { rel: 0x88, type: "u32" },
  /** 🔶 手に持っていた時間（秒。メニュー画面は数えない）。+0x84 と常に同じ値（chunks/weapon-record、[U] 2026-10-05）。書くときは +0x84 にも同じ値を書く */
  heldTime: { rel: 0x80, type: "u32" },
} as const satisfies Record<string, TypedField>;

/** 数値のほかの、1・2・4 B の欄 */
const SCALAR_FIELD_SPECS = {
  weaponId: { rel: 0x00, type: "u16" }, // ✅ 完成武器ID。0xFFFF は自作
  /** ✅ 刃の ID。読むときは 3 B（blade）で [TS] の値と照合する */
  bladeId: { rel: 0x02, type: "u16" },
  /** ✅ 鞘の ID（chunks/weapon-record のパーツの X。[U] 2026-10-05 鞘だけを書き換えてゲーム内で反映を確認）。下位バイトは刃の 3 B、上位バイトは鍔の 3 B にも含まれる */
  sheath: { rel: 0x04, type: "u16" },
  /** ✅ 鍔の ID。読むときは 3 B（guard）で [TS] の値と照合する */
  guardId: { rel: 0x06, type: "u16" },
  grip: { rel: 0x08, type: "u16" }, // ✅
  /** 固有武器の6バイト（u16 × 3。U-9）。完成武器ごとに決まる値 */
  unique0: { rel: 0x0a, type: "u16" },
  unique1: { rel: 0x0c, type: "u16" },
  unique2: { rel: 0x0e, type: "u16" },
  /**
   * 武器種（U-8 解決、[U] 2026-10-05）。帯刀に刀・槍・拳銃を置くと 0・1・3。
   * 🟢 幅は u16（[TS] の配置で +0x1E〜+0x1F。上位バイトは常に 0）
   */
  weaponType: { rel: 0x18, type: "u16" },
  /** 完成武器ごとに決まる値。特殊武器は名前の番号、通常は 0xFFFF */
  specialNameNo: { rel: 0x1a, type: "u16" },
  /** ❓ 完成武器ごとに決まる値（complete.csv の flag_22） */
  flag22: { rel: 0x1c, type: "u16" },
  /**
   * 🟢 完成武器の名前の番号（complete.csv の name_no。自作は −1）。[TS] の配置の +0x72〜+0x75 で、
   * これまで「自作かどうか」としていた +0x74 はこの値の上位 16 bit。0 以上なら完成武器の名前が表示され、name は使われない
   */
  nameNo: { rel: 0x6c, type: "i32" },
  /** 🔶 +0x80 と同じ値（heldTime の写し） */
  heldTime2: { rel: 0x84, type: "u32" },
  /** 🟢 1 以上なら武器名が「*****」と表示される（要ゲーム内確認） */
  nameHidden: { rel: 0x93, type: "u8" },
} as const satisfies Record<string, TypedField>;

/** 1・2・4 B でない欄（位置と幅） */
const BYTES_FIELD_SPECS = {
  blade: { rel: 0x02, bytes: 3 }, // ✅（[TS] の値）で読む。書くのは ID（bladeId）と X（sheath）
  guard: { rel: 0x05, bytes: 3 }, // ✅（[TS] の値）で読む。書くのは ID（guardId）だけ
  charms: { rel: 0x1e, bytes: 12 }, // 4 B × 3組 ✅
  name: { rel: 0x2a, bytes: 66 }, // UTF-16LE ✅位置 ／ 🟢 66 B ／ ✅最大17文字（U-5）
  title: { rel: 0x90, bytes: 3 }, // ✅
} as const;

type ScalarKey = keyof typeof SCALAR_FIELD_SPECS | NumberKey;
const WEAPON_CODEC = recordCodec<ScalarKey>({ ...NUMBER_FIELD_SPECS, ...SCALAR_FIELD_SPECS });

/** 部品の u16 × 4（+0x02〜+0x09：刃の ID・X・鍔の ID・柄の ID）。U-3 */
const PART_WORD_KEYS = ["bladeId", "sheath", "guardId", "grip"] as const satisfies readonly ScalarKey[];

const relOf = <K extends string>(specs: Record<K, { rel: number }>) =>
  Object.fromEntries(Object.entries<{ rel: number }>(specs).map(([k, s]) => [k, s.rel])) as Record<K, number>;

/** レコード内の位置（chunks/weapon-record の構造）。型・幅は *_FIELD_SPECS */
export const WEAPON_FIELDS: Readonly<Record<ScalarKey | keyof typeof BYTES_FIELD_SPECS, number>> = {
  ...relOf(NUMBER_FIELD_SPECS),
  ...relOf(SCALAR_FIELD_SPECS),
  ...relOf(BYTES_FIELD_SPECS),
};

export type PartKind = "blade" | "guard" | "grip";

const PART_LISTS: Record<PartKind, readonly PartOption[]> = {
  blade: BLADES,
  guard: GUARDS,
  grip: GRIPS,
};
const PART_NOUNS: Record<PartKind, string> = { blade: "刃", guard: "鍔", grip: "柄" };

/** 🟢 武器名の欄は 66 B（ゲームは 18 文字まで保存し、残りを 0 で埋める） */
export const WEAPON_NAME_BYTES = BYTES_FIELD_SPECS.name.bytes;
/** ✅ 17文字まで（U-5 案A で確定、[U] 2026-10-05。[TS] 作者の注記「ゲーム内では17文字まで」） */
export const WEAPON_NAME_MAX_CHARS = 17;

export type NumberKey = keyof typeof NUMBER_FIELD_SPECS;
export const NUMBER_KEYS = Object.keys(NUMBER_FIELD_SPECS) as readonly NumberKey[];

export type NumberRange = { min: number; max: number };

/**
 * ゲーム上の正規の範囲（chunks/weapon-record の値の範囲）。
 * AGENTS.md：これを超える値は通常モードでは拒否し、上級者モードを明示したときだけ型で書ける範囲まで許可する。
 * - 斬殺数・つま斬り数は 4万を超えると表示が崩れるという報告がある（🔶 chunks/weapon-record の値の範囲）ので、ゲーム上の上限を 40,000 にする
 */
const GAME_RANGES: Record<NumberKey, NumberRange> = {
  attack: { min: 0, max: 500 },
  durabilityMax: { min: 0, max: 2000 },
  durability: { min: 0, max: 2000 },
  // 現在の質には上限を設けない（ユーザー判断 2026-10-08）。質の最大値を超えてもよい
  quality: { min: 0, max: 0x7fff },
  qualityMax: { min: 0, max: 21 },
  kills: { min: 0, max: 40_000 },
  tsumaKills: { min: 0, max: 40_000 },
  // ✅ 耐久回復の累積値・🔶 手に持っていた時間は u32。ゲーム上の上限は分からないので、型で書ける範囲と同じにする
  durabilityRecovery: NUM_TYPE_RANGE.u32,
  heldTime: NUM_TYPE_RANGE.u32,
};

/** 数値の範囲。game はゲーム上の正規の範囲、system はセーブの型（NUMBER_FIELD_SPECS）で書ける範囲 */
export const WEAPON_NUMBER_RANGES = Object.fromEntries(
  NUMBER_KEYS.map((k) => [k, { game: GAME_RANGES[k], system: NUM_TYPE_RANGE[NUMBER_FIELD_SPECS[k].type] }]),
) as Record<NumberKey, { game: NumberRange; system: NumberRange }>;

const inRange = (v: number, r: NumberRange) => v >= r.min && v <= r.max;
export const formatRange = (r: NumberRange) =>
  `${r.min.toLocaleString()}〜${r.max.toLocaleString()}`;

// ---- 武器種（U-8） ----

/** 値は [W-PC]。5種ともゲーム内で確認した（[U] 2026-10-05） */
export const WEAPON_TYPES: readonly { id: number; label: string }[] = [
  { id: 0, label: "刀" },
  { id: 1, label: "槍" },
  { id: 2, label: "爪" },
  { id: 3, label: "拳銃" },
  { id: 4, label: "ライフル" },
];

// ---- 魅力（chunks/weapon-record ✅） ----

export const CHARM_SLOTS = 3;
/** 個数の合計の上限（4以上で箪笥を開けなくなった報告あり。chunks/weapon-record） */
export const CHARM_TOTAL_MAX = 3;
export const NO_CHARM = 0xffff;

/** 魅力の ID 順（datatable/weapon/charm.csv。「なし」の 0xFFFF は選択肢にしない） */
export const CHARMS: readonly { id: number; label: string }[] = Object.values(CHARM_TABLE)
  .filter((r) => r.id_dec !== NO_CHARM)
  .map((r) => ({ id: r.id_dec, label: r.name_ja }));

// ---- 銘（chunks/weapon-record ✅） ----

/** 銘なしの 3 B と、表での ID */
const NO_TITLE_RAW = 0xffffff;
const NO_TITLE_ID = 0xffff;

/**
 * 銘の番号 → 名前（datatable/weapon/title.csv。「銘なし」は含めない）。raw は save_bytes_le を LE で読んだ 3 B。
 * バイト列は `<0x6A + 番号> 01 <番号>` で、番号は 3 バイト目
 */
export const WEAPON_TITLES: readonly { no: number; label: string; raw: number }[] = Object.values(TITLE_TABLE)
  .filter((r) => r.id_dec !== NO_TITLE_ID)
  .map((r) => ({
    no: r.save_bytes_le[2],
    label: r.name_ja,
    raw: r.save_bytes_le[0] | (r.save_bytes_le[1] << 8) | (r.save_bytes_le[2] << 16),
  }));

export type PartView = {
  /** 読んだ値（刃・鍔は 3 B、柄は 2 B を LE で読んだもの） */
  value: number;
  /** ID 表にあれば名前 */
  label: string | null;
  /** 一致した選択肢の識別子（partKey）。null は表にない値 */
  key: string | null;
};

/** problem はレコード全体の妥当性検証に落ちた理由。空き枠は problem ではなく empty で示す */
export type WeaponView = ViewStatus & {
  /** レコードの先頭位置 */
  offset: number;
  /** 🟢 空き枠（刃・X・鍔・柄がすべて 0xFFFF）。編集しない */
  empty: boolean;
  name: Field<string>;
  /** 🟢 完成武器の名前の番号（i32）。0 以上なら name は表示されない */
  nameNo: number;
  /** 🟢 1 以上なら武器名が「*****」と表示される（+0x93 の u8）。 */
  nameHidden: Field<boolean>;
  weaponId: Field<number> & { label: string | null };
  /** 特殊武器（刃の3バイト目が 0xFF。D-15） */
  special: boolean;
  blade: Field<PartView>;
  guard: Field<PartView>;
  grip: Field<PartView>;
  numbers: Record<NumberKey, Field<number>>;
  /** 魅力を個数分に展開したもの。通常は3枠、上級者設定では最大9個。空きは null */
  charms: Field<(number | null)[]>;
  /** 銘の番号。null は銘なし。label が null なら未知のバイト列 */
  title: Field<number | null> & { label: string | null };
  /** 鞘（X）。label は同じ鞘を使う刃の名前。表にない X は null */
  sheath: Field<number> & { label: string | null };
  /** 武器種（U-8）。label は WEAPON_TYPES の名前、未知の値は null */
  weaponType: Field<number> & { label: string | null };
  /** 完成武器ID・武器種・部品が、その完成武器の構成とすべて一致する（matchesCompleteWeapon） */
  matchesComplete: boolean;
  /** 刃・鞘・鍔・柄がすべて一致する完成武器の ID（completeWeaponByParts）。なければ null */
  completeByParts: number | null;
};

/** 3 B を LE で読む。範囲外は readU16・readU8 が例外にする */
function readU24(bytes: Uint8Array, offset: number): number {
  return readU16(bytes, offset) | (readU8(bytes, offset + 2) << 16);
}

function writeU24(bytes: Uint8Array, offset: number, value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffff)
    throw new RangeError("値が範囲外です");
  writeU16(bytes, offset, value & 0xffff);
  writeU8(bytes, offset + 2, value >>> 16);
}

/**
 * 選択肢の識別子。ID は表（partOptions の1つの一覧）の中で一意。
 * 特殊武器の刃は通常の刃と ID が重なる（D-15）ので、別の識別子にして通常の刃の識別子で書けないようにする
 */
export const partKey = (p: PartOption) =>
  p.tsRaw !== undefined && isSpecialBlade(p.tsRaw) ? `special:${p.id}` : String(p.id);

/** 読んだ 3 B／2 B の値から部品の ID（u16）を取り出す（chunks/weapon-record のパーツ：刃は下位 2 B、鍔は上位 2 B、柄は 2 B そのまま） */
function partId(kind: PartKind, raw: number): number {
  if (kind === "grip") return raw;
  return kind === "blade" ? raw & 0xffff : (raw >>> 8) & 0xffff;
}

/**
 * 読んだ値に一致する選択肢を探す。[TS] の値と完全一致するものを優先し、なければ ID（u16）が一致するものを使う。
 * X（鞘）が標準と違うかは、刃の bladeX と +0x04〜+0x05 の 2 B を比べて別に判定する
 */
function findPart(
  kind: PartKind,
  list: readonly PartOption[],
  raw: number,
): PartOption | undefined {
  const exact = list.find((p) => p.tsRaw === raw);
  if (exact) return exact;
  const id = partId(kind, raw);
  return list.find((p) => p.id === id);
}

/** 部品の欄の警告。option は findPart で引いた選択肢（表になければ undefined）、sheath は今の X（+0x04〜+0x05） */
function partWarning(
  kind: PartKind,
  option: PartOption | undefined,
  special: boolean,
  sheath: number,
): string | null {
  const noun = PART_NOUNS[kind];
  // 特殊武器の鍔・柄は 0xFFFF（表にない）のが正しい
  if (!option) return special && kind !== "blade" ? null : `表にない${noun}です。既知の${noun}への変更だけができます`; // U-10
  // U-13 ゲーム内の名前が未確認
  if (partName(option).includes("？")) return "名前に「？」が付いた ID です。ゲーム内では別の名前で表示されることがあります";
  if (kind !== "blade") return null;
  // 刃は、X がその刃の標準の鞘（bladeX）と違えば警告する
  const standardX = bladeX(option);
  if (standardX !== null && standardX !== sheath) return "鞘がこの刃の標準の鞘と違います。刃を選び直すと標準の鞘に戻ります";
  // U-3 案B
  if (isXUnknown(kind, option)) return "この刃の鞘は不明で、元のままです。ゲーム内で分解→組み立てると正しい鞘になります";
  // U-3 規則を確かめた範囲の外
  if (option.xExtended) return "鞘は計算で求めた値です。ゲーム内の名前・外観が違うことがあります";
  return null;
}

/** 武器名の欄の警告。nameNo は完成武器の名前の番号 */
function nameWarning(text: string, nameNo: number): string | null {
  if (text.length > WEAPON_NAME_MAX_CHARS) return `${WEAPON_NAME_MAX_CHARS}文字を超えています（${text.length}文字）`;
  // 🟢
  if (nameNo >= 0) return "完成武器の名前が表示されるので、この名前は使われません";
  return null;
}

export function isSpecialBlade(value: number): boolean {
  return value >>> 16 === 0xff && value !== 0xffffff;
}

export function weaponIdLabel(id: number): string | null {
  const option = WEAPON_IDS.find((w) => w.id === id);
  return option ? weaponIdName(option) : null;
}

export function charmLabel(id: number): string | null {
  return CHARMS.find((c) => c.id === id)?.label ?? null;
}

/** 個数分に展開した魅力（WeaponView の charms.value）を、最初に出てきた順に ID ごとの個数にまとめる。空きは数えない */
export function countCharms(values: readonly (number | null)[]): { id: number; count: number }[] {
  const groups: { id: number; count: number }[] = [];
  for (const id of values) {
    if (id === null) continue;
    const g = groups.find((x) => x.id === id);
    if (g) g.count++;
    else groups.push({ id, count: 1 });
  }
  return groups;
}

/** 魅力の要約（一覧の表示用）。合計が3個までなら1個ずつの名前、4個以上（上級者設定）なら「名前 ×個数」。空きは含めない */
export function charmSummary(values: readonly (number | null)[]): string[] {
  const label = (id: number) => charmLabel(id) ?? "不明";
  const ids = values.filter((id): id is number => id !== null);
  if (ids.length <= CHARM_TOTAL_MAX) return ids.map(label);
  return countCharms(ids).map(({ id, count }) => `${label(id)} ×${count}`);
}

/** 一覧・見出しに出す武器名。名前を隠す武器は「*****」、名前が空なら「（名前なし）」 */
export function weaponDisplayName(weapon: WeaponView): string {
  if (weapon.nameHidden.value) return "*****";
  return weapon.name.value || "（名前なし）";
}

/** 銘の 3 B を番号に変換する。銘なしは null、未知のバイト列は undefined */
export function decodeTitle(raw: number): number | null | undefined {
  if (raw === NO_TITLE_RAW) return null;
  // ✅ U-2 案A：人斬りもほかの19種と同じ規則（6A 01 00）。[TS] の定義値 00 6A 01 はゲーム内で「……」と表示されたので未知として扱う
  return WEAPON_TITLES.find((t) => t.raw === raw)?.no;
}

export function encodeTitle(no: number | null): number {
  if (no === null) return NO_TITLE_RAW;
  const title = WEAPON_TITLES.find((t) => t.no === no);
  if (!title) throw new RangeError("未知の銘です");
  return title.raw;
}

/** 銘の番号の表示名。銘なしは「なし」、未知のバイト列（undefined）・表にない番号は null */
function titleLabel(no: number | null | undefined): string | null {
  if (no === null) return "なし";
  if (no === undefined) return null;
  return WEAPON_TITLES.find((t) => t.no === no)?.label ?? null;
}

export function validateWeaponName(text: string): string | null {
  return validateText(text, WEAPON_NAME_MAX_CHARS, "武器名");
}

/** ゲーム上の範囲で検証する。上級者モード（options.advanced）ではシステム上の範囲で検証する */
export function validateWeaponNumber(
  key: NumberKey,
  value: number,
  options: EditOpts = NORMAL_EDIT_OPTS,
): string | null {
  const { game, system } = WEAPON_NUMBER_RANGES[key];
  if (!Number.isInteger(value)) return "整数を入力してください";
  if (!inRange(value, system))
    return `${formatRange(system)} の範囲で入力してください（システム上の範囲）`;
  if (!options.advanced && !inRange(value, game))
    return `${formatRange(game)} の範囲で入力してください（ゲーム上の範囲。超えるには上級者モードをオンにします）`;
  return null;
}

/** 同じIDは保存時に合算する。🟢 1組の個数は1〜3、異なるIDは最大3種類 */
export function validateCharms(
  charms: readonly (number | null)[],
  options: EditOpts = NORMAL_EDIT_OPTS,
): string | null {
  if (!options.advanced && charms.length > CHARM_SLOTS) return `魅力は${CHARM_SLOTS}つまでです`;
  const counts = new Map<number, number>();
  for (const c of charms) {
    if (c === null) continue;
    if (!charmLabel(c)) return "未知の魅力です";
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  if (counts.size > CHARM_SLOTS) return `魅力は${CHARM_SLOTS}種類までです`;
  // 🟢 合算して4以上を1組に書くと範囲外になるため、上級者モードでも拒否する。
  for (const count of counts.values()) {
    if (count > CHARM_TOTAL_MAX) return `同じ魅力の個数は合算して${CHARM_TOTAL_MAX}までです`;
  }
  if (!options.advanced && charms.filter((c) => c !== null).length > CHARM_TOTAL_MAX)
    return `魅力の個数の合計は${CHARM_TOTAL_MAX}までです（超えるには上級者モードをオンにします）`;
  return null;
}

/** 魅力の 12 B を読み、個数分に展開する。妥当でなければ problem を返す */
function readCharms(bytes: Uint8Array, base: number): Field<(number | null)[]> {
  const list: number[] = [];
  let problem: string | null = null;
  for (let i = 0; i < CHARM_SLOTS; i++) {
    const id = readU16(bytes, base + i * 4);
    const count = readU16(bytes, base + i * 4 + 2);
    if (id === NO_CHARM) {
      if (count !== 0) problem = "魅力がないのに個数が入っています";
      continue;
    }
    if (!charmLabel(id)) problem = "未知の魅力が付いています";
    else if (count === 0 || count > CHARM_TOTAL_MAX) problem = "魅力の個数が範囲外です";
    else for (let n = 0; n < count; n++) list.push(id);
  }
  const value: (number | null)[] = [...list];
  while (value.length < CHARM_SLOTS) value.push(null);
  return { warnings: [], value, problem };
}

/** 🟢 空き枠：刃・X・鍔・柄（+0x02〜+0x09 の u16 × 4）がすべて 0xFFFF。ゲームはこのレコードから武器を作らない */
export function isEmptyWeapon(bytes: Uint8Array, offset: number): boolean {
  return PART_WORD_KEYS.every((k) => WEAPON_CODEC.readField(bytes, offset, k) === 0xffff);
}

/** レコードの境界・空き・名前・魅力だけを検査する。表示用の完成武器照合は行わない。 */
export function weaponRecordProblem(bytes: Uint8Array, offset: number, layoutProblem: string | null = null): string | null {
  if (!Number.isInteger(offset) || offset < 0 || offset + WEAPON_RECORD_BYTES > bytes.byteLength)
    throw new RangeError("ファイルが小さすぎて武器を読めません");
  if (layoutProblem) return layoutProblem;
  if (isEmptyWeapon(bytes, offset)) return null;
  const name = readUtf16Fixed(bytes, offset + WEAPON_FIELDS.name, WEAPON_NAME_BYTES);
  const charms = readCharms(bytes, offset + WEAPON_FIELDS.charms);
  return fixedStringProblem(name, '武器名') ?? (charms.problem ? `魅力：${charms.problem}` : null);
}

export function readWeapon(
  bytes: Uint8Array,
  offset: number,
  layoutProblem: string | null = null,
): WeaponView {
  if (offset < 0 || offset + WEAPON_RECORD_BYTES > bytes.byteLength)
    throw new RangeError("ファイルが小さすぎて武器を読めません");
  const at = (k: keyof typeof WEAPON_FIELDS) => offset + WEAPON_FIELDS[k];
  const read = (k: ScalarKey) => WEAPON_CODEC.readField(bytes, offset, k);

  const weaponId = read("weaponId");
  const bladeValue = readU24(bytes, at("blade"));
  const empty = isEmptyWeapon(bytes, offset);
  const special = isSpecialBlade(bladeValue);

  const nameRaw = readUtf16Fixed(bytes, at("name"), WEAPON_NAME_BYTES);
  const charms = readCharms(bytes, at("charms"));
  // レコード全体の妥当性（位置がずれていないか）。書き込み前の検査と同じ判定を使う
  const recordProblem = weaponRecordProblem(bytes, offset, layoutProblem);
  const f = <T>(
    value: T,
    problem: string | null = null,
    warning: string | null = null,
  ): Field<T> => ({
    value,
    problem: recordProblem ?? (empty ? "空き枠です" : problem),
    warnings: warningsOf(warning),
  });

  const numbers = {} as Record<NumberKey, Field<number>>;
  for (const key of NUMBER_KEYS) {
    const v = read(key);
    const { game } = WEAPON_NUMBER_RANGES[key];
    numbers[key] = f(
      v,
      null,
      inRange(v, game)
        ? null
        : `現在の値（${v.toLocaleString()}）はゲーム上の範囲（${formatRange(game)}）の外です`,
    );
  }
  if (numbers.durability.value > numbers.durabilityMax.value) {
    numbers.durability.warnings.push("最大耐久より大きい値です");
  }
  if (read("heldTime2") !== numbers.heldTime.value) {
    numbers.heldTime.warnings.push("別の場所に持っている同じ値と食い違っています。書き込むと両方を同じ値にします");
  }

  const titleNo = decodeTitle(readU24(bytes, at("title")));
  const title = titleLabel(titleNo);

  const sheathValue = read("sheath");
  const sheath = SHEATHS.find((x) => x.id === sheathValue);
  const sheathLabel = sheath ? sheathName(sheath) : null;
  const typeValue = read("weaponType");
  const typeLabel = WEAPON_TYPES.find((t) => t.id === typeValue)?.label ?? null;

  const nameNo = read("nameNo");
  const specialProblem = special ? "特殊武器の鍔・柄は変更できません" : null;
  const part = (kind: PartKind, raw: number): Field<PartView> => {
    const option = findPart(
      kind,
      special && kind === "blade" ? SPECIAL_BLADES : PART_LISTS[kind],
      raw,
    );
    const view = {
      value: raw,
      label: option ? partName(option) : null,
      key: option ? partKey(option) : null,
    };
    const warning = partWarning(kind, option, special, sheathValue);
    return f(view, kind === "blade" ? null : specialProblem, warning);
  };

  return {
    warnings: [],
    offset,
    empty,
    problem: recordProblem,
    name: f(nameRaw.text, null, nameWarning(nameRaw.text, nameNo)),
    nameNo,
    nameHidden: f(read("nameHidden") !== 0),
    weaponId: {
      ...f(
        weaponId,
        null,
        weaponIdLabel(weaponId) ? null : "未知の完成武器です",
      ),
      label: weaponIdLabel(weaponId),
    },
    special,
    blade: part("blade", bladeValue),
    guard: part("guard", readU24(bytes, at("guard"))),
    grip: part("grip", read("grip")),
    numbers,
    charms: { ...charms, problem: recordProblem ?? (empty ? "空き枠です" : charms.problem) },
    title: {
      ...f(titleNo ?? null, null, title === null ? "未知の銘が付いています" : null),
      label: title,
    },
    sheath: {
      ...f(sheathValue, null, sheathLabel ? null : "表にない鞘です"),
      label: sheathLabel,
    },
    weaponType: {
      ...f(typeValue, null, typeLabel ? null : "未知の武器種です"),
      label: typeLabel,
    },
    matchesComplete: matchesCompleteWeapon(bytes, offset, weaponId),
    completeByParts: completeWeaponByParts(bytes, offset),
  };
}

// 書き込み。呼び出し側で妥当性検証を通したレコードに対してだけ使う。
// 不正な値は例外にして、バイト列を変えない。

function assertEditable(bytes: Uint8Array, offset: number): void {
  // ファイルサイズが想定と違えば書かない（assertWritable が検査するので、weaponRecordProblem には渡さない）
  assertWritable(bytes, offset, WEAPON_RECORD_BYTES);
  if (isEmptyWeapon(bytes, offset)) throw new RangeError("空き枠です");
  const problem = weaponRecordProblem(bytes, offset);
  if (problem) throw new RangeError(problem);
}

export function writeWeaponName(bytes: Uint8Array, offset: number, text: string): void {
  assertWritable(bytes);
  const problem = validateWeaponName(text);
  if (problem) throw new RangeError(problem);
  assertEditable(bytes, offset);
  writeUtf16Fixed(bytes, offset + WEAPON_FIELDS.name, WEAPON_NAME_BYTES, text);
}

export function writeWeaponNumber(
  bytes: Uint8Array,
  offset: number,
  key: NumberKey,
  value: number,
  options: EditOpts = NORMAL_EDIT_OPTS,
): void {
  assertWritable(bytes);
  const problem = validateWeaponNumber(key, value, options);
  if (problem) throw new RangeError(problem);
  assertEditable(bytes, offset);
  WEAPON_CODEC.writeField(bytes, offset, key, value);
  // 🔶 手に持っていた時間は +0x84 にも同じ値がある。両方をそろえる
  if (key === "heldTime") WEAPON_CODEC.writeField(bytes, offset, "heldTime2", value);
}

/** 完成武器ID（+0x00 の 2 B）だけを書く。名前・パーツは変えない */
export function writeWeaponId(bytes: Uint8Array, offset: number, id: number): void {
  assertWritable(bytes);
  if (!weaponIdLabel(id)) throw new RangeError("未知の完成武器です");
  assertEditable(bytes, offset);
  WEAPON_CODEC.writeField(bytes, offset, "weaponId", id);
}

/** 指定武器に変更できる完成武器（部品の構成が分かっているもの） */
export const COMPLETE_WEAPONS: readonly (WeaponIdOption & { build: WeaponBuild })[] =
  WEAPON_IDS.filter((w): w is WeaponIdOption & { build: WeaponBuild } => w.build !== undefined);

/**
 * 完成武器のレコードで、その完成武器ごとに決まる値（✅ reserch/2026-10-07_special-weapons.md：サンプルの14種で全一致。値は 🟢 complete.csv）。
 * [欄, 値] の一覧（欄の型は SCALAR_FIELD_SPECS）
 */
type CompleteWords = readonly (readonly [ScalarKey, number])[];

function completeWeaponWords(id: number, build: WeaponBuild): CompleteWords {
  const special = build.kind === "special";
  const unique = build.unique ?? [0xffff, 0xffff, 0xffff];
  return [
    ["weaponId", id],
    ["bladeId", build.blade],
    ["sheath", special ? NO_SHEATH : build.sheath],
    ["guardId", special ? 0xffff : build.guard],
    ["grip", special ? 0xffff : build.grip],
    ["unique0", unique[0]],
    ["unique1", unique[1]],
    ["unique2", unique[2]],
    ["weaponType", build.type],
    ["specialNameNo", special ? build.nameNo : 0xffff],
    ["flag22", build.flag22],
    // 🟢 名前の番号は i32（完成武器では 0 以上）
    ["nameNo", build.nameNo],
  ];
}

const COMPLETE_WORDS: ReadonlyMap<number, CompleteWords> = new Map(
  COMPLETE_WEAPONS.map((w) => [w.id, completeWeaponWords(w.id, w.build)]),
);
const COMPLETE_PART_WORDS = COMPLETE_WEAPONS.map((w) => ({
  id: w.id,
  words: completeWeaponWords(w.id, w.build).filter(([k]) => (PART_WORD_KEYS as readonly ScalarKey[]).includes(k)),
}));

const matchesWords = (bytes: Uint8Array, offset: number, words: CompleteWords) =>
  words.every(([k, value]) => WEAPON_CODEC.readField(bytes, offset, k) === value);

/**
 * 指定武器に変更する：その完成武器のレコードに入る値（completeWeaponWords）をすべて書く。
 * - 書く位置：+0x00 完成武器ID、+0x02〜+0x09 部品（特殊武器は刃のあと FFFF × 3）、+0x0A〜+0x0F 固有武器の6バイト（U-9）、
 *   +0x18 武器種（u16）、+0x1A（特殊武器は名前の番号、通常は FFFF）、+0x1C、+0x6C 名前の番号（i32）
 * - 名前・攻撃力・耐久・質・魅力・銘・斬殺数などは変えない（ユーザー判断 2026-10-07）
 * - 通常の武器と特殊武器の間でも変更できる。書いた値はゲームが書く値と同じ（✅ 読み）だが、ゲーム内で読めるかは要ゲーム内確認
 */
export function writeCompleteWeapon(bytes: Uint8Array, offset: number, id: number): void {
  assertEditable(bytes, offset);
  const words = COMPLETE_WORDS.get(id);
  if (!words) throw new RangeError("構成が分からない完成武器です");
  for (const [k, value] of words) WEAPON_CODEC.writeField(bytes, offset, k, value);
}

/** レコードの値が、その完成武器のレコードに入る値（writeCompleteWeapon で書く値）とすべて一致するか */
export function matchesCompleteWeapon(bytes: Uint8Array, offset: number, id: number): boolean {
  const words = COMPLETE_WORDS.get(id);
  return words !== undefined && matchesWords(bytes, offset, words);
}

/**
 * 部品（+0x02〜+0x09 の刃・鞘・鍔・柄）がすべて一致する完成武器の ID。なければ null。
 * 完成武器ID・名前の番号などは比べない
 */
export function completeWeaponByParts(bytes: Uint8Array, offset: number): number | null {
  return COMPLETE_PART_WORDS.find((w) => matchesWords(bytes, offset, w.words))?.id ?? null;
}

/**
 * その部品を使う完成武器の ID（完成武器ID の順）。🟢 complete.csv の部品の構成で引く。
 * 特殊武器の刃は特殊武器の間だけ、通常の刃・鍔・柄は通常の武器の間だけで比べる
 */
export function completeWeaponsUsingPart(kind: PartKind, option: PartOption): number[] {
  const id = option.id;
  const special = kind === "blade" && option.tsRaw !== undefined && isSpecialBlade(option.tsRaw);
  return COMPLETE_WEAPONS.filter(({ build }) => {
    if ((build.kind === "special") !== special) return false;
    if (kind === "blade") return build.blade === id;
    return build.kind === "normal" && build[kind] === id;
  }).map((w) => w.id);
}

/** その鞘（X）を使う完成武器の ID（完成武器ID の順）。🟢 complete.csv の sheath_x で引く。特殊武器は鞘がないので含まない */
export function completeWeaponsUsingSheath(sheath: number): number[] {
  return COMPLETE_WEAPONS.filter(
    ({ build }) => build.kind === "normal" && build.sheath === sheath,
  ).map((w) => w.id);
}

/**
 * 選択肢の一覧。特殊武器の刃は特殊武器の刃の間だけで変えられ、鍔・柄は変えられない（D-15）。
 * 規則で X を計算できない [CT] の刃（x が null）も含む（isXUnknown）
 */
export function partOptions(kind: PartKind, special: boolean): readonly PartOption[] {
  if (kind === "blade") return special ? SPECIAL_BLADES : BLADES;
  if (special) return [];
  return PART_LISTS[kind];
}

/**
 * ❓ X（chunks/weapon-record のパーツ）を規則で計算できない [CT] の刃。ID だけを書き、X は元の値のまま残す（U-3 案B）。
 * ゲーム内で分解→組み立てると正しい X になるので、それで X を調べる（ユーザー判断 2026-10-05、要ゲーム内確認）
 */
export function isXUnknown(kind: PartKind, option: PartOption): boolean {
  return kind === "blade" && option.source === "ct" && option.x == null;
}

/**
 * 刃の X（鞘の ID、chunks/weapon-record のパーツ）。null は X 不明（isXUnknown）。
 * 特殊武器の刃は 0xFFFF（鞘なし。[U] 2026-10-05）。表の読み込み時に完全な X へ正規化する
 */
export function bladeX(option: PartOption): number | null {
  return option.x ?? null;
}

/**
 * パーツを書く。key は partKey の値。+0x02〜+0x09 を 2 B×4（刃の ID、X、鍔の ID、柄の ID）として書く（U-3）。
 * ✅ X は鞘の ID で刃によって決まる（[U] 2026-10-05）ので、刃を選んだときだけ X を書き、鍔を選んだときは X を変えない。
 * [TS] の 3 B 値のまま書くと、X の上位バイト（+0x05、鍔の 3 B の先頭）が前の武器のまま残り、表にない鞘になった（[U] 2026-10-05、
 * 和泉守兼定 X 0x162 の上に柾重を書くと X 0x1CD）。
 * - 刃：ID（+0x02）と bladeX（+0x04〜+0x05）。[CT] の X は 🔶 規則で計算したものと ✅ 実測のものがある（U-3 案C）。
 *   規則外の刃（isXUnknown）は ID だけを書き、X は元の値のまま残す（❓ U-3 案B、ユーザー判断 2026-10-05）
 * - 鍔：ID（+0x06）だけ。柄：ID（+0x08）
 */
export function writeWeaponPart(
  bytes: Uint8Array,
  offset: number,
  kind: PartKind,
  key: string,
): void {
  assertEditable(bytes, offset);
  const special = isSpecialBlade(readU24(bytes, offset + WEAPON_FIELDS.blade));
  const option = partOptions(kind, special).find((p) => partKey(p) === key);
  if (!option) throw new RangeError("書き込めないパーツです");

  const write = (k: ScalarKey, value: number) => WEAPON_CODEC.writeField(bytes, offset, k, value);
  if (kind === "grip") return write("grip", option.id);
  if (kind === "guard") return write("guardId", option.id);
  write("bladeId", option.id);
  // X 不明の刃は X を変えない（U-3 案B。isXUnknown）
  const x = bladeX(option);
  if (x !== null) write("sheath", x);
}

/**
 * 魅力を書く（D-7）。同じ ID は1組にまとめて個数で表し、使う組を前に詰める。空いた組は `FF FF 00 00`。
 * 直前の +0x1C（❓ 完成武器ごとに決まる値）は変えない。
 */
export function writeWeaponCharms(
  bytes: Uint8Array,
  offset: number,
  charms: readonly (number | null)[],
  options: EditOpts = NORMAL_EDIT_OPTS,
): void {
  assertWritable(bytes);
  const problem = validateCharms(charms, options);
  if (problem) throw new RangeError(problem);
  assertEditable(bytes, offset);
  const groups = countCharms(charms);
  const base = offset + WEAPON_FIELDS.charms;
  for (let i = 0; i < CHARM_SLOTS; i++) {
    const g = groups[i];
    writeU16(bytes, base + i * 4, g ? g.id : NO_CHARM);
    writeU16(bytes, base + i * 4 + 2, g ? g.count : 0);
  }
}

/** 銘（+0x90 の 3 B）だけを書く。null は銘なし */
export function writeWeaponTitle(bytes: Uint8Array, offset: number, no: number | null): void {
  assertWritable(bytes);
  const raw = encodeTitle(no);
  assertEditable(bytes, offset);
  writeU24(bytes, offset + WEAPON_FIELDS.title, raw);
}

/**
 * 鞘・武器種の書き込みで、その武器の欄で「○○を上書き」を押したか（ユーザー判断 2026-10-05：押したことを明示とみなす）。
 * 上級者モードとは別の印。どちらも 🔶 データ破損のおそれがあるので、押していなければ書かない
 */
export type OverrideOpts = { override: boolean };
const NO_OVERRIDE: OverrideOpts = { override: false };

/**
 * ✅ 鞘（X、+0x04〜+0x05 の u16）を書く。「鞘を上書き」を押したときだけ（options.override。ユーザー判断 2026-10-05）。
 * 表にある鞘だけを書ける。表にある鞘に書き換えると反映された（[U] 2026-10-05）。表にない X（規則を延ばした見栄春の 0xD9）では、
 * ロード時にエラーが出て鞘が表示されなかった（ゲーム内で分解・再組み立てすると直った）
 */
export function writeWeaponSheath(
  bytes: Uint8Array,
  offset: number,
  x: number,
  options: OverrideOpts = NO_OVERRIDE,
): void {
  assertWritable(bytes);
  if (!options.override) throw new RangeError("鞘は「鞘を上書き」を押してから選んでください");
  if (!SHEATHS.some((s) => s.id === x)) throw new RangeError("表にない鞘です");
  assertEditable(bytes, offset);
  WEAPON_CODEC.writeField(bytes, offset, "sheath", x);
}

/**
 * 武器種（+0x18 の u16 🟢）を書く。「武器種を上書き」を押したときだけ（options.override。ユーザー判断 2026-10-05）。パーツは変えない。
 * パーツと合わない武器種にしたときの動作は未確認（要ゲーム内確認）
 */
export function writeWeaponType(
  bytes: Uint8Array,
  offset: number,
  type: number,
  options: OverrideOpts = NO_OVERRIDE,
): void {
  assertWritable(bytes);
  if (!options.override) throw new RangeError("武器種は「武器種を上書き」を押してから選んでください");
  if (!WEAPON_TYPES.some((t) => t.id === type)) throw new RangeError("未知の武器種です");
  assertEditable(bytes, offset);
  WEAPON_CODEC.writeField(bytes, offset, "weaponType", type);
}

/** 🟢 名前を隠す（+0x93 の u8）を書く。オンは 1、オフは 0。1 以上だと武器名が「*****」と表示される（要ゲーム内確認） */
export function writeWeaponNameHidden(bytes: Uint8Array, offset: number, hidden: boolean): void {
  assertWritable(bytes);
  assertEditable(bytes, offset);
  WEAPON_CODEC.writeField(bytes, offset, "nameHidden", hidden ? 1 : 0);
}
