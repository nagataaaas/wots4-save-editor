import { useContext } from 'react'
import { AnchorScope } from '@/lib/navigation-context'
import { SearchCollectorContext, SearchPathContext, searchKey, type FieldName, type SearchCollector, type SearchEntry } from '@/lib/search-collector'

function register(collector: SearchCollector | null, entry: Omit<SearchEntry, 'section'>) {
  if (!collector || !entry.label) return
  const id = `${entry.box}\u001e${searchKey(entry)}`
  if (collector.seen.has(id)) return
  collector.seen.add(id)
  collector.entries.push({ section: collector.section, ...entry })
}

/** 欄の名前を検索の索引に載せ、外側の箱・小見出しを含めた欄の名前を返す（ふつうは SearchField を使う） */
export function useSearchField(label: string): FieldName {
  const collector = useContext(SearchCollectorContext)
  const path = useContext(SearchPathContext)
  const anchor = useContext(AnchorScope)
  register(collector, { anchor, path, label, box: false })
  return { anchor, path, label }
}

/** 箱（anchor を持つカード・まとまり）の名前を検索の索引に載せる。id は useAnchor の id。中身は <SearchPath label> で包む */
export function useSearchBox(id: string, label: string | undefined): void {
  const collector = useContext(SearchCollectorContext)
  const path = useContext(SearchPathContext)
  if (label) register(collector, { anchor: id, path, label, box: true })
}
