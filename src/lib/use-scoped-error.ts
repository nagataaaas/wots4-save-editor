import { useContext, useState } from 'react'
import { SaveContext } from './save-context'

/** 読み込み直し（と scope の変化）で消えるエラー文。欄を key で作り直さずに、前のセーブのエラーを残さない。 */
export function useScopedError(scope: string | number = '') {
  const loadId = useContext(SaveContext)?.save?.loadId
  const source = `${loadId}:${scope}`
  const [state, setState] = useState({ source, error: null as string | null })
  const error = state.source === source ? state.error : null
  const setError = (error: string | null) => setState({ source, error })
  return [error, setError] as const
}
