import { useContext, useMemo, type ComponentProps, type ReactNode } from 'react'
import { SearchPathContext, searchKey } from '@/lib/search-collector'
import { useSearchField } from '@/lib/search-hooks'
import { useFieldTarget } from './navigation-target-context'

/** 中身の欄のパンくず（検索）に label を足す */
export function SearchPath({ label, children }: { label: string | undefined; children: ReactNode }) {
  const path = useContext(SearchPathContext)
  // 中の欄が移動先の登録をやり直さないよう、外側と label が同じなら同じ配列を渡す
  const inner = useMemo(() => (label ? [...path, label] : path), [path, label])
  if (!label) return <>{children}</>
  return <SearchPathContext.Provider value={inner}>{children}</SearchPathContext.Provider>
}

/** 1つの欄（項目名と入力を包む div）。名前を検索の索引に載せ、検索から飛ぶとこの div までスクロールする */
export function SearchField({ label, ...props }: ComponentProps<'div'> & { label: string }) {
  const name = useSearchField(label)
  const ref = useFieldTarget(name)
  return <div {...props} ref={ref} data-search-key={searchKey(name)} />
}

/**
 * anchor を持たない小見出しのまとまり（見出しと中身を包む div）。見出しを検索の索引に載せ、中身の欄のパンくずに title を足す。
 * 検索から飛ぶとこの div までスクロールする
 */
export function SearchScope({ title, children, ...props }: ComponentProps<'div'> & { title: string }) {
  const name = useSearchField(title)
  const ref = useFieldTarget(name)
  return (
    <div {...props} ref={ref} data-search-key={searchKey(name)}>
      <SearchPath label={title}>{children}</SearchPath>
    </div>
  )
}
