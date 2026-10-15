import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LoadedSave, SaveContextValue } from './save-context'
import { SaveProvider } from './save-provider'
import { addLoaded, addSaved, clearAll, getBytes, getSnapshot } from './history-db'
import { downloadBytes } from './file-io'

// 描画を保留した状態で、同じイベント内の連続操作と同期例外を検証する。
const state = vi.hoisted(() => ({
  save: null as LoadedSave | null,
  cursor: 0,
  hooks: [] as { value: unknown; deps?: readonly unknown[] }[],
  memo(compute: () => unknown, deps: readonly unknown[]) {
    const i = this.cursor++
    const prev = this.hooks[i]
    if (!prev || deps.some((d, n) => !Object.is(d, prev.deps?.[n]))) this.hooks[i] = { value: compute(), deps }
    return this.hooks[i].value
  },
}))
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  useMemo: (compute: () => unknown, deps: readonly unknown[]) => state.memo(compute, deps),
  useCallback: (callback: unknown, deps: readonly unknown[]) => state.memo(() => callback, deps),
  useRef: (current: unknown) => {
    const i = state.cursor++
    state.hooks[i] ??= { value: { current } }
    return state.hooks[i].value
  },
  useState: (initial: unknown) => {
    const i = state.cursor++
    state.hooks[i] ??= { value: initial }
    return [state.hooks[i].value, (next: unknown) => {
      const value = typeof next === 'function' ? next(state.hooks[i].value) : next
      state.hooks[i].value = value
      if (value && typeof value === 'object' && 'working' in value) state.save = value as LoadedSave
    }]
  },
}))
vi.mock('./history-db', () => ({
  addLoaded: vi.fn().mockResolvedValue(7), addSaved: vi.fn().mockResolvedValue(undefined),
  clearAll: vi.fn().mockResolvedValue(undefined), getBytes: vi.fn(), getSnapshot: vi.fn(),
}))
vi.mock('./file-io', async (importOriginal) => ({
  ...await importOriginal<typeof import('./file-io')>(), downloadBytes: vi.fn(),
}))

const file = (name = 'S4-DATA_00') => ({ name, arrayBuffer: async () => new Uint8Array(4).buffer }) as File
const provider = () => {
  state.cursor = 0
  return SaveProvider({ children: null }).props.value as SaveContextValue
}

beforeEach(() => { state.save = null; state.hooks = []; vi.clearAllMocks() })

