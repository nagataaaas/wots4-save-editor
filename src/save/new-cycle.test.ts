// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// enableCharacterSetup：0x0010＝0 だけ（✅ [U] 難易度と主人公の設定に進む）。
// startNewCycle：物語を終えたときにゲームが行う処理（🟢）。✅ [U] 2026-10-09 クリアのあとの保存で難易度が普通（1）になる。
// 貴重品を前に詰めるのは 🔶。現在地 0x27 は値が 🟢・意味が 🔶。
import { describe, expect, it } from 'vitest'
import { readF32, readU16, readU32, writeF32, writeU16, writeU32 } from './binary'
import { TS_SAVE_SIZE } from './layout'
import {
  NEW_CYCLE_CLEARED_OCCUPATION_FLAGS,
  NEW_CYCLE_KEEP_FLAGS,
  enableCharacterSetup,
  startNewCycle,
} from './new-cycle'
import { readDate } from './scenario-date'
import { isEmptyWeapon } from './weapon'

const BAG = 0xa6b0
const CHEST = 0xacf4
const REC = 0xa0
const HAND = 0x5b40
const ITEM_CHEST = 0x58c0
const VALUABLES = 0x5b90
const BLADES = { carried: 0x6326, chest: 0x738e, bytes: 0x12 }
const GUARDS = { carried: 0x6a2e, chest: 0x88a6, bytes: 0x0c }

function emptyWeapon(b: Uint8Array, at: number) {
  b.fill(0, at, at + REC)
  b.fill(0xff, at + 2, at + 10)
}
function weapon(b: Uint8Array, at: number, blade: number) {
  b.fill(0x11, at, at + REC)
  writeU16(b, at + 2, blade)
  writeU16(b, at + 4, 0)
  writeU16(b, at + 6, 1)
  writeU16(b, at + 8, 2)
}
function item(b: Uint8Array, at: number, id: number, count: number) {
  b.set([id & 0xff, id >> 8, count & 0xff, count >> 8, 0x06, 0xaa, 0xbb, 0xcc], at)
}
function emptyItem(b: Uint8Array, at: number) {
  b.set([0xff, 0xff, 0, 0, 0, 0, 0, 0], at)
}

/** 周回の途中を模したセーブ。武器・道具・部品の枠はどれも空きにし、ほかは 0 以外で埋める */
function makeMidCycleSave(size = TS_SAVE_SIZE): Uint8Array {
  const b = new Uint8Array(size)
  for (let i = 0; i < b.length; i++) b[i] = (i * 7 + 3) & 0xff
  if (size !== TS_SAVE_SIZE) return b
  b[0x0000] = 3 // 超難しい
  writeU32(b, 0x0008, 5000)
  writeU32(b, 0x000c, 10000)
  b.set([0x90, 0x01, 0x00, 0x0d, 0x01], 0x10) // 5日目夕、段階 400
  writeU32(b, 0x0bd8, 4) // 経過日数（u32 の上位は実セーブでは 0）
  for (let i = 0; i < 10; i++) emptyWeapon(b, BAG + i * REC)
  for (let i = 0; i < 200; i++) emptyWeapon(b, CHEST + i * REC)
  writeU16(b, 0x129f4, 0)
  b[0x129f6] = 2
  for (let i = 0; i < 10; i++) emptyItem(b, HAND + i * 8)
  for (let i = 0; i < 80; i++) emptyItem(b, ITEM_CHEST + i * 8)
  for (let i = 0; i < 10; i++) emptyItem(b, VALUABLES + i * 8)
  for (const p of [BLADES, GUARDS, { carried: 0x6ede, chest: 0x96b6, bytes: 0x0c }]) {
    for (let i = 0; i < 100; i++) writeU16(b, p.carried + i * p.bytes, 0xffff)
    for (let i = 0; i < 300; i++) writeU16(b, p.chest + i * p.bytes, 0xffff)
  }
  return b
}

