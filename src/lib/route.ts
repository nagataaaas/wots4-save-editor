import { sections, type SectionId } from '@/features/sections'

/**
 * URL のハッシュで開く画面と箱を表す（`#/画面/箱の anchor`）。
 * 静的サイトを任意のパスに置くので、パスではなくハッシュを使う。
 * 例：`#/npc` は「世界 / NPC」、`#/npc/npc-flags/dojo` はその「NPCイベントフラグ」の「道場・先生」
 */
export type Route = {
  section: SectionId
  /** 箱の anchor（anchorPath でつないだもの）。画面だけなら null */
  anchor: string | null
}

const SECTION_IDS = new Set<string>(sections.map((s) => s.id))

/** ハッシュを読む。画面が分からないときは null */
export function parseHash(hash: string): Route | null {
  const path = hash.replace(/^#\/?/, '')
  const [head, ...rest] = path.split('/').map((p) => {
    try {
      return decodeURIComponent(p)
    } catch {
      return p
    }
  })
  if (!head || !SECTION_IDS.has(head)) return null
  const anchor = rest.filter(Boolean).join('/')
  return { section: head as SectionId, anchor: anchor || null }
}

export function formatHash({ section, anchor }: Route): string {
  const parts = [section, ...(anchor ? anchor.split('/') : [])]
  return `#/${parts.map(encodeURIComponent).join('/')}`
}
