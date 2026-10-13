import { useContext, useState } from 'react'
import { SaveContext } from './save-context'
import { errorMessage } from './error-message'

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string }

/** 入力中だけ文字列を保持する。外部の値と読み込み直しは、欄を作り直さず表示に反映する。 */
export function useFieldDraft<T>({ value, format, parse, apply, identity, commitOn = 'change' }: {
  value: T | null
  format: (value: T) => string
  parse: (input: string) => ParseResult<T>
  apply: (value: T) => void
  identity: string | number
  commitOn?: 'change' | 'blur'
}) {
  const loadId = useContext(SaveContext)?.save?.loadId
  const formatted = value === null ? '' : format(value)
  // base は入力途中の値を受け付けたときのセーブ上の値。フォーカス外でエラーを残している間に外から値が変わったら、入力途中の値を捨てる
  const empty = { loadId, identity, base: formatted, focused: false, draft: '', error: null as string | null }
  const [state, setState] = useState(empty)
  const stale = !state.focused && state.error !== null && state.base !== formatted
  const current = state.loadId === loadId && state.identity === identity && value !== null && !stale
  // 同じ位置へ戻ったときにも、以前の入力が復活しないように破棄する。
  if (state.loadId !== loadId || state.identity !== identity || stale || (value === null && (state.focused || state.error !== null))) {
    setState(empty)
  }
  const focused = current && state.focused
  const error = current ? state.error : null
  const input = current && (focused || error !== null) ? state.draft : formatted

  function validateAndApply(draft: string) {
    let error: string | null = null
    const result = parse(draft)
    if (!result.ok) error = result.error
    else if (format(result.value) !== formatted) {
      try { apply(result.value) } catch (e) { error = errorMessage(e) }
    }
    return error
  }

  function change(draft: string) {
    if (value === null) return
    const error = commitOn === 'change' ? validateAndApply(draft) : null
    setState({ ...empty, focused, draft, error })
  }

  function commit(focused: boolean) {
    if (value === null) return
    setState({ ...empty, focused, draft: input, error: validateAndApply(input) })
  }

  return {
    input, error, focused, change, commit: () => commit(focused),
    focus: () => setState({ ...empty, focused: true, draft: input, error }),
    blur: () => commitOn === 'blur' ? commit(false) : setState(empty),
  }
}
