import { type ReactNode } from 'react'
import { AnchorLink, ToggleChevron } from '@/components/anchor-link'
import { DisclosureContent } from '@/components/disclosure-content'
import { isOnButton } from '@/lib/click-target'
import { useAnchoredOpen } from '@/lib/navigation-context'
import { useSearchBox } from '@/lib/search-hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleTrigger } from '@/components/ui/collapsible'

type Props = {
  /** リンク先にするときの名前（useAnchor）。リンク先がこのカードかその中なら開き、このカードならスクロールする */
  anchor: string
  /** 開閉の Trigger に入れる見出し。関数なら開閉の状態で描き分ける */
  title: ReactNode | ((open: boolean) => ReactNode)
  /** 検索で引く名前。title が文字列でないときに渡す（文字列ならそれを使う） */
  searchLabel?: string
  /** 見出しの横に置く丸ハテナ・バッジなど（Trigger の外） */
  extra?: ReactNode
  /** 見出しの下・説明の上に、閉じていても出すもの（帯刀の武器の概要など） */
  headerExtra?: ReactNode
  description?: ReactNode
  defaultOpen?: boolean
  contentClassName?: string
  children: ReactNode
}

/**
 * 開閉できるカード（帯刀の武器カードと同じ動き）。
 * 閉じているときはカード全体、開いているときは見出しの欄で開閉する（ユーザー判断 2026-10-05）。キーボードでは見出しの Trigger で開閉できる
 */
export function CollapsibleCard({
  anchor,
  title,
  searchLabel = typeof title === 'string' ? title : undefined,
  extra,
  description,
  headerExtra,
  defaultOpen = false,
  contentClassName,
  children,
}: Props) {
  const { id, ref, open, setOpen } = useAnchoredOpen(anchor, defaultOpen)
  useSearchBox(id, searchLabel)

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      render={
        <Card
          id={id}
          ref={ref}
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
          <CollapsibleTrigger className="flex flex-wrap items-center gap-2 text-left hover:underline">
            {typeof title === 'function' ? title(open) : title}
          </CollapsibleTrigger>
          {extra}
        </CardTitle>
        {headerExtra}
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <DisclosureContent id={id} searchLabel={searchLabel}>
        <CardContent className={`pt-6 ${contentClassName ?? ''}`}>{children}</CardContent>
      </DisclosureContent>
    </Collapsible>
  )
}
