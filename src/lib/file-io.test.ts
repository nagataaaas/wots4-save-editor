import { describe, expect, it } from 'vitest'
import { assertSameSize } from './file-io'

describe('assertSameSize', () => {
  it('同じサイズなら通す', () => {
    expect(() => assertSameSize(new Uint8Array(4), new Uint8Array(4))).not.toThrow()
  })

  it('サイズが違えば拒否する', () => {
    expect(() => assertSameSize(new Uint8Array(4), new Uint8Array(5))).toThrow()
  })
})
