import { useState } from 'react'
import { InfoTip } from '@/components/info-tip'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatHex4 } from '@/lib/format'
import { cn } from '@/lib/utils'
import { EMPTY_ID, validateItemCount, type ItemOptionGroup, type ItemSlot } from '@/save/item-slot'

// アイテムの枠（ID＋個数、8 B）を1件編集する行。道具・重要品で共通（chunks/items）。

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e))

/** ID を 16進4桁（0x なし）で表示する */
const hexId = (id: number) => id.toString(16).toUpperCase().padStart(4, '0')

function parseHexId(input: string): number | null {
  const t = input.trim().replace(/^0x/i, '')
  return /^[0-9a-f]{1,4}$/i.test(t) ? parseInt(t, 16) : null
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
  /** 個数の欄を出す（道具は1枠1個なので出さない） */
  showCount?: boolean
  onChange: (id: number, count: number) => void
}) {
  const [draft, setDraft] = useState(() => (slot && slot.id !== EMPTY_ID ? String(slot.count) : ''))
  const [idDraft, setIdDraft] = useState(() => (slot ? hexId(slot.id) : ''))
  const [error, setError] = useState<string | null>(null)

  const readOnly = slot === null || slot.problem !== null
  const isEmpty = slot?.id === EMPTY_ID
  // 現在の ID が書けない値（未知など）なら、ID の変更だけを許し、個数は変えられない
  const countLocked = slot === null || slot.problem !== null || isEmpty || !slot.idWritable
  const isKnown = slot !== null && (isEmpty || groups.some((g) => g.items.some((v) => v.id === slot.id)))

  function run(action: () => void) {
    setError(null)
    try {
      action()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  /** なし → 個数 0。空きから入れたとき、または個数 0 のときは 1 にする */
  const countFor = (id: number) => (id === EMPTY_ID ? 0 : slot && slot.count >= 1 ? slot.count : 1)

  function handleSelect(s: string) {
    if (!slot) return
    const id = Number(s)
    if (id === slot.id) return
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
    const problem = validateItemCount(count)
    if (problem) {
      setError(problem)
      return
    }
    setError(null)
    if (count !== slot.count) run(() => onChange(slot.id, count))
  }

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
          'grid gap-2',
          investigate && showCount && 'grid-cols-[1fr_5.5rem_5.5rem]',
          investigate !== showCount && (investigate ? 'grid-cols-[1fr_5.5rem]' : 'grid-cols-[1fr_7rem]'),
        )}
      >
        <Select
          // '' は Radix Select でプレースホルダー表示になる（undefined だと非制御扱いになる）
          value={slot === null ? '' : String(slot.id)}
          disabled={readOnly}
          onValueChange={handleSelect}
        >
          <SelectTrigger className="w-full" aria-label={`${index + 1}件目の${noun}`}>
            <SelectValue placeholder="未読み込み" />
          </SelectTrigger>
          <SelectContent>
            {slot && !isKnown && (
              <SelectItem value={String(slot.id)} disabled>
                {formatHex4(slot.id)} {slot.label ?? '未知の ID'}（現在の値）
              </SelectItem>
            )}
            <SelectItem value={String(EMPTY_ID)}>なし</SelectItem>
            {groups.map((g, gi) =>
              g.label ? (
                <SelectGroup key={gi}>
                  <SelectLabel>{g.label}</SelectLabel>
                  {g.items.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ) : (
                g.items.map((v) => (
                  <SelectItem key={v.id} value={String(v.id)}>
                    {v.label}
                  </SelectItem>
                ))
              ),
            )}
          </SelectContent>
        </Select>
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
          <Input
            value={slot === null || isEmpty ? '' : countLocked ? String(slot.count) : draft}
            disabled={slot === null || isEmpty}
            readOnly={countLocked}
            placeholder={slot === null ? '未読み込み' : isEmpty ? '—' : undefined}
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
