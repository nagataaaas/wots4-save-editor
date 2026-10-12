import type { ComponentProps } from 'react'
import { AnchorLink, CARD_ANCHOR_LINK_CLASS } from '@/components/anchor-link'
import { Card } from '@/components/ui/card'
import { AnchorScope, useAnchor } from '@/lib/navigation-context'
import { cn } from '@/lib/utils'

/**
 * 開閉しないカード。anchor はリンク先にするときの名前（useAnchor）で、URL（#/画面/anchor）から開くとここまでスクロールする。
 * 中の箱の anchor はこのカードの anchor の下につなぐ
 */
export function AnchoredCard({ anchor, className, children, ...props }: ComponentProps<typeof Card> & { anchor: string }) {
  const { id } = useAnchor(anchor)
  return (
    <Card id={id} className={cn('relative scroll-mt-4', className)} {...props}>
      <AnchorLink id={id} className={CARD_ANCHOR_LINK_CLASS} />
      <AnchorScope.Provider value={id}>{children}</AnchorScope.Provider>
    </Card>
  )
}
