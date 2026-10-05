import { useState, type ReactNode } from 'react'
import { AdvancedModeContext } from '@/lib/advanced-mode-context'

/** 上級者モードの状態を画面全体に共有する。読み込み直しても保持し、ページを開き直すとオフに戻る */
export function AdvancedModeProvider({ children }: { children: ReactNode }) {
  const [advanced, setAdvanced] = useState(false)
  return <AdvancedModeContext.Provider value={{ advanced, setAdvanced }}>{children}</AdvancedModeContext.Provider>
}
