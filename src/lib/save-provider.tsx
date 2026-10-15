import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  assertSameSize, canWriteToFile, downloadBytes, pickFileToOpen, pickFileToSave, readFileAsBytes, writeBytesToFile,
} from '@/lib/file-io'
import { addLoaded, addSaved, clearAll, getBytes, getSnapshot } from '@/lib/history-db'
import { SaveContext, type LoadedSave } from '@/lib/save-context'
import { errorMessage } from '@/lib/error-message'
import { tr } from '@/lib/i18n'
import { countChangedBytes } from '@/lib/byte-diff'

/**
 * 読み込んだセーブをメモリ上に保持し、画面全体に共有する。読み込み時と保存のたびに履歴（IndexedDB）へ残す。
 * 保存は、開いたファイルへの上書き（File System Access API）か、使えないブラウザではダウンロード
 */
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

  /** 履歴に残す。失敗してもエラーを出すだけで、編集は続けられる。残せたかを返す */
  const record = useCallback(async (action: () => Promise<void>): Promise<boolean> => {
    try {
      await action()
      setHistoryVersion((v) => v + 1)
      return true
    } catch (e) {
      setError(tr({ ja: `履歴に残せませんでした: ${errorMessage(e)}`, en: `Could not save to the history: ${errorMessage(e)}` }))
      return false
    }
  }, [])

  const load = useCallback(async (file: File, handle: FileSystemFileHandle | null = null) => {
    setError(null)
    let original: Uint8Array
    try {
      original = await readFileAsBytes(file)
    } catch (e) {
      setError(errorMessage(e))
      return
    }
    const loadId = ++loadSeq.current
    replaceSave({ name: file.name, original, working: original.slice(), saved: original, loadId, sessionId: null, handle })
    await record(async () => {
      const sessionId = await addLoaded(file.name, original)
      // 履歴に残すあいだに別のファイルを読み込んでいたら、そちらには紐づけない
      replaceSave((prev) => (prev?.loadId === loadId ? { ...prev, sessionId } : prev))
    })
  }, [record, replaceSave])

  const openFile = useCallback(async () => {
    setError(null)
    let picked: Awaited<ReturnType<typeof pickFileToOpen>>
    try {
      picked = await pickFileToOpen()
    } catch (e) {
      setError(errorMessage(e))
      return
    }
    if (picked) await load(picked.file, picked.handle)
  }, [load])

  const update =useCallback((mutator: (bytes: Uint8Array) => void) => {
    const save = saveRef.current
    if (!save) throw new Error(tr({ ja: 'セーブファイルが読み込まれていません', en: 'No save file loaded' }))
    const next = save.working.slice()
    mutator(next)
    assertSameSize(save.original, next)
    replaceSave({ ...save, working: next })
  }, [replaceSave])

  const saveEdited = useCallback(async () => {
    const save = saveRef.current
    if (!save) return
    setError(null)
    // working は update のたびに新しい配列に差し替わるので、書き出す版の参照をそのまま保存済みとして持てる
    const { working, loadId, sessionId } = save
    let handle = save.handle
    try {
      assertSameSize(save.original, working)
      if (!handle && canWriteToFile()) {
        handle = await pickFileToSave(save.name)
        if (!handle) return
      }
      if (handle) await writeBytesToFile(handle, working)
      else downloadBytes(working, save.name)
    } catch (e) {
      // 書き出せなかった版は、保存した版として履歴に残さない
      setError(errorMessage(e))
      return
    }
    // 書き出しを待つあいだに続けた編集は残し、別のファイルを読み込んでいたらそちらは変えない
    replaceSave((prev) => (prev?.loadId === loadId ? { ...prev, saved: working, handle, name: handle?.name ?? prev.name } : prev))
    if (sessionId !== null) void record(() => addSaved(sessionId, working))
  }, [record, replaceSave])

  const restore = useCallback(async (id: number) => {
    setError(null)
    try {
      const snapshot = await getSnapshot(id)
      const [bytes, original] = await Promise.all([getBytes(id), getBytes(snapshot.sessionId)])
      // 開いているファイルと同じ名前の版なら、そのファイルに上書きできるままにする。別の名前なら上書き先を持たない
      const current = saveRef.current?.handle ?? null
      replaceSave({
        name: snapshot.fileName,
        original,
        working: bytes.slice(),
        saved: bytes,
        loadId: ++loadSeq.current,
        sessionId: snapshot.sessionId,
        handle: current?.name === snapshot.fileName ? current : null,
      })
    } catch (e) {
      setError(tr({ ja: `履歴から復元できませんでした: ${errorMessage(e)}`, en: `Could not restore from the history: ${errorMessage(e)}` }))
    }
  }, [replaceSave])

  const clearHistory = useCallback(async () => {
    // 消せなかったときは組が残っているので、このあとの保存もその組に残す
    if (!(await record(clearAll))) return
    // 編集中のデータの組も消えたので、このあとの保存は履歴に残さない
    replaceSave((prev) => (prev ? { ...prev, sessionId: null } : prev))
  }, [record, replaceSave])

  const value = useMemo(() => ({
    save, error, changedBytes, unsavedBytes, load, openFile, update, saveEdited, restore, clearHistory, historyVersion,
  }), [save, error, changedBytes, unsavedBytes, load, openFile, update, saveEdited, restore, clearHistory, historyVersion])

  return (
    <SaveContext.Provider
      value={value}
    >
      {children}
    </SaveContext.Provider>
  )
}
