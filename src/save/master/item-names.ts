// アイテムのマスターデータ。docs/save_format/datatable/item/item.csv をビルド時に読み込む（表を二重に持たない）。
// ID 0x00〜0xF1、欠番なし。ほかのモジュールに依存しない。
//
// - 名前（ja・en）と読み（reading）は ITEM_LABELS にだけ持つ。画面やほかのモジュールでは labels.ts の itemLabel(ItemLabelId) で引く
//   - 名前 🟢 ゲーム内の表記のまま。同じ名前が複数の ID にあるもの（部品箱・茶器・伝説の魚など）も、そのまま表示する
//     （同じ名前が複数の ID にあっても ID は添えない。ユーザー判断 2026-10-07）
//   - 読み（ひらがな）🟢 ゲーム内の表記のまま。空欄は仮の値だったもの（item.csv の備考）。検索に使う
// - descJa・descEn：説明文 🟢 ゲーム内の表記のまま
// - kind：種別 🟢。0＝道具、1＝料理（料理屋でその場で食べる）、2＝宿（梅・竹・松の間、入院）、3＝なし（手に入る経路がない。未使用とみられる）
// - maxStack：手持ちの1枠にまとめて持てる最大数 🟢。ほとんど 1。箪笥はこの上限を超えて入る（[U] sample）
import itemCsv from "../../../docs/save_format/datatable/item/item.csv?raw";
import { itemId, itemLabelId, type ItemId, type ItemLabelId, type LocalizedLabel } from "./label-types";

/** 0＝道具、1＝料理、2＝宿、3＝なし（手に入る経路がない） */
export type ItemKind = 0 | 1 | 2 | 3;

export type ItemEntry = {
  id: ItemId;
  labelId: ItemLabelId;
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

function loadItems(text: string): { entries: ItemEntry[]; labels: Map<ItemLabelId, LocalizedLabel> } {
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
  const entries: ItemEntry[] = [];
  const labels = new Map<ItemLabelId, LocalizedLabel>();
  // 0xFFFF は「なし」で、アイテムではない
  for (const r of rows.filter((r) => r.length > 1 && r[c.id] !== "65535")) {
    const kind = Number(r[c.kind]);
    if (kind !== 0 && kind !== 1 && kind !== 2 && kind !== 3) throw new Error(`item.csv の kind が不正です: ${r[c.id]}`);
    const id = Number(r[c.id]);
    entries.push({
      id: itemId(id),
      labelId: itemLabelId(id),
      descJa: r[c.descJa],
      descEn: r[c.descEn],
      kind,
      maxStack: Number(r[c.maxStack]),
    });
    labels.set(itemLabelId(id), { ja: r[c.ja], en: r[c.en], reading: r[c.reading] });
  }
  return { entries, labels };
}

const loaded = loadItems(itemCsv);

export const ITEMS: readonly ItemEntry[] = loaded.entries;

/** アイテムの表示名（日本語・英語・読み） */
export const ITEM_LABELS: ReadonlyMap<ItemLabelId, LocalizedLabel> = loaded.labels;

const BY_ID = new Map<number, ItemEntry>(ITEMS.map((it) => [it.id, it]));

export function findItem(id: number): ItemEntry | undefined {
  return BY_ID.get(id);
}
