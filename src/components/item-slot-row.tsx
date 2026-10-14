import { FieldFeedback } from '@/components/field-shell'
import { InfoTip } from '@/components/info-tip'
import { ItemCategoryIcon } from '@/components/item-category-icon'
import { SearchSelectControl } from '@/components/search-select-control'
import type { OptionGroup, SelectOption } from '@/components/select-options'
import { Input } from '@/components/ui/input'
import { useFieldDraft } from '@/lib/use-field-draft'
import { useFieldAction } from '@/lib/use-field-action'
import { integerValue, parseInteger } from '@/lib/parse'
import { formatWarnings } from '@/lib/format'
import { cn } from '@/lib/utils'
import { EMPTY_ID, validateItemCount, type ItemOptionGroup, type ItemSlot } from '@/save/item-slot'

// アイテムの枠（ID＋個数、8 B）を1件編集する行。道具・箪笥・重要品で共通（chunks/items）。

/** ID を 16進4桁（0x なし）で表示する */
const hexId = (id: number) => id.toString(16).toUpperCase().padStart(4, '0')

type SlotSelectOptions = { groups: OptionGroup[]; options: SelectOption[] }

/**
 * groups から作った選択肢。同じ groups（呼び出し側で useMemo した配列やモジュールの定数）なら全行で使い回す。
 * 箪笥は80行あり、行ごと・描画ごとに全アイテムの選択肢を作ると重いため
 */
const selectOptionsCache = new WeakMap<readonly ItemOptionGroup[], SlotSelectOptions>()

function selectOptionsFor(groups: readonly ItemOptionGroup[]): SlotSelectOptions {
  const cached = selectOptionsCache.get(groups)
  if (cached) return cached
  // 「なし」は見出しのないまとまりにして、道具の一覧（通常モードは見出しなし）と区切り線で分ける
  const optionGroups: OptionGroup[] = [
    { name: undefined, items: [{ value: String(EMPTY_ID), label: 'なし', keywords: ['FFFF'], leading: <ItemCategoryIcon id={EMPTY_ID} /> }] },
    ...groups.map((g) => ({
      name: g.label,
      items: g.items.map((item) => ({
        value: String(item.id),
        label: item.label,
        keywords: item.keywords,
        description: item.description,
        leading: <ItemCategoryIcon id={item.id} />,
      })),
    })),
  ]
  const result = { groups: optionGroups, options: optionGroups.flatMap((g) => g.items) }
  selectOptionsCache.set(groups, result)
  return result
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
  const { error: actionError, setError, run } = useFieldAction(`${offset}:${slot?.id}`)

  const readOnly = slot === null || slot.problem !== null
  const warning = formatWarnings(slot?.warnings)
  const isEmpty = slot?.id === EMPTY_ID
  // 現在の ID が書けない値（未知など）なら、ID の変更だけを許し、個数は変えられない
  const countLocked = slot === null || slot.problem !== null || isEmpty || !slot.idWritable
  /** なし → 個数 0。空きから入れたとき、または個数 0 のときは 1 にする。新しい ID の上限を超える個数は上限に下げる */
  const countFor = (id: number) => {
    if (id === EMPTY_ID) return 0
    const current = slot && slot.count >= 1 ? slot.count : 1
    return Math.min(current, countMaxFor?.(id) ?? current)
  }

  function choose(id: number) {
    if (!slot || id === slot.id) return
    run(() => onChange(id, countFor(id)))
  }

  const idInput = useFieldDraft({
    value: slot?.id ?? null, format: hexId, identity: offset,
    parse: (input) => {
      const text = input.trim().replace(/^0x/i, '')
      const parsed = text.length <= 4 ? integerValue(input, { radix: 16 }) : null
      const id = parsed !== null && parsed <= 0xffff ? parsed : null
      return id === null ? { ok: false, error: 'ID は16進4桁まで（例：2F）で入力してください' } : { ok: true, value: id }
    },
    apply: (id) => onChange(id, countFor(id)),
  })
  const countInput = useFieldDraft({
    value: slot && slot.id !== EMPTY_ID ? slot.count : null,
    format: String, identity: `${offset}:${slot?.id}`,
    parse: (input) =>
      parseInteger(input, (count) => validateItemCount(count, slot ? countMaxFor?.(slot.id) : undefined), {
        error: '1以上の整数を入力してください',
      }),
    apply: (count) => { if (slot) onChange(slot.id, count) },
  })
  const error = actionError ?? idInput.error ?? countInput.error

  const { groups: optionGroups, options } = selectOptionsFor(groups)

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
        <SearchSelectControl
          value={slot ? String(slot.id) : null}
          currentLabel={slot?.label ?? undefined}
          options={options}
          groups={optionGroups}
          disabled={readOnly}
          aria-label={`${index + 1}件目の${noun}`}
          searchPlaceholder={searchPlaceholder ?? `${noun}を検索（名前・読み・英語名）`}
          className="h-8 px-2 text-sm"
          contentClassName="min-w-64"
          leading={<ItemCategoryIcon id={slot?.id ?? EMPTY_ID} />}
          onChange={(value) => choose(Number(value))}
        />
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
      <FieldFeedback className="col-start-2" problem={slot?.problem} error={error} warning={warning} />
    </div>
  )
}
