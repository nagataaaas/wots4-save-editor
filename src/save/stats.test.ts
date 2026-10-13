// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 位置と意味は docs/save_format/chunks/stats（🟢）。
// 行動の回数の i 1・2 の場面の細部は 🔶（確度をテストでも確かめる）。
import { describe, expect, it } from 'vitest'
import { writeF32, writeU16, writeU32 } from './binary'
import { TS_SAVE_SIZE } from './layout'
import {
  ACTION_COUNTS,
  STAT_FIELDS,
  formatSeconds,
  readStats,
  statField,
  validateStat,
  writeStat,
} from './stats'

function makeSave(size = TS_SAVE_SIZE): Uint8Array {
  const b = new Uint8Array(size)
  // 範囲の両隣（侍点 0x0B3C・周回数 0x0B8C・経過日数 0x0BD8・技ごとの斬殺数 0x0C64）に値を置き、書き込みで変わらないことを見る
  writeU32(b, 0x0b3c, 12345)
  writeU32(b, 0x0b8c, 38)
  writeU16(b, 0x0bd8, 4)
  writeU32(b, 0x0c64, 7)
  // 実セーブで見た並びに近い値
  writeF32(b, 0x0b34, 100.48300170898438)
  writeF32(b, 0x0b38, 41)
  writeU16(b, 0x0b9c + 2 * 10, 28)
  writeU32(b, 0x0bbc, 4260)
  writeU32(b, 0x0bcc, 679)
  writeU32(b, 0x0bd4, 66)
  return b
}

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i)
  return out
}

const valueOf = (b: Uint8Array, key: string) => readStats(b).values.find((v) => v.field.key === key)!.value

describe('侍評価・活動記録 0x0B34〜0x0C63', () => {
  it('🟢 項目は範囲の中にあり、重ならない。侍点・周回数・経過日数・終わり方は含めない', () => {
    const used = new Set<number>()
    for (const f of STAT_FIELDS) {
      const width = f.type === 'u16' ? 2 : 4
      expect(f.offset).toBeGreaterThanOrEqual(0x0b34)
      expect(f.offset + width - 1).toBeLessThanOrEqual(0x0c63)
      for (let i = 0; i < width; i++) {
        expect(used.has(f.offset + i)).toBe(false)
        used.add(f.offset + i)
      }
    }
    for (const o of [0x0b3c, 0x0b8c, 0x0bba, 0x0bd8]) expect(used.has(o)).toBe(false)
  })

  it('🟢 値を読む（f32・u16・u32）', () => {
    const b = makeSave()
    expect(valueOf(b, 'degreeBest')).toBeCloseTo(100.483, 3)
    expect(valueOf(b, 'degreeLast')).toBe(41)
    expect(valueOf(b, 'title10')).toBe(28)
    expect(valueOf(b, 'fastestClear')).toBe(4260)
    expect(valueOf(b, 'killsTotal')).toBe(679)
    expect(valueOf(b, 'comboTotal')).toBe(66)
    expect(readStats(b).problem).toBeNull()
  })

  it('行動の回数（i 1・2 は 🔶、ほかは 🟢）。🟢 人物の種類 15 暗闇脳天・16 魔鱗組', () => {
    expect(ACTION_COUNTS.map((a) => a.index)).toEqual([
      0, // 🟢
      1, // 🔶
      2, // 🔶
      3, // 🟢
      4, // 🟢
      5, // 🟢
      6, // 🟢
      7, // 🟢
      9, // 🟢
      10, // 🟢
    ])
    expect(statField('damageCycle15').label).toBe('暗闇脳天（周回中）')
    expect(statField('damageTotal16').label).toBe('魔鱗組（累計）')
    expect(statField('damageTotal4').offset).toBe(0x0c30) // 赤城（累計）
  })

  it('1項目の幅だけを書く', () => {
    const cases: [string, number, number[]][] = [
      ['action4', 3, [0x0b5c]],
      ['title14', 2, [0x0bb8]],
      ['playTimeTotal', 0x01020304, [0x0b94, 0x0b95, 0x0b96, 0x0b97]],
      ['damageCycle4', 0x100, [0x0bed]],
    ]
    for (const [key, value, changed] of cases) {
      const before = makeSave()
      const after = before.slice()
      writeStat(after, key, value, { advanced: false })
      expect(diffOffsets(before, after)).toEqual(changed)
      expect(valueOf(after, key)).toBe(value)
    }
    const before = makeSave()
    const after = before.slice()
    writeStat(after, 'distanceCycle', 1234.5, { advanced: false })
    expect(diffOffsets(before, after).every((o) => o >= 0x0bc0 && o <= 0x0bc3)).toBe(true)
    expect(valueOf(after, 'distanceCycle')).toBe(1234.5)
  })

  it('通常モードはゲームの上限まで、上級者モードは型の範囲まで', () => {
    const b = makeSave()
    expect(() => writeStat(b, 'action4', 9999, { advanced: false })).not.toThrow()
    expect(() => writeStat(b, 'action4', 10000, { advanced: false })).toThrow(RangeError)
    expect(() => writeStat(b, 'action4', 10000, { advanced: true })).not.toThrow()
    expect(() => writeStat(b, 'title0', 0x10000, { advanced: true })).toThrow(RangeError)
    expect(() => writeStat(b, 'degreeLast', 120.5, { advanced: false })).toThrow(RangeError)
    expect(() => writeStat(b, 'degreeLast', 150, { advanced: true })).not.toThrow()
    expect(validateStat(statField('killsCycle'), 1.5, { advanced: true })).not.toBeNull()
    expect(validateStat(statField('distanceCycle'), Number.NaN, { advanced: true })).not.toBeNull()
  })

  it('通常の範囲の外の値は警告する', () => {
    const b = makeSave()
    writeU32(b, 0x0b4c, 20000)
    const v = readStats(b).values.find((x) => x.field.key === 'action0')!
    expect((v.warnings.join('。') || null)).toMatch(/通常の範囲/)
  })

  it('読み出し→書き戻しでバイト列が一致する', () => {
    const before = makeSave()
    const after = before.slice()
    for (const v of readStats(after).values) writeStat(after, v.field.key, v.value, { advanced: true })
    expect(diffOffsets(before, after)).toEqual([])
  })

  it('サイズが 0x48BB0 でなければ読み取り専用にする', () => {
    const b = makeSave(TS_SAVE_SIZE + 4)
    expect(readStats(b).problem).not.toBeNull()
    expect(() => writeStat(b, 'action4', 1, { advanced: false })).toThrow(RangeError)
  })

  it('秒を時:分:秒にする', () => {
    expect(formatSeconds(4260)).toBe('1:11:00')
    expect(formatSeconds(35_999_999)).toBe('9999:59:59')
  })
})
