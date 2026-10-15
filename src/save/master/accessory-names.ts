// 装飾品と特典解除のマスターデータ。docs/save_format/datatable/accessory/accessory.csv・unlock/unlock.csv・appearance/cloth.csv から
// 生成した dataset/*.ts を使う（表を二重に持たない）。
//
// 装飾品（accessory.csv、全行 🟢）：ID 0〜157、欠番なし。ID がそのままセーブの所持フラグの添字（chunks/accessories）
// - ja・en・descJa：名前と説明。ゲーム内の表記のまま
// - part：付ける場所（head・chest・main・r_shoulder）
// - dlc：DLC の番号（null＝本編、0＝龍馬の脇差、1＝新撰組、2＝ドナドナ・さよ）
// - shop：店で買えるか。false は DLC か特典の解除で手に入る物
// - menuOrder：ゲーム内の一覧の並び順（🔶）
//
// 特典解除（unlock.csv）：番号 0〜105。名前・条件・効果は 🟢 ゲーム内の表記のまま。
// この番号がセーブの状態の表の添字と同じかは 🔶 未確認（U-17）
//
// 容姿の服（appearance/cloth.csv、全行 🟢）：服の番号 0〜241 のうち194件。番号がそのまま容姿のビット番号（chunks/appearance）。
// 32〜46・238〜241 はゲーム内で確認（✅ [U] 2026-10-07）
import { ACCESSORY_TABLE } from "./dataset/accessory";
import { CLOTH_TABLE } from "./dataset/cloth";
import { OUTFIT_TABLE } from "./dataset/outfit";
import { UNLOCK_TABLE } from "./dataset/unlock";
import { tr, type Localized } from "@/lib/i18n";

export type AccessoryEntry = {
  id: number;
  ja: string;
  en: string;
  descJa: string;
  descEn: string;
  part: string;
  dlc: number | null;
  shop: boolean;
  menuOrder: number;
  /** 🟢 装着時の標準部位・位置・回転（度）・一様サイズ。セーブには補正を保存する。 */
  defaultAttachment: number;
  defaultPosition: readonly [number, number, number];
  defaultRotation: readonly [number, number, number];
  defaultSize: number;
};

export type UnlockEntry = {
  id: number;
  ja: string;
  en: string;
  category: string;
  conditionJa: string;
  effectJa: string;
  conditionEn: string;
  effectEn: string;
};

function loadAccessories(): AccessoryEntry[] {
  return Object.values(ACCESSORY_TABLE).map((r) => ({
    id: r.id_dec,
    ja: r.name_ja,
    en: r.name_en,
    descJa: r.description_ja,
    descEn: r.description_en,
    part: r.part,
    dlc: r.dlc,
    shop: r.shop === 1,
    menuOrder: r.menu_order,
    defaultAttachment: r.default_attachment_id,
    defaultPosition: [r.default_position_x, r.default_position_y, r.default_position_z],
    defaultRotation: [r.default_rotation_x, r.default_rotation_y, r.default_rotation_z],
    defaultSize: r.default_size,
  }));
}

function loadUnlocks(): UnlockEntry[] {
  return Object.values(UNLOCK_TABLE).map((r) => ({
    id: r.id_dec,
    ja: r.name_ja,
    en: r.name_en,
    category: r.category,
    conditionJa: r.condition_ja,
    effectJa: r.effect_ja,
    conditionEn: r.condition_en,
    effectEn: r.effect_en,
  }));
}

export type ClothEntry = {
  id: number;
  ja: string;
  en: string;
  /** 🟢 説明。複数部品の異なる説明は「 / 」で区切る。説明がない番号は空文字。 */
  descJa: string;
  descEn: string;
  /** 上半身・下半身・足元・小物（複数の部品が入る番号は「・」でつなぐ） */
  category: string;
  dlc: number | null;
};

