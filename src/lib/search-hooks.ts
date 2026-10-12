import { useContext } from 'react'
import { AnchorScope } from '@/lib/navigation-context'
import { SearchCollectorContext, SearchPathContext, searchKey, type SearchCollector, type SearchEntry } from '@/lib/search-collector'

function register(collector: SearchCollector | null, entry: Omit<SearchEntry, 'section'>) {
  if (!collector || !entry.label) return
  const id = `${entry.box}\u001e${searchKey(entry.anchor, entry.path, entry.label)}`
  if (collector.seen.has(id)) return
  collector.seen.add(id)
  collector.entries.push({ section: collector.section, ...entry })
}

/** 欄の名前を検索の索引に載せ、欄の要素に付ける data-search-key を返す（ふつうは SearchField を使う） */
export function useSearchField(label: string): string {
  const collector = useContext(SearchCollectorContext)
  const path = useContext(SearchPathContext)
  const anchor = useContext(AnchorScope)
  register(collector, { anchor, path, label, box: false })
  return searchKey(anchor, path, label)
}

/** 箱（anchor を持つカード・まとまり）の名前を検索の索引に載せる。id は useAnchor の id。中身は <SearchPath label> で包む */
export function useSearchBox(id: string, label: string | undefined): void {
  const collector = useContext(SearchCollectorContext)
  const path = useContext(SearchPathContext)
  if (label) register(collector, { anchor: id, path, label, box: true })
}
