// 武器の ID 表。docs/save_format/datatable/weapon/*.csv（blade・blade-special・guard・grip・complete）から生成した master/dataset/*.ts を使う（表を二重に持たない）。
// 刃・鍔・柄の ID と名前、刃の X、完成武器ID は 🟢 で全件裏付けた（2026-10-07。U-10 は解消）。名前のない試作用らしい部品（刃 0・3・43・44 など）は datatable に載せない（ユーザー判断 2026-10-07）。
// 名前は武器名のマスター（master/weapon-names.ts）のキーで参照する（依存の順：weapon-names → weapon-ids → weapon → 画面）。
// 行ごとの根拠（D-13・U-3 など）は CSV の備考。
//
// source の意味（CSV の save_bytes_le があれば 'ts'、なければ 'ct'）：
//   'ts'：[TS] の定義値（✅ [TS][I-3]。U-3 案A：この値のまま書けば正しく動く）、または実セーブのバイト列をゲーム内の表示で確認した値（✅ [U]）。
//         tsRaw は save_bytes_le（刃・鍔が 3 B、柄が 2 B）を LE で読んだ値。id は共通の u16 ID
//   'ct'：Cheat Engine テーブル [CT] の ID（u16）だけが分かっているもの。🟢（2026-10-07。ゲーム内では未確認）。
//         id は ID。刃は X（chunks/weapon-record のパーツ）を規則で計算して書く（計算した値は 🟢）（U-3 案C、ユーザー判断 2026-10-05）。規則外の刃は x が null で、
//         ID だけを書き X は元の値のまま残す（U-3 案B。ゲーム内で分解→組み立てると正しい X になるので、それで X を調べる。ユーザー判断 2026-10-05）
// U-13 は案A（CT の刃 305〜316 は +1 ずれている）で決着した（ユーザー判断 2026-10-05）。CSV の ID は −1 した値
// 正道刀の鍔（[TS] の定義値 0xAC0109）は作者が異常値と注記しており I-3 の対象外なので載せない。

import { getLanguage } from "@/lib/i18n";
import { BLADE_TABLE } from "./master/dataset/blade";
import { BLADE_SPECIAL_TABLE } from "./master/dataset/blade-special";
import { COMPLETE_TABLE } from "./master/dataset/complete";
import { GRIP_TABLE } from "./master/dataset/grip";
import { GUARD_TABLE } from "./master/dataset/guard";
import {
  isWeaponKey,
  weaponKind,
  weaponName,
  type Lang,
  type WeaponKey,
  type WeaponKind,
} from "./master/weapon-names";

export type PartOption = {
  source: "ts" | "ct";
  id: number;
  /**
   * 'ts' だけ：save_bytes_le を LE で読んだ保存値（刃・鍔は 3 B、柄は 2 B）。
   * 読んだ値と完全一致する選択肢を優先して引くのと、特殊武器の刃（3バイト目が FF）の判定に使う。選択肢の識別子・書き込みは id を使う
   */
  tsRaw?: number;
  /** 武器名のマスターのキー */
  name: WeaponKey;
  /**
   * 刃だけ：X（鞘の ID、u16）。
   * 'ct' は 🟢 規則で計算した X、または ✅ 実セーブで確かめた X。null は規則外で X 不明（ID だけ書く。U-3 案B）。
   * 'ts' も完全な X を持つ（3 B 値には X の下位バイトしかない）。
   */
  x?: number | null;
  /** x が、規則を確かめた範囲（0x3F〜0x51、0x109〜0x134）の外に規則を延ばして計算した値（ユーザー判断 2026-10-05、ゲーム内で確認待ち） */
  xExtended?: boolean;
};

/** 部品の CSV（blade・guard・grip）の行。0xFFFF の「なし」は選択肢にしない */
type PartRow = { id_dec: number; save_bytes_le: readonly number[]; name_ja: string };

const NONE_ID = 0xffff;

/** "07 00 A2" → 0xA20007 */
function bytesLe(bytes: readonly number[]): number {
  return bytes.reduceRight((acc, b) => acc * 0x100 + b, 0);
}

function weaponKeyOf(name: string, file: string): WeaponKey {
  if (!isWeaponKey(name)) throw new Error(`${file} の名前が完成武器の表にありません: ${name}`);
  return name;
}

