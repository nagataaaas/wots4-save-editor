import { Check, ChevronsUpDown } from 'lucide-react'
import { Fragment, useState } from 'react'
import { InfoTip } from '@/components/info-tip'
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
import { formatHex4 } from '@/lib/format'
import { matchesSearch } from '@/lib/search'
import { cn } from '@/lib/utils'
import { EMPTY_ID, validateItemCount, type ItemOptionGroup, type ItemSlot } from '@/save/item-slot'

// アイテムの枠（ID＋個数、8 B）を1件編集する行。道具・箪笥・重要品で共通（chunks/items）。

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e))

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
  const [draft, setDraft] = useState(() => (slot && slot.id !== EMPTY_ID ? String(slot.count) : ''))
  const [idDraft, setIdDraft] = useState(() => (slot ? hexId(slot.id) : ''))
  const [error, setError] = useState<string | null>(null)

  const readOnly = slot === null || slot.problem !== null
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
          : `${formatHex4(slot.id)} ${slot.label ?? '未知の ID'}（現在の値）`

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

  function handleId(input: string) {
    if (!slot) return
    setIdDraft(input)
    const id = parseHexId(input)
    if (id === null) {
      setError('ID は16進4桁まで（例：2F）で入力してください')
      return
    }
    if (id === slot.id) {
      setError(null)
      return
    }
    run(() => onChange(id, countFor(id)))
  }

  function handleCount(input: string) {
    if (!slot) return
    setDraft(input)
    if (!/^\d+$/.test(input.trim())) {
      setError('1以上の整数を入力してください')
      return
    }
    const count = Number(input.trim())
    const problem = validateItemCount(count, countMaxFor?.(slot.id))
    if (problem) {
      setError(problem)
      return
    }
    setError(null)
    if (count !== slot.count) run(() => onChange(slot.id, count))
  }

  const item = (id: number, label: string, keywords: readonly string[] = [], description?: string) => (
    <CommandItem key={id} value={String(id)} keywords={[label, ...keywords]} onSelect={() => choose(id)}>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span>{label}</span>
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
    <div className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">{index + 1}件目</span>
        <InfoTip offset={offset} />
        {slot && (
          <span className="text-muted-foreground ml-auto font-mono text-xs" title="+0x04〜+0x07（用途不明）">
            ❓ {slot.unknown.toString(16).toUpperCase().padStart(8, '0')}
          </span>
        )}
      </div>
      <div
        className={cn(
          'grid items-start gap-2',
          investigate && showCount && 'grid-cols-[1fr_5.5rem_5.5rem]',
          investigate !== showCount && (investigate ? 'grid-cols-[1fr_5.5rem]' : 'grid-cols-[1fr_7rem]'),
        )}
      >
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              aria-label={`${index + 1}件目の${noun}`}
              disabled={readOnly}
              className="w-full min-w-0 justify-between font-normal"
            >
              <span className={cn('truncate', slot === null && 'text-muted-foreground')}>{triggerText}</span>
              <ChevronsUpDown className="opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-(--radix-popover-trigger-width) min-w-64 p-0" align="start">
            <Command filter={substringFilter}>
              <CommandInput placeholder={`${noun}を検索（名前・読み・英語名・ID）`} />
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
            value={slot === null ? '' : readOnly ? hexId(slot.id) : idDraft}
            disabled={slot === null}
            readOnly={readOnly}
            placeholder="ID"
            className="font-mono"
            aria-label={`${index + 1}件目の ID（16進）`}
            onChange={(e) => handleId(e.target.value)}
            onBlur={() => {
              if (error && slot) {
                setIdDraft(hexId(slot.id))
                setError(null)
              }
            }}
          />
        )}
        {showCount && (
          <div className="flex min-w-0 flex-col gap-1">
            <Input
              value={slot === null || isEmpty ? '' : countLocked ? String(slot.count) : draft}
              disabled={slot === null || isEmpty}
              readOnly={countLocked}
              placeholder={slot === null ? '未読み込み' : isEmpty ? '—' : undefined}
              type="number"
              min={overLimitAllowed || normalMax === undefined ? undefined : 1}
              max={overLimitAllowed ? undefined : normalMax}
              inputMode="numeric"
              aria-label={`${index + 1}件目の個数`}
              aria-invalid={error !== null}
              onChange={(e) => handleCount(e.target.value)}
              onBlur={() => {
                // 不正な入力のまま離れたら、セーブ上の値に戻す
                if (error && slot) {
                  setDraft(String(slot.count))
                  setError(null)
                }
              }}
            />
            {countLimitText && !slot?.problem && (
              <p className="text-muted-foreground text-xs">{countLimitText}</p>
            )}
          </div>
        )}
      </div>
      {slot?.problem ? (
        <p className="text-muted-foreground text-xs">読み取り専用：{slot.problem}</p>
      ) : error ? (
        <p className="text-destructive text-xs">{error}</p>
      ) : (
        slot?.warning && <p className="text-xs text-amber-600 dark:text-amber-400">⚠ {slot.warning}</p>
      )}
    </div>
  )
}
