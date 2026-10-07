import type { LucideIcon } from 'lucide-react'

/**
 * 選択肢1つ分（SelectRow・SearchSelectRow で共通）。
 * group があると、同じ group の選択肢を見出しつきでまとめる（最初に出てきた順）。
 * keywords は検索つきの欄（SearchSelectRow）で label のほかに部分一致させる語
 */
export type SelectOption = {
  value: string
  label: string
  disabled?: boolean
  icon?: LucideIcon | null
  group?: string
  keywords?: readonly string[]
  /** 選んだあとの欄に出す名前（group の見出しがないと分からない label のとき）。SelectRow で使う */
  selectedLabel?: string
}

export type OptionGroup = { name: string | undefined; items: SelectOption[] }

/** 選択肢を group ごとにまとめる。group の順は最初に出てきた順 */
export function groupOptions(options: readonly SelectOption[]): OptionGroup[] {
  const groups: OptionGroup[] = []
  for (const o of options) {
    const g = groups.find((x) => x.name === o.group)
    if (g) g.items.push(o)
    else groups.push({ name: o.group, items: [o] })
  }
  return groups
}
