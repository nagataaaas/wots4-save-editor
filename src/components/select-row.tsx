import type { LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { InfoTip } from '@/components/info-tip'
import { WarningTip } from '@/components/warning-tip'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/** group があると、同じ group の選択肢を見出しつきでまとめる（最初に出てきた順） */
export type SelectOption = { value: string; label: string; disabled?: boolean; icon?: LucideIcon | null; group?: string }

function groupOptions(options: readonly SelectOption[]): { name: string | undefined; items: SelectOption[] }[] {
  const groups: { name: string | undefined; items: SelectOption[] }[] = []
  for (const o of options) {
    const g = groups.find((x) => x.name === o.group)
    if (g) g.items.push(o)
    else groups.push({ name: o.group, items: [o] })
  }
  return groups
}

function OptionItem({ option: o }: { option: SelectOption }) {
  return (
    <SelectItem value={o.value} disabled={o.disabled}>
      {o.icon && <o.icon />}
      {o.label}
    </SelectItem>
  )
}

type Props = {
  label: string
  offset: number
  badges?: ReactNode
  /** null はセーブ未読み込み */
  value: string | null
  /** 現在の値が options にないときに表示する名前（例：未知の ID）。選び直すことはできない */
  currentLabel?: string
  options: readonly SelectOption[]
  /** 妥当性検証に落ちた理由。あれば読み取り専用 */
  problem: string | null
  /** 検証は通っているが、今は変更させないとき（例：上書きを明示していない）。hint はそのまま表示する */
  disabled?: boolean
  warning?: string | null
  /** バリデーション（文字数・数値の範囲など）だけを簡潔に書く。下に常に表示する */
  hint?: ReactNode
  /** 備考。項目名の端の丸ハテナにホバーで表示する */
  note?: ReactNode
  /** 現在値と違う値を選んだときだけ呼ばれる。例外はその場で表示する */
  onChange: (value: string) => void
}

/** 選択肢から1つ選ぶ1フィールド分の欄。FieldRow と同じ見た目にする */
export function SelectRow({ label, offset, badges, value, currentLabel, options, problem, disabled, warning, hint, note, onChange }: Props) {
  const [error, setError] = useState<string | null>(null)
  const listed = value === null || options.some((o) => o.value === value)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Label>{label}</Label>
        <InfoTip offset={offset}>{note}</InfoTip>
        {!problem && <WarningTip warning={warning} />}
        {badges}
      </div>
      <Select
        // '' は Radix Select でプレースホルダー表示になる（undefined だと非制御扱いになる）
        value={value ?? ''}
        disabled={disabled || value === null || problem !== null || options.length === 0}
        onValueChange={(v) => {
          if (v === value) return
          setError(null)
          try {
            onChange(v)
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
          }
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="未読み込み" />
        </SelectTrigger>
        <SelectContent>
          {!listed && value !== null && (
            <SelectItem value={value} disabled>
              {currentLabel ?? value}（現在の値）
            </SelectItem>
          )}
          {groupOptions(options).map((g, i) =>
            g.name === undefined ? (
              g.items.map((o) => <OptionItem key={o.value} option={o} />)
            ) : (
              <SelectGroup key={g.name}>
                {i > 0 && <SelectSeparator />}
                <SelectLabel>{g.name}</SelectLabel>
                {g.items.map((o) => (
                  <OptionItem key={o.value} option={o} />
                ))}
              </SelectGroup>
            ),
          )}
        </SelectContent>
      </Select>
      {problem ? (
        <p className="text-muted-foreground text-xs">読み取り専用：{problem}</p>
      ) : (
        // hint は常に出し、エラーはその下に足す。警告は項目名の横のアイコン（FieldRow と同じ）
        <>
          {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
          {error && <p className="text-destructive text-xs">{error}</p>}
        </>
      )}
    </div>
  )
}
