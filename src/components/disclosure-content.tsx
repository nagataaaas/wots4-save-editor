import type { ReactNode } from 'react'
import { CollapsibleContent } from '@/components/ui/collapsible'
import { AnchorScope } from '@/lib/navigation-context'
import { SearchPath } from '@/lib/search-context'
import { cn } from '@/lib/utils'

const ANIMATION = 'h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0'

/** 中身を開閉し、子の検索とリンクをこのまとまりへつなぐ。余白は内側の要素で取る。 */
export function DisclosureContent({ id, searchLabel, className, children }: {
  id: string; searchLabel?: string; className?: string; children: ReactNode
}) {
  return <CollapsibleContent className={cn(ANIMATION, className)}>
    <AnchorScope.Provider value={id}>
      <SearchPath label={searchLabel}>{children}</SearchPath>
    </AnchorScope.Provider>
  </CollapsibleContent>
}
