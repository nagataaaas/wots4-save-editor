import { Alert, AlertDescription, AlertTitle } from './ui/alert'

/** 画面・カードの上部に出す「読み込めません」「読み取り専用」。書き込みのエラーは操作した欄の近くに出す（WriteError） */
export function PageBanner({ error, problem, className }: { error?: string | null; problem?: string | null; className?: string }) {
  return <>
    {error && <Alert variant="destructive" className={className}><AlertTitle>読み込めません</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
    {!error && problem && <Alert variant="destructive" className={className}><AlertTitle>読み取り専用</AlertTitle><AlertDescription>{problem}</AlertDescription></Alert>}
  </>
}
