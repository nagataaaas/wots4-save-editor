import { errorMessage } from './error-message'
import { useScopedError } from './use-scoped-error'

export function useFieldAction(scope?: string | number) {
  const [error, setError] = useScopedError(scope)
  const run = (action: () => void) => {
    setError(null)
    try { action(); return true } catch (e) { setError(errorMessage(e)); return false }
  }
  return { error, setError, run }
}
