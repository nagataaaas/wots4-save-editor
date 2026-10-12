import { useCallback, useState, type ReactNode } from 'react'
import { AdvancedModeContext } from '@/lib/advanced-mode-context'

const STORAGE_KEY = 'wots4-save-editor:advanced-mode'

/** 保存した上級者モードの状態を読む。読めない（プライベートモード・ストレージの無効化など）ときはオフ */
function loadAdvanced(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/** 上級者モードの状態を残す。残せなくても切り替えは止めない */
function storeAdvanced(advanced: boolean): void {
  try {
    if (advanced) localStorage.setItem(STORAGE_KEY, '1')
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 残せないときはこのページを開いている間だけ保持する
  }
}

/** 上級者モードの状態を画面全体に共有する。localStorage に残し、ページを開き直しても保持する */
export function AdvancedModeProvider({ children }: { children: ReactNode }) {
  const [advanced, setAdvancedState] = useState(loadAdvanced)
  const setAdvanced = useCallback((value: boolean) => {
    setAdvancedState(value)
    storeAdvanced(value)
  }, [])
  return <AdvancedModeContext.Provider value={{ advanced, setAdvanced }}>{children}</AdvancedModeContext.Provider>
}