function loadClothes(): ClothEntry[] {
  return Object.values(CLOTH_TABLE).map((r) => ({
    id: r.id_dec,
    ja: r.name_ja,
    en: r.name_en,
    descJa: r.description_ja,
    descEn: r.description_en,
    category: r.category,
    dlc: r.dlc,
  }));
}

/** 🟢 全身の服の表示名・説明。特典の番号と保存位置との対応は 🔶 U-17 のまま。 */
export function appearanceUnlockInformation(
  entry: UnlockEntry,
): { ja: string; en: string; descriptionJa: string; descriptionEn: string } {
  const outfits = Object.values(OUTFIT_TABLE).filter((r) => r.unlock_id === entry.id);
  if (entry.category !== "服" || outfits.length === 0) {
    return { ja: entry.ja, en: entry.en, descriptionJa: entry.effectJa, descriptionEn: entry.effectEn };
  }
  const joinUnique = (values: string[]) => [...new Set(values)].join(" / ");
  return {
    ja: joinUnique(outfits.map((r) => r.name_ja)),
    en: joinUnique(outfits.map((r) => r.name_en)),
    descriptionJa: joinUnique(outfits.map((r) => r.description_ja)),
    descriptionEn: joinUnique(outfits.map((r) => r.description_en)),
  };
}

/** 番号順 */
export const CLOTHES: readonly ClothEntry[] = loadClothes();

/** ID 順 */
export const ACCESSORIES: readonly AccessoryEntry[] = loadAccessories();

/** 番号順（先頭16件・31・101 ✅ [U] 2026-10-07、ほかは 🔶 U-17。31 の書き込み反映は 🔶 U-17） */
export const UNLOCKS: readonly UnlockEntry[] = loadUnlocks();

/** 付ける場所の表示名 */
export const ACCESSORY_PART_LABELS: Record<string, Localized> = {
  head: { ja: "頭", en: "Head" },
  chest: { ja: "胸・背中", en: "Chest/Back" },
  main: { ja: "腰", en: "Waist" },
  r_shoulder: { ja: "手・肩", en: "Hand/Shoulder" },
};

/** DLC の番号の表示名 */
export const ACCESSORY_DLC_LABELS: Record<number, Localized> = {
  0: { ja: "DLC 龍馬", en: "DLC Ryoma" },
  1: { ja: "DLC 新撰組", en: "DLC Shinsengumi" },
  2: { ja: "DLC ドナドナ・さよ", en: "DLC Dona Dona & Sayo" },
};

/** 特典の種類（unlock.csv の category）と服の部位（cloth.csv の category を「・」で分けたもの）の表示名 */
const CATEGORY_LABELS: Record<string, Localized> = {
  武器箪笥: { ja: "武器箪笥", en: "Weapon Chest" },
  難易度: { ja: "難易度", en: "Difficulty" },
  肌の色: { ja: "肌の色", en: "Skin Color" },
  髪の色: { ja: "髪の色", en: "Hair Color" },
  体型: { ja: "体型", en: "Figure" },
  顔: { ja: "顔", en: "Face" },
  髪型: { ja: "髪型", en: "Hairstyle" },
  服: { ja: "服", en: "Clothes" },
  装飾品: { ja: "装飾品", en: "Accessories" },
  免許: { ja: "免許", en: "Licenses" },
  その他: { ja: "その他", en: "Other" },
  上半身: { ja: "上半身", en: "Upper" },
  下半身: { ja: "下半身", en: "Lower" },
  足元: { ja: "足元", en: "Feet" },
  小物: { ja: "小物", en: "Small items" },
  全身: { ja: "全身", en: "Whole Body" },
};

/** 種類・部位の今の言語の表示名。「・」でつないだものは1つずつ訳す。表にない名前はそのまま */
export function categoryLabel(category: string): string {
  return category
    .split("・")
    .map((c) => (CATEGORY_LABELS[c] ? tr(CATEGORY_LABELS[c]) : c))
    .join(tr({ ja: "・", en: " / " }));
}
