import { useState, type ComponentProps, type ReactNode } from 'react'
import { Tooltip, TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type Props = Omit<ComponentProps<'button'>, 'content'> & {
  /** ホバー・フォーカス中に出す中身 */
  content: ReactNode
  contentClassName?: string
}

/**
 * ホバーかフォーカスをしている間だけ Tooltip を作るボタン。
 * 1ページに Tooltip を数百個並べると初期化だけで描画が重くなるため、ふだんはただのボタンにしておく
 */
export function LazyTip({ content, contentClassName, children, ...buttonProps }: Props) {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null)
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        {...buttonProps}
        ref={setAnchor}
        onPointerEnter={() => setOpen(true)}
        onPointerLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
        }}
      >
        {children}
      </button>
      {/* 開閉はこのボタンのイベントだけで決める（トリガーのない Tooltip は、Base UI がすぐ閉じようとする） */}
      {open && (
        <Tooltip open>
          {/* 矢印がボタンに重なると pointerleave で閉じて開き直すのを繰り返すので、ポインターを通す */}
          <TooltipContent anchor={anchor} className={cn('pointer-events-none', contentClassName)}>
            {content}
          </TooltipContent>
        </Tooltip>
      )}
    </>
  )
}
