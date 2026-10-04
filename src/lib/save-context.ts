import { createContext, useContext } from 'react'

export type LoadedSave = {
  name: string
  /** 読み込んだままのバイト列。バックアップの書き出しに使い、変更しない */
  original: Uint8Array
  /** 編集対象のバイト列（original のコピー） */
  working: Uint8Array
}

export type SaveContextValue = {
  save: LoadedSave | null
  error: string | null
  load: (file: File) => Promise<void>
  downloadBackup: () => void
  downloadEdited: () => void
}

export const SaveContext = createContext<SaveContextValue | null>(null)

export function useSave(): SaveContextValue {
  const ctx = useContext(SaveContext)
  if (!ctx) throw new Error('useSave は SaveProvider の内側で使う')
  return ctx
}
