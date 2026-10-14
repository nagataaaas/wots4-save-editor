import { createContext, useCallback, useContext, useRef, type RefObject } from 'react'
import type { FieldName } from './search-collector'

/** 移動先になれる欄・小見出しの要素と、その名前 */
export type FieldTarget = FieldName & { element: HTMLElement }

export type NavigationTargetRegistry = {
  /** 箱の anchor ごとの要素 */
  boxes: Map<string, HTMLElement>
  fields: Set<FieldTarget>
  changed: RefObject<() => void>
}
export const NavigationTargetContext = createContext<NavigationTargetRegistry | null>(null)

/** 箱の要素を移動先として登録する ref */
export function useBoxTarget(id: string) {
  const targets = useContext(NavigationTargetContext)
  const current = useRef<HTMLElement | null>(null)
  return useCallback((element: HTMLElement | null) => {
    if (!targets) return
    if (element) targets.boxes.set(id, element)
    else if (targets.boxes.get(id) === current.current) targets.boxes.delete(id)
    current.current = element
    targets.changed.current()
  }, [targets, id])
}

/** 欄・小見出しの要素を移動先として登録する ref。path は描画をまたいで同じ配列を渡す（SearchPath が作るもの） */
export function useFieldTarget({ anchor, path, label }: FieldName) {
  const targets = useContext(NavigationTargetContext)
  const current = useRef<FieldTarget | null>(null)
  return useCallback((element: HTMLElement | null) => {
    if (!targets) return
    if (current.current) targets.fields.delete(current.current)
    current.current = element ? { anchor, path, label, element } : null
    if (current.current) targets.fields.add(current.current)
    targets.changed.current()
  }, [targets, anchor, path, label])
}
