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
  readI16,
  readU16,
  readU32,
  readU8,
  readUtf16Fixed,
  writeI16,
  writeU16,
  writeU32,
  writeU8,
  writeUtf16Fixed,
} from "./binary";
import {
  BLADES,
  GRIPS,
  GUARDS,
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

/** レコード内の位置（chunks/weapon-record の構造） */
export const WEAPON_FIELDS = {
  weaponId: 0x00, // u16 ✅ 完成武器ID。0xFFFF は自作
  blade: 0x02, // 3 B ✅（[TS] の値）で読む。書くのは ID（u16）と X（+0x04 の u16）
  guard: 0x05, // 3 B ✅（[TS] の値）で読む。書くのは ID（+0x06 の u16）だけ
  /** u16 ✅ 鞘の ID（chunks/weapon-record のパーツの X。[U] 2026-10-05 鞘だけを書き換えてゲーム内で反映を確認）。下位バイトは刃の 3 B、上位バイトは鍔の 3 B にも含まれる */
  sheath: 0x04,
  grip: 0x08, // 2 B ✅
  attack: 0x10, // i16 ✅（符号付き。ユーザー確認 2026-10-05）
  durabilityMax: 0x12, // i16 ✅ 最大耐久（符号付き。ユーザー確認 2026-10-05）
  quality: 0x14, // i16 ✅（符号付き。ユーザー確認 2026-10-05）
  /**
   * 武器種（U-8 解決、[U] 2026-10-05）。帯刀に刀・槍・拳銃を置くと 0・1・3。
   * 🟢 幅は u16（[TS] の配置で +0x1E〜+0x1F。上位バイトは常に 0）
   */
  weaponType: 0x18,
  qualityMax: 0x16, // i16 ✅（符号付き。ユーザー確認 2026-10-05）
  charms: 0x1e, // 4 B × 3組 ✅
  name: 0x2a, // UTF-16LE ✅位置 ／ 🟢 66 B ／ ✅最大17文字（U-5）
  /**
   * 🟢 i32 完成武器の名前の番号（complete.csv の name_no。自作は −1）。[TS] の配置の +0x72〜+0x75 で、
   * これまで「自作かどうか」としていた +0x74 はこの値の上位 16 bit。0 以上なら完成武器の名前が表示され、name は使われない
   */
  nameNo: 0x6c,
  /** u32 🔶 手に持っていた時間（秒。メニュー画面は数えない）。+0x84 と常に同じ値（chunks/weapon-record、[U] 2026-10-05）。書くときは +0x84 にも同じ値を書く */
  heldTime: 0x80,
  /** u32 🔶 +0x80 と同じ値（heldTime の写し） */
  heldTime2: 0x84,
  /** u32 ✅ 耐久回復の累積値 */
  durabilityRecovery: 0x88,
  durability: 0x8c, // i16 ✅ 現在の耐久（符号付き。ユーザー確認 2026-10-05）。🟢 0 以下ならロード時に折れた武器になる
  title: 0x90, // 3 B ✅
  /** u8 🟢 1 以上なら武器名が「*****」と表示される（要ゲーム内確認） */
  nameHidden: 0x93,
  kills: 0x96, // u16 ✅ 斬殺数（65535 から1人斬ると 0 に戻った。[U] 2026-10-05）
  tsumaKills: 0x98, // ✅位置 ／ 🟢 u16 つま斬り数
} as const;

export type PartKind = "blade" | "guard" | "grip";

const PART_LISTS: Record<PartKind, readonly PartOption[]> = {
  blade: BLADES,
  guard: GUARDS,
  grip: GRIPS,
};
const PART_NOUNS: Record<PartKind, string> = { blade: "刃", guard: "鍔", grip: "柄" };

/** 🟢 武器名の欄は 66 B（ゲームは 18 文字まで保存し、残りを 0 で埋める） */
export const WEAPON_NAME_BYTES = 66;
/** ✅ 17文字まで（U-5 案A で確定、[U] 2026-10-05。[TS] 作者の注記「ゲーム内では17文字まで」） */
export const WEAPON_NAME_MAX_CHARS = 17;

export type NumberKey =
  | "attack"
  | "durabilityMax"
  | "durability"
  | "quality"
  | "qualityMax"
  | "kills"
  | "tsumaKills"
  | "durabilityRecovery"
  | "heldTime";

export type NumberRange = { min: number; max: number };

/** u32 で読み書きする数値（ほかは 2 B） */
const U32_NUMBERS: ReadonlySet<NumberKey> = new Set(["durabilityRecovery", "heldTime"]);

/**
 * 数値の範囲。game はゲーム上の正規の範囲（chunks/weapon-record の値の範囲）、system はセーブの型で書ける範囲。
 * AGENTS.md：game を超える値は通常モードでは拒否し、上級者モードを明示したときだけ system まで許可する。
 * - 攻撃力・耐久（現在・最大）・質（現在・最大）は ✅ int16（ユーザー確認 2026-10-05）
 * - 斬殺数は ✅ uint16（65535 から1人斬ると 0 に戻った。ユーザー確認 2026-10-05）
 * - つま斬り数は 🟢 uint16
 * - 斬殺数・つま斬り数は 4万を超えると表示が崩れるという報告がある（🔶 chunks/weapon-record の値の範囲）ので、ゲーム上の上限を 40,000 にする
 */
export const WEAPON_NUMBER_RANGES: Record<NumberKey, { game: NumberRange; system: NumberRange }> = {
  attack: { game: { min: 0, max: 500 }, system: { min: -0x8000, max: 0x7fff } },
  durabilityMax: { game: { min: 0, max: 2000 }, system: { min: -0x8000, max: 0x7fff } },
  durability: { game: { min: 0, max: 2000 }, system: { min: -0x8000, max: 0x7fff } },
  // 現在の質には上限を設けない（ユーザー判断 2026-10-08）。質の最大値を超えてもよい
  quality: { game: { min: 0, max: 0x7fff }, system: { min: -0x8000, max: 0x7fff } },
  qualityMax: { game: { min: 0, max: 21 }, system: { min: -0x8000, max: 0x7fff } },
  kills: { game: { min: 0, max: 40_000 }, system: { min: 0, max: 0xffff } },
  tsumaKills: { game: { min: 0, max: 40_000 }, system: { min: 0, max: 0xffff } },
  // ✅ 耐久回復の累積値・🔶 手に持っていた時間は u32。ゲーム上の上限は分からないので、型で書ける範囲と同じにする
  durabilityRecovery: { game: { min: 0, max: 0xffffffff }, system: { min: 0, max: 0xffffffff } },
  heldTime: { game: { min: 0, max: 0xffffffff }, system: { min: 0, max: 0xffffffff } },
};

/** 符号付き（int16）で読み書きする数値 */
const SIGNED_NUMBERS: ReadonlySet<NumberKey> = new Set(
  (Object.keys(WEAPON_NUMBER_RANGES) as NumberKey[]).filter(
    (k) => WEAPON_NUMBER_RANGES[k].system.min < 0,
  ),
);

const inRange = (v: number, r: NumberRange) => v >= r.min && v <= r.max;
export const formatRange = (r: NumberRange) =>
  `${r.min.toLocaleString()}〜${r.max.toLocaleString()}`;

export const NUMBER_KEYS: readonly NumberKey[] = [
  "attack",
  "durabilityMax",
  "durability",
  "quality",
  "qualityMax",
  "kills",
  "tsumaKills",
  "durabilityRecovery",
  "heldTime",
];

function readNumber(bytes: Uint8Array, offset: number, key: NumberKey): number {
  const at = offset + WEAPON_FIELDS[key];
  if (U32_NUMBERS.has(key)) return readU32(bytes, at);
  return SIGNED_NUMBERS.has(key) ? readI16(bytes, at) : readU16(bytes, at);
}

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

export const CHARMS: readonly { id: number; label: string }[] = [
  { id: 0, label: "天運" },
  { id: 1, label: "暗刃" },
  { id: 2, label: "明刃" },
  { id: 3, label: "銭呼" },
  { id: 4, label: "活復" },
  { id: 5, label: "疾風" },
  { id: 6, label: "背水" },
  { id: 7, label: "投抜" },
  { id: 8, label: "頑健" },
  { id: 9, label: "重撃" },
];

// ---- 銘（chunks/weapon-record ✅） ----

/** 銘の番号 → 名前。バイト列は `<0x6A + 番号> 01 <番号>` */
export const TITLES: readonly { no: number; label: string }[] = [
  { no: 0x00, label: "人斬り" },
  { no: 0x01, label: "狂事" },
  { no: 0x02, label: "血河" },
  { no: 0x03, label: "黄泉路" },
  { no: 0x04, label: "猟奇守" },
  { no: 0x05, label: "石頭" },
  { no: 0x06, label: "鉄壁" },
  { no: 0x07, label: "白金造" },
  { no: 0x08, label: "金剛造" },
  { no: 0x09, label: "不壊" },
  { no: 0x0a, label: "一輝" },
  { no: 0x0b, label: "二条" },
  { no: 0x0c, label: "三晃" },
  { no: 0x0d, label: "四海" },
  { no: 0x0e, label: "悟道" },
  { no: 0x0f, label: "剃刀" },
  { no: 0x10, label: "鋭刃" },
  { no: 0x11, label: "冷刃" },
  { no: 0x12, label: "鬼神" },
  { no: 0x13, label: "散華" },
];

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
  /** 🟢 1 以上なら武器名が「*****」と表示される（+0x93 の u8）。raw は読んだ値 */
  nameHidden: Field<boolean> & { raw: number };
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
  title: Field<number | null> & { label: string | null; raw: number };
  /** 鞘（X）。label は同じ鞘を使う刃の名前。表にない X は null */
  sheath: Field<number> & { label: string | null };
  /** 武器種（U-8）。label は WEAPON_TYPES の名前、未知の値は null */
  weaponType: Field<number> & { label: string | null };
  /** 完成武器ID・武器種・部品が、その完成武器の構成とすべて一致する（matchesCompleteWeapon） */
  matchesComplete: boolean;
  /** 刃・鞘・鍔・柄がすべて一致する完成武器の ID（completeWeaponByParts）。なければ null */
  completeByParts: number | null;
};

