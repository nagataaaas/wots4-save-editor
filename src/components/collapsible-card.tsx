import { ChevronRight } from 'lucide-react'
import { useState, type MouseEvent, type ReactNode } from 'react'
import { AnchorScope, useAnchor } from '@/lib/navigation-context'
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
  const { id, targeted, seq } = useAnchor(anchor)
  const [open, setOpen] = useState(defaultOpen || targeted)
  // 画面にいるまま同じカードの中へもう一度リンクしたときも開く（リンクごとに1回）
  const [openedFor, setOpenedFor] = useState(seq)
  if (targeted && openedFor !== seq) {
    setOpenedFor(seq)
    setOpen(true)
  }

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
          <CollapsibleTrigger className="group flex flex-wrap items-center gap-2 text-left hover:underline">
            <ChevronRight
              className="size-4 shrink-0 transition-transform group-data-panel-open:rotate-90"
              aria-hidden
            />
            {title}
          </CollapsibleTrigger>
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
