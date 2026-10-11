import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useSave } from '@/lib/save-context'

/**
 * セーブ未読み込みの案内。App がどのページでも見出しの下に1つだけ出す（各ページでは出さない）。
 * 未読み込みのときの各ページは、読み込み後と同じ構成で描き、値を空・書き込む操作を無効にする（AGENTS.md「セーブ未読み込みのときの表示」）
 */
export function NoSaveNotice() {
  const { save } = useSave()
  if (save) return null
  return (
    <Alert className="mb-4">
      <AlertTitle>セーブファイルが読み込まれていません</AlertTitle>
      <AlertDescription>サイドバーの「ファイルを開く」から読み込むと、各項目を編集できます。</AlertDescription>
    </Alert>
  )
}
