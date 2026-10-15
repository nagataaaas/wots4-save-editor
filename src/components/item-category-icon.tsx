import { BookOpen, FlaskConical, Package, Utensils, Wine, type LucideIcon } from 'lucide-react'
import { tr } from '@/lib/i18n'
import { EMPTY_ID } from '@/save/item-slot'
import { ITEM_CATEGORY_LABELS, itemCategory, type ItemCategory } from '@/save/master/item-names'

const ICONS: Record<ItemCategory, LucideIcon> = {
  food: Utensils,
  drink: Wine,
  reading: BookOpen,
  usable: FlaskConical,
}

/** 未分類の品は汎用アイコン。空き枠だけ余白にして、名前の左端を揃える。 */
export function ItemCategoryIcon({ id }: { id: number }) {
  if (id === EMPTY_ID) return <span className="size-4 shrink-0" aria-hidden="true" />
  const category = itemCategory(id)
  const Icon = category ? ICONS[category] : Package
  const label = category ? tr(ITEM_CATEGORY_LABELS[category]) : tr({ ja: 'アイテム', en: 'Item' })
  return (
    <span className="text-muted-foreground inline-flex size-4 shrink-0" title={label} data-item-category={category ?? 'item'}>
      <Icon className="size-4" aria-hidden="true" />
      <span className="sr-only">{label}：</span>
    </span>
  )
}
