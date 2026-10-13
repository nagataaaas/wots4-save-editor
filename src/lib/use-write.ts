import { useState } from 'react'
import { errorMessage } from './error-message'
import { useSave } from './save-context'

export type WriteMessage = { error: boolean; text: string } | null

/**
 * 書き込みと、その結果の表示。結果はこのフックを呼んだ部品が自分の近くに出す。
 * 読み込み直したら古い結果は出さない。失敗時の途中変更は SaveProvider が捨てる。
 */
export function useWrite() {
  const { save, update } = useSave()
  const [state, setState] = useState<{ loadId: number | undefined; message: WriteMessage }>({ loadId: save?.loadId, message: null })
  const message = state.loadId === save?.loadId ? state.message : null
  const setMessage = (message: WriteMessage) => setState({ loadId: save?.loadId, message })

  /** 書き込んで mutate の戻り値を返す。失敗は例外のまま投げる（FieldRow・SelectRow などの欄がその場に出す） */
  function write<T>(mutate: (bytes: Uint8Array) => T): T {
    let result!: T
    update(bytes => { result = mutate(bytes) })
    return result
  }

  /**
   * action の例外を受け止めて error に入れる。ボタン・スイッチなど、自分ではエラーを出さない操作に使う。
   * label を渡すと、成功したときにそれを成功文として message に入れる
   */
  function attempt<T>(action: () => T, label?: string): { ok: true; value: T } | { ok: false } {
    try {
      const value = action()
      setMessage(label === undefined ? null : { error: false, text: label })
      return { ok: true, value }
    } catch (error) {
      setMessage({ error: true, text: errorMessage(error) })
      return { ok: false }
    }
  }

  const tryWrite = <T,>(mutate: (bytes: Uint8Array) => T) => attempt(() => write(mutate))

  /** 書き込みに成功したら label を成功文として出す。成功したら true */
  const run = (label: string, mutate: (bytes: Uint8Array) => unknown): boolean =>
    attempt(() => write(mutate), label).ok

  return { write, attempt, tryWrite, run, message, error: message?.error ? message.text : null, setMessage }
}
