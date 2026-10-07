// アイテムのマスターデータ。docs/save_format/datatable/item/item.csv をビルド時に読み込む（表を二重に持たない）。
// ID 0x00〜0xF1、欠番なし。ほかのモジュールに依存しない。
//
// - ja・en：名前。🟢 ゲーム内の表記のまま。同じ名前が複数の ID にあるもの（部品箱・茶器・伝説の魚など）は、
//   表示のときに itemDisplayName で ID を添えて見分ける
// - reading：読み（ひらがな）🟢 ゲーム内の表記のまま。空欄は仮の値だったもの（item.csv の備考）。検索に使う
// - descJa・descEn：説明文 🟢 ゲーム内の表記のまま
// - kind：種別 🟢。0＝道具、1＝料理（料理屋でその場で食べる）、2＝宿（梅・竹・松の間、入院）、3＝なし（手に入る経路がない。未使用とみられる）
// - maxStack：手持ちの1枠にまとめて持てる最大数 🟢。ほとんど 1。箪笥はこの上限を超えて入る（[U] sample）
import itemCsv from "../../../docs/save_format/datatable/item/item.csv?raw";

/** 0＝道具、1＝料理、2＝宿、3＝なし（手に入る経路がない） */
export type ItemKind = 0 | 1 | 2 | 3;

export type ItemEntry = {
  id: number;
  ja: string;
  en: string;
  reading: string;
  descJa: string;
  descEn: string;
  kind: ItemKind;
  maxStack: number;
};

/** 種別の見出し。3 は「なし」だと選択肢の「なし」（空き枠）と紛らわしいので補足をつける */
export const ITEM_KIND_LABELS: Record<ItemKind, string> = {
  0: "道具",
  1: "料理",
  2: "宿",
  3: "なし（手に入る経路がない）",
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
    reading: col("reading"),
    descJa: col("description_ja"),
    descEn: col("description_en"),
    kind: col("kind"),
    maxStack: col("max_stack"),
  };
  return rows
    .filter((r) => r.length > 1 && r[c.id] !== "65535") // 0xFFFF は「なし」で、アイテムではない
    .map((r) => {
      const kind = Number(r[c.kind]);
      if (kind !== 0 && kind !== 1 && kind !== 2 && kind !== 3) throw new Error(`item.csv の kind が不正です: ${r[c.id]}`);
      return {
        id: Number(r[c.id]),
        ja: r[c.ja],
        en: r[c.en],
        reading: r[c.reading],
        descJa: r[c.descJa],
        descEn: r[c.descEn],
        kind,
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
