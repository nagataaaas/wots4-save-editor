import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import type { Section } from '@/features/sections'
import { useSave } from '@/lib/save-context'

/** 各機能の画面ができるまでの仮表示 */
export function SectionPlaceholder({ section }: { section: Section }) {
  const { save } = useSave()

  return (
    <div className="flex flex-col gap-4">
      {!save && (
        <Alert>
          <AlertTitle>セーブファイルが読み込まれていません</AlertTitle>
          <AlertDescription>サイドバーの「ファイルを開く」から読み込んでください。</AlertDescription>
        </Alert>
      )}
      <Alert>
        <AlertTitle>「{section.label}」は未実装です</AlertTitle>
        <AlertDescription>解析ノート：{section.note}</AlertDescription>
      </Alert>
    </div>
  )
}
