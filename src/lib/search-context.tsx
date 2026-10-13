import { useContext, type ComponentProps, type ReactNode } from 'react'
import { SearchPathContext } from '@/lib/search-collector'
import { useSearchField } from '@/lib/search-hooks'
import { useNavigationTarget } from './navigation-target-context'

/** 中身の欄のパンくず（検索）に label を足す */
export function SearchPath({ label, children }: { label: string | undefined; children: ReactNode }) {
  const path = useContext(SearchPathContext)
  if (!label) return <>{children}</>
  return <SearchPathContext.Provider value={[...path, label]}>{children}</SearchPathContext.Provider>
}

/** 1つの欄（項目名と入力を包む div）。名前を検索の索引に載せ、検索から飛ぶとこの div までスクロールする */
export function SearchField({ label, ...props }: ComponentProps<'div'> & { label: string }) {
  const key = useSearchField(label)
  const ref = useNavigationTarget('fields', key)
  return <div {...props} ref={ref} data-search-key={key} />
}

/**
 * anchor を持たない小見出しのまとまり（見出しと中身を包む div）。見出しを検索の索引に載せ、中身の欄のパンくずに title を足す。
 * 検索から飛ぶとこの div までスクロールする
 */
export function SearchScope({ title, children, ...props }: ComponentProps<'div'> & { title: string }) {
  const key = useSearchField(title)
  const ref = useNavigationTarget('fields', key)
  return (
    <div {...props} ref={ref} data-search-key={key}>
      <SearchPath label={title}>{children}</SearchPath>
    </div>
  )
}
