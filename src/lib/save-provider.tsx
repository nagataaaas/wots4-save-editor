import { useMemo, useRef, useState, type ReactNode } from 'react'
import { assertSameSize, downloadBytes, readFileAsBytes } from '@/lib/file-io'
import { addLoaded, addSaved, clearAll, getBytes, getSnapshot } from '@/lib/history-db'
import { SaveContext, type LoadedSave } from '@/lib/save-context'

function countChangedBytes(a: Uint8Array, b: Uint8Array): number {
  let n = 0
  for (let i = 0; i < a.byteLength; i++) if (a[i] !== b[i]) n++
  return n
}

function message(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/** 読み込んだセーブをメモリ上に保持し、画面全体に共有する。読み込み時と保存のたびに履歴（IndexedDB）へ残す */
export function SaveProvider({ children }: { children: ReactNode }) {
  const [save, setSave] = useState<LoadedSave | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [historyVersion, setHistoryVersion] = useState(0)
  const loadSeq = useRef(0)

  const changedBytes = useMemo(() => (save ? countChangedBytes(save.original, save.working) : 0), [save])
  const unsavedBytes = useMemo(() => (save ? countChangedBytes(save.saved, save.working) : 0), [save])

  function run(action: () => void) {
    setError(null)
    try {
      action()
    } catch (e) {
      setError(message(e))
    }
  }

  /** 履歴に残す。失敗してもエラーを出すだけで、編集は続けられる */
  async function record(action: () => Promise<void>) {
    try {
      await action()
      setHistoryVersion((v) => v + 1)
    } catch (e) {
      setError(`履歴に残せませんでした: ${message(e)}`)
    }
  }

  async function load(file: File) {
    setError(null)
    let original: Uint8Array
    try {
      original = await readFileAsBytes(file)
    } catch (e) {
      setError(message(e))
      return
    }
    const loadId = ++loadSeq.current
    setSave({ name: file.name, original, working: original.slice(), saved: original, loadId, sessionId: null })
    await record(async () => {
      const sessionId = await addLoaded(file.name, original)
      // 履歴に残すあいだに別のファイルを読み込んでいたら、そちらには紐づけない
      setSave((prev) => (prev?.loadId === loadId ? { ...prev, sessionId } : prev))
    })
  }

  function update(mutator: (bytes: Uint8Array) => void) {
    if (!save) throw new Error('セーブファイルが読み込まれていません')
    const next = save.working.slice()
    mutator(next)
    assertSameSize(save.original, next)
    setSave({ ...save, working: next })
  }

  function downloadEdited() {
    if (!save) return
    run(() => {
      assertSameSize(save.original, save.working)
      downloadBytes(save.working, save.name)
      // working は update のたびに新しい配列に差し替わるので、参照をそのまま保存済みとして持てる
      setSave({ ...save, saved: save.working })
    })
    const { sessionId, working } = save
    if (sessionId !== null) void record(() => addSaved(sessionId, working))
  }

  async function restore(id: number) {
    setError(null)
    try {
      const snapshot = await getSnapshot(id)
      const [bytes, original] = await Promise.all([getBytes(id), getBytes(snapshot.sessionId)])
      setSave({
        name: snapshot.fileName,
        original,
        working: bytes.slice(),
        saved: bytes,
        loadId: ++loadSeq.current,
        sessionId: snapshot.sessionId,
      })
    } catch (e) {
      setError(`履歴から復元できませんでした: ${message(e)}`)
    }
  }

  async function clearHistory() {
    await record(clearAll)
    // 編集中のデータの組も消えたので、このあとの保存は履歴に残さない
    setSave((prev) => (prev ? { ...prev, sessionId: null } : prev))
  }

  return (
    <SaveContext.Provider
      value={{
        save,
        error,
        changedBytes,
        unsavedBytes,
        load,
        update,
        downloadEdited,
        restore,
        clearHistory,
        historyVersion,
      }}
    >
      {children}
    </SaveContext.Provider>
  )
}
