import { useContext, type ComponentProps, type ReactNode } from 'react'
import { SearchPathContext } from '@/lib/search-collector'
import { useSearchField } from '@/lib/search-hooks'

/** 中身の欄のパンくず（検索）に label を足す */
export function SearchPath({ label, children }: { label: string | undefined; children: ReactNode }) {
  const path = useContext(SearchPathContext)
  if (!label) return <>{children}</>
  return <SearchPathContext.Provider value={[...path, label]}>{children}</SearchPathContext.Provider>
}

/** 1つの欄（項目名と入力を包む div）。名前を検索の索引に載せ、検索から飛ぶとこの div までスクロールする */
export function SearchField({ label, ...props }: ComponentProps<'div'> & { label: string }) {
  return <div data-search-key={useSearchField(label)} {...props} />
}

/**
 * anchor を持たない小見出しのまとまり（見出しと中身を包む div）。見出しを検索の索引に載せ、中身の欄のパンくずに title を足す。
 * 検索から飛ぶとこの div までスクロールする
 */
export function SearchScope({ title, children, ...props }: ComponentProps<'div'> & { title: string }) {
  const key = useSearchField(title)
  return (
    <div data-search-key={key} {...props}>
      <SearchPath label={title}>{children}</SearchPath>
    </div>
  )
}
