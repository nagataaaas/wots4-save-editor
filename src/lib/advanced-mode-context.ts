import { createContext, useContext } from 'react'

/**
 * 上級者モード。ゲーム上の正規の範囲を超える値を、システム上の範囲（型で書ける範囲）まで受け付ける。
 * AGENTS.md：正規範囲を超える値は、上級者モードを明示したときだけ許可する。切り替えはサイドバー（ユーザー判断 2026-10-05）
 */
export type AdvancedModeValue = {
  advanced: boolean
  setAdvanced: (advanced: boolean) => void
}

export const AdvancedModeContext = createContext<AdvancedModeValue | null>(null)

export function useAdvancedMode(): AdvancedModeValue {
  const ctx = useContext(AdvancedModeContext)
  if (!ctx) throw new Error('useAdvancedMode は AdvancedModeProvider の内側で使う')
  return ctx
}
