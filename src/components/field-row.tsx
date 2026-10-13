import { useId, type ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { InfoTip } from '@/components/info-tip'
import { WarningTip } from '@/components/warning-tip'
import { Label } from '@/components/ui/label'
import { SearchField } from '@/lib/search-context'
import { useFieldDraft, type ParseResult } from '@/lib/use-field-draft'

export type { ParseResult } from '@/lib/use-field-draft'

type Props<T> = {
  label: string
  offset: number
  badges?: ReactNode
  /** null はセーブ未読み込み。入力欄を無効にして空欄で表示する */
  value: T | null
  /** 妥当性検証に落ちた理由。あれば読み取り専用 */
  problem: string | null
  /** 編集はできるが注意が必要な理由（正規範囲外の値など）。項目名の横の警告アイコンにホバーで表示する */
  warning?: string | null
  format: (value: T) => string
  /** 入力欄にフォーカスがないときの表示（「？」など）。フォーカスすると format の値で編集する */
  display?: (value: T) => string
  parse: (input: string) => ParseResult<T>
  /** 入力が妥当で、現在値と異なるときだけ呼ばれる */
  apply: (value: T) => void
  inputMode?: 'numeric' | 'decimal' | 'text'
  /** バリデーション（文字数・数値の範囲など）だけを簡潔に書く。下に常に表示する */
  hint?: ReactNode
  /** 備考。項目名の端の丸ハテナにホバーで表示する */
  note?: ReactNode
}

/**
 * 1フィールド分の入力欄。入力途中の文字列は手元に持ち、妥当な値になったときだけセーブに反映する。
 * フォーカスが外れているときは最新の値を表示し、読み込み直し・位置の変更で入力途中の値を捨てる。
 */
export function FieldRow<T>({ label, offset, badges, value, problem, warning, format, display, parse, apply, inputMode, hint, note }: Props<T>) {
  const id = useId()
  const draft = useFieldDraft({ value, format, parse, apply, identity: offset })
  const { error, focused } = draft

  return (
    <SearchField label={label} className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={id}>{label}</Label>
        <InfoTip offset={offset}>{note}</InfoTip>
        {!problem && <WarningTip warning={warning} />}
        {badges}
      </div>
      <Input
        id={id}
        value={
          value === null ? '' : display && !focused ? display(value) : problem ? format(value) : draft.input
        }
        disabled={value === null}
        placeholder={value === null ? '未読み込み' : undefined}
        readOnly={problem !== null}
        inputMode={inputMode}
        aria-invalid={error !== null}
        onChange={(e) => draft.change(e.target.value)}
        onFocus={draft.focus}
        onBlur={draft.blur}
      />
      {problem ? (
        <p className="text-muted-foreground text-xs">読み取り専用：{problem}</p>
      ) : (
        // hint（範囲など）は常に出し、エラーはその下に足す。警告は項目名の横のアイコン（WarningTip）
        <>
          {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
          {error && <p className="text-destructive text-xs">{error}</p>}
        </>
      )}
    </SearchField>
  )
}