describe('SaveProvider の同期更新', () => {
  it('親の再描画だけなら共有値を維持し、編集後は件数とセーブを更新する', async () => {
    const initial = provider()
    expect(provider()).toBe(initial)
    await initial.load(file())
    const loaded = provider()
    expect(loaded).not.toBe(initial)
    expect(loaded.update).toBe(initial.update)
    expect(loaded.load).toBe(initial.load)
    expect(provider()).toBe(loaded)
    loaded.update(b => { b[1] = 5 })
    const edited = provider()
    expect(edited.changedBytes).toBe(1)
    expect(edited.unsavedBytes).toBe(1)
    expect(edited.save?.working[1]).toBe(5)
    await edited.saveEdited()
    expect(provider().unsavedBytes).toBe(0)
  })
  it('同じ描画の update を2回呼んでも、両方の変更が残る', async () => {
    const ctx = provider()
    await ctx.load(file())
    ctx.update(b => { b[0] = 1 })
    ctx.update(b => { b[1] = b[0] + 1 })
    expect(state.save?.working).toEqual(new Uint8Array([1, 2, 0, 0]))
    expect(state.save?.original).toEqual(new Uint8Array(4))
    expect(state.save?.saved).toEqual(new Uint8Array(4))
  })

  it('途中で失敗した変更を捨て、例外を同期で返す', async () => {
    const ctx = provider()
    expect(() => ctx.update(() => {})).toThrow('読み込まれていません')
    await ctx.load(file())
    ctx.update(b => { b[0] = 1 })
    const previous = state.save
    expect(() => ctx.update(b => { b[0] = 9; throw new Error('書き込み失敗') })).toThrow('書き込み失敗')
    expect(state.save).toBe(previous)
    ctx.update(b => { b[1] = b[0] })
    expect(state.save?.working).toEqual(new Uint8Array([1, 1, 0, 0]))
  })

  it('履歴への記録中に編集しても、記録の完了で変更が消えない', async () => {
    let finish!: (id: number) => void
    vi.mocked(addLoaded).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const ctx = provider()
    const loading = ctx.load(file())
    await vi.waitFor(() => expect(addLoaded).toHaveBeenCalled())
    ctx.update(b => { b[2] = 3 })
    finish(8)
    await loading
    expect(state.save?.sessionId).toBe(8)
    expect(state.save?.working[2]).toBe(3)
    await ctx.saveEdited()
    expect(downloadBytes).toHaveBeenCalledWith(new Uint8Array([0, 0, 3, 0]), 'S4-DATA_00')
    expect(addSaved).toHaveBeenCalledWith(8, state.save?.working)
    expect(state.save?.saved).toBe(state.save?.working)
  })

  it('読み込み直し・復元後も、そのセーブを更新する', async () => {
    const ctx = provider()
    await ctx.load(file())
    ctx.update(b => { b[0] = 1 })
    await ctx.load(file('S4-DATA_01'))
    ctx.update(b => { b[1] = 2 })
    expect(state.save?.working).toEqual(new Uint8Array([0, 2, 0, 0]))
    vi.mocked(getSnapshot).mockResolvedValue({ fileName: '復元', sessionId: 10 } as Awaited<ReturnType<typeof getSnapshot>>)
    vi.mocked(getBytes).mockResolvedValueOnce(new Uint8Array([3, 0, 0, 0])).mockResolvedValueOnce(new Uint8Array(4))
    await ctx.restore(11)
    ctx.update(b => { b[2] = b[0] })
    expect(state.save?.working).toEqual(new Uint8Array([3, 0, 3, 0]))
  })
})

describe('SaveProvider の失敗後の続き', () => {
  it('ダウンロードに失敗したら、保存済みにせず、履歴にも保存した版を残さない', async () => {
    const ctx = provider()
    await ctx.load(file())
    ctx.update(b => { b[0] = 1 })
    vi.mocked(downloadBytes).mockImplementationOnce(() => { throw new Error('ダウンロード失敗') })
    await ctx.saveEdited()
    expect(addSaved).not.toHaveBeenCalled()
    expect(state.save?.saved).toEqual(new Uint8Array(4))
    expect(provider().error).toBe('ダウンロード失敗')
  })

  it('履歴を消せなかったら、組との紐づけを残し、このあとの保存も履歴に残す', async () => {
    const ctx = provider()
    await ctx.load(file())
    expect(state.save?.sessionId).toBe(7)
    vi.mocked(clearAll).mockRejectedValueOnce(new Error('消去失敗'))
    await ctx.clearHistory()
    expect(state.save?.sessionId).toBe(7)
    expect(provider().error).toContain('消去失敗')
    await ctx.saveEdited()
    expect(addSaved).toHaveBeenCalledWith(7, state.save?.working)
  })

  it('履歴を消せたら、このあとの保存は履歴に残さない', async () => {
    const ctx = provider()
    await ctx.load(file())
    await ctx.clearHistory()
    expect(state.save?.sessionId).toBeNull()
    await ctx.saveEdited()
    expect(addSaved).not.toHaveBeenCalled()
  })
})