function partOptions<R extends PartRow>(
  table: Readonly<Record<number, R>>,
  file: string,
  extra: (r: R, source: PartOption["source"]) => Partial<PartOption> = () => ({}),
): PartOption[] {
  return Object.values(table)
    .filter((r) => r.id_dec !== NONE_ID)
    .map((r) => {
      const source = r.save_bytes_le.length === 0 ? "ct" : "ts";
      const tsRaw = source === "ts" ? bytesLe(r.save_bytes_le) : undefined;
      return { source, id: r.id_dec, tsRaw, name: weaponKeyOf(r.name_ja, file), ...extra(r, source) };
    });
}

/** 刃（+0x02）。🟢 ID と鞘を別々に持つ。 */
export const BLADES: readonly PartOption[] = partOptions(BLADE_TABLE, "blade.csv", (r, source) => {
  if (source === "ct") return { x: r.sheath_x };
  // 3 B 値には X の下位バイトしかない（X が 0x100 以上だと収まらない。U-3）ので、表の sheath_x を優先し、ないときだけ 3 B 値の先頭を使う
  return { x: r.sheath_x ?? (bytesLe(r.save_bytes_le) >>> 16) };
});

/** 鍔の ID（+0x06 の u16）。'ts' の tsRaw は +0x05〜+0x07 の 3 B（1バイト目は 🔶 X の上位バイト） */
export const GUARDS: readonly PartOption[] = partOptions(GUARD_TABLE, "guard.csv");

/** 柄の ID（+0x08 の u16）。 */
export const GRIPS: readonly PartOption[] = partOptions(GRIP_TABLE, "grip.csv");

/**
 * 特殊武器の刃（3バイト目 0xFF。D-15 で通常パーツと別扱い）。[TS] の値と、ゲーム内で確認した値（[U]）。
 * 下位16ビット 0x00〜0x0B ですべて（ユーザー判断 2026-10-05。0x0C 以降はないものとする）。
 * 名前は、その刃を使う完成武器の名前（blade-special.csv の名前は「虎爪（無手）」のように補足つき）
 */
const SPECIAL_KEYS = new Map<number, WeaponKey>(
  Object.values(COMPLETE_TABLE).flatMap((r) =>
    r.guard === null && r.blade !== null ? [[r.blade, weaponKeyOf(r.name_ja, "complete.csv")] as const] : [],
  ),
);
export const SPECIAL_BLADES: readonly PartOption[] = Object.values(BLADE_SPECIAL_TABLE).map((r) => {
  const name = SPECIAL_KEYS.get(r.id_dec);
  if (!name) throw new Error(`blade-special.csv の ${r.id_dec} を使う完成武器がありません`);
  return { source: "ts", id: r.id_dec, tsRaw: 0xff0000 | r.id_dec, x: 0xffff, name };
});

/** パーツの表示名 */
export function partName(option: PartOption, lang: Lang = getLanguage()): string {
  return weaponName(option.name, lang);
}

/**
 * 鞘（X、+0x04〜+0x05 の u16。chunks/weapon-record のパーツ、datatable/weapon/blade.csv の sheath_x）。✅ X は鞘の ID（[U] 2026-10-05）。names は同じ X を使う刃（刃の ID 順）。0xFFFF は鞘なし（[U] 2026-10-05）。
 * U-3 案C の行は、[CT] の刃の X を規則（ID＋0x17／ID−0x5D）で計算した値から逆算して足した鞘（ユーザー判断 2026-10-05）。値は 🟢 で裏付けた（2026-10-07）。
 * どの刃にも使われない鞘（0x29・0x2A など）は載せない
 */
export type SheathOption = { id: number; names: readonly WeaponKey[] };

export const NO_SHEATH = 0xffff;

/** 鞘の ID 順。最後に鞘なし */
export const SHEATHS: readonly SheathOption[] = (() => {
  const names = new Map<number, WeaponKey[]>();
  for (const r of Object.values(BLADE_TABLE)) {
    if (r.id_dec === NONE_ID || r.sheath_x === null) continue;
    names.set(r.sheath_x, [...(names.get(r.sheath_x) ?? []), weaponKeyOf(r.name_ja, "blade.csv")]);
  }
  return [
    ...[...names].sort(([a], [b]) => a - b).map(([id, n]) => ({ id, names: n })),
    { id: NO_SHEATH, names: [] },
  ];
})();

/** 鞘の種別（刀・槍）。同じ鞘を使う刃の最初の1つで決める。鞘なしは null */
export function sheathKind(sheath: SheathOption): WeaponKind | null {
  return sheath.names.length === 0 ? null : weaponKind(sheath.names[0]);
}

