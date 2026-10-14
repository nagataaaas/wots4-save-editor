import { describe, expect, it } from 'vitest'
import { loadedCandidates, sha256Hex, type SnapshotRecord } from './history-db'

const record = (id: number, over: Partial<SnapshotRecord>) =>
  ({ id, sessionId: id, kind: 'loaded', fileName: 'S4-DATA_00', createdAt: 0, ...over }) as SnapshotRecord

describe('履歴の読み込みの版を探す', () => {
  it('SHA-256 を16進で返す', async () => {
    expect(await sha256Hex(new Uint8Array([0x61, 0x62, 0x63]))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })

  it('同じファイル名の読み込みのうち、ハッシュが一致するものと、ハッシュのない版だけを候補にする', () => {
    const records = [
      record(1, { sha256: 'aa' }),
      record(2, { sha256: 'bb' }),
      record(3, {}),
      record(4, { sha256: 'aa', fileName: 'S4-DATA_01' }),
      record(5, { sha256: 'aa', kind: 'saved' }),
    ]
    expect(loadedCandidates(records, 'S4-DATA_00', 'aa').map((r) => r.id)).toEqual([1, 3])
  })

  it('ハッシュを計算できなかったときは、同じファイル名の読み込みをすべて候補にする', () => {
    const records = [record(1, { sha256: 'aa' }), record(2, {})]
    expect(loadedCandidates(records, 'S4-DATA_00', undefined).map((r) => r.id)).toEqual([1, 2])
  })
})
