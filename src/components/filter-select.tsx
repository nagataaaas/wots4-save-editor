import type { ReactNode } from 'react'
import { LazySelect } from '@/components/lazy-select'
import { SelectItem } from '@/components/ui/select'

export type FilterOption<T extends string> = { value: T; label: ReactNode; disabled?: boolean }

/** 選択肢の値から型を保ったまま通知する。表示名と選択肢は同じ表から作る。 */
export function FilterSelect<T extends string>({ options, value, onChange, disabled, className, placeholder, ...rest }: {
  options: readonly FilterOption<T>[]
  value: T | null
  onChange: (value: T) => void
  disabled?: boolean
  className?: string
  placeholder?: string
  'aria-label'?: string
}) {
  return (
    <LazySelect value={value} items={Object.fromEntries(options.map(o => [o.value, o.label]))}
      disabled={disabled} className={className} placeholder={placeholder} {...rest}
      onValueChange={value => {
        const option = options.find(o => o.value === value)
        if (option && !option.disabled) onChange(option.value)
      }}>
      {options.map(o => <SelectItem key={o.value} value={o.value} disabled={o.disabled}>{o.label}</SelectItem>)}
    </LazySelect>
  )
}
