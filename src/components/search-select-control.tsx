import { Check, ChevronsUpDown } from 'lucide-react'
import { Fragment, useState, type ReactNode } from 'react'
import { groupOptions, type OptionGroup, type SelectOption } from '@/components/select-options'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { tr } from '@/lib/i18n'
import { substringFilter } from '@/lib/search'
import { cn } from '@/lib/utils'

/**
 * 項目名と下の補足は呼び出し側が持つ、検索つきの選択欄。
 * 一覧は options の group でまとめる。見出しのないまとまりを区切り線で分けたいときは groups を渡す（options と同じ選択肢を並べる）
 */
export function SearchSelectControl({ value, currentLabel, options, groups = groupOptions(options), disabled, searchPlaceholder = tr({ ja: '検索', en: 'Search' }), className, contentClassName, leading, onChange, ...rest }: {
  value: string | null; currentLabel?: string; options: readonly SelectOption[]; groups?: readonly OptionGroup[]; disabled?: boolean;
  searchPlaceholder?: string; className?: string; contentClassName?: string; leading?: ReactNode;
  'aria-label'?: string; onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.value === value)
  const current = currentLabel ?? tr({ ja: '不明', en: 'Unknown' })
  const text = value === null ? tr({ ja: '未読み込み', en: 'Not loaded' })
    : selected ? selected.selectedLabel ?? selected.label
    : tr({ ja: `${current}（現在の値）`, en: `${current} (current value)` })
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger render={<Button variant="outline" role="combobox" aria-expanded={open}
      disabled={disabled || value === null || options.length === 0}
      className={cn('w-full min-w-0 justify-between font-normal', className)} {...rest} />}>
      <span className={cn('flex min-w-0 items-center gap-2', value === null && 'text-muted-foreground')}>
        {leading ?? selected?.leading}
        {selected?.icon && <selected.icon />}
        <span className="truncate">{text}</span>
      </span>
      <ChevronsUpDown className="opacity-50" />
    </PopoverTrigger>
    <PopoverContent className={cn('w-(--anchor-width) p-0', contentClassName)} align="start">
      <Command filter={substringFilter} defaultValue={value ?? undefined}>
        <CommandInput placeholder={searchPlaceholder} />
        <CommandList>
          <CommandEmpty>{tr({ ja: '見つかりません', en: 'No matches' })}</CommandEmpty>
          {groups.map((g, i) => <Fragment key={g.name ?? `group-${i}`}>
            {i > 0 && <CommandSeparator />}
            <CommandGroup heading={g.name}>
              {g.items.map(o => <CommandItem key={o.value} value={o.value}
                keywords={[o.label, ...(o.keywords ?? []), ...(o.description ? [o.description] : [])]}
                disabled={o.disabled} onSelect={() => {
                  setOpen(false)
                  if (o.value !== value) onChange(o.value)
                }}>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex items-center gap-2">{o.leading}{o.icon && <o.icon />}<span>{o.label}</span></span>
                  {o.description && <span className="text-muted-foreground text-xs leading-snug">{o.description}</span>}
                </span>
                <Check className={cn('ml-auto shrink-0', o.value === value ? 'opacity-100' : 'opacity-0')} />
              </CommandItem>)}
            </CommandGroup>
          </Fragment>)}
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
}
