import { sections, type SectionId } from '@/features/sections'
import type { FieldName } from './search-collector'

/**
 * URL のハッシュで開く画面・箱・欄を表す（`#/画面/箱の anchor/~/箱の中の小見出し…/欄の名前`）。
 * 静的サイトを任意のパスに置くので、パスではなくハッシュを使う。
 * 例：`#/npc` は「世界 / NPC」、`#/npc/npc-flags/dojo` はその「NPCイベントフラグ」の「道場・先生」、
 * `#/hero/vitals/~/HP/現在` は「HP・活力・つま斬り」の箱の「HP」の「現在」の欄
 */
export type Route = {
  section: SectionId
  /** 箱の anchor（anchorPath でつないだもの）。画面だけなら null */
  anchor: string | null
  /** 欄・小見出しの、いちばん内側の箱より内側の名前の並び（最後が欄の名前）。箱・画面なら null */
  field?: readonly string[] | null
}

/** anchor と欄の名前の境目の区切り。anchor の名前には使わない */
const FIELD_MARK = '~'

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
  const mark = rest.indexOf(FIELD_MARK)
  const anchor = (mark < 0 ? rest : rest.slice(0, mark)).filter(Boolean).join('/')
  const field = mark < 0 ? [] : rest.slice(mark + 1).filter(Boolean)
  return { section: head as SectionId, anchor: anchor || null, field: field.length > 0 ? field : null }
}

export function formatHash({ section, anchor, field }: Route): string {
  const parts = [section, ...(anchor ? anchor.split('/') : []), ...(field?.length ? [FIELD_MARK, ...field] : [])]
  return `#/${parts.map(encodeURIComponent).join('/')}`
}

/**
 * 欄・小見出しの中から、URL の anchor と欄の名前の並びに合うものを選ぶ。
 * 欄の名前は外側の箱と小見出しの名前（path）を含み、URL には箱より内側の名前だけを書く。
 * anchor が同じで、名前の並び（path と label）が field で終わるもののうち、いちばん短いものを返す
 */
export function matchField<T extends FieldName>(fields: Iterable<T>, anchor: string | null, field: readonly string[]): T | undefined {
  let best: { target: T; length: number } | undefined
  for (const target of fields) {
    const names = [...target.path, target.label]
    if (target.anchor !== (anchor ?? '') || names.length < field.length) continue
    if (!field.every((f, i) => names[names.length - field.length + i] === f)) continue
    if (!best || names.length < best.length) best = { target, length: names.length }
  }
  return best?.target
}
