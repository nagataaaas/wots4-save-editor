import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { assertSameSize, downloadBytes, readFileAsBytes } from '@/lib/file-io'
import { addLoaded, addSaved, clearAll, getBytes, getSnapshot } from '@/lib/history-db'
import { SaveContext, type LoadedSave } from '@/lib/save-context'
import { errorMessage } from '@/lib/error-message'
import { countChangedBytes } from '@/lib/byte-diff'

/** 読み込んだセーブをメモリ上に保持し、画面全体に共有する。読み込み時と保存のたびに履歴（IndexedDB）へ残す */
export function SaveProvider({ children }: { children: ReactNode }) {
  const [save, setSave] = useState<LoadedSave | null>(null)
  const saveRef = useRef<LoadedSave | null>(null)
  // 同じイベント内の連続更新にも、最新のセーブを同期で渡す。
  const replaceSave = useCallback((next: LoadedSave | null | ((prev: LoadedSave | null) => LoadedSave | null)) => {
    const value = typeof next === 'function' ? next(saveRef.current) : next
    saveRef.current = value
    setSave(value)
  }, [])
  const [error, setError] = useState<string | null>(null)
  const [historyVersion, setHistoryVersion] = useState(0)
  const loadSeq = useRef(0)

  const changedBytes = useMemo(() => (save ? countChangedBytes(save.original, save.working) : 0), [save])
  const unsavedBytes = useMemo(() => (save ? countChangedBytes(save.saved, save.working) : 0), [save])

  /** 失敗したらエラーを出して false を返す。続きは true のときだけ行う */
  const run = useCallback((action: () => void): boolean => {
    setError(null)
    try {
      action()
      return true
    } catch (e) {
      setError(errorMessage(e))
      return false
    }
  }, [])

  /** 履歴に残す。失敗してもエラーを出すだけで、編集は続けられる。残せたかを返す */
  const record = useCallback(async (action: () => Promise<void>): Promise<boolean> => {
    try {
      await action()
      setHistoryVersion((v) => v + 1)
      return true
    } catch (e) {
      setError(`履歴に残せませんでした: ${errorMessage(e)}`)
      return false
    }
  }, [])

  const load = useCallback(async (file: File) => {
    setError(null)
    let original: Uint8Array
    try {
      original = await readFileAsBytes(file)
    } catch (e) {
      setError(errorMessage(e))
      return
    }
    const loadId = ++loadSeq.current
    replaceSave({ name: file.name, original, working: original.slice(), saved: original, loadId, sessionId: null })
    await record(async () => {
      const sessionId = await addLoaded(file.name, original)
      // 履歴に残すあいだに別のファイルを読み込んでいたら、そちらには紐づけない
      replaceSave((prev) => (prev?.loadId === loadId ? { ...prev, sessionId } : prev))
    })
  }, [record, replaceSave])

  const update = useCallback((mutator: (bytes: Uint8Array) => void) => {
    const save = saveRef.current
    if (!save) throw new Error('セーブファイルが読み込まれていません')
    const next = save.working.slice()
    mutator(next)
    assertSameSize(save.original, next)
    replaceSave({ ...save, working: next })
  }, [replaceSave])

  const downloadEdited = useCallback(() => {
    const save = saveRef.current
    if (!save) return
    const downloaded = run(() => {
      assertSameSize(save.original, save.working)
      downloadBytes(save.working, save.name)
      // working は update のたびに新しい配列に差し替わるので、参照をそのまま保存済みとして持てる
      replaceSave({ ...save, saved: save.working })
    })
    // ダウンロードできなかった版は、保存した版として履歴に残さない
    if (!downloaded) return
    const { sessionId, working } = save
    if (sessionId !== null) void record(() => addSaved(sessionId, working))
  }, [record, replaceSave, run])

  const restore = useCallback(async (id: number) => {
    setError(null)
    try {
      const snapshot = await getSnapshot(id)
      const [bytes, original] = await Promise.all([getBytes(id), getBytes(snapshot.sessionId)])
      replaceSave({
        name: snapshot.fileName,
        original,
        working: bytes.slice(),
        saved: bytes,
        loadId: ++loadSeq.current,
        sessionId: snapshot.sessionId,
      })
    } catch (e) {
      setError(`履歴から復元できませんでした: ${errorMessage(e)}`)
    }
  }, [replaceSave])

  const clearHistory = useCallback(async () => {
    // 消せなかったときは組が残っているので、このあとの保存もその組に残す
    if (!(await record(clearAll))) return
    // 編集中のデータの組も消えたので、このあとの保存は履歴に残さない
    replaceSave((prev) => (prev ? { ...prev, sessionId: null } : prev))
  }, [record, replaceSave])

  const value = useMemo(() => ({
    save, error, changedBytes, unsavedBytes, load, update, downloadEdited, restore, clearHistory, historyVersion,
  }), [save, error, changedBytes, unsavedBytes, load, update, downloadEdited, restore, clearHistory, historyVersion])

  return (
    <SaveContext.Provider
      value={value}
    >
      {children}
    </SaveContext.Provider>
  )
}
