import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SaveContextValue } from './save-context'
import { SaveContext } from './save-context'
import { useSaveView } from './use-save-view'
import { useWrite } from './use-write'

// 描画ごとの state と useMemo の依存を保ち、同期の書き込み結果と次の描画の表示を検証する。
const state = vi.hoisted(() => ({
  context: null as SaveContextValue | null,
  slots: [] as unknown[], cursor: 0,
}))
vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useContext: (context: unknown) => context === SaveContext ? state.context : null,
  useMemo: (compute: () => unknown, deps: unknown[]) => {
    const index = state.cursor++
    const prev = state.slots[index] as { deps: unknown[]; value: unknown } | undefined
    if (prev && prev.deps.length === deps.length && prev.deps.every((d, i) => Object.is(d, deps[i]))) return prev.value
    const value = compute()
    state.slots[index] = { deps, value }
    return value
  },
  useState: (initial: unknown) => {
    const index = state.cursor++
    if (!(index in state.slots)) state.slots[index] = initial
    return [state.slots[index], (value: unknown) => { state.slots[index] = value }]
  },
}))

function render<T>(hook: () => T): T {
  state.cursor = 0
  return hook()
}
function load(bytes = new Uint8Array(4), loadId = 1) {
  state.context!.save = { name: '合成セーブ', original: bytes.slice(), working: bytes, saved: bytes.slice(), loadId, sessionId: null }
}

beforeEach(() => {
  state.slots = []
  state.cursor = 0
  state.context = {
    save: null, error: null, changedBytes: 0, unsavedBytes: 0, historyVersion: 0,
    load: async () => {}, restore: async () => {}, clearHistory: async () => {}, downloadEdited: () => {},
    update: mutate => {
      const save = state.context!.save
      if (!save) throw new Error('セーブファイルが読み込まれていません')
      const next = save.working.slice()
      mutate(next)
      state.context!.save = { ...save, working: next }
    },
  }
})

describe('useSaveView', () => {
  it('未読み込みでは reader を呼ばず、空の値を返す', () => {
    const read = vi.fn()
    expect(render(() => useSaveView(read))).toEqual({ view: null, error: null, problem: null, readOnly: true })
    expect(read).not.toHaveBeenCalled()
  })
  it('読み込みと編集後の最新バイト列を読む', () => {
    load()
    const read = (b: Uint8Array) => ({ value: b[0] })
    expect(render(() => useSaveView(read))).toMatchObject({ view: { value: 0 }, error: null, problem: null, readOnly: false })
    state.context!.update(b => { b[0] = 7 })
    expect(render(() => useSaveView(read)).view?.value).toBe(7)
  })
  it('セーブと read が同じなら読み直さない', () => {
    load()
    const read = vi.fn((b: Uint8Array) => ({ value: b[0] }))
    render(() => useSaveView(read))
    render(() => useSaveView(read))
    expect(read).toHaveBeenCalledTimes(1)
    state.context!.update(b => { b[0] = 1 })
    render(() => useSaveView(read))
    expect(read).toHaveBeenCalledTimes(2)
  })
  it('problem で取り出した理由で読み取り専用にする', () => {
    load()
    const ok = render(() => useSaveView(() => ({ problem: null }), { problem: v => v.problem }))
    expect(ok).toMatchObject({ problem: null, readOnly: false })
    state.slots = []
    const ng = render(() => useSaveView(() => ({ inner: { problem: 'サイズが違います' } }), { problem: v => v.inner.problem }))
    expect(ng).toMatchObject({ problem: 'サイズが違います', readOnly: true })
  })
  it('例外と null の読取結果をエラーにする', () => {
    load()
    // 関数が毎回違うので、描画ごとに読み直す
    expect(render(() => useSaveView(() => { throw new RangeError('短すぎます') }))).toEqual({ view: null, error: '短すぎます', problem: null, readOnly: true })
    expect(render(() => useSaveView(() => null)).error).toBe('ファイルが小さすぎて読めません')
    expect(render(() => useSaveView(() => { throw '読み込み失敗' })).error).toBe('読み込み失敗')
  })
})

describe('useWrite', () => {
  it('write は結果を返し、失敗は例外のまま投げて途中の変更を反映しない（欄がその場に出す）', () => {
    load()
    const hook = render(useWrite)
    expect(hook.write(b => { b[0] = 2; return [2] })).toEqual([2])
    const before = state.context!.save!.working.slice()
    expect(() => hook.write(b => { b[0] = 9; throw new Error('書き込み失敗') })).toThrow('書き込み失敗')
    expect(state.context!.save!.working).toEqual(before)
    expect(render(useWrite).error).toBeNull()
  })
  it('tryWrite・attempt は失敗を受け止めて error に入れ、次の成功で消す', () => {
    load()
    expect(render(useWrite).tryWrite(() => { throw new Error('ボタンの失敗') })).toEqual({ ok: false })
    expect(render(useWrite).error).toBe('ボタンの失敗')
    expect(render(useWrite).tryWrite(b => { b[3] = 4; return 'ok' })).toEqual({ ok: true, value: 'ok' })
    expect(render(useWrite).error).toBeNull()
    expect(render(useWrite).attempt(() => { throw '外の例外' })).toEqual({ ok: false })
    expect(render(useWrite).error).toBe('外の例外')
  })
  it('run・attempt の label は成功したときだけ成功文にする', () => {
    load()
    expect(render(useWrite).run('変更しました', b => { b[1] = 3 })).toBe(true)
    expect(render(useWrite).message).toEqual({ error: false, text: '変更しました' })
    expect(render(useWrite).attempt(() => { throw new Error('失敗') }, '成功')).toEqual({ ok: false })
    expect(render(useWrite).message).toEqual({ error: true, text: '失敗' })
  })
  it('未読み込みの失敗を成功扱いせず、読み込み直しで古い結果を隠す', () => {
    expect(render(useWrite).run('成功', () => {})).toBe(false)
    expect(render(useWrite).error).toContain('読み込まれていません')
    load()
    expect(render(useWrite).message).toBeNull()
    render(useWrite).tryWrite(() => { throw '失敗' })
    expect(render(useWrite).error).toBe('失敗')
    load(new Uint8Array(4), 2)
    expect(render(useWrite).message).toBeNull()
  })
})