/** 鞘の表示名。同じ鞘を使う刃の名前を「・」でつなぐ。鞘なしは「鞘なし」 */
export function sheathName(sheath: SheathOption, lang: Lang = getLanguage()): string {
  if (sheath.names.length === 0) return lang === "en" ? "No sheath" : "鞘なし";
  return sheath.names.map((n) => weaponName(n, lang)).join(lang === "en" ? " / " : "・");
}

/**
 * 完成武器ID（レコードの先頭 +0x00 の u16。datatable/weapon/complete.csv）。name が null は自作武器（0xFFFF）。
 * 2〜116 の全件 🟢（2026-10-07）。[TS] の表は 31 と 94 以降がずれていたので使わない（check-diff §0.2）。鬼ヶ島 106 は [U]、陸奥守吉行 110 はサンプルのセーブとも一致。
 * 0・1 は部品が中道刀と同じ試作用らしい行なので載せない（ユーザー判断 2026-10-07）
 * build はその完成武器のレコードに入る値（complete.csv の weapon_type・blade・sheath_x・guard・grip・unique_bytes・name_no・flag_22）。🟢。
 * サンプルのセーブの14種（特殊武器4種を含む）で、すべての値が一致した（✅ reserch/2026-10-07_special-weapons.md）
 */
type BuildCommon = {
  /** +0x18 武器種 */
  type: number;
  /** +0x02 刃の ID。特殊武器は特殊武器の刃の ID */
  blade: number;
  /** +0x6C 名前の番号（特殊武器は +0x1A にも入る） */
  nameNo: number;
  /** +0x1C の値（意味は ❓） */
  flag22: number;
  /** +0x0A〜+0x0F 固有武器の6バイト（u16 × 3）。null は固有武器でない（FF × 6） */
  unique: readonly [number, number, number] | null;
};
export type WeaponBuild =
  | (BuildCommon & { kind: "normal"; sheath: number; guard: number; grip: number })
  /** 特殊武器。X・鍔・柄は 0xFFFF */
  | (BuildCommon & { kind: "special" });

export type WeaponIdOption = { id: number; name: WeaponKey | null; build?: WeaponBuild };

export const CUSTOM_WEAPON_ID = 0xffff;

type CompleteRow = (typeof COMPLETE_TABLE)[keyof typeof COMPLETE_TABLE];

/** "41 02 0A 00 61 00" → [0x241, 0x0A, 0x61]。空は null（固有武器でない）。空か 6 B かは生成時に検証済み */
function uniqueOf(b: readonly number[]): BuildCommon["unique"] {
  if (b.length === 0) return null;
  return [b[0] | (b[1] << 8), b[2] | (b[3] << 8), b[4] | (b[5] << 8)];
}

function buildOf(r: CompleteRow): WeaponBuild {
  if (r.blade === null || r.name_no === null || r.flag_22 === null || r.weapon_type === null)
    throw new Error(`complete.csv の ${r.id_dec} の部品が読めません`);
  const type = r.weapon_type;
  const blade = r.blade;
  const tail = { nameNo: r.name_no, flag22: r.flag_22, unique: uniqueOf(r.unique_bytes) };
  if (r.guard === null) return { kind: "special", type, blade, ...tail };
  const parts: { sheath: number | null; grip: number | null } = { sheath: r.sheath_x, grip: r.grip };
  if (parts.sheath === null || parts.grip === null) throw new Error(`complete.csv の ${r.id_dec} の鞘・柄が読めません`);
  return { kind: "normal", type, blade, sheath: parts.sheath, guard: r.guard, grip: parts.grip, ...tail };
}

/** 完成武器ID の順。最後に自作 */
export const WEAPON_IDS: readonly WeaponIdOption[] = Object.values(COMPLETE_TABLE).map((r) =>
  r.id_dec === CUSTOM_WEAPON_ID
    ? { id: CUSTOM_WEAPON_ID, name: null }
    : { id: r.id_dec, name: weaponKeyOf(r.name_ja, "complete.csv"), build: buildOf(r) },
);

/** 完成武器ID の表示名。自作は「自作」 */
export function weaponIdName(option: WeaponIdOption, lang: Lang = getLanguage()): string {
  if (option.name === null) return lang === "en" ? "Custom" : "自作";
  return weaponName(option.name, lang);
}
