import type { ComponentProps } from 'react'
import { Card } from '@/components/ui/card'
import { AnchorScope, useAnchor } from '@/lib/navigation-context'
import { cn } from '@/lib/utils'

/**
 * 開閉しないカード。anchor はリンク先にするときの名前（useAnchor）で、URL（#/画面/anchor）から開くとここまでスクロールする。
 * 中の箱の anchor はこのカードの anchor の下につなぐ。見出し（CardTitle）の先頭に ScopeAnchorLink を置く
 */
export function AnchoredCard({ anchor, className, children, ...props }: ComponentProps<typeof Card> & { anchor: string }) {
  const { id } = useAnchor(anchor)
  return (
    <Card id={id} className={cn('scroll-mt-4', className)} {...props}>
      <AnchorScope.Provider value={id}>{children}</AnchorScope.Provider>
    </Card>
  )
}
