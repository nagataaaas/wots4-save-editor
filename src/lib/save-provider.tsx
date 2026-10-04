import { useState, type ReactNode } from 'react'
import { assertSameSize, backupFileName, downloadBytes, readFileAsBytes } from '@/lib/file-io'
import { SaveContext, type LoadedSave } from '@/lib/save-context'

/** 読み込んだセーブをメモリ上に保持し、画面全体に共有する */
export function SaveProvider({ children }: { children: ReactNode }) {
  const [save, setSave] = useState<LoadedSave | null>(null)
  const [error, setError] = useState<string | null>(null)

  function run(action: () => void) {
    setError(null)
    try {
      action()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function load(file: File) {
    setError(null)
    try {
      const original = await readFileAsBytes(file)
      setSave({ name: file.name, original, working: original.slice() })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function downloadBackup() {
    if (!save) return
    run(() => downloadBytes(save.original, backupFileName(save.name)))
  }

  function downloadEdited() {
    if (!save) return
    run(() => {
      assertSameSize(save.original, save.working)
      downloadBytes(save.working, save.name)
    })
  }

  return (
    <SaveContext.Provider value={{ save, error, load, downloadBackup, downloadEdited }}>
      {children}
    </SaveContext.Provider>
  )
}