describe('enableCharacterSetup：難易度と主人公設定を行えるようにする', () => {
  it('✅ [U] 0x0010（u16）だけを 0 にする', () => {
    const before = makeMidCycleSave()
    const after = before.slice()
    enableCharacterSetup(after)
    const diff: number[] = []
    for (let i = 0; i < before.length; i++) if (before[i] !== after[i]) diff.push(i)
    expect(diff).toEqual([0x10, 0x11])
    expect(readDate(after).stage).toBe(0)
  })

  it('サイズが 0x48BB0 でなければ書かない', () => {
    expect(() => enableCharacterSetup(makeMidCycleSave(TS_SAVE_SIZE + 4))).toThrow(RangeError)
  })
})

describe('startNewCycle：共通の初期化（🟢）', () => {
  const before = makeMidCycleSave()
  before[0x36a8] = 0x04
  before[0x36a9] = 0xff
  const after = before.slice()
  startNewCycle(after)

  it('✅ [U] 難易度は 1（普通）。🟢 段階 0・保留量 0・現在地 0x27・時間帯 0・日数 1日目', () => {
    expect(after[0x0000]).toBe(1)
    expect(Array.from(after.slice(0x10, 0x15))).toEqual([0x00, 0x00, 0x00, 0x27, 0x00])
    expect(readDate(after)).toMatchObject({ stage: 0, day: 1, slot: 0, pending: 0, problem: null })
  })

  it('🟢 イベントの状態 A は FF を残し、ほかを 00 にする', () => {
    expect(after[0x36a8]).toBe(0x00)
    expect(after[0x36a9]).toBe(0xff)
    for (let n = 0; n < 166; n++) expect([0x00, 0xff]).toContain(after[0x36a8 + n])
  })

  it('🟢 シナリオのフラグは 0。施設 0x375D〜0x3760 と 0x3799・0x379A は残す', () => {
    expect(NEW_CYCLE_KEEP_FLAGS).toEqual([0x375d, 0x375e, 0x375f, 0x3760, 0x3799, 0x379a])
    for (let p = 0x374e; p <= 0x3837; p++) {
      if (NEW_CYCLE_KEEP_FLAGS.includes(p)) expect(after[p]).toBe(before[p])
      else expect(after[p]).toBe(0)
    }
  })

  it('🟢 周回中の記録と斬殺数の表（0x0C64〜0x1C03）は 0。累計（0x1C04〜）と 0x0C20〜0x0C63 は残す', () => {
    expect(after.slice(0x0c64, 0x1c04).every((v) => v === 0)).toBe(true)
    expect(after.slice(0x1c04, 0x1c24)).toEqual(before.slice(0x1c04, 0x1c24))
    expect(after.slice(0x0c20, 0x0c64)).toEqual(before.slice(0x0c20, 0x0c64))
    expect(after.slice(0x0bdc, 0x0c20).every((v) => v === 0)).toBe(true)
    expect(after.slice(0x0b44, 0x0b8c).every((v) => v === 0)).toBe(true)
    for (const o of [0x0b90, 0x0b98, 0x0bc0, 0x0bc8, 0x0bd0]) expect(readU32(after, o)).toBe(0)
    expect(after[0x0bba]).toBe(0)
    expect(readU16(after, 0x0bd8)).toBe(0)
    // 🟢 経過日数は u16 だけを書く
    const odd = makeMidCycleSave()
    odd[0x0bda] = 0x12
    startNewCycle(odd)
    expect(odd[0x0bda]).toBe(0x12)
    for (const o of [0x0b3c, 0x0b94, 0x0bc4, 0x0bcc]) expect(readU32(after, o)).toBe(readU32(before, o))
  })

  it('🟢 HP・活力は 1000.0、0x35B4 は 0.0', () => {
    for (const o of [0x35a4, 0x35a8, 0x35ac, 0x35b0, 0x35b8]) expect(readF32(after, o)).toBe(1000)
    expect(readF32(after, 0x35b4)).toBe(0)
  })

  it('🟢 夜這いの記録・段階・約束の枠を消し、回数は残す', () => {
    for (let i = 0; i < 100; i++) {
      expect(Array.from(after.slice(0x137f0 + i * 16, 0x13800 + i * 16))).toEqual([
        255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 255, 255, 0, 0,
      ])
    }
    expect(readU32(after, 0x13e30)).toBe(0)
    expect(readU32(after, 0x13e34)).toBe(0)
    expect(after.slice(0x14038, 0x14060).every((v) => v === 0xff)).toBe(true)
    expect(Array.from(after.slice(0x14060, 0x14063))).toEqual([0, 0, 0])
    expect(after[0x14064]).toBe(0)
    expect(readU32(after, 0x137ec)).toBe(readU32(before, 0x137ec))
    expect(after.slice(0x13e38, 0x13e70)).toEqual(before.slice(0x13e38, 0x13e70))
  })

  it('🟢 そのほかの初期化の範囲', () => {
    expect(readU32(after, 0x0018)).toBe(0)
    expect(after.slice(0x001c, 0x00dc).every((v) => v === 0xff)).toBe(true)
    expect(after.slice(0x00dc, 0x011c)).toEqual(before.slice(0x00dc, 0x011c))
    expect(after.slice(0x015c, 0x0b34).every((v) => v === 0)).toBe(true)
    expect(after.slice(0x2ba4, 0x2fa4).every((v) => v === 0)).toBe(true)
    expect(after.slice(0x45f40, 0x4626e).every((v) => v === 0)).toBe(true)
    expect(readU16(after, 0x3900)).toBe(0xffff)
    expect(readU16(after, 0x6324)).toBe(0xffff)
  })

  it('🟢 残すもの：治安・装飾品・容姿・特典・なりわいの状態の表', () => {
    for (const [a, z] of [
      [0x0015, 0x0018],
      [0x33a4, 0x35a4],
      [0x3902, 0x39a0],
      [0x3aad4, 0x3ab7b],
      [0x43318, 0x43382],
    ]) {
      expect(after.slice(a, z)).toEqual(before.slice(a, z))
    }
  })

  it('サイズが 0x48BB0 でなければ書かない', () => {
    const b = makeMidCycleSave(TS_SAVE_SIZE + 4)
    const copy = b.slice()
    expect(() => startNewCycle(b)).toThrow(RangeError)
    expect(b).toEqual(copy)
  })
})

