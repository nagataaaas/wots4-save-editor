import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useFieldDraft } from './use-field-draft'

// 各描画で hook の state を保持し、実際の入力イベントと親の値更新を順に再現する。
const state = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0, loadId: 1 }))
vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useContext: () => ({ save: { loadId: state.loadId } }),
  useState: (initial: unknown) => {
    const index = state.cursor++
    if (!(index in state.slots)) state.slots[index] = initial
    return [state.slots[index], (next: unknown) => { state.slots[index] = next }]
  },
}))

let value: number | null
let identity: number
let fail: boolean
let commitOn: 'change' | 'blur'
const apply = vi.fn((next: number) => {
  if (fail) throw new Error('書き込み失敗')
  value = next
})

function useRender() {
  // oxlint-disable-next-line react/immutability -- hook の描画を再現するテスト用カーソル
  state.cursor = 0
  return useFieldDraft({
    value, identity, format: String, apply, commitOn,
    parse: (input) => /^\d+$/.test(input) ? { ok: true, value: Number(input) } : { ok: false, error: '整数を入力してください' },
  })
}

beforeEach(() => {
  state.slots = []
  state.loadId = 1
  value = 10
  identity = 8
  fail = false
  commitOn = 'change'
  apply.mockClear()
})

describe('入力途中の値とセーブ値の同期', () => {
  it('フォーカスがなければ外部編集・一括設定・復元後の値をすぐ表示する', () => {
    expect(useRender().input).toBe('10')
    value = 20
    expect(useRender().input).toBe('20')
    value = null
    expect(useRender().input).toBe('')
    value = 30
    expect(useRender().input).toBe('30')
  })

  it('入力中の先頭ゼロを保ち、フォーカスを外すと最新値を表示する', () => {
    useRender().focus()
    useRender().change('0020')
    expect(value).toBe(20)
    expect(useRender().input).toBe('0020')
    value = 40
    expect(useRender().input).toBe('0020')
    useRender().blur()
    expect(useRender().input).toBe('40')
    useRender().focus()
    expect(useRender().input).toBe('40')
  })

  it('不正入力は書かず、欄を離れるとセーブ値に戻してエラーを消す', () => {
    useRender().focus()
    useRender().change('-')
    expect(useRender()).toMatchObject({ input: '-', error: '整数を入力してください' })
    expect(apply).not.toHaveBeenCalled()
    useRender().blur()
    expect(useRender()).toMatchObject({ input: '10', error: null })
  })

  it('入力中でも読み込み直し・履歴からの復元で draft とエラーを捨てる', () => {
    useRender().focus()
    useRender().change('bad')
    state.loadId++
    // 同じ値の別セーブでも入力途中の文字を持ち越さない。
    expect(useRender()).toMatchObject({ input: '10', error: null, focused: false })
    useRender().focus()
    expect(useRender().input).toBe('10')
  })

  it('位置やアイテムの変更で異なる欄に古い入力を持ち越さない', () => {
    useRender().focus()
    useRender().change('bad')
    identity = 16
    value = 30
    expect(useRender()).toMatchObject({ input: '30', error: null })
    identity = 8
    expect(useRender()).toMatchObject({ input: '30', error: null })
  })

  it('書き込み失敗は表示し、次の正常入力で回復する。同じ値は書かない', () => {
    useRender().focus()
    useRender().change('0010')
    expect(apply).not.toHaveBeenCalled()
    fail = true
    useRender().change('20')
    expect(value).toBe(10)
    expect(useRender().error).toBe('書き込み失敗')
    fail = false
    useRender().change('20')
    expect(value).toBe(20)
    expect(useRender().error).toBeNull()
  })

  it('なりわいの回数は Enter・blur のときだけ検証して書く', () => {
    commitOn = 'blur'
    useRender().focus()
    useRender().change('0020')
    expect(apply).not.toHaveBeenCalled()
    useRender().commit()
    expect(value).toBe(20)
    expect(useRender().input).toBe('0020')
    useRender().change('30')
    useRender().blur()
    expect(value).toBe(30)
    expect(useRender().input).toBe('30')
    useRender().focus()
    useRender().change('bad')
    useRender().blur()
    expect(useRender()).toMatchObject({ input: 'bad', error: '整数を入力してください' })
  })

  it('なりわいの回数でエラーを残して離れたあと、外から値が変わったら最新値に戻す', () => {
    commitOn = 'blur'
    useRender().focus()
    useRender().change('bad')
    useRender().blur()
    expect(useRender()).toMatchObject({ input: 'bad', error: '整数を入力してください' })
    value = 50
    expect(useRender()).toMatchObject({ input: '50', error: null, focused: false })
    useRender().focus()
    expect(useRender().input).toBe('50')
  })

  it('未読み込みでは入力イベントから書き込まない', () => {
    value = null
    useRender().change('20')
    expect(apply).not.toHaveBeenCalled()
    expect(useRender().input).toBe('')
  })
})
