import { useState, type ReactNode } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { tr } from '@/lib/i18n'
import { Select, SelectContent, SelectTrigger, SelectValue, selectTriggerClassName } from '@/components/ui/select'

type Props = {
  /** null はプレースホルダーを出す */
  value: string | null
  /** 値ごとにトリガーへ出す名前 */
  items: Readonly<Record<string, ReactNode>>
  placeholder?: string
  disabled?: boolean
  /** トリガーの className */
  className?: string
  'aria-label'?: string
  /** null 以外の値を選んだときに呼ばれる */
  onValueChange: (value: string) => void
  /** SelectContent の中身（SelectItem など） */
  children: ReactNode
}

/**
 * 押されるまでは見た目だけのボタンを描き、押したときに Select を作って開く。
 * 1ページに Select を数百個並べると、Select の初期化だけで描画が重くなるため
 */
export function LazySelect({ value, items, placeholder, disabled, className, onValueChange, children, ...rest }: Props) {
  const [active, setActive] = useState(false)

  if (!active) {
    const label = value === null ? undefined : items[value]
    return (
      <button
        type="button"
        data-slot="select-trigger"
        data-size="default"
        data-placeholder={label === undefined ? '' : undefined}
        aria-haspopup="listbox"
        aria-label={rest['aria-label']}
        disabled={disabled}
        className={cn(selectTriggerClassName, className)}
        onClick={() => setActive(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            setActive(true)
          }
        }}
      >
        <span data-slot="select-value" className="flex flex-1 text-left">
          {label ?? placeholder ?? (value === null ? '' : tr({ ja: '不明', en: 'Unknown' }))}
        </span>
        <ChevronDownIcon className="text-muted-foreground pointer-events-none size-4" />
      </button>
    )
  }

  return (
    <Select
      defaultOpen
      value={value}
      items={items}
      disabled={disabled}
      onValueChange={(v) => {
        if (v !== null) onValueChange(v)
      }}
    >
      <SelectTrigger className={className} aria-label={rest['aria-label']} autoFocus>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  )
}
