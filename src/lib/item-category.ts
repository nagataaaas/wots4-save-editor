import { findItem } from '@/save/master/item-names'

/** 表示用の分類。ゲームの kind（道具・料理・宿・なし）や編集可否とは別。 */
export type ItemCategory = 'food' | 'drink' | 'reading' | 'usable'

export const ITEM_CATEGORY_LABELS: Record<ItemCategory, string> = {
  food: '食べ物・食べて使うもの',
  drink: '飲み物',
  reading: '読み物',
  usable: '使用アイテム',
}

// 🔶 CSV の use_action の分類候補（docs/save_format/datatable/item/README.md）。
// 食べる分類には秘薬・魚なども含まれる。名前・説明・IDから独自に分類しない。
const ACTION_CATEGORIES: ReadonlyMap<number, ItemCategory> = new Map([
  [0x00d5, 'food'],
  [0x00d8, 'drink'],
  [0x00d9, 'reading'],
  [0x00f7, 'usable'],
  [0x00f8, 'usable'],
])

/** 未知・空き・未分類の値は null（分類なし）。汎用アイコンの表示は呼び出し側で扱う。 */
export function itemCategory(id: number): ItemCategory | null {
  const item = findItem(id)
  if (!item || item.kind !== 0 || item.useAction === null) return null
  return ACTION_CATEGORIES.get(item.useAction) ?? null
}
