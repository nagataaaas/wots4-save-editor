import type { ReactNode } from 'react'
import { CircleQuestionMark } from 'lucide-react'
import { LazyTip } from '@/components/lazy-tip'
import { formatOffset } from '@/lib/format'
import { tr } from '@/lib/i18n'

/** 項目名の端に置く丸ハテナ。オフセットや備考をホバーで表示する */
export function InfoTip({ offset, children }: { offset?: ReactNode; children?: ReactNode }) {
  if (offset === undefined && !children) return null
  return (
    <LazyTip
      className="text-muted-foreground hover:text-foreground inline-flex"
      aria-label={tr({ ja: '補足', en: 'More info' })}
      contentClassName="flex max-w-xs flex-col gap-1"
      content={
        <>
          {offset !== undefined && (
            <span className="font-mono">{typeof offset === 'number' ? formatOffset(offset) : offset}</span>
          )}
          {children && <span>{children}</span>}
        </>
      }
    >
      <CircleQuestionMark className="size-3.5" />
    </LazyTip>
  )
}
