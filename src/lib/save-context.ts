import { createContext, useContext } from 'react'

export type LoadedSave = {
  name: string
  /** 読み込んだままのバイト列（履歴から復元したときは、その組の読み込みの版）。変更しない */
  original: Uint8Array
  /** 編集対象のバイト列（original のコピー） */
  working: Uint8Array
  /** 最後に「保存」でダウンロードした内容。未保存なら original と同じ */
  saved: Uint8Array
  /** 読み込みごとに増える番号。画面側の入力途中の値を読み込み直しで捨てるために使う */
  loadId: number
  /** 履歴（src/lib/history-db.ts）の組の id。履歴に残せなかったときは null */
  sessionId: number | null
}

export type SaveContextValue = {
  save: LoadedSave | null
  error: string | null
  /** working と original（読み込み時）で異なるバイト数 */
  changedBytes: number
  /** working と saved（最後に保存した内容）で異なるバイト数 */
  unsavedBytes: number
  load: (file: File) => Promise<void>
  /**
   * working を書き換える。mutator には working のコピーを渡し、例外が出なければ反映する。
   * 例外が出た場合は何も変えずに、その例外を投げ直す。
   */
  update: (mutator: (bytes: Uint8Array) => void) => void
  downloadEdited: () => void
  /** 履歴の版 id を編集中のデータにする。組に紐づいたままなので、続けて保存すると同じ組に版が増える */
  restore: (id: number) => Promise<void>
  /** 履歴を全部消す */
  clearHistory: () => Promise<void>
  /** 履歴が変わるたびに増える番号。一覧の読み直しに使う */
  historyVersion: number
}

export const SaveContext = createContext<SaveContextValue | null>(null)

export function useSave(): SaveContextValue {
  const ctx = useContext(SaveContext)
  if (!ctx) throw new Error('useSave は SaveProvider の内側で使う')
  return ctx
}
