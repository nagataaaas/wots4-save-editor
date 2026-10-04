import { useMemo, useState, type ReactNode } from 'react'
import { assertSameSize, backupFileName, downloadBytes, readFileAsBytes } from '@/lib/file-io'
import { SaveContext, type LoadedSave } from '@/lib/save-context'

function countChangedBytes(a: Uint8Array, b: Uint8Array): number {
  let n = 0
  for (let i = 0; i < a.byteLength; i++) if (a[i] !== b[i]) n++
  return n
}

/** 読み込んだセーブをメモリ上に保持し、画面全体に共有する */
export function SaveProvider({ children }: { children: ReactNode }) {
  const [save, setSave] = useState<LoadedSave | null>(null)
  const [error, setError] = useState<string | null>(null)

  const changedBytes = useMemo(() => (save ? countChangedBytes(save.original, save.working) : 0), [save])
  const unsavedBytes = useMemo(() => (save ? countChangedBytes(save.saved, save.working) : 0), [save])

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
      setSave((prev) => ({
        name: file.name,
        original,
        working: original.slice(),
        saved: original,
        loadId: (prev?.loadId ?? 0) + 1,
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function update(mutator: (bytes: Uint8Array) => void) {
    if (!save) throw new Error('セーブファイルが読み込まれていません')
    const next = save.working.slice()
    mutator(next)
    assertSameSize(save.original, next)
    setSave({ ...save, working: next })
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
      // working は update のたびに新しい配列に差し替わるので、参照をそのまま保存済みとして持てる
      setSave({ ...save, saved: save.working })
    })
  }

  return (
    <SaveContext.Provider
      value={{ save, error, changedBytes, unsavedBytes, load, update, downloadBackup, downloadEdited }}
    >
      {children}
    </SaveContext.Provider>
  )
}
