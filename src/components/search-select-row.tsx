import type { ReactNode } from 'react'
import { FieldShell } from '@/components/field-shell'
import { SearchSelectControl } from '@/components/search-select-control'
import type { SelectOption } from '@/components/select-options'
import { useWrite } from '@/lib/use-write'

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
  const { error, attempt } = useWrite(offset)
  return (
    <FieldShell label={label} offset={offset} note={note} warning={warning} badges={badges} problem={problem} hint={hint} error={error}>
      <SearchSelectControl
        value={value}
        currentLabel={currentLabel}
        options={options}
        disabled={disabled || problem !== null}
        searchPlaceholder={searchPlaceholder}
        onChange={(v) => attempt(() => onChange(v))}
      />
    </FieldShell>
  )
}
