import { type MouseEvent, type ReactNode } from 'react'
import { AnchorLink, ToggleChevron } from '@/components/anchor-link'
import { AnchorScope, useAnchoredOpen } from '@/lib/navigation-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

/** 開閉で高さが伸び縮みする中身（Base UI の --collapsible-panel-height を transition する。帯刀の武器カードと同じ） */
const COLLAPSIBLE_ANIMATION =
  'h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0'

/** クリックがボタン（開閉の Trigger、丸ハテナなど）の上か。ボタンは自分の動作だけをさせる */
const isOnButton = (e: MouseEvent<HTMLElement>) => e.target instanceof Element && e.target.closest('button') !== null

type Props = {
  /** リンク先にするときの名前（useAnchor）。リンク先がこのカードかその中なら開き、このカードならスクロールする */
  anchor: string
  /** 開閉の Trigger に入れる見出し */
  title: ReactNode
  /** 見出しの横に置く丸ハテナ・バッジなど（Trigger の外） */
  extra?: ReactNode
  description?: ReactNode
  defaultOpen?: boolean
  contentClassName?: string
  children: ReactNode
}

/**
 * 開閉できるカード（帯刀の武器カードと同じ動き）。
 * 閉じているときはカード全体、開いているときは見出しの欄で開閉する。キーボードでは見出しの Trigger で開閉できる
 */
export function CollapsibleCard({
  anchor,
  title,
  extra,
  description,
  defaultOpen = false,
  contentClassName,
  children,
}: Props) {
  const { id, open, setOpen } = useAnchoredOpen(anchor, defaultOpen)

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      render={
        <Card
          id={id}
          className={open ? 'scroll-mt-4 gap-0' : 'hover:bg-muted/40 scroll-mt-4 cursor-pointer gap-0'}
          onClick={(e) => {
            if (!open && !isOnButton(e)) setOpen(true)
          }}
        />
      }
    >
      <CardHeader
        className={open ? 'cursor-pointer' : undefined}
        onClick={(e) => {
          if (open && !isOnButton(e)) setOpen(false)
        }}
      >
        <CardTitle className="flex flex-wrap items-center gap-2">
          {/* 三角の開閉はカード・見出しの欄のクリックに任せる */}
          <ToggleChevron open={open} />
          <AnchorLink id={id} />
          <CollapsibleTrigger className="flex flex-wrap items-center gap-2 text-left hover:underline">{title}</CollapsibleTrigger>
          {extra}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CollapsibleContent className={COLLAPSIBLE_ANIMATION}>
        <CardContent className={`pt-6 ${contentClassName ?? ''}`}>
          <AnchorScope.Provider value={id}>{children}</AnchorScope.Provider>
        </CardContent>
      </CollapsibleContent>
    </Collapsible>
  )
}
