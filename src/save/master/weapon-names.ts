// 武器名のマスターデータ。刃・鍔・柄・鞘・完成武器ID の表（weapon-ids.ts）は、名前をここのキーで参照する。
// docs/save_format/datatable/weapon/complete.csv（完成武器）から生成した dataset/complete.ts を使う（表を二重に持たない）。
// ほかのモジュールに依存しない（依存の順：weapon-names → weapon-ids → weapon → 画面）。
//
// - キー：完成武器の日本語名（complete.csv の name_ja、補足なし）。表示には ja／en を使う
// - ja：日本語の表示名（[TS]・[CT]・ゲーム内の表示）。特殊武器は特殊武器の刃の名前（blade-special.csv。「虎爪（無手）」のように補足つき）。
//   刃・鍔・柄・完成武器の名前は 🟢 で裏付けた（2026-10-07。U-10）
// - en：英語の表示名（complete.csv の name_en）。[CT] の英語名から「Blade - 」などを除いたもの。特殊武器は英語版のゲーム内の表記（🟢）
// - reading：ja の読み（complete.csv の reading。五十音順に並べるため。ユーザー判断 2026-10-05）。刃の読みは全件 🟢 に合わせた
//   （ユーザー判断 2026-10-07。すきもの・りゅうまち・かつかざん など。小書きの仮名を使わない読みもそのまま）。特殊武器は ID 順に並べるので持たない
// - kind：sword（刀）／spear（槍）／special（特殊武器）。槍は刃の [CT] の英語名が「Spear Blade」のもの
//   （ユーザー判断で [CT] を確定扱い 2026-10-05）。焔魔・霜柱・立奈美の刃と藤奈美（武器種 1）はゲーム内でも槍と確認した（[U] 2026-10-05）
//   特殊武器は鍔・柄のない完成武器（刃が blade-special.csv の ID）
import { getLanguage } from "@/lib/i18n";
import { BLADE_TABLE } from "./dataset/blade";
import { BLADE_SPECIAL_TABLE } from "./dataset/blade-special";
import { COMPLETE_TABLE } from "./dataset/complete";

export type Lang = "ja" | "en";

export type WeaponKind = "sword" | "spear" | "special";

export type WeaponNameEntry = {
  ja: string;
  en: string | null;
  reading?: string;
  kind: WeaponKind;
};

type CompleteRow = (typeof COMPLETE_TABLE)[keyof typeof COMPLETE_TABLE];

/** 完成武器の日本語名。自作武器（0xFFFF）は名前を持たない */
export type WeaponKey = Exclude<CompleteRow["name_ja"], "自作">;

const CUSTOM_ROW_ID = 0xffff;

function nameEntry(r: CompleteRow): WeaponNameEntry {
  if (r.guard === null) {
    const special = BLADE_SPECIAL_TABLE[r.blade as keyof typeof BLADE_SPECIAL_TABLE];
    if (!special) throw new Error(`complete.csv の ${r.id_dec} の刃が blade-special.csv にありません: ${r.blade}`);
    return { ja: special.name_ja, en: r.name_en, kind: "special" };
  }
  const blade = BLADE_TABLE[r.blade as keyof typeof BLADE_TABLE];
  if (!blade) throw new Error(`complete.csv の ${r.id_dec} の刃が blade.csv にありません: ${r.blade}`);
  const kind = blade.name_en.startsWith("Spear ") ? "spear" : "sword";
  const reading: string = r.reading;
  return { ja: r.name_ja, en: r.name_en, ...(reading === "" ? {} : { reading }), kind };
}

/** 完成武器ID の順 */
export const WEAPON_NAMES: Readonly<Record<WeaponKey, WeaponNameEntry>> = Object.fromEntries(
  Object.values(COMPLETE_TABLE)
    .filter((r) => r.id_dec !== CUSTOM_ROW_ID)
    .map((r) => [r.name_ja, nameEntry(r)]),
) as Record<WeaponKey, WeaponNameEntry>;

/** 名前がマスターのキーか */
export function isWeaponKey(name: string): name is WeaponKey {
  return Object.hasOwn(WEAPON_NAMES, name);
}

const entry = (key: WeaponKey): WeaponNameEntry => WEAPON_NAMES[key];

/** 表示名。英語名がなければ日本語名で代用する。lang を省くと今の言語 */
export function weaponName(key: WeaponKey, lang: Lang = getLanguage()): string {
  const e = entry(key);
  return lang === "en" ? (e.en ?? e.ja) : e.ja;
}

/** 検索に使う語（読み・ja・en。ないものは除く） */
export function weaponSearchTerms(key: WeaponKey): string[] {
  const e = entry(key);
  return [e.reading, e.ja, e.en].filter((s): s is string => !!s);
}

export function weaponKind(key: WeaponKey): WeaponKind {
  return entry(key).kind;
}

/** 種別の表示名（選択肢の見出しなど）。使う所で tr() するか weaponKindLabel() で引く */
export const WEAPON_KIND_LABELS: Record<WeaponKind, Record<Lang, string>> = {
  sword: { ja: "刀", en: "Sword" },
  spear: { ja: "槍", en: "Spear" },
  special: { ja: "特殊", en: "Special" },
};

/** 種別の表示名。lang を省くと今の言語 */
export function weaponKindLabel(kind: WeaponKind, lang: Lang = getLanguage()): string {
  return WEAPON_KIND_LABELS[kind][lang];
}

const collators: Record<Lang, Intl.Collator> = {
  ja: new Intl.Collator("ja"),
  en: new Intl.Collator("en"),
};

/** 名前順に比べる。ja は読み（なければ ja）の五十音順、en は表示名のアルファベット順。lang を省くと今の言語 */
export function compareWeaponNames(a: WeaponKey, b: WeaponKey, lang: Lang = getLanguage()): number {
  const sortKey = (k: WeaponKey) => (lang === "ja" ? (entry(k).reading ?? entry(k).ja) : weaponName(k, "en"));
  return collators[lang].compare(sortKey(a), sortKey(b));
}