describe('SaveProvider の上書き（File System Access API）', () => {
  /** createWritable に書いた内容を残すハンドル */
  const handle = (name: string, fail = false) => {
    const written: Uint8Array[] = []
    const h = {
      name,
      getFile: async () => file(name),
      createWritable: async () => ({
        write: async (b: Uint8Array) => {
          if (fail) throw new Error('書き込み失敗')
          written.push(b.slice())
        },
        close: async () => {},
        abort: async () => {},
      }),
    } as unknown as FileSystemFileHandle
    return { h, written }
  }
  const stubPickers = (open: FileSystemFileHandle, save?: FileSystemFileHandle | null) => {
    const showSaveFilePicker = vi.fn(async () => {
      if (save === null) throw new DOMException('取り消し', 'AbortError')
      return save
    })
    vi.stubGlobal('window', {
      showOpenFilePicker: async () => [open],
      showSaveFilePicker,
    })
    return showSaveFilePicker
  }
  afterEach(() => { vi.unstubAllGlobals() })

  it('ファイル選択で開いたら、保存でそのファイルに上書きし、ダウンロードしない', async () => {
    const opened = handle('S4-DATA_02')
    stubPickers(opened.h)
    const ctx = provider()
    await ctx.openFile()
    expect(state.save?.handle).toBe(opened.h)
    ctx.update(b => { b[3] = 4 })
    await ctx.saveEdited()
    expect(opened.written).toEqual([new Uint8Array([0, 0, 0, 4])])
    expect(downloadBytes).not.toHaveBeenCalled()
    expect(state.save?.saved).toBe(state.save?.working)
    expect(addSaved).toHaveBeenCalledWith(7, state.save?.working)
  })

  it('上書き先がなければ保存先を選ばせ、そのあとは選んだファイルに上書きする。取り消したら何もしない', async () => {
    const chosen = handle('別名')
    const showSaveFilePicker = stubPickers(handle('未使用').h, null)
    const ctx = provider()
    await ctx.load(file())
    ctx.update(b => { b[0] = 1 })
    await ctx.saveEdited()
    expect(showSaveFilePicker).toHaveBeenCalledTimes(1)
    expect(provider().error).toBeNull()
    expect(state.save?.saved).toEqual(new Uint8Array(4))
    expect(addSaved).not.toHaveBeenCalled()

    showSaveFilePicker.mockResolvedValueOnce(chosen.h)
    await ctx.saveEdited()
    expect(chosen.written).toEqual([new Uint8Array([1, 0, 0, 0])])
    expect(state.save?.handle).toBe(chosen.h)
    expect(state.save?.name).toBe('別名')
    ctx.update(b => { b[1] = 2 })
    await ctx.saveEdited()
    expect(showSaveFilePicker).toHaveBeenCalledTimes(2)
    expect(chosen.written[1]).toEqual(new Uint8Array([1, 2, 0, 0]))
    expect(downloadBytes).not.toHaveBeenCalled()
  })

  it('上書きに失敗したら、保存済みにせず、履歴にも保存した版を残さない', async () => {
    const failing = handle('S4-DATA_00', true)
    stubPickers(failing.h)
    const ctx = provider()
    await ctx.openFile()
    ctx.update(b => { b[0] = 1 })
    await ctx.saveEdited()
    expect(provider().error).toBe('書き込み失敗')
    expect(state.save?.saved).toEqual(new Uint8Array(4))
    expect(addSaved).not.toHaveBeenCalled()
  })

  it('復元した版が開いているファイルと同じ名前なら上書き先を残し、違う名前なら外す', async () => {
    const opened = handle('S4-DATA_00')
    stubPickers(opened.h)
    const ctx = provider()
    await ctx.openFile()
    vi.mocked(getSnapshot).mockResolvedValueOnce({ fileName: 'S4-DATA_00', sessionId: 10 } as Awaited<ReturnType<typeof getSnapshot>>)
    vi.mocked(getBytes).mockResolvedValue(new Uint8Array(4))
    await ctx.restore(11)
    expect(state.save?.handle).toBe(opened.h)
    vi.mocked(getSnapshot).mockResolvedValueOnce({ fileName: 'S4-DATA_01', sessionId: 12 } as Awaited<ReturnType<typeof getSnapshot>>)
    await ctx.restore(13)
    expect(state.save?.handle).toBeNull()
  })
})
