import { createContext, useContext } from 'react'
import type { SectionId } from '@/features/sections'

/**
 * トップバーの検索（src/components/search-dialog.tsx）で引く項目。
 * 索引は手書きせず、全画面を索引モード（SearchCollectorContext）で描いたときに、箱・小見出し・欄が自分の名前を登録して作る（src/features/search-index.ts）
 */
export type SearchEntry = {
  section: SectionId
  /** 移動先の箱の anchor。箱のときはその箱自身、欄・小見出しのときはいちばん内側の箱。箱の外なら空 */
  anchor: string
  /** 画面の名前より内側の、外側の箱・小見出しの名前の並び（パンくず） */
  path: readonly string[]
  label: string
  /** 箱そのもの（anchor へ飛べば箱がスクロールする）。false は欄・小見出しで、要素の data-search-key を探してスクロールする */
  box: boolean
  /** 上級者モードのときだけ描かれる箱・欄。通常モードでは検索結果に出さない */
  advanced?: true
}

export type SearchCollector = {
  section: SectionId
  entries: SearchEntry[]
  seen: Set<string>
}

/** 索引モードのときだけ値がある。この中では開閉できる箱がすべて開いて描かれる（useAnchoredOpen） */
export const SearchCollectorContext = createContext<SearchCollector | null>(null)

/** 外側の箱・小見出しの名前の並び（検索のパンくず） */
export const SearchPathContext = createContext<readonly string[]>([])

export function useIndexing(): boolean {
  return useContext(SearchCollectorContext) !== null
}

/** 欄・小見出しの要素に付ける data-search-key の値。検索から飛ぶときにこれで要素を探す */
export const searchKey = (anchor: string, path: readonly string[], label: string): string =>
  [anchor, ...path, label].join('\u001f')
