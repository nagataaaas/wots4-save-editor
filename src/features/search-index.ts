import { sections, type SectionId } from '@/features/sections'
import type { SearchEntry } from '@/lib/search-collector'
import { normalizeForSearch } from '@/lib/search'
import { getLanguage, trIn, type Language } from '@/lib/i18n'
import { matchField, type Route } from '@/lib/route'

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

/** 欄の、いちばん内側の箱より内側の名前の並び（URL に書く Route の field）を返す関数 */
function relativeFields(entries: readonly SearchEntry[]): (e: SearchEntry) => string[] {
  // 箱の anchor → 箱の名前までのパンくず。欄のパンくずからこれを除いたものを URL に書く
  const boxCrumbs = new Map<string, string[]>()
  for (const e of entries) if (e.box) boxCrumbs.set(`${e.section}${e.anchor}`, [...e.path, e.label])
  return (e) => {
    const box = boxCrumbs.get(`${e.section}${e.anchor}`) ?? []
    const inside = box.every((b, i) => e.path[i] === b) ? e.path.slice(box.length) : e.path
    return [...inside, e.label]
  }
}

/** 集めた名前（search-index.{lang}.generated.json）に、画面そのものと、フォルダ・画面の名前のパンくずを足す */
export function toSearchItems(entries: readonly SearchEntry[], lang: Language = getLanguage()): SearchItem[] {
  const items: SearchItem[] = []
  const relative = relativeFields(entries)
  const add = (section: SectionId, anchor: string, field: string[] | null, crumbs: string[], advanced = false) =>
    items.push({ section, anchor, field, crumbs, normalized: crumbs.map(normalizeForSearch), advanced })
  for (const s of sections) {
    const head = s.folder ? [trIn(s.folder, lang), trIn(s.label, lang)] : [trIn(s.label, lang)]
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

const entriesCache: Partial<Record<Language, Promise<SearchEntry[]>>> = {}
const itemsCache: Partial<Record<Language, Promise<SearchItem[]>>> = {}

function loadEntries(lang: Language): Promise<SearchEntry[]> {
  const loaded = (entriesCache[lang] ??= (
    lang === 'en' ? import('./search-index.en.generated.json') : import('./search-index.ja.generated.json')
  ).then((m) => m.default as SearchEntry[]))
  loaded.catch(() => delete entriesCache[lang])
  return loaded
}

/** 今の言語の索引。検索を初めて開いたときに読み、あとは使い回す */
export function loadSearchIndex(lang: Language = getLanguage()): Promise<SearchItem[]> {
  const loaded = (itemsCache[lang] ??= loadEntries(lang).then((entries) => toSearchItems(entries, lang)))
  loaded.catch(() => delete itemsCache[lang])
  return loaded
}

/**
 * 欄の URL（#/画面/箱/~/欄…）の欄の名前を lang の言語に読み替える。
 * 欄の名前は画面の言語で書くので、別の言語のリンクを開くと欄が見つからない。
 * lang の索引に合う欄がなく、ほかの言語の索引に合う欄があれば、同じ位置の lang の欄の名前にする（言語ごとの索引は同じ順に並ぶ）
 */
export function translateRouteField(route: Route, lang: Language, indexes: Readonly<Record<Language, readonly SearchEntry[]>>): Route {
  const field = route.field
  if (!field?.length) return route
  const find = (entries: readonly SearchEntry[]) =>
    matchField(entries.filter((e) => !e.box && e.section === route.section), route.anchor, field)
  if (find(indexes[lang])) return route
  for (const other of Object.keys(indexes) as Language[]) {
    if (other === lang) continue
    const found = find(indexes[other])
    if (!found) continue
    const target = indexes[lang][indexes[other].indexOf(found)]
    if (target) return { ...route, field: relativeFields(indexes[lang])(target) }
  }
  return route
}

/** translateRouteField を、索引を読んでから行う */
export async function translateRoute(route: Route, lang: Language = getLanguage()): Promise<Route> {
  if (!route.field?.length) return route
  const [ja, en] = await Promise.all([loadEntries('ja'), loadEntries('en')])
  return translateRouteField(route, lang, { ja, en })
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
