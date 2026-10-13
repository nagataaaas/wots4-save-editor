import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { matchFieldKey } from './route'
import { NavigationTargetContext, type NavigationTargetRegistry } from './navigation-target-context'

/** 欄を探す移動で、箱だけが見つかったあと、欄が後から描かれるのを待つ時間 */
const FIELD_WAIT_MS = 2000
/** 箱の開閉のアニメーションを待つ上限。終わらないアニメーション（読み込み中の表示など）があっても移動する */
const ANIMATION_WAIT_MS = 600

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

/**
 * 箱・欄のマウント完了を受けて、一か所でスクロールする。
 * 欄への移動で欄がまだなく箱だけがあるときは、いったん箱へ移り、FIELD_WAIT_MS のあいだ欄が登録されるのを待って欄へ移り直す
 */
export function NavigationTargets({ anchor, field, seq, children }: {
  anchor: string | null; field: readonly string[] | null; seq: number; children: ReactNode
}) {
  const changed = useRef(() => {})
  const targets = useMemo<NavigationTargetRegistry>(() => ({ boxes: new Map(), fields: new Map(), changed }), [changed])
  useLayoutEffect(() => {
    let frame = 0
    let clear = 0
    let giveUp = 0
    let cancelled = false
    let completed = false
    let generation = 0
    let hit: HTMLElement | null = null
    const reveal = (element: HTMLElement, kind: 'field' | 'box') => {
      if (hit) delete hit.dataset.searchHit
      window.clearTimeout(clear)
      element.scrollIntoView({ behavior: 'smooth', block: kind === 'field' ? 'center' : 'start' })
      element.dataset.searchHit = kind
      hit = element
      clear = window.setTimeout(() => { delete element.dataset.searchHit }, 2000)
    }
    const schedule = () => {
      if (completed) return
      const run = ++generation
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(async () => {
          const key = field ? matchFieldKey([...targets.fields.keys()], anchor, field) : undefined
          const fieldElement = key ? targets.fields.get(key) : undefined
          let box: HTMLElement | undefined
          // セーブや絞り込みで行がない場合は、存在する最も内側の一覧・箱へ移動する。
          const names = anchor?.split('/') ?? []
          while (names.length && !box) {
            box = targets.boxes.get(names.join('/'))
            names.pop()
          }
          const element = fieldElement ?? box
          if (!element) return
          // 箱の開閉による位置の変化が終わってから移動する。
          await settleAnimations(element, targets.boxes.values())
          if (cancelled || run !== generation || !element.isConnected) return
          if (fieldElement || field === null) {
            completed = true
            window.clearTimeout(giveUp)
            reveal(element, fieldElement ? 'field' : 'box')
            return
          }
          // 欄がまだない：箱へ移っておき、欄の登録（changed）を待つ。待ちきれなければ箱で終える
          if (hit !== element) reveal(element, 'box')
          if (!giveUp) giveUp = window.setTimeout(() => { completed = true }, FIELD_WAIT_MS)
        })
      })
    }
    changed.current = schedule
    if (anchor !== null || field !== null) schedule()
    return () => {
      cancelled = true
      changed.current = () => {}
      cancelAnimationFrame(frame)
      window.clearTimeout(clear)
      window.clearTimeout(giveUp)
      if (hit) delete hit.dataset.searchHit
    }
  }, [targets, changed, anchor, field, seq])
  return <NavigationTargetContext.Provider value={targets}>{children}</NavigationTargetContext.Provider>
}