describe('startNewCycle：引き継ぎ（🟢）', () => {
  it('🟢 表示は4語がFFFF、周回移行の空きは4語が負、袋を移せるかは刃だけで判定する', () => {
    const bytes = makeMidCycleSave()
    for (const rel of [2, 4, 6, 8]) writeU16(bytes, CHEST + rel, 0xfffe)
    expect(isEmptyWeapon(bytes, CHEST)).toBe(false)
    weapon(bytes, BAG, 10)
    weapon(bytes, BAG + REC, 0x8000)
    const skipped = bytes.slice(BAG + REC, BAG + 2 * REC)
    const report = startNewCycle(bytes)
    expect(report.weaponsMoved).toBe(1)
    expect(readU16(bytes, CHEST + 2)).toBe(10)
    expect(bytes.slice(BAG + REC, BAG + 2 * REC)).toEqual(skipped)
    expect(isEmptyWeapon(bytes, BAG)).toBe(true)
  })

  it('🟢 武器箪笥の容量は符号付き1バイト。負なら袋に残す', () => {
    for (const capacity of [0x80, 0xff]) {
      const bytes = makeMidCycleSave()
      bytes[0x129f6] = capacity
      weapon(bytes, BAG, 10)
      const before = bytes.slice(BAG, BAG + REC)
      expect(startNewCycle(bytes)).toMatchObject({ weaponsMoved: 0, weaponsLeft: 1 })
      expect(bytes.slice(BAG, BAG + REC)).toEqual(before)
    }
  })
  it('クリアは難易度ごとのクリア回数を +1（1000 まで）、立ち去りは立ち去った回数を +1（99,999 まで）', () => {
    const b = makeMidCycleSave()
    writeU16(b, 0x43398 + 3 * 2, 5)
    const c = b.slice()
    startNewCycle(c, 'clear')
    expect(readU16(c, 0x4339e)).toBe(6)
    expect(readU32(c, 0x46340)).toBe(readU32(b, 0x46340))

    writeU32(b, 0x46340, 32)
    const g = b.slice()
    startNewCycle(g, 'gone')
    expect(readU32(g, 0x46340)).toBe(33)
    expect(g.slice(0x43398, 0x433a0)).toEqual(b.slice(0x43398, 0x433a0))

    writeU16(b, 0x4339e, 1000)
    writeU32(b, 0x46340, 99_999)
    const capped = b.slice()
    startNewCycle(capped, 'clear')
    startNewCycle(capped, 'gone')
    expect(readU16(capped, 0x4339e)).toBe(1000)
    expect(readU32(capped, 0x46340)).toBe(99_999)
  })

  it('🟢 周回数 0x0B8C はクリアでも立ち去りでも +1（99,999 で止まる）', () => {
    const b = makeMidCycleSave()
    writeU32(b, 0x0b8c, 38)
    for (const end of ['clear', 'gone'] as const) {
      const c = b.slice()
      startNewCycle(c, end)
      expect(readU32(c, 0x0b8c)).toBe(39)
    }
    writeU32(b, 0x0b8c, 99_999)
    startNewCycle(b)
    expect(readU32(b, 0x0b8c)).toBe(99_999)
  })

  it('記録 B：A が 00〜05 で B が 04 でなければ B ← A', () => {
    const b = makeMidCycleSave()
    const cases: [number, number, number][] = [
      // [A, B, 結果の B]
      [0x04, 0xff, 0x04],
      [0x00, 0x05, 0x00],
      [0x05, 0x04, 0x04],
      [0xff, 0x03, 0x03],
      [0x03, 0x00, 0x03],
    ]
    cases.forEach(([a, rec], i) => {
      b[0x36a8 + i] = a
      b[0x3838 + i] = rec
    })
    startNewCycle(b)
    cases.forEach(([, , want], i) => expect(b[0x3838 + i]).toBe(want))
    expect(b.slice(0x3838 + 166, 0x3900)).toEqual(makeMidCycleSave().slice(0x3838 + 166, 0x3900))
  })

  it('なりわいのフラグ 4〜14・18・19・23〜31 を 0、ほかは残す', () => {
    const b = makeMidCycleSave()
    const before = b.slice()
    startNewCycle(b)
    for (let n = 0; n < 64; n++) {
      const want = NEW_CYCLE_CLEARED_OCCUPATION_FLAGS.includes(n) ? 0 : before[0x011c + n]
      expect(b[0x011c + n]).toBe(want)
    }
  })

  it('所持金は金庫に足して 0（999,999 まで）', () => {
    const b = makeMidCycleSave()
    expect(startNewCycle(b).vaultAdded).toBe(5000)
    expect(readU32(b, 0x0008)).toBe(0)
    expect(readU32(b, 0x000c)).toBe(15000)

    const c = makeMidCycleSave()
    writeU32(c, 0x000c, 998_000)
    startNewCycle(c)
    expect(readU32(c, 0x000c)).toBe(999_999)
  })

  it('武器袋 → 武器箪笥の空き枠（容量×10 枠の中）。本数 +1、袋は空きにする。入らなければ袋に残す', () => {
    const b = makeMidCycleSave()
    weapon(b, BAG, 10)
    weapon(b, BAG + 9 * REC, 20)
    weapon(b, CHEST, 30)
    writeU16(b, 0x129f4, 1)
    const report = startNewCycle(b)
    expect(report).toMatchObject({ weaponsMoved: 2, weaponsLeft: 0 })
    // 9 番から順に入る
    expect(readU16(b, CHEST + 1 * REC + 2)).toBe(20)
    expect(readU16(b, CHEST + 2 * REC + 2)).toBe(10)
    expect(readU16(b, 0x129f4)).toBe(3)
    for (const i of [0, 9]) {
      const at = BAG + i * REC
      expect(Array.from(b.slice(at, at + 10))).toEqual([0, 0, 255, 255, 255, 255, 255, 255, 255, 255])
      expect(b.slice(at + 10, at + REC).every((v) => v === 0)).toBe(true)
    }

    const full = makeMidCycleSave()
    full[0x129f6] = 2
    writeU16(full, 0x129f4, 20)
    weapon(full, BAG, 10)
    const r2 = startNewCycle(full)
    expect(r2).toMatchObject({ weaponsMoved: 0, weaponsLeft: 1 })
    expect(readU16(full, BAG + 2)).toBe(10)
    expect(readU16(full, 0x129f4)).toBe(20)
  })

  it('手持ちの道具 → 箪笥。同じ品で 99 未満の枠に足し、超えた分は空き枠へ。入らなければ残す', () => {
    const b = makeMidCycleSave()
    item(b, ITEM_CHEST, 0x02, 95)
    item(b, HAND, 0x02, 10)
    item(b, HAND + 1 * 8, 0x05, 1)
    const report = startNewCycle(b)
    expect(report).toMatchObject({ itemsMoved: 2, itemsLeft: 0 })
    // 9 → 0 の順：0x05 が先に空き枠 1 に入り、0x02 は枠 0 を 99 にして残り 6 を枠 2 へ
    expect([readU16(b, ITEM_CHEST), readU16(b, ITEM_CHEST + 2)]).toEqual([0x02, 99])
    expect([readU16(b, ITEM_CHEST + 8), readU16(b, ITEM_CHEST + 10)]).toEqual([0x05, 1])
    expect([readU16(b, ITEM_CHEST + 16), readU16(b, ITEM_CHEST + 18)]).toEqual([0x02, 6])
    expect(b[ITEM_CHEST + 16 + 4]).toBe(0x06)
    for (const i of [0, 1]) expect(Array.from(b.slice(HAND + i * 8, HAND + i * 8 + 8))).toEqual([255, 255, 0, 0, 0, 0, 0, 0])

    const full = makeMidCycleSave()
    for (let i = 0; i < 80; i++) item(full, ITEM_CHEST + i * 8, 0x03, 1)
    item(full, ITEM_CHEST + 5 * 8, 0x02, 97)
    item(full, HAND, 0x02, 5)
    item(full, HAND + 8, 0x04, 1)
    const r2 = startNewCycle(full)
    expect(r2).toMatchObject({ itemsMoved: 0, itemsLeft: 2 })
    expect(readU16(full, ITEM_CHEST + 5 * 8 + 2)).toBe(99)
    expect([readU16(full, HAND), readU16(full, HAND + 2)]).toEqual([0x02, 3])
    expect([readU16(full, HAND + 8), readU16(full, HAND + 10)]).toEqual([0x04, 1])
  })

  it('持っている部品 → 部品の箪笥の最初の空き枠。部品 ID ごとの数 +1', () => {
    const b = makeMidCycleSave()
    b.fill(0x22, BLADES.carried + 3 * BLADES.bytes, BLADES.carried + 4 * BLADES.bytes)
    writeU16(b, BLADES.carried + 3 * BLADES.bytes, 0x0105)
    writeU16(b, BLADES.chest, 0x0001)
    writeU16(b, GUARDS.carried, 0x0010)
    b[0x131f8 + 0x0105] = 0xff
    b[0x131f8 + 0x0010] = 4
    const report = startNewCycle(b)
    expect(report).toMatchObject({ partsMoved: 2, partsLeft: 0 })
    const moved = BLADES.chest + 1 * BLADES.bytes
    expect(readU16(b, moved)).toBe(0x0105)
    expect(b.slice(moved + 2, moved + BLADES.bytes).every((v) => v === 0x22)).toBe(true)
    expect(readU16(b, GUARDS.chest)).toBe(0x0010)
    const cleared = BLADES.carried + 3 * BLADES.bytes
    expect(readU16(b, cleared)).toBe(0xffff)
    expect(b.slice(cleared + 2, cleared + BLADES.bytes).every((v) => v === 0)).toBe(true)
    expect(b[0x131f8 + 0x0105]).toBe(0xff)
    expect(b[0x131f8 + 0x0010]).toBe(5)
  })

  it('🟢 貴重品は道具の表にある品を取り除き、鉄4種は残す。🔶 残した品を前に詰める', () => {
    const b = makeMidCycleSave()
    item(b, VALUABLES, 0x00, 1) // 会談の手紙（取り除く）
    item(b, VALUABLES + 1 * 8, 0x29, 21) // くず鉄
    item(b, VALUABLES + 2 * 8, 0xed, 1) // 拷問部屋の鍵（取り除く）
    item(b, VALUABLES + 3 * 8, 0x2b, 1) // 堂島鋼
    const report = startNewCycle(b)
    expect(report.valuablesRemoved).toBe(2)
    expect([readU16(b, VALUABLES), readU16(b, VALUABLES + 2)]).toEqual([0x29, 21])
    expect(readU16(b, VALUABLES + 8)).toBe(0x2b)
    for (let i = 2; i < 10; i++) expect(Array.from(b.slice(VALUABLES + i * 8, VALUABLES + i * 8 + 8))).toEqual([255, 255, 0, 0, 0, 0, 0, 0])
  })

  it('流通の記録の経過の数を +1（空きは変えない）', () => {
    const b = makeMidCycleSave()
    emptyWeapon(b, 0x440d8)
    weapon(b, 0x440d8 + 0xa4, 7)
    writeU16(b, 0x440d8 + 0xa4 + 0x94, 2)
    writeU16(b, 0x44a74, 0x10)
    writeU16(b, 0x44a74 + 8, 0xffff)
    writeU16(b, 0x44a74 + 12, 0xffff)
    writeU16(b, 0x44aec, 3)
    writeU16(b, 0x44aec + 0x12, 1)
    writeU16(b, 0x452bc, 3)
    writeU16(b, 0x452bc + 0x0c, 0)
    const before = b.slice()
    startNewCycle(b)
    expect(b.slice(0x440d8, 0x440d8 + 0xa4)).toEqual(before.slice(0x440d8, 0x440d8 + 0xa4))
    expect(readU16(b, 0x440d8 + 0xa4 + 0x94)).toBe(3)
    expect(readU16(b, 0x44a74 + 8)).toBe(0)
    expect(readU16(b, 0x44a74 + 12 + 8)).toBe(readU16(before, 0x44a74 + 12 + 8))
    expect(readU16(b, 0x44aec + 0x12)).toBe(2)
    expect(readU16(b, 0x452bc + 0x0c)).toBe(1)
  })

  it('帯刀は変えない', () => {
    const b = makeMidCycleSave()
    weapon(b, 0xa4c8, 5)
    const before = b.slice()
    startNewCycle(b)
    expect(b.slice(0xa4c8, 0xa6b0)).toEqual(before.slice(0xa4c8, 0xa6b0))
  })
})

it('F32 の書き込みの往復（初期化で書く 1000.0）', () => {
  const b = new Uint8Array(4)
  writeF32(b, 0, 1000)
  expect(Array.from(b)).toEqual([0x00, 0x00, 0x7a, 0x44])
})
