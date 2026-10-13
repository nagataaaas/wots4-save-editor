import { createContext, useCallback, useContext, useRef, type RefObject } from 'react'

export type NavigationTargetRegistry = {
  boxes: Map<string, HTMLElement>
  fields: Map<string, HTMLElement>
  changed: RefObject<() => void>
}
export const NavigationTargetContext = createContext<NavigationTargetRegistry | null>(null)

export function useNavigationTarget(kind: 'boxes' | 'fields', key: string) {
  const targets = useContext(NavigationTargetContext)
  const current = useRef<HTMLElement | null>(null)
  return useCallback((element: HTMLElement | null) => {
    if (!targets) return
    if (element) targets[kind].set(key, element)
    else if (targets[kind].get(key) === current.current) targets[kind].delete(key)
    current.current = element
    targets.changed.current()
  }, [targets, kind, key])
}
