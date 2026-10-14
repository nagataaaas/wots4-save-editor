import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LoadedSave, SaveContextValue } from './save-context'
import { SaveProvider } from './save-provider'
import { addLoaded, addSaved, getBytes, getSnapshot } from './history-db'
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
    edited.downloadEdited()
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
    ctx.downloadEdited()
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
