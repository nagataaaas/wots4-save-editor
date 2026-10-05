import type { ReactNode } from 'react'
import { CircleQuestionMark } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatOffset } from '@/lib/format'

/** 項目名の端に置く丸ハテナ。オフセットや備考をホバーで表示する */
export function InfoTip({ offset, children }: { offset?: ReactNode; children?: ReactNode }) {
  if (offset === undefined && !children) return null
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="text-muted-foreground hover:text-foreground inline-flex" aria-label="補足">
          <CircleQuestionMark className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="flex max-w-xs flex-col gap-1">
        {offset !== undefined && (
          <span className="font-mono">{typeof offset === 'number' ? formatOffset(offset) : offset}</span>
        )}
        {children && <span>{children}</span>}
      </TooltipContent>
    </Tooltip>
  )
}
