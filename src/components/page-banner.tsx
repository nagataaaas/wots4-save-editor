import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { tr } from '@/lib/i18n'

/** 画面・カードの上部に出す「読み込めません」「読み取り専用」。書き込みのエラーは操作した欄の近くに出す（WriteError） */
export function PageBanner({ error, problem, className }: { error?: string | null; problem?: string | null; className?: string }) {
  return <>
    {error && <Alert variant="destructive" className={className}><AlertTitle>{tr({ ja: '読み込めません', en: 'Cannot read' })}</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
    {!error && problem && <Alert variant="destructive" className={className}><AlertTitle>{tr({ ja: '読み取り専用', en: 'Read-only' })}</AlertTitle><AlertDescription>{problem}</AlertDescription></Alert>}
  </>
}
