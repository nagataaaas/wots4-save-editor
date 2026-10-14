import { createContext, useCallback, useContext, useRef, type RefObject } from 'react'
import { matchField } from './route'
import type { FieldName } from './search-collector'

/** 移動先になれる欄・小見出しの要素と、その名前 */
export type FieldTarget<E = HTMLElement> = FieldName & { element: E }

/**
 * 移動先の要素。field があればそれに合う欄（matchField）、なければ anchor の箱。
 * 箱は anchor を外側へたどって、登録されているいちばん内側のものを使う（セーブや絞り込みで行がない場合）。
 * kind は見つかったのが欄か箱か。どちらもなければ null
 */
export function findNavigationTarget<E>(
  targets: { boxes: ReadonlyMap<string, E>; fields: Iterable<FieldTarget<E>> },
  anchor: string | null,
  field: readonly string[] | null,
): { element: E; kind: 'field' | 'box' } | null {
  const fieldTarget = field ? matchField(targets.fields, anchor, field) : undefined
  if (fieldTarget) return { element: fieldTarget.element, kind: 'field' }
  const names = anchor?.split('/') ?? []
  for (; names.length > 0; names.pop()) {
    const box = targets.boxes.get(names.join('/'))
    if (box !== undefined) return { element: box, kind: 'box' }
  }
  return null
}

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
