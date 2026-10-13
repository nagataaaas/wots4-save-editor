import { Check, ChevronsUpDown } from 'lucide-react'
import { Fragment, useState } from 'react'
import { InfoTip } from '@/components/info-tip'
import { ItemCategoryIcon } from '@/components/item-category-icon'
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
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { errorMessage } from '@/lib/error-message'
import { useFieldDraft } from '@/lib/use-field-draft'
import { useScopedError } from '@/lib/use-scoped-error'
import { formatWarnings } from '@/lib/format'
import { matchesSearch } from '@/lib/search'
import { cn } from '@/lib/utils'
import { EMPTY_ID, validateItemCount, type ItemOptionGroup, type ItemSlot } from '@/save/item-slot'

// アイテムの枠（ID＋個数、8 B）を1件編集する行。道具・箪笥・重要品で共通（chunks/items）。

/** ID を 16進4桁（0x なし）で表示する */
const hexId = (id: number) => id.toString(16).toUpperCase().padStart(4, '0')

function parseHexId(input: string): number | null {
  const t = input.trim().replace(/^0x/i, '')
  return /^[0-9a-f]{1,4}$/i.test(t) ? parseInt(t, 16) : null
}

/** label と keywords のどれかに、検索語が部分一致すれば表示する（cmdk の既定はあいまい一致なので置き換える） */
function substringFilter(_value: string, search: string, keywords?: string[]): number {
  return matchesSearch(search, keywords ?? []) ? 1 : 0
}

