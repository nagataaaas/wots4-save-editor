import { Hash } from 'lucide-react'
import { useNavigation } from '@/lib/navigation-context'
import { formatHash } from '@/lib/route'
import { cn } from '@/lib/utils'

/** カードの左の余白で、見出しの行に並べる位置（カードの上の余白 --card-spacing ＋ 見出しの行の高さとの差） */
export const CARD_ANCHOR_LINK_CLASS = 'absolute top-[calc(var(--card-spacing)+4px)] left-1'

/**
 * 箱へのリンク（#/画面/箱の anchor）。押すと URL がこの箱のものになる（hashchange で App が箱を開いてスクロールする）。
 * 置いた場所のクリック（カードの開閉など）には伝えない
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
