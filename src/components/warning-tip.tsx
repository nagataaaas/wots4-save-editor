import { TriangleAlert } from 'lucide-react'
import { LazyTip } from '@/components/lazy-tip'

/** 項目名の端に置く警告アイコン。正規範囲外の値など、編集はできるが注意が必要な理由をホバーで表示する */
export function WarningTip({ warning }: { warning: string | null | undefined }) {
  if (!warning) return null
  return (
    <LazyTip
      className="inline-flex text-amber-600 dark:text-amber-400"
      aria-label={`警告：${warning}`}
      contentClassName="max-w-xs"
      content={warning}
    >
      <TriangleAlert className="size-3.5" />
    </LazyTip>
  )
}
