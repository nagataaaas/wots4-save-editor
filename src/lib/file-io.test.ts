import { describe, expect, it } from 'vitest'
import { assertSameSize, backupFileName } from './file-io'

describe('backupFileName', () => {
  it('元の名前に .bak.<ISO日時> を付ける', () => {
    const now = new Date('2026-10-04T12:34:56.789Z')
    expect(backupFileName('S4-DATA_00', now)).toBe('S4-DATA_00.bak.2026-10-04T12-34-56.789Z')
  })
})

describe('assertSameSize', () => {
  it('同じサイズなら通す', () => {
    expect(() => assertSameSize(new Uint8Array(4), new Uint8Array(4))).not.toThrow()
  })

  it('サイズが違えば拒否する', () => {
    expect(() => assertSameSize(new Uint8Array(4), new Uint8Array(5))).toThrow()
  })
})
