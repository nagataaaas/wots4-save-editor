import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ActionButton } from './action-button'

// 描画間の state を保ち、ボタン操作と読み込み直しを再現する。
const state = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0, loadId: 1 }))
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(),
  useContext: () => ({ save: { loadId: state.loadId } }),
  useState: (initial: unknown) => {
    const index = state.cursor++
    if (!(index in state.slots)) state.slots[index] = initial
    return [state.slots[index], (next: unknown) => { state.slots[index] = next }]
  },
}))

const action = vi.fn()
function useRender(confirm?: 'repeat' | 'inline') {
  // oxlint-disable-next-line react/immutability -- hook の描画を再現するテスト用カーソル
  state.cursor = 0
  return ActionButton({ label: '変更する', onAction: action, confirm })
}
const primary = (element: ReturnType<typeof useRender>) => element.props.children[0].props.children[0]

beforeEach(() => {
  state.slots = []
  state.loadId = 1
  action.mockReset()
})

describe('確認つきの操作', () => {
  it('1回目は確認に進み、2回目で1回だけ実行する', () => {
    primary(useRender('repeat')).props.onClick()
    expect(action).not.toHaveBeenCalled()
    expect(primary(useRender('repeat')).props.children).toBe('もう一度押すと書き込みます')
    primary(useRender('repeat')).props.onClick()
    expect(action).toHaveBeenCalledTimes(1)
    expect(primary(useRender('repeat')).props.children).toBe('変更する')
  })
  it('フォーカスを外す、やめる、読み込み直しで確認を解除する', () => {
    primary(useRender('repeat')).props.onClick()
    primary(useRender('repeat')).props.onBlur()
    expect(primary(useRender('repeat')).props.children).toBe('変更する')
    primary(useRender('inline')).props.onClick()
    useRender('inline').props.children[0].props.children[1].props.onClick()
    expect(primary(useRender('inline')).props.children).toBe('変更する')
    primary(useRender('repeat')).props.onClick()
    state.loadId++
    expect(primary(useRender('repeat')).props.children).toBe('変更する')
    expect(action).not.toHaveBeenCalled()
  })
})

describe('確認なしの操作', () => {
  it('1回目で実行し、書き込みエラーを近くに出して、読み込み直しで消す', () => {
    action.mockImplementation(() => { throw new Error('書き込み失敗') })
    primary(useRender()).props.onClick()
    expect(action).toHaveBeenCalledTimes(1)
    expect(useRender().props.children[1].props.error).toBe('書き込み失敗')
    state.loadId++
    expect(useRender().props.children[1].props.error).toBeNull()
  })
})
