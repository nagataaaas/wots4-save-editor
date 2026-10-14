import { useContext, useState } from 'react'
import { SaveContext } from './save-context'

/**
 * 読み込み直し（と scope の変化）で null に戻る値（書き込みのエラー文・成功文など）。
 * 欄を key で作り直さずに、前のセーブの結果を残さない。
 */
export function useScopedState<T>(scope: string | number = '') {
  const loadId = useContext(SaveContext)?.save?.loadId
  const source = `${loadId}:${scope}`
  const [state, setState] = useState({ source, value: null as T | null })
  const value = state.source === source ? state.value : null
  const setValue = (value: T | null) => setState({ source, value })
  return [value, setValue] as const
}
