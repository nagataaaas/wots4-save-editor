// 装飾品と特典解除のマスターデータ。docs/save_format/datatable/accessory/accessory.csv・unlock/unlock.csv をビルド時に読み込む（表を二重に持たない）。
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
import accessoryCsv from "../../../docs/save_format/datatable/accessory/accessory.csv?raw";
import clothCsv from "../../../docs/save_format/datatable/appearance/cloth.csv?raw";
import unlockCsv from "../../../docs/save_format/datatable/unlock/unlock.csv?raw";
import { parseCsv } from "./item-names";

export type AccessoryEntry = {
  id: number;
  ja: string;
  en: string;
  descJa: string;
  part: string;
  dlc: number | null;
  shop: boolean;
  menuOrder: number;
};

export type UnlockEntry = {
  id: number;
  ja: string;
  en: string;
  category: string;
  conditionJa: string;
  effectJa: string;
};

function table(text: string, file: string): { col: (name: string) => number; rows: string[][] } {
  const [header, ...rows] = parseCsv(text.replace(/^﻿/, ""));
  return {
    col: (name) => {
      const i = header.indexOf(name);
      if (i < 0) throw new Error(`${file} に ${name} 列がありません`);
      return i;
    },
    rows: rows.filter((r) => r.length > 1),
  };
}

function loadAccessories(text: string): AccessoryEntry[] {
  const { col, rows } = table(text, "accessory.csv");
  const c = {
    id: col("id_dec"),
    ja: col("name_ja"),
    en: col("name_en"),
    descJa: col("description_ja"),
    part: col("part"),
    dlc: col("dlc"),
    shop: col("shop"),
    menuOrder: col("menu_order"),
  };
  return rows.map((r) => ({
    id: Number(r[c.id]),
    ja: r[c.ja],
    en: r[c.en],
    descJa: r[c.descJa],
    part: r[c.part],
    dlc: r[c.dlc] === "" ? null : Number(r[c.dlc]),
    shop: r[c.shop] === "1",
    menuOrder: Number(r[c.menuOrder]),
  }));
}

function loadUnlocks(text: string): UnlockEntry[] {
  const { col, rows } = table(text, "unlock.csv");
  const c = {
    id: col("id_dec"),
    ja: col("name_ja"),
    en: col("name_en"),
    category: col("category"),
    conditionJa: col("condition_ja"),
    effectJa: col("effect_ja"),
  };
  return rows.map((r) => ({
    id: Number(r[c.id]),
    ja: r[c.ja],
    en: r[c.en],
    category: r[c.category],
    conditionJa: r[c.conditionJa],
    effectJa: r[c.effectJa],
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

function loadClothes(text: string): ClothEntry[] {
  const { col, rows } = table(text, "cloth.csv");
  const c = { id: col("id_dec"), ja: col("name_ja"), en: col("name_en"), category: col("category"), dlc: col("dlc") };
  return rows.map((r) => ({
    id: Number(r[c.id]),
    ja: r[c.ja],
    en: r[c.en],
    category: r[c.category],
    dlc: r[c.dlc] === "" ? null : Number(r[c.dlc]),
  }));
}

/** 番号順 */
export const CLOTHES: readonly ClothEntry[] = loadClothes(clothCsv);

/** ID 順 */
export const ACCESSORIES: readonly AccessoryEntry[] = loadAccessories(accessoryCsv);

/** 番号順（先頭16件・31・101 ✅ [U] 2026-10-07、ほかは 🔶 U-17。31 の書き込み反映は 🔶 U-17） */
export const UNLOCKS: readonly UnlockEntry[] = loadUnlocks(unlockCsv);

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
