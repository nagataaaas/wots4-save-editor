import type { ComponentProps, ReactNode } from 'react'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ScopeAnchorLink } from '@/components/anchor-link'
import { AnchorScope, useAnchor } from '@/lib/navigation-context'
import { SearchPath } from '@/lib/search-context'
import { useSearchBox } from '@/lib/search-hooks'
import { cn } from '@/lib/utils'

type HeaderProps = {
  /** 見出しの横に置く丸ハテナ・バッジなど */
  extra?: ReactNode
  description?: ReactNode
  /** 説明の下に置くもの（警告の一覧など） */
  headerExtra?: ReactNode
}

/** title が文字列ならそれを検索で引く名前にする。文字列でない title や、見出しを自分で描くときは searchLabel が要る */
type TitleProps = { title: string; searchLabel?: string } | { title?: ReactNode; searchLabel: string }

/**
 * 開閉しないカード。anchor はリンク先にするときの名前（useAnchor）で、URL（#/画面/anchor）から開くとここまでスクロールする。
 * 中の箱の anchor はこのカードの anchor の下につなぐ。
 * title を渡すと、先頭に ScopeAnchorLink を置いた見出しと説明を描く。渡さないときは、子で見出しの先頭に ScopeAnchorLink を置く
 */
export function AnchoredCard({
  anchor,
  title,
  description,
  extra,
  headerExtra,
  searchLabel = typeof title === 'string' ? title : undefined,
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof Card>, 'title'> & { anchor: string } & HeaderProps & TitleProps) {
  const { id } = useAnchor(anchor)
  useSearchBox(id, searchLabel)
  return (
    <Card id={id} className={cn('scroll-mt-4', className)} {...props}>
      <AnchorScope.Provider value={id}>
        <SearchPath label={searchLabel}>
          {title && (
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                <ScopeAnchorLink />
                {title}
                {extra}
              </CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
              {headerExtra}
            </CardHeader>
          )}
          {children}
        </SearchPath>
      </AnchorScope.Provider>
    </Card>
  )
}
