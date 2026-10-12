import { ChevronRight, Hash } from 'lucide-react'
import { useContext } from 'react'
import { AnchorScope, useNavigation } from '@/lib/navigation-context'
import { formatHash } from '@/lib/route'
import { cn } from '@/lib/utils'

/**
 * 箱へのリンク（#/画面/箱の anchor）。見出しの行の中、開閉の三角の右・見出しの左に置く。
 * 押すと URL がこの箱のものになる（hashchange で App が箱を開いてスクロールする）。右クリックでリンクを取れる。
 * 置いた場所のクリック（カードの開閉など）には伝えない。リンクはボタンの中に置けないので、開閉の Trigger の外に置く
 */
export function AnchorLink({ id, className }: { id: string; className?: string }) {
  const { section } = useNavigation()
  return (
    <a
      href={formatHash({ section, anchor: id })}
      onClick={(e) => e.stopPropagation()}
      aria-label="この欄へのリンク"
      title="この欄へのリンク"
      className={cn(
        'text-muted-foreground/40 hover:text-foreground focus-visible:text-foreground inline-flex size-4 shrink-0 items-center justify-center rounded-sm',
        className,
      )}
    >
      <Hash className="size-3.5" aria-hidden />
    </a>
  )
}

/** いちばん内側の箱（AnchoredCard など、AnchorScope を渡す箱）へのリンク。カードの見出しの先頭に置く */
export function ScopeAnchorLink({ className }: { className?: string }) {
  const id = useContext(AnchorScope)
  return <AnchorLink id={id} className={className} />
}

/**
 * 開閉の三角。リンクを三角と見出しのあいだに置くため、Trigger の外に置く（開いていると下向き）。
 * 押したときの開閉は onToggle か、置いた場所のクリック（カードの見出しの欄など）に任せる
 */
export function ToggleChevron({ open, onToggle }: { open: boolean; onToggle?: () => void }) {
  return (
    <ChevronRight
      className={cn('size-4 shrink-0 cursor-pointer transition-transform', open && 'rotate-90')}
      aria-hidden
      onClick={onToggle}
    />
  )
}
