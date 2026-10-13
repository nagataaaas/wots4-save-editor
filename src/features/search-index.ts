import { sections, type SectionId } from '@/features/sections'
import type { SearchEntry } from '@/lib/search-collector'
import { normalizeForSearch } from '@/lib/search'

/** 検索の1件。選ぶと go(section, anchor, field) で飛ぶ（URL も #/section/anchor/~/field… になる） */
export type SearchItem = {
  section: SectionId
  /** 箱の anchor。画面そのもの・箱の外の欄なら空 */
  anchor: string
  /** 欄・小見出しの、いちばん内側の箱より内側の名前の並び（最後が欄の名前。Route の field）。箱・画面なら null（箱は自分でスクロールする） */
  field: string[] | null
  /** フォルダ > 画面 > 箱・小見出し … > 名前 */
  crumbs: string[]
  /** crumbs を normalizeForSearch したもの（検索のたびに作り直さない） */
  normalized: string[]
  /** 上級者モードのときだけ描かれる箱・欄（SearchEntry.advanced） */
  advanced: boolean
}

/** 集めた名前（search-index.generated.json）に、画面そのものと、フォルダ・画面の名前のパンくずを足す */
export function toSearchItems(entries: readonly SearchEntry[]): SearchItem[] {
  const items: SearchItem[] = []
  // 箱の anchor → 箱の名前までのパンくず。欄のパンくずからこれを除いたものを URL に書く
  const boxCrumbs = new Map<string, string[]>()
  for (const e of entries) if (e.box) boxCrumbs.set(`${e.section}${e.anchor}`, [...e.path, e.label])
  const relative = (e: SearchEntry) => {
    const box = boxCrumbs.get(`${e.section}${e.anchor}`) ?? []
    const inside = box.every((b, i) => e.path[i] === b) ? e.path.slice(box.length) : e.path
    return [...inside, e.label]
  }
  const add = (section: SectionId, anchor: string, field: string[] | null, crumbs: string[], advanced = false) =>
    items.push({ section, anchor, field, crumbs, normalized: crumbs.map(normalizeForSearch), advanced })
  for (const s of sections) {
    const head = s.folder ? [s.folder, s.label] : [s.label]
    add(s.id, '', null, head)
    for (const e of entries)
      if (e.section === s.id)
        add(s.id, e.anchor, e.box ? null : relative(e), [...head, ...e.path, e.label], e.advanced === true)
  }
  return items
}

/** 今のモードで画面に描かれる項目だけにする。上級者モードだけの箱・欄は、通常モードでは飛んでも見つからない */
export function itemsForMode(items: readonly SearchItem[], advanced: boolean): readonly SearchItem[] {
  return advanced ? items : items.filter((i) => !i.advanced)
}

let cache: Promise<SearchItem[]> | null = null

/** 検索を初めて開いたときに読み、あとは使い回す */
export function loadSearchIndex(): Promise<SearchItem[]> {
  cache ??= import('./search-index.generated.json').then((m) => toSearchItems(m.default as SearchEntry[]))
  cache.catch(() => (cache = null))
  return cache
}

const crumbsKey = (crumbs: readonly string[]) => crumbs.join('\u001f')

/**
 * 検索語を空白で区切り、すべての語がパンくずのどこかに部分一致する項目を返す。
 * パンくずの途中（A > B > C > D の C）までですべての語が揃うときは、その下（D）は出さずに C を1件だけ出す。
 * ただし D の名前にも語が含まれる（A > B > C > DC）ときは、D も出す。
 * C そのものが項目にない（フォルダなど）ときは、その下でいちばん浅い項目を出す。
 * 名前そのものに一致するものを先に並べる
 */
export function searchItems(items: readonly SearchItem[], query: string): SearchItem[] {
  const words = normalizeForSearch(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const byCrumbs = new Map<string, SearchItem>()
  for (const item of items) if (!byCrumbs.has(crumbsKey(item.crumbs))) byCrumbs.set(crumbsKey(item.crumbs), item)

  const seen = new Set<SearchItem>()
  const hits: { item: SearchItem; rank: number }[] = []
  for (const item of items) {
    const crumbs = item.normalized
    // すべての語が揃う、いちばん短いパンくずの長さ
    let depth = 0
    while (depth < crumbs.length && !words.every((w) => crumbs.slice(0, depth + 1).some((c) => c.includes(w)))) depth++
    if (depth === crumbs.length) continue
    // 自分の名前にも語が含まれる（A > B > C > DC を C で探す）なら、外側の C とは別にそのまま出す
    const ownMatch = words.some((w) => crumbs[crumbs.length - 1].includes(w))
    let shown: SearchItem = item
    for (let n = depth + 1; !ownMatch && n <= item.crumbs.length; n++) {
      const found = byCrumbs.get(crumbsKey(item.crumbs.slice(0, n)))
      if (found) {
        shown = found
        break
      }
    }
    if (seen.has(shown)) continue
    seen.add(shown)
    const name = shown.normalized[shown.normalized.length - 1]
    const rank = words.every((w) => name.includes(w)) ? (words.join('') === name ? 0 : 1) : 2
    hits.push({ item: shown, rank })
  }
  // sort は安定なので、同じ順位の中は画面の並び順のまま
  return hits.sort((a, b) => a.rank - b.rank).map((h) => h.item)
}