export function readU24(bytes: Uint8Array, offset: number): number {
  return readU16(bytes, offset) | (bytes[offset + 2] << 16);
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
): { option: PartOption } | undefined {
  const exact = list.find((p) => p.tsRaw === raw);
  if (exact) return { option: exact };
  const id = partId(kind, raw);
  const byId = list.find((p) => p.id === id);
  return byId && { option: byId };
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

/** 銘の 3 B を番号に変換する。銘なしは null、未知のバイト列は undefined */
export function decodeTitle(raw: number): number | null | undefined {
  if (raw === 0xffffff) return null;
  const b0 = raw & 0xff;
  const b1 = (raw >>> 8) & 0xff;
  const b2 = raw >>> 16;
  // ✅ U-2 案A：人斬りもほかの19種と同じ規則（6A 01 00）。[TS] の定義値 00 6A 01 はゲーム内で「……」と表示されたので未知として扱う
  if (b1 === 0x01 && b2 <= 0x13 && b0 === 0x6a + b2) return b2;
  return undefined;
}

export function encodeTitle(no: number | null): number {
  if (no === null) return 0xffffff;
  if (!TITLES.some((t) => t.no === no)) throw new RangeError("未知の銘です");
  return (0x6a + no) | (0x01 << 8) | (no << 16);
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
  for (let i = 0; i < 4; i++)
    if (readU16(bytes, offset + WEAPON_FIELDS.blade + i * 2) !== 0xffff) return false;
  return true;
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

  const weaponId = readU16(bytes, at("weaponId"));
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
    const v = readNumber(bytes, offset, key);
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
  const heldTime2 = readU32(bytes, at("heldTime2"));
  if (heldTime2 !== numbers.heldTime.value) {
    numbers.heldTime.warnings.push("別の場所に持っている同じ値と食い違っています。書き込むと両方を同じ値にします");
  }

  const titleRaw = readU24(bytes, at("title"));
  const titleNo = decodeTitle(titleRaw);
  const titleLabel =
    titleNo === null
      ? "なし"
      : titleNo === undefined
        ? null
        : (TITLES.find((t) => t.no === titleNo)?.label ?? null);

  const sheathValue = readU16(bytes, at("sheath"));
  const sheath = SHEATHS.find((x) => x.id === sheathValue);
  const sheathLabel = sheath ? sheathName(sheath) : null;
  const typeValue = readU16(bytes, at("weaponType"));
  const typeLabel = WEAPON_TYPES.find((t) => t.id === typeValue)?.label ?? null;

  const nameNo = readU32(bytes, at("nameNo")) | 0;
  const hiddenRaw = readU8(bytes, at("nameHidden"));
  const nameLength = nameRaw.text.length;
  const specialProblem = special ? "特殊武器の鍔・柄は変更できません" : null;
  const part = (kind: PartKind, raw: number): Field<PartView> => {
    const hit = findPart(
      kind,
      special && kind === "blade" ? SPECIAL_BLADES : PART_LISTS[kind],
      raw,
    );
    const view = {
      value: raw,
      label: hit ? partName(hit.option) : null,
      key: hit ? partKey(hit.option) : null,
    };
    const noun = PART_NOUNS[kind];
    // 刃は、X（+0x04〜+0x05 の 2 B）がその刃の標準の鞘（bladeX）と違えば警告する
    const standardX = hit && kind === "blade" ? bladeX(hit.option) : null;
    const xDiffers = standardX !== null && standardX !== sheathValue;
    const warning = !hit
      ? special && kind !== "blade"
        ? null
        : `表にない${noun}です。既知の${noun}への変更だけができます` // U-10
      : partName(hit.option).includes("？")
        ? `名前に「？」が付いた ID です。ゲーム内では別の名前で表示されることがあります` // U-13 ゲーム内の名前が未確認
        : xDiffers
          ? "鞘がこの刃の標準の鞘と違います。刃を選び直すと標準の鞘に戻ります"
          : isXUnknown(kind, hit.option)
            ? "この刃の鞘は不明で、元のままです。ゲーム内で分解→組み立てると正しい鞘になります" // U-3 案B
            : hit.option.xExtended
              ? "鞘は計算で求めた値です。ゲーム内の名前・外観が違うことがあります" // U-3 規則を確かめた範囲の外
              : null;
    return f(view, kind === "blade" ? null : specialProblem, warning);
  };

  return {
    warnings: [],
    offset,
    empty,
    problem: recordProblem,
    name: f(
      nameRaw.text,
      null,
      nameLength > WEAPON_NAME_MAX_CHARS
        ? `${WEAPON_NAME_MAX_CHARS}文字を超えています（${nameLength}文字）`
        : nameNo >= 0
          ? "完成武器の名前が表示されるので、この名前は使われません" // 🟢
          : null,
    ),
    nameNo,
    nameHidden: { ...f(hiddenRaw !== 0), raw: hiddenRaw },
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
    grip: part("grip", readU16(bytes, at("grip"))),
    numbers,
    charms: { ...charms, problem: recordProblem ?? (empty ? "空き枠です" : charms.problem) },
    title: {
      ...f(
        titleNo ?? null,
        null,
        titleLabel === null
          ? "未知の銘が付いています"
          : null,
      ),
      label: titleLabel,
      raw: titleRaw,
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
  if (U32_NUMBERS.has(key)) {
    writeU32(bytes, offset + WEAPON_FIELDS[key], value);
    // 🔶 手に持っていた時間は +0x84 にも同じ値がある。両方をそろえる
    if (key === "heldTime") writeU32(bytes, offset + WEAPON_FIELDS.heldTime2, value);
  } else if (SIGNED_NUMBERS.has(key)) writeI16(bytes, offset + WEAPON_FIELDS[key], value);
  else writeU16(bytes, offset + WEAPON_FIELDS[key], value);
}

/** 完成武器ID（+0x00 の 2 B）だけを書く。名前・パーツは変えない */
export function writeWeaponId(bytes: Uint8Array, offset: number, id: number): void {
  assertWritable(bytes);
  if (!weaponIdLabel(id)) throw new RangeError("未知の完成武器です");
  assertEditable(bytes, offset);
  writeU16(bytes, offset + WEAPON_FIELDS.weaponId, id);
}

/** 指定武器に変更できる完成武器（部品の構成が分かっているもの） */
export const COMPLETE_WEAPONS: readonly (WeaponIdOption & { build: WeaponBuild })[] =
  WEAPON_IDS.filter((w): w is WeaponIdOption & { build: WeaponBuild } => w.build !== undefined);

/**
 * 完成武器のレコードで、その完成武器ごとに決まる値（✅ reserch/2026-10-07_special-weapons.md：サンプルの14種で全一致。値は 🟢 complete.csv）。
 * 位置 → u16（位置は本当の先頭から。[TS] の配置では +0x06）
 */
function completeWeaponWords(id: number, build: WeaponBuild): [number, number][] {
  const special = build.kind === "special";
  const unique = build.unique ?? [0xffff, 0xffff, 0xffff];
  return [
    [0x00, id],
    [0x02, build.blade],
    [0x04, special ? 0xffff : build.sheath],
    [0x06, special ? 0xffff : build.guard],
    [0x08, special ? 0xffff : build.grip],
    [0x0a, unique[0]],
    [0x0c, unique[1]],
    [0x0e, unique[2]],
    [WEAPON_FIELDS.weaponType, build.type],
    [0x1a, special ? build.nameNo : 0xffff],
    [0x1c, build.flag22],
    // 🟢 名前の番号は i32（上位 16 bit は 0）
    [WEAPON_FIELDS.nameNo, build.nameNo],
    [WEAPON_FIELDS.nameNo + 2, 0x0000],
  ];
}

const COMPLETE_WORDS = new Map(COMPLETE_WEAPONS.map(w => [w.id, completeWeaponWords(w.id, w.build)]));
const COMPLETE_PART_WORDS = COMPLETE_WEAPONS.map(w => ({ id: w.id, words: COMPLETE_WORDS.get(w.id)?.filter(([at]) => at >= 0x02 && at <= 0x08) ?? [] }));

/**
 * 指定武器に変更する：その完成武器のレコードに入る値（completeWeaponWords）をすべて書く。
 * - 書く位置：+0x00 完成武器ID、+0x02〜+0x09 部品（特殊武器は刃のあと FFFF × 3）、+0x0A〜+0x0F 固有武器の6バイト（U-9）、
 *   +0x18 武器種（u16）、+0x1A（特殊武器は名前の番号、通常は FFFF）、+0x1C、+0x6C 名前の番号（i32）
 * - 名前・攻撃力・耐久・質・魅力・銘・斬殺数などは変えない（ユーザー判断 2026-10-07）
 * - 通常の武器と特殊武器の間でも変更できる。書いた値はゲームが書く値と同じ（✅ 読み）だが、ゲーム内で読めるかは要ゲーム内確認
 */
export function writeCompleteWeapon(bytes: Uint8Array, offset: number, id: number): void {
  assertEditable(bytes, offset);
  const option = COMPLETE_WEAPONS.find((w) => w.id === id);
  if (!option) throw new RangeError("構成が分からない完成武器です");
  for (const [at, value] of COMPLETE_WORDS.get(option.id) ?? [])
    writeU16(bytes, offset + at, value);
}

/** レコードの値が、その完成武器のレコードに入る値（writeCompleteWeapon で書く値）とすべて一致するか */
export function matchesCompleteWeapon(bytes: Uint8Array, offset: number, id: number): boolean {
  const option = COMPLETE_WEAPONS.find((w) => w.id === id);
  if (!option) return false;
  return (COMPLETE_WORDS.get(option.id) ?? []).every(
    ([at, value]) => readU16(bytes, offset + at) === value,
  );
}

/**
 * 部品（+0x02〜+0x09 の刃・鞘・鍔・柄）がすべて一致する完成武器の ID。なければ null。
 * 完成武器ID・名前の番号などは比べない
 */
export function completeWeaponByParts(bytes: Uint8Array, offset: number): number | null {
  const match = COMPLETE_PART_WORDS.find((w) =>
    w.words.every(([at, value]) => readU16(bytes, offset + at) === value),
  );
  return match?.id ?? null;
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

  const id = option.id;
  if (kind === "grip") return writeU16(bytes, offset + WEAPON_FIELDS.grip, id);
  if (kind === "guard") return writeU16(bytes, offset + WEAPON_FIELDS.guard + 1, id);
  writeU16(bytes, offset + WEAPON_FIELDS.blade, id);
  // X 不明の刃は X を変えない（U-3 案B。isXUnknown）
  const x = bladeX(option);
  if (x !== null) writeU16(bytes, offset + WEAPON_FIELDS.blade + 2, x);
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
  const groups: { id: number; count: number }[] = [];
  for (const c of charms) {
    if (c === null) continue;
    const g = groups.find((x) => x.id === c);
    if (g) g.count++;
    else groups.push({ id: c, count: 1 });
  }
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
 * ✅ 鞘（X、+0x04〜+0x05 の u16）を書く。上級者モード専用（options.advanced。ユーザー判断 2026-10-05）。
 * 表にある鞘だけを書ける。表にある鞘に書き換えると反映された（[U] 2026-10-05）。表にない X（規則を延ばした見栄春の 0xD9）では、
 * ロード時にエラーが出て鞘が表示されなかった（ゲーム内で分解・再組み立てすると直った）
 */
export function writeWeaponSheath(
  bytes: Uint8Array,
  offset: number,
  x: number,
  options: EditOpts = NORMAL_EDIT_OPTS,
): void {
  assertWritable(bytes);
  if (!options.advanced) throw new RangeError("鞘は上級者モードでだけ変更できます");
  if (!SHEATHS.some((s) => s.id === x)) throw new RangeError("表にない鞘です");
  assertEditable(bytes, offset);
  writeU16(bytes, offset + WEAPON_FIELDS.sheath, x);
}

/**
 * 武器種（+0x18 の u16 🟢）を書く。上級者モード専用（options.advanced。ユーザー判断 2026-10-05）。パーツは変えない。
 * パーツと合わない武器種にしたときの動作は未確認（要ゲーム内確認）
 */
export function writeWeaponType(
  bytes: Uint8Array,
  offset: number,
  type: number,
  options: EditOpts = NORMAL_EDIT_OPTS,
): void {
  assertWritable(bytes);
  if (!options.advanced) throw new RangeError("武器種は上級者モードでだけ変更できます");
  if (!WEAPON_TYPES.some((t) => t.id === type)) throw new RangeError("未知の武器種です");
  assertEditable(bytes, offset);
  writeU16(bytes, offset + WEAPON_FIELDS.weaponType, type);
}

/** 🟢 名前を隠す（+0x93 の u8）を書く。オンは 1、オフは 0。1 以上だと武器名が「*****」と表示される（要ゲーム内確認） */
export function writeWeaponNameHidden(bytes: Uint8Array, offset: number, hidden: boolean): void {
  assertWritable(bytes);
  assertEditable(bytes, offset);
  writeU8(bytes, offset + WEAPON_FIELDS.nameHidden, hidden ? 1 : 0);
}
