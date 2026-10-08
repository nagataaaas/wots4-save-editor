// アイテムのマスターデータ。docs/save_format/datatable/item/item.csv から生成した dataset/item.ts を使う（表を二重に持たない）。
// ID 0x00〜0xF1、欠番なし。
//
// - 名前（ja・en）と読み（reading）は ITEM_LABELS にだけ持つ。画面やほかのモジュールでは labels.ts の itemLabel(ItemLabelId) で引く
//   - 名前 🟢 ゲーム内の表記のまま。同じ名前が複数の ID にあるもの（部品箱・茶器・伝説の魚など）も、そのまま表示する
//     （同じ名前が複数の ID にあっても ID は添えない。ユーザー判断 2026-10-07）
//   - 読み（ひらがな）🟢 ゲーム内の表記のまま。空欄は仮の値だったもの（item.csv の備考）。検索に使う
// - descJa・descEn：説明文 🟢 ゲーム内の表記のまま
// - kind：種別 🟢。0＝道具、1＝料理（料理屋でその場で食べる）、2＝宿（梅・竹・松の間、入院）、3＝なし（手に入る経路がない。未使用とみられる）
// - maxStack：手持ちの1枠にまとめて持てる最大数 🟢。ほとんど 1。箪笥はこの上限を超えて入る（[U] sample）
import { ITEM_TABLE } from "./dataset/item";
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

// 0xFFFF は「なし」で、アイテムではない
const ROWS = Object.values(ITEM_TABLE).filter((r) => r.id_dec !== 0xffff);

function itemKind(r: (typeof ROWS)[number]): ItemKind {
  const kind: number | null = r.kind;
  if (kind !== 0 && kind !== 1 && kind !== 2 && kind !== 3) throw new Error(`item.csv の kind が不正です: ${r.id_dec}`);
  return kind;
}

export const ITEMS: readonly ItemEntry[] = ROWS.map((r) => ({
  id: itemId(r.id_dec),
  labelId: itemLabelId(r.id_dec),
  descJa: r.description_ja,
  descEn: r.description_en,
  kind: itemKind(r),
  maxStack: r.max_stack,
}));

/** アイテムの表示名（日本語・英語・読み） */
export const ITEM_LABELS: ReadonlyMap<ItemLabelId, LocalizedLabel> = new Map(
  ROWS.map((r) => [itemLabelId(r.id_dec), { ja: r.name_ja, en: r.name_en, reading: r.reading }]),
);

const BY_ID = new Map<number, ItemEntry>(ITEMS.map((it) => [it.id, it]));

export function findItem(id: number): ItemEntry | undefined {
  return BY_ID.get(id);
}
