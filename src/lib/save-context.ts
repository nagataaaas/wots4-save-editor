import { createContext, useContext } from 'react'

export type LoadedSave = {
  name: string
  /** 読み込んだままのバイト列。バックアップの書き出しに使い、変更しない */
  original: Uint8Array
  /** 編集対象のバイト列（original のコピー） */
  working: Uint8Array
  /** 最後に「保存」でダウンロードした内容。未保存なら original と同じ */
  saved: Uint8Array
  /** 読み込みごとに増える番号。画面側の入力途中の値を読み込み直しで捨てるために使う */
  loadId: number
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
  downloadBackup: () => void
  downloadEdited: () => void
}

export const SaveContext = createContext<SaveContextValue | null>(null)

export function useSave(): SaveContextValue {
  const ctx = useContext(SaveContext)
  if (!ctx) throw new Error('useSave は SaveProvider の内側で使う')
  return ctx
}
