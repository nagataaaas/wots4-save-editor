import { useMemo } from 'react'
import { useSave } from './save-context'
import { errorMessage } from './error-message'

/** view 自身の problem（多くのモジュールの View が持つ「読み取り専用にする理由」）。持たなければ null */
function ownProblem(view: unknown): string | null {
  if (typeof view !== 'object' || view === null || !('problem' in view)) return null
  return typeof view.problem === 'string' ? view.problem : null
}

/**
 * 読めない場合も画面の枠を描けるよう、値と読み込みエラーを分ける。
 * read はセーブか read 自体が変わったときに呼び直すので、描画をまたいで同じ関数を渡す
 * （モジュールの関数か、閉じ込める値を依存にした useCallback）。
 * problem は読み取り専用にする理由を view から取り出す。指定がなければ view 自身の problem を使い、
 * それもなければ、読めた値はすべて書き込める扱い。
 */
export function useSaveView<T>(
  read: (bytes: Uint8Array) => T | null,
  { problem: problemOf = ownProblem }: { problem?: (view: T) => string | null } = {},
) {
  const { save } = useSave()
  const result = useMemo((): { view: T; error: null } | { view: null; error: string | null } => {
    if (!save) return { view: null, error: null }
    try {
      const view = read(save.working)
      if (view === null) throw new RangeError('ファイルが小さすぎて読めません')
      return { view, error: null }
    } catch (error) {
      return { view: null, error: errorMessage(error) }
    }
  }, [save, read])
  const problem = result.view !== null ? problemOf(result.view) : null
  return { view: result.view, error: result.error, problem, readOnly: result.view === null || problem !== null }
}
