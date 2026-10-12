import { createContext, useContext, useEffect, useState } from 'react'
import type { SectionId } from '@/features/sections'
import { useIndexing } from '@/lib/search-collector'

/**
 * 画面の切り替え。ほかの画面の項目へのリンクに使う。
 * anchor を渡すと、切り替えた先の画面で、その anchor を持つ箱（CollapsibleCard・FlagSection など）が自分で開いてスクロールする（useAnchor）
 */
export type NavigationValue = {
  /**
   * field は欄・小見出しへ飛ぶときの、いちばん内側の箱より内側の名前の並び（Route の field）。
   * 箱を開いたあと、箱ではなくその要素までスクロールして枠で目立たせる（App）
   */
  go: (section: SectionId, anchor?: string, field?: readonly string[]) => void
  /** いま開いている画面 */
  section: SectionId
  /** 直前の go で渡された anchor。サイドバーで切り替えたときは null */
  anchor: string | null
  /** 直前の go・URL で渡された field */
  field: readonly string[] | null
  /** go を呼ぶたびに増える。同じ anchor へもう一度飛んだときにも開いてスクロールし直すために使う */
  seq: number
}

/**
 * 箱の名前を外側からつないだ anchor（「NPCイベントフラグ」のカード npc-flags の中の「道場・先生」なら npc-flags/dojo）。
 * リンク先の anchor は、箱のある画面が自分の箱の名前からこれで作って出す
 */
export const anchorPath = (...names: string[]): string => names.filter(Boolean).join('/')

export const NavigationContext = createContext<NavigationValue | null>(null)

export function useNavigation(): NavigationValue {
  const ctx = useContext(NavigationContext)
  if (!ctx) throw new Error('useNavigation は NavigationContext の内側で使う')
  return ctx
}

/** 外側の箱の anchor。箱は自分の anchor をこれで中身に渡す（`<AnchorScope.Provider value={id}>`） */
export const AnchorScope = createContext<string>('')

/** 外側の箱が開くアニメーション（collapsible-card の duration-200）のあとに位置が決まる */
const SCROLL_DELAY_MS = 250

export type AnchorState = {
  /** 外側の箱の anchor をつないだ、この箱の anchor。DOM の id にも使う */
  id: string
  /** リンク先がこの箱か、この箱の中。開閉できる箱はこのとき開く */
  targeted: boolean
  /** リンクで飛ぶたびに変わる。開閉できる箱が、同じリンクで飛び直したときにも開き直すために使う */
  seq: number
}

/**
 * 箱の anchor。リンク先がこの箱そのものなら、この箱（id の要素）までスクロールする。
 * 箱の要素には id と scroll-mt-4 を付ける
 */
export function useAnchor(name: string): AnchorState {
  const parent = useContext(AnchorScope)
  const id = anchorPath(parent, name)
  const { anchor, field, seq } = useNavigation()
  // 欄へ飛ぶときは、箱ではなく欄までスクロールする
  const self = anchor === id && field === null
  const targeted = anchor !== null && (anchor === id || anchor.startsWith(`${id}/`))

  useEffect(() => {
    if (!self) return
    const t = window.setTimeout(
      () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      SCROLL_DELAY_MS,
    )
    return () => window.clearTimeout(t)
  }, [self, id, seq])

  return { id, targeted, seq }
}

/**
 * 開閉できる箱の anchor と開閉の状態。リンク先がこの箱かその中なら開く（リンクごとに1回。画面にいるまま同じ箱へもう一度リンクしたときも開く）。
 * 箱の要素には id と scroll-mt-4 を付け、中身は `<AnchorScope.Provider value={id}>` で包む。
 * 検索の索引を作るとき（useIndexing）は、中の欄を拾うために常に開いて描く
 */
export function useAnchoredOpen(name: string, defaultOpen = false) {
  const indexing = useIndexing()
  const { id, targeted, seq } = useAnchor(name)
  const [open, setOpen] = useState(defaultOpen || targeted)
  const [openedFor, setOpenedFor] = useState(seq)
  if (targeted && openedFor !== seq) {
    setOpenedFor(seq)
    setOpen(true)
  }
  return { id, open: open || indexing, setOpen }
}
