import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import type { Section } from '@/features/sections'

/** 各機能の画面ができるまでの仮表示 */
export function SectionPlaceholder({ section }: { section: Section }) {
  return (
    <div className="flex flex-col gap-4">
      <Alert>
        <AlertTitle>「{section.label}」は未実装です</AlertTitle>
        <AlertDescription>解析ドキュメント：{section.note}</AlertDescription>
      </Alert>
    </div>
  )
}
