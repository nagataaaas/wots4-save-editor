import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { tr } from '@/lib/i18n'
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
      <AlertTitle>{tr({ ja: 'セーブファイルが読み込まれていません', en: 'No save file loaded' })}</AlertTitle>
      <AlertDescription>
        {tr({
          ja: 'サイドバーの「ファイルを開く」から読み込むと、各項目を編集できます。',
          en: 'Load a save with "Open File" in the sidebar to edit each item.',
        })}
      </AlertDescription>
    </Alert>
  )
}
