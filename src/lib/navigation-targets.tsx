import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { findNavigationTarget, NavigationTargetContext, type NavigationTargetRegistry } from './navigation-target-context'

/** 欄を探す移動で、箱だけが見つかったあと、欄が後から描かれるのを待つ時間 */
const FIELD_WAIT_MS = 2000
/** 箱の開閉のアニメーションを待つ上限。終わらないアニメーション（読み込み中の表示など）があっても移動する */
const ANIMATION_WAIT_MS = 600
/** 移動先の枠を出しておく時間 */
const HIGHLIGHT_MS = 2000

/** 要素を含む箱で動いている、終わりのあるアニメーションが終わるまで待つ（上限 ANIMATION_WAIT_MS） */
function settleAnimations(element: HTMLElement, boxes: Iterable<HTMLElement>): Promise<unknown> {
  const animations = element.getAnimations().concat(
    ...[...boxes].filter((box) => box.contains(element)).map((box) => box.getAnimations({ subtree: true })),
  ).filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
  if (animations.length === 0) return Promise.resolve()
  return Promise.race([
    Promise.allSettled(animations.map((animation) => animation.finished)),
    new Promise((resolve) => window.setTimeout(resolve, ANIMATION_WAIT_MS)),
  ])
}

/** 移動先までスクロールして枠（data-search-hit）で目立たせる。枠は次の reveal・HIGHLIGHT_MS 後・dispose で消す */
function createHighlight() {
  let hit: HTMLElement | null = null
  let clear = 0
  return {
    get current() {
      return hit
    },
    reveal(element: HTMLElement, kind: 'field' | 'box') {
      if (hit) delete hit.dataset.searchHit
      window.clearTimeout(clear)
      element.scrollIntoView({ behavior: 'smooth', block: kind === 'field' ? 'center' : 'start' })
      element.dataset.searchHit = kind
      hit = element
      clear = window.setTimeout(() => { delete element.dataset.searchHit }, HIGHLIGHT_MS)
    },
    dispose() {
      window.clearTimeout(clear)
      if (hit) delete hit.dataset.searchHit
    },
  }
}

/**
 * 箱・欄のマウント完了を受けて、一か所でスクロールする。
 * 欄への移動で欄がまだなく箱だけがあるときは、いったん箱へ移り、FIELD_WAIT_MS のあいだ欄が登録されるのを待って欄へ移り直す
 */
export function NavigationTargets({ anchor, field, seq, children }: {
  anchor: string | null; field: readonly string[] | null; seq: number; children: ReactNode
}) {
  const changed = useRef(() => {})
  const targets = useMemo<NavigationTargetRegistry>(() => ({ boxes: new Map(), fields: new Set(), changed }), [changed])
  useLayoutEffect(() => {
    // 移動先がなければ、箱・欄が増えても何もしない
    if (anchor === null && field === null) return
    const highlight = createHighlight()
    /** schedule のたびに増やす。古い待ちの結果は捨てる（後片付けでも増やす） */
    let generation = 0
    let frame = 0
    /** 欄へ移ったか、欄を待ちきれなかった。このあとの登録では移動しない */
    let finished = false
    let giveUp = 0
    const step = async (run: number) => {
      const target = findNavigationTarget(targets, anchor, field)
      if (!target) return
      // 箱の開閉による位置の変化が終わってから移動する。
      await settleAnimations(target.element, targets.boxes.values())
      if (run !== generation || !target.element.isConnected) return
      if (target.kind === 'field' || field === null) {
        finished = true
        window.clearTimeout(giveUp)
        highlight.reveal(target.element, target.kind)
        return
      }
      // 欄がまだない：箱へ移っておき、欄の登録（changed）を待つ。待ちきれなければ箱で終える
      if (highlight.current !== target.element) highlight.reveal(target.element, 'box')
      if (!giveUp) giveUp = window.setTimeout(() => { finished = true }, FIELD_WAIT_MS)
    }
    // 登録が続けて変わっても、描画が落ち着いた2フレーム後に1回だけ探す
    const schedule = () => {
      if (finished) return
      const run = ++generation
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => void step(run))
      })
    }
    changed.current = schedule
    schedule()
    return () => {
      generation++
      changed.current = () => {}
      cancelAnimationFrame(frame)
      window.clearTimeout(giveUp)
      highlight.dispose()
    }
  }, [targets, changed, anchor, field, seq])
  return <NavigationTargetContext.Provider value={targets}>{children}</NavigationTargetContext.Provider>
}
