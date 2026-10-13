/** 全角・半角、大文字・小文字、カタカナ・ひらがなの違いを無視して比べるための形 */
export function normalizeForSearch(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
}

/** 検索語が terms のどれかに部分一致するか。空の検索語はすべてに一致する */
export function matchesSearch(search: string, terms: readonly string[]): boolean {
  const q = normalizeForSearch(search.trim())
  if (!q) return true
  return terms.some((t) => normalizeForSearch(t).includes(q))
}

/** cmdk で表示名・読み・説明を部分一致で探す。 */
export function substringFilter(_value: string, search: string, keywords?: string[]): number {
  return matchesSearch(search, keywords ?? []) ? 1 : 0
}
