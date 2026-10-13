import type { ReactNode } from 'react'
import { InfoTip } from '@/components/info-tip'
import { WarningTip } from '@/components/warning-tip'
import { Label } from '@/components/ui/label'
import { SearchField } from '@/lib/search-context'

/**
 * 欄の下の段。読み取り専用ならその理由だけを出す。
 * hint（範囲など）は常に出し、エラーはその下に足す。warning は項目名の横のアイコン（WarningTip）を置けない欄でだけ渡す
 */
export function FieldFeedback({ problem, hint, error, warning, className = '' }: {
  problem?: string | null; hint?: ReactNode; error?: string | null; warning?: string | null; className?: string
}) {
  if (problem) return <p className={`text-muted-foreground text-xs ${className}`}>読み取り専用：{problem}</p>
  return <>
    {hint && <p className={`text-muted-foreground text-xs ${className}`}>{hint}</p>}
    {error ? <p className={`text-destructive text-xs ${className}`}>{error}</p>
      : warning && <p className={`text-xs text-amber-600 dark:text-amber-400 ${className}`}>⚠ {warning}</p>}
  </>
}

/** 入力欄の共通の枠。項目名・丸ハテナ・警告・badges の行、入力（children）、下の段の順に並べる */
export function FieldShell({ label, offset, htmlFor, note, warning, badges, problem, hint, error, children }: {
  label: string; offset: number; htmlFor?: string; note?: ReactNode; warning?: string | null;
  badges?: ReactNode; problem: string | null; hint?: ReactNode; error?: string | null; children: ReactNode
}) {
  return <SearchField label={label} className="flex flex-col gap-1.5">
    <div className="flex flex-wrap items-center gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      <InfoTip offset={offset}>{note}</InfoTip>
      {!problem && <WarningTip warning={warning} />}
      {badges}
    </div>
    {children}
    <FieldFeedback problem={problem} hint={hint} error={error} />
  </SearchField>
}
