import { useId, useState, type ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { InfoTip } from '@/components/info-tip'
import { WarningTip } from '@/components/warning-tip'
import { Label } from '@/components/ui/label'

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string }

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
 * 読み込み直したときに入力途中の値を捨てるため、呼び出し側で key に loadId を含めること。
 */
export function FieldRow<T>({ label, offset, badges, value, problem, warning, format, display, parse, apply, inputMode, hint, note }: Props<T>) {
  const id = useId()
  const [draft, setDraft] = useState(() => (value === null ? '' : format(value)))
  const [error, setError] = useState<string | null>(null)
  const [focused, setFocused] = useState(false)

  function handleChange(input: string) {
    if (value === null) return
    setDraft(input)
    const result = parse(input)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(null)
    if (format(result.value) === format(value)) return
    try {
      apply(result.value)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={id}>{label}</Label>
        <InfoTip offset={offset}>{note}</InfoTip>
        {!problem && <WarningTip warning={warning} />}
        {badges}
      </div>
      <Input
        id={id}
        value={
          value === null ? '' : display && !focused ? display(value) : problem ? format(value) : draft
        }
        disabled={value === null}
        placeholder={value === null ? '未読み込み' : undefined}
        readOnly={problem !== null}
        inputMode={inputMode}
        aria-invalid={error !== null}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => {
          setFocused(true)
          if (display && value !== null && !error) setDraft(format(value))
        }}
        onBlur={() => {
          setFocused(false)
          // 不正な入力のまま離れたら、セーブ上の値に戻す
          if (error && value !== null) {
            setDraft(format(value))
            setError(null)
          }
        }}
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
    </div>
  )
}