/** slot が null のときはセーブ未読み込み。入力欄を無効にして表示する */
export function ItemSlotRow({
  index,
  offset,
  slot,
  groups,
  noun,
  searchPlaceholder,
  investigate = false,
  showCount = true,
  countMaxFor,
  normalCountMaxFor,
  onChange,
}: {
  index: number
  offset: number
  slot: ItemSlot | null
  /** 選択肢（「なし」は自動で先頭に入る） */
  groups: readonly ItemOptionGroup[]
  /** 読み上げ用の名前（例：重要品、道具） */
  noun: string
  /** 検索欄のプレースホルダー。なければ「（noun）を検索（名前・読み・英語名）」 */
  searchPlaceholder?: string
  /** ID を16進で直接入れる欄を出す（上級者モード） */
  investigate?: boolean
  /** 個数の欄を出す */
  showCount?: boolean
  /** ID ごとの個数の上限（書ける値）。なければ ITEM_COUNT_MAX */
  countMaxFor?: (id: number) => number
  /** ID ごとの通常モードの個数の上限（表示用）。上級者モードで countMaxFor がこれを超えるときに両方を表示する */
  normalCountMaxFor?: (id: number) => number
  onChange: (id: number, count: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [actionError, setError] = useScopedError(`${offset}:${slot?.id}`)

  const readOnly = slot === null || slot.problem !== null
  const warning = formatWarnings(slot?.warnings)
  const isEmpty = slot?.id === EMPTY_ID
  // 現在の ID が書けない値（未知など）なら、ID の変更だけを許し、個数は変えられない
  const countLocked = slot === null || slot.problem !== null || isEmpty || !slot.idWritable
  const selected = slot ? groups.flatMap((g) => g.items).find((v) => v.id === slot.id) : undefined
  const triggerText =
    slot === null
      ? '未読み込み'
      : isEmpty
        ? 'なし'
        : selected
          ? selected.label
          : `${slot.label ?? '不明'}（現在の値）`

  function run(action: () => void) {
    setError(null)
    try {
      action()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  /** なし → 個数 0。空きから入れたとき、または個数 0 のときは 1 にする。新しい ID の上限を超える個数は上限に下げる */
  const countFor = (id: number) => {
    if (id === EMPTY_ID) return 0
    const current = slot && slot.count >= 1 ? slot.count : 1
    return Math.min(current, countMaxFor?.(id) ?? current)
  }

  function choose(id: number) {
    setOpen(false)
    if (!slot || id === slot.id) return
    run(() => onChange(id, countFor(id)))
  }

  const idInput = useFieldDraft({
    value: slot?.id ?? null, format: hexId, identity: offset,
    parse: (input) => {
      const id = parseHexId(input)
      return id === null ? { ok: false, error: 'ID は16進4桁まで（例：2F）で入力してください' } : { ok: true, value: id }
    },
    apply: (id) => onChange(id, countFor(id)),
  })
  const countInput = useFieldDraft({
    value: slot && slot.id !== EMPTY_ID ? slot.count : null,
    format: String, identity: `${offset}:${slot?.id}`,
    parse: (input) => {
      if (!/^\d+$/.test(input.trim())) return { ok: false, error: '1以上の整数を入力してください' }
      const count = Number(input.trim())
      const problem = validateItemCount(count, slot ? countMaxFor?.(slot.id) : undefined)
      return problem ? { ok: false, error: problem } : { ok: true, value: count }
    },
    apply: (count) => { if (slot) onChange(slot.id, count) },
  })
  const error = actionError ?? idInput.error ?? countInput.error

  // 説明文でも検索できるよう、keywords に入れる
  const item = (id: number, label: string, keywords: readonly string[] = [], description?: string) => (
    <CommandItem
      key={id}
      value={String(id)}
      keywords={description ? [label, ...keywords, description] : [label, ...keywords]}
      onSelect={() => choose(id)}
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <ItemCategoryIcon id={id} />
          <span>{label}</span>
        </span>
        {description && <span className="text-muted-foreground text-xs leading-snug">{description}</span>}
      </span>
      <Check className={cn('ml-auto shrink-0', slot?.id === id ? 'opacity-100' : 'opacity-0')} />
    </CommandItem>
  )

  // 個数の上限。書ける上限（countMax）が通常の上限（normalMax）を超えるのは上級者モードのとき。
  // 通常モードでは入力欄の min・max を 1 とその アイテムの上限にし、上級者モードではつけない（ユーザー判断 2026-10-07）
  const countMax = slot && !isEmpty ? countMaxFor?.(slot.id) : undefined
  const normalMax = slot && !isEmpty ? (normalCountMaxFor?.(slot.id) ?? countMax) : undefined
  const overLimitAllowed = countMax !== undefined && normalMax !== undefined && countMax > normalMax
  const countLimitText =
    showCount && normalMax !== undefined ? (overLimitAllowed ? `最大 ${normalMax}（超過可）` : `最大 ${normalMax}`) : null

  return (
    <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-x-2 gap-y-1 py-1.5 first:pt-0 last:pb-0">
      <div className="flex h-8 items-center gap-1 text-xs">
        <span className="text-muted-foreground tabular-nums">{index + 1}</span>
        <InfoTip offset={offset} />
      </div>
      <div
        className={cn(
          'grid min-w-0 items-center gap-2',
          investigate && showCount && 'grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_5rem_auto]',
          investigate !== showCount && (investigate ? 'grid-cols-[minmax(0,1fr)_5rem]' : 'grid-cols-[minmax(0,1fr)_auto]'),
        )}
      >
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                aria-label={`${index + 1}件目の${noun}`}
                disabled={readOnly}
                className="h-8 w-full min-w-0 justify-between px-2 text-sm font-normal"
              />
            }
          >
            <span className="flex min-w-0 items-center gap-2">
              <ItemCategoryIcon id={slot?.id ?? EMPTY_ID} />
              <span className={cn('truncate', slot === null && 'text-muted-foreground')}>{triggerText}</span>
            </span>
            <ChevronsUpDown className="opacity-50" />
          </PopoverTrigger>
          <PopoverContent className="w-(--anchor-width) min-w-64 p-0" align="start">
            <Command filter={substringFilter} defaultValue={slot ? String(slot.id) : undefined}>
              <CommandInput placeholder={searchPlaceholder ?? `${noun}を検索（名前・読み・英語名）`} />
              <CommandList>
                <CommandEmpty>見つかりません</CommandEmpty>
                <CommandGroup>{item(EMPTY_ID, 'なし', ['FFFF'])}</CommandGroup>
                {groups.map((g, gi) => (
                  <Fragment key={g.label ?? `group-${gi}`}>
                    <CommandSeparator />
                    <CommandGroup heading={g.label}>
                      {g.items.map((v) => item(v.id, v.label, v.keywords, v.description))}
                    </CommandGroup>
                  </Fragment>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {investigate && (
          <Input
            value={slot === null ? '' : readOnly ? hexId(slot.id) : idInput.input}
            disabled={slot === null}
            readOnly={readOnly}
            placeholder="ID"
            className={cn('h-8 font-mono', showCount && 'col-start-1 row-start-2 sm:col-auto sm:row-auto')}
            aria-label={`${index + 1}件目の ID（16進）`}
            onChange={(e) => { setError(null); idInput.change(e.target.value) }}
            onFocus={idInput.focus}
            onBlur={idInput.blur}
          />
        )}
        {showCount && (
          <div className={cn('flex items-center gap-2', investigate && 'col-start-2 row-start-1 sm:col-auto sm:row-auto')}>
            <Input
              className="h-8 w-18 px-2 tabular-nums"
              value={slot === null || isEmpty ? '' : countLocked ? String(slot.count) : countInput.input}
              disabled={slot === null || isEmpty}
              readOnly={countLocked}
              placeholder={slot === null ? '未読み込み' : isEmpty ? '—' : undefined}
              type="number"
              min={overLimitAllowed || normalMax === undefined ? undefined : 1}
              max={overLimitAllowed ? undefined : normalMax}
              inputMode="numeric"
              aria-label={`${index + 1}件目の個数`}
              aria-invalid={error !== null}
              onChange={(e) => { setError(null); countInput.change(e.target.value) }}
              onFocus={countInput.focus}
              onBlur={countInput.blur}
            />
            <span className="text-muted-foreground w-14 text-xs leading-tight tabular-nums">
              {!slot?.problem && countLimitText}
            </span>
          </div>
        )}
      </div>
      {slot?.problem ? (
        <p className="text-muted-foreground col-start-2 text-xs">読み取り専用：{slot.problem}</p>
      ) : error ? (
        <p className="text-destructive col-start-2 text-xs">{error}</p>
      ) : (
        warning && <p className="col-start-2 text-xs text-amber-600 dark:text-amber-400">⚠ {warning}</p>
      )}
    </div>
  )
}
