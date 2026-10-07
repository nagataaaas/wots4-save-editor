import { Check, ChevronsUpDown } from 'lucide-react'
import { Fragment, useState, type ReactNode } from 'react'
import { InfoTip } from '@/components/info-tip'
import { groupOptions, type SelectOption } from '@/components/select-options'
import { WarningTip } from '@/components/warning-tip'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { matchesSearch } from '@/lib/search'

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
  disabled?: boolean
  warning?: string | null
  hint?: ReactNode
  /** 備考。項目名の端の丸ハテナにホバーで表示する */
  note?: ReactNode
  /** 検索欄のプレースホルダー */
  searchPlaceholder?: string
  /** 現在値と違う値を選んだときだけ呼ばれる。例外はその場で表示する */
  onChange: (value: string) => void
}

/** label と keywords のどれかに、検索語が部分一致すれば表示する（cmdk の既定はあいまい一致なので置き換える） */
function substringFilter(_value: string, search: string, keywords?: string[]): number {
  return matchesSearch(search, keywords ?? []) ? 1 : 0
}

/** 検索つきで選択肢から1つ選ぶ欄。SelectRow と同じ見た目・同じグループ分けにする */
export function SearchSelectRow({
  label,
  offset,
  badges,
  value,
  currentLabel,
  options,
  problem,
  disabled,
  warning,
  hint,
  note,
  searchPlaceholder = '検索',
  onChange,
}: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selected = options.find((o) => o.value === value)
  const triggerText =
    value === null ? '未読み込み' : selected ? selected.label : `${currentLabel ?? value}（現在の値）`

  const select = (v: string) => {
    setOpen(false)
    if (v === value) return
    setError(null)
    try {
      onChange(v)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Label>{label}</Label>
        <InfoTip offset={offset}>{note}</InfoTip>
        {!problem && <WarningTip warning={warning} />}
        {badges}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled || value === null || problem !== null || options.length === 0}
              className="w-full justify-between font-normal"
            />
          }
        >
          <span className={`flex items-center gap-2 truncate ${value === null ? 'text-muted-foreground' : ''}`}>
            {selected?.icon && <selected.icon />}
            {triggerText}
          </span>
          <ChevronsUpDown className="opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-(--anchor-width) p-0" align="start">
          <Command filter={substringFilter}>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>見つかりません</CommandEmpty>
              {groupOptions(options).map((g, i) => (
                <Fragment key={g.name ?? `group-${i}`}>
                  {i > 0 && <CommandSeparator />}
                  <CommandGroup heading={g.name}>
                    {g.items.map((o) => (
                      <CommandItem
                        key={o.value}
                        value={o.value}
                        keywords={[o.label, ...(o.keywords ?? [])]}
                        disabled={o.disabled}
                        onSelect={() => select(o.value)}
                      >
                        {o.icon && <o.icon />}
                        {o.label}
                        <Check className={`ml-auto ${o.value === value ? 'opacity-100' : 'opacity-0'}`} />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Fragment>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {problem ? (
        <p className="text-muted-foreground text-xs">読み取り専用：{problem}</p>
      ) : (
        <>
          {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
          {error && <p className="text-destructive text-xs">{error}</p>}
        </>
      )}
    </div>
  )
}
