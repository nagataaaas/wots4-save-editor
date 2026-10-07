// アイテムのマスターデータ。docs/save_format/datatable/item/item.csv をビルド時に読み込む（表を二重に持たない）。
// ID 0x00〜0xF1、欠番なし。ほかのモジュールに依存しない。
//
// - ja・en：名前。🟢 ゲーム内の表記のまま。同じ名前が複数の ID にあるもの（部品箱・茶器・伝説の魚など）は、
//   表示のときに itemDisplayName で ID を添えて見分ける
// - descJa・descEn：説明文 🟢 ゲーム内の表記のまま
// - obtain：0＝道具として手に入る、1＝その場で使う（料理屋の料理・宿）、2＝手に入る経路がない（未使用とみられる）🟢
// - maxStack：手持ちの1枠にまとめて持てる最大数 🟢。ほとんど 1。箪笥はこの上限を超えて入る（[U] sample）
import itemCsv from "../../../docs/save_format/datatable/item/item.csv?raw";

/** 0＝道具として手に入る、1＝その場で使う、2＝手に入る経路がない */
export type ItemObtain = 0 | 1 | 2;

export type ItemEntry = {
  id: number;
  ja: string;
  en: string;
  descJa: string;
  descEn: string;
  obtain: ItemObtain;
  maxStack: number;
};

export const ITEM_OBTAIN_LABELS: Record<ItemObtain, string> = {
  0: "道具",
  1: "その場で使う",
  2: "手に入る経路がない",
};

/** RFC 4180 の CSV を行・列に分ける（"..." の中のカンマ・改行・"" に対応） */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function loadItems(text: string): ItemEntry[] {
  const [header, ...rows] = parseCsv(text.replace(/^﻿/, ""));
  const col = (name: string) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`item.csv に ${name} 列がありません`);
    return i;
  };
  const c = {
    id: col("id_dec"),
    ja: col("name_ja"),
    en: col("name_en"),
    descJa: col("description_ja"),
    descEn: col("description_en"),
    obtain: col("obtain"),
    maxStack: col("max_stack"),
  };
  return rows
    .filter((r) => r.length > 1 && r[c.id] !== "65535") // 0xFFFF は「なし」で、アイテムではない
    .map((r) => {
      const obtain = Number(r[c.obtain]);
      if (obtain !== 0 && obtain !== 1 && obtain !== 2) throw new Error(`item.csv の obtain が不正です: ${r[c.id]}`);
      return {
        id: Number(r[c.id]),
        ja: r[c.ja],
        en: r[c.en],
        descJa: r[c.descJa],
        descEn: r[c.descEn],
        obtain,
        maxStack: Number(r[c.maxStack]),
      };
    });
}

export const ITEMS: readonly ItemEntry[] = loadItems(itemCsv);

const BY_ID = new Map(ITEMS.map((it) => [it.id, it]));

export function findItem(id: number): ItemEntry | undefined {
  return BY_ID.get(id);
}

const NAME_COUNT = new Map<string, number>();
for (const it of ITEMS) NAME_COUNT.set(it.ja, (NAME_COUNT.get(it.ja) ?? 0) + 1);

/** 表示名。同じ名前が複数の ID にあるときは「（0x1C）」のように ID を添える */
export function itemDisplayName(it: ItemEntry): string {
  if ((NAME_COUNT.get(it.ja) ?? 0) <= 1) return it.ja;
  return `${it.ja}（0x${it.id.toString(16).toUpperCase().padStart(2, "0")}）`;
}
