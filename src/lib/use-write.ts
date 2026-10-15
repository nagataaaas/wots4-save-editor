import { useContext } from 'react'
import { errorMessage } from './error-message'
import { tr } from './i18n'
import { SaveContext } from './save-context'
import { useScopedState } from './use-scoped-state'

export type WriteMessage = { error: boolean; text: string } | null

export type AttemptResult<T> = { ok: true; value: T } | { ok: false }

/** 成功文。値から作るときは関数で渡す（書き込みの結果の報告など） */
export type SuccessText<T> = string | ((value: T) => string)

/**
 * 書き込みと、その結果の表示。結果はこのフックを呼んだ部品が自分の近くに出す。
 * 読み込み直したとき（と scope が変わったとき）は古い結果を出さない。失敗時の途中変更は SaveProvider が捨てる。
 *
 * - write：書き込んで mutate の戻り値を返す。失敗は例外のまま投げる（FieldRow など、自分でエラーを出す欄に渡す）
 * - attempt：action の例外を受け止めて message に入れる。ボタン・スイッチ・選択欄など、自分では例外を出さない操作に使う。
 *   success を渡すと、成功したときにそれを成功文にする。渡さなければ成功で message を消す
 * - tryWrite：attempt(() => write(mutate), success) の略
 */
export function useWrite(scope?: string | number) {
  const update = useContext(SaveContext)?.update
  const [message, setMessage] = useScopedState<NonNullable<WriteMessage>>(scope)

  function write<T>(mutate: (bytes: Uint8Array) => T): T {
    if (!update) throw new Error(tr({ ja: 'セーブファイルが読み込まれていません', en: 'No save file loaded' }))
    let result!: T
    update(bytes => { result = mutate(bytes) })
    return result
  }

  function attempt<T>(action: () => T, success?: SuccessText<T>): AttemptResult<T> {
    try {
      const value = action()
      setMessage(success === undefined ? null : { error: false, text: typeof success === 'function' ? success(value) : success })
      return { ok: true, value }
    } catch (error) {
      setMessage({ error: true, text: errorMessage(error) })
      return { ok: false }
    }
  }

  const tryWrite = <T,>(mutate: (bytes: Uint8Array) => T, success?: SuccessText<T>) => attempt(() => write(mutate), success)

  return { write, attempt, tryWrite, message, error: message?.error ? message.text : null, setMessage }
}
