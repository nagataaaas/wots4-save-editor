import { createContext, useContext, useState } from 'react'
import { useBoxTarget } from './navigation-target-context'
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
  /**
   * 箱の id ごとの、最後に移動で開いた seq（箱そのものか、その中が移動先になったとき）。
   * 開閉できる箱が、移動で開いたことを覚えておくのに使う（useAnchoredOpen）。省略は移動なし
   */
  openedSeqs?: ReadonlyMap<string, number>
}

/**
 * anchor への移動（seq）で開く箱として、anchor とその外側の箱の id の seq を更新した表を返す。
 * 表は移動先になった箱とその外側の箱の数までしか増えない
 */
export function markOpened(
  openedSeqs: ReadonlyMap<string, number>,
  anchor: string | null,
  seq: number,
): ReadonlyMap<string, number> {
  if (!anchor) return openedSeqs
  const next = new Map(openedSeqs)
  const names = anchor.split('/')
  for (let n = 1; n <= names.length; n++) next.set(names.slice(0, n).join('/'), seq)
  return next
}

/**
 * 開閉できる箱 id が開いているか。manual は手で開閉したとき（マウント時はその時点）の seq と開閉。
 * 箱かその中が manual.seq より後に移動先になっていれば開く。
 * 次の移動先が別の箱でも、移動で開いた箱は閉じない（最後に移動で開いた seq は変わらないため）。
 * 移動で開いたあとも手で閉じられる（manual.seq が移動の seq に追いつく）
 */
export function anchoredOpen(
  openedSeqs: ReadonlyMap<string, number> | undefined,
  id: string,
  manual: { seq: number; open: boolean },
): boolean {
  const seq = openedSeqs?.get(id)
  return (seq !== undefined && seq > manual.seq) || manual.open
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

export type AnchorState = {
  ref: (element: HTMLElement | null) => void
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
  const { anchor, seq } = useNavigation()
  const targeted = anchor !== null && (anchor === id || anchor.startsWith(`${id}/`))

  const ref = useBoxTarget(id)
  return { id, targeted, seq, ref }
}

/**
 * 開閉できる箱の anchor と開閉の状態。リンク先がこの箱かその中なら開く（リンクごとに1回。画面にいるまま同じ箱へもう一度リンクしたときも開く）。
 * 箱の要素には id と scroll-mt-4 を付け、中身は `<AnchorScope.Provider value={id}>` で包む。
 * 検索の索引を作るとき（useIndexing）は、中の欄を拾うために常に開いて描く
 */
export function useAnchoredOpen(name: string, defaultOpen = false) {
  const indexing = useIndexing()
  const { id, targeted, seq, ref } = useAnchor(name)
  const { openedSeqs } = useNavigation()
  // マウント時に移動先なら、その移動で開く（seq を -1 にして、移動の seq より前に開閉したことにする）
  const [manual, setManual] = useState(() => ({ seq: targeted ? -1 : seq, open: defaultOpen }))
  const setOpen = (value: boolean) => setManual({ seq, open: value })
  return { id, ref, open: anchoredOpen(openedSeqs, id, manual) || indexing, setOpen }
}
