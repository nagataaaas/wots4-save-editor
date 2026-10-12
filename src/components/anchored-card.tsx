import type { ComponentProps } from 'react'
import { Card } from '@/components/ui/card'
import { AnchorScope, useAnchor } from '@/lib/navigation-context'
import { SearchPath } from '@/lib/search-context'
import { useSearchBox } from '@/lib/search-hooks'
import { cn } from '@/lib/utils'

/**
 * 開閉しないカード。anchor はリンク先にするときの名前（useAnchor）で、URL（#/画面/anchor）から開くとここまでスクロールする。
 * 中の箱の anchor はこのカードの anchor の下につなぐ。見出し（CardTitle）の先頭に ScopeAnchorLink を置く。
 * searchLabel は検索で引く名前（見出しと同じ文字列）
 */
export function AnchoredCard({
  anchor,
  searchLabel,
  className,
  children,
  ...props
}: ComponentProps<typeof Card> & { anchor: string; searchLabel: string }) {
  const { id } = useAnchor(anchor)
  useSearchBox(id, searchLabel)
  return (
    <Card id={id} className={cn('scroll-mt-4', className)} {...props}>
      <AnchorScope.Provider value={id}>
        <SearchPath label={searchLabel}>{children}</SearchPath>
      </AnchorScope.Provider>
    </Card>
  )
}
