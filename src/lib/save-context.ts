import { createContext, useContext } from 'react'

export type LoadedSave = {
  name: string
  /** 読み込んだままのバイト列（履歴から復元したときは、その組の読み込みの版）。変更しない */
  original: Uint8Array
  /** 編集対象のバイト列（original のコピー） */
  working: Uint8Array
  /** 最後に「保存」で書き出した内容。未保存なら original と同じ */
  saved: Uint8Array
  /** 読み込みごとに増える番号。画面側の入力途中の値を読み込み直しで捨てるために使う */
  loadId: number
  /** 履歴（src/lib/history-db.ts）の組の id。履歴に残せなかったときは null */
  sessionId: number | null
  /**
   * 「保存」で上書きするファイル（File System Access API のハンドル）。
   * ファイル選択で開いたとき・保存先を選んだときに持つ。ないときは、選べるブラウザでは保存先を選ばせ、選べないブラウザではダウンロードする
   */
  handle: FileSystemFileHandle | null
}

export type SaveContextValue = {
  save: LoadedSave | null
  error: string | null
  /** working と original（読み込み時）で異なるバイト数 */
  changedBytes: number
  /** working と saved（最後に保存した内容）で異なるバイト数 */
  unsavedBytes: number
  /** 渡されたファイルを読み込む。handle を渡すと、「保存」でそのファイルに上書きする */
  load: (file: File, handle?: FileSystemFileHandle | null) => Promise<void>
  /** ファイル選択（File System Access API）で開く。上書きできるようにハンドルも持つ。使えるのは canWriteToFile() のときだけ */
  openFile: () => Promise<void>
  /**
   * working を書き換える。mutator には working のコピーを渡し、例外が出なければ反映する。
   * 例外が出た場合は何も変えずに、その例外を投げ直す。
   */
  update: (mutator: (bytes: Uint8Array) => void) => void
  /** working を書き出す。ハンドルがあれば上書き、なければ保存先を選ばせるかダウンロード。書き出せたら保存した版を履歴に残す */
  saveEdited: () => Promise<void>
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
