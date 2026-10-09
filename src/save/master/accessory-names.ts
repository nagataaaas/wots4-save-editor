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
import { UNLOCK_TABLE } from "./dataset/unlock";

export type AccessoryEntry = {
  id: number;
  ja: string;
  en: string;
  descJa: string;
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
};

function loadAccessories(): AccessoryEntry[] {
  return Object.values(ACCESSORY_TABLE).map((r) => ({
    id: r.id_dec,
    ja: r.name_ja,
    en: r.name_en,
    descJa: r.description_ja,
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
  }));
}

export type ClothEntry = {
  id: number;
  ja: string;
  en: string;
  /** 上半身・下半身・足元・小物（複数の部品が入る番号は「・」でつなぐ） */
  category: string;
  dlc: number | null;
};

function loadClothes(): ClothEntry[] {
  return Object.values(CLOTH_TABLE).map((r) => ({
    id: r.id_dec,
    ja: r.name_ja,
    en: r.name_en,
    category: r.category,
    dlc: r.dlc,
  }));
}

/** 番号順 */
export const CLOTHES: readonly ClothEntry[] = loadClothes();

/** ID 順 */
export const ACCESSORIES: readonly AccessoryEntry[] = loadAccessories();

/** 番号順（先頭16件・31・101 ✅ [U] 2026-10-07、ほかは 🔶 U-17。31 の書き込み反映は 🔶 U-17） */
export const UNLOCKS: readonly UnlockEntry[] = loadUnlocks();

/** 付ける場所の表示名 */
export const ACCESSORY_PART_LABELS: Record<string, string> = {
  head: "頭",
  chest: "胸・背中",
  main: "腰",
  r_shoulder: "手・肩",
};

/** DLC の番号の表示名 */
export const ACCESSORY_DLC_LABELS: Record<number, string> = {
  0: "DLC 龍馬",
  1: "DLC 新撰組",
  2: "DLC ドナドナ・さよ",
};
