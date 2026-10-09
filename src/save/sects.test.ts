// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
import { describe, expect, it } from 'vitest'
import { readI16, readU16, writeI16, writeU16, writeU8 } from './binary'
import { TS_SAVE_SIZE } from './hero'
import {
  EQUIP_OFFSET,
  SCROLL_HELD_OFFSET,
  SCROLL_HELD_SLOTS,
  SCROLL_SLOT_BYTES,
  SCROLL_STORED_OFFSET,
  SCROLL_STORED_SLOTS,
  SECT_COUNT_OFFSET,
  SECT_RECORDS_OFFSET,
  SHEET_STATE_SLOTS,
  STANCE_STATES_OFFSET,
  forgetSheetSkill,
  learnSectSkills,
  learnSheetSkills,
  learnUniqueSkills,
  nextState,
  ownedSectIds,
  rankForMastery,
  readSects,
  sectHasUniqueSkill,
  sectSheetSkills,
  sheetStateOffset,
  writeSectValues,
} from './sects'
import { findSect, findSkillSheet } from './master/sect-data'

/** 🟢 鬼怒川流剣術（ID 51）の 1つめの技の表は 29（構え 3 脇） */
const SHEET = 29
const STANCE = 3
/** 実セーブで覚えていた技の番号（技の表 29） */
const LEARNED_BEFORE = [0, 1, 2, 7, 9, 18, 29, 51, 73]

/** 流派の書の枠を空き（−1, −1）にする */
function clearScrolls(b: Uint8Array, base: number, slots: number): void {
  for (let i = 0; i < slots; i++) {
    writeI16(b, base + i * SCROLL_SLOT_BYTES, -1)
    writeI16(b, base + i * SCROLL_SLOT_BYTES + 2, -1)
  }
}

function makeSave(): Uint8Array {
  const b = new Uint8Array(TS_SAVE_SIZE)
  clearScrolls(b, SCROLL_HELD_OFFSET, SCROLL_HELD_SLOTS)
  clearScrolls(b, SCROLL_STORED_OFFSET, SCROLL_STORED_SLOTS)
  for (let i = 0; i < SHEET_STATE_SLOTS; i++) writeI16(b, sheetStateOffset(i), -1)
  // 装備：構えの組 0〜5
  ;[51, 82, 99, 105, 106, 94].forEach((id, s) => writeI16(b, EQUIP_OFFSET + 2 * s, id))
  // 持ち歩きに 天神御影流剣術（書の番号 448 → 流派 43）
  writeI16(b, SCROLL_HELD_OFFSET, 448)
  // 流派の表：51 と 43
  writeU16(b, SECT_COUNT_OFFSET, 2)
  writeI16(b, SECT_RECORDS_OFFSET, 43)
  writeI16(b, SECT_RECORDS_OFFSET + 16, 51)
  writeI16(b, SECT_RECORDS_OFFSET + 16 + 2, 598)
  // 技の覚え状況：枠 0 に技の表 29
  writeI16(b, sheetStateOffset(0), SHEET)
  writeU16(b, sheetStateOffset(0) + 2, LEARNED_BEFORE.length)
  for (const no of LEARNED_BEFORE) {
    writeU8(b, sheetStateOffset(0) + 4 + no, 1)
    writeU8(b, STANCE_STATES_OFFSET + STANCE * 128 + no, 1)
  }
  return b
}

describe('readSects', () => {
  it('🟢 装備・流派の書・流派の表・技の覚え状況を読む', () => {
    const v = readSects(makeSave())
    expect(v.problem).toBeNull()
    expect(v.equipped).toEqual([51, 82, 99, 105, 106, 94])
    expect(v.held[0].sect?.id).toBe(43)
    expect(v.held[1].empty).toBe(true)
    expect(v.records.map((r) => [r.id, r.mastery])).toEqual([
      [43, 0],
      [51, 598],
    ])
    expect(v.sheetSlots[0]).toMatchObject({ sheetId: SHEET, count: 9 })
    expect([...ownedSectIds(v)].sort((a, b) => a - b)).toEqual([43, 51, 82, 94, 99, 105, 106])
  })

  it('🟢 装備の並びは構えの組の順（刀・槍・無手・拳銃・ライフル・二刀）。はじめからの 6 つと実セーブの装備で確かめる', () => {
    for (const ids of [
      [32, 85, 98, 105, 106, 90],
      [51, 82, 99, 105, 106, 94],
    ]) {
      expect(ids.map((id) => findSect(id)!.slot)).toEqual([0, 1, 2, 3, 4, 5])
    }
  })

  it('❓ U-1：サイズが違えば読み取り専用', () => {
    const b = new Uint8Array(TS_SAVE_SIZE + 2)
    b.set(makeSave())
    expect(readSects(b).problem).not.toBeNull()
    expect(() => learnSheetSkills(b, SHEET)).toThrow()
  })

  it('知らない流派 ID があれば読み取り専用', () => {
    const b = makeSave()
    writeI16(b, SECT_RECORDS_OFFSET, 1999)
    expect(readSects(b).problem).toMatch(/知らない流派/)
  })
})

describe('learnSheetSkills', () => {
  it('✅ [U] 技の表 29 の技を全部覚えさせると、ゲームで反映された書き込みと同じバイト列になる（特別な技 21 は除く）', () => {
    const b = makeSave()
    learnSheetSkills(b, SHEET)
    // 2026-10-09 にゲームで反映を確かめたバイト列（覚えていた 9 件に加えて 10 件。80 は派生先 81 があるので 2）
    const expected = new Map<number, number>([
      ...LEARNED_BEFORE.map((n) => [n, 1] as [number, number]),
      [19, 1], [47, 1], [48, 1], [59, 1], [69, 1], [74, 1], [75, 1], [80, 2], [81, 1], [90, 1],
    ])
    expect(readU16(b, sheetStateOffset(0) + 2)).toBe(19)
    for (let no = 0; no < 128; no++) {
      expect(b[sheetStateOffset(0) + 4 + no]).toBe(expected.get(no) ?? 0)
      expect(b[STANCE_STATES_OFFSET + STANCE * 128 + no]).toBe(expected.get(no) ?? 0)
    }
  })

  it('🟢 特別な技（習得条件 51〜56）は includeSpecial のときだけ覚えさせる', () => {
    const b = makeSave()
    learnSheetSkills(b, SHEET, undefined, { includeSpecial: true })
    expect(b[sheetStateOffset(0) + 4 + 21]).toBe(1)
  })

  it('🟢 派生先だけを指定すると派生元も覚え、派生元は 2 になる', () => {
    const b = makeSave()
    learnSheetSkills(b, SHEET, [81])
    expect(b[sheetStateOffset(0) + 4 + 80]).toBe(2)
    expect(b[sheetStateOffset(0) + 4 + 81]).toBe(1)
    expect(readU16(b, sheetStateOffset(0) + 2)).toBe(11)
  })

  it('🟢 枠がない技の表は、先頭の空き枠に割り当てる', () => {
    const b = makeSave()
    const sheet = findSect(43)!.sheets[0]
    learnSectSkills(b, 43)
    expect(readI16(b, sheetStateOffset(1))).toBe(sheet)
    expect(readU16(b, sheetStateOffset(1) + 2)).toBeGreaterThan(0)
  })

  it('🟢 状態 3 の技を対象にすると 1 にする。構えごとの状態は 2 を 1 で上書きしない', () => {
    const b = makeSave()
    writeU8(b, sheetStateOffset(0) + 4 + 19, 3)
    writeU8(b, STANCE_STATES_OFFSET + STANCE * 128 + 19, 3)
    writeU8(b, STANCE_STATES_OFFSET + STANCE * 128 + 47, 2)
    learnSheetSkills(b, SHEET, [19, 47])
    expect(b[sheetStateOffset(0) + 4 + 19]).toBe(1)
    expect(b[STANCE_STATES_OFFSET + STANCE * 128 + 19]).toBe(1)
    expect(b[STANCE_STATES_OFFSET + STANCE * 128 + 47]).toBe(2)
  })

  it('🟢 技の表ごとの状態が前から 1 でも、対象にした技は構えごとの状態も書く', () => {
    const b = makeSave()
    writeU8(b, STANCE_STATES_OFFSET + STANCE * 128 + 0, 0)
    learnSheetSkills(b, SHEET, [0])
    expect(b[STANCE_STATES_OFFSET + STANCE * 128 + 0]).toBe(1)
  })

  it('🟢 固有技は覚えられる流派でだけ出し、ほかの流派では固有技も習得するにしても書かない', () => {
    // 乾坤一擲（技の番号 21）は脇の技の表に入っているが、覚えられるのは武業流剣術（49）だけ
    const sheet = findSkillSheet(SHEET)!
    expect(sheet.skills.some((s) => s.skillNo === 21)).toBe(true)
    expect(sectSheetSkills(findSect(51)!, sheet).some((s) => s.skillNo === 21)).toBe(false)
    const own = findSect(49)!
    expect(sectSheetSkills(own, findSkillSheet(own.sheets[0])!).some((s) => s.skillNo === 21)).toBe(true)

    const b = makeSave()
    learnSectSkills(b, 51, { includeSpecial: true })
    expect(b[sheetStateOffset(0) + 4 + 21]).toBe(0)
    expect(b[STANCE_STATES_OFFSET + STANCE * 128 + 21]).toBe(0)

    // 🟢 要ゲーム内確認：固有技は状態 3（習得済・俺流には未組み込み）にする
    learnSectSkills(b, 49, { includeSpecial: true })
    const slot = readSects(b).sheetSlots.find((s) => s.sheetId === own.sheets[0])!
    expect(slot.states[21]).toBe(3)
    expect(b[STANCE_STATES_OFFSET + STANCE * 128 + 21]).toBe(3)
  })

  it('🟢 固有技の習得は 3（要ゲーム内確認）、俺流で表示は 3 → 1。習得済みの 1 は 3 に戻さない', () => {
    const sheet = findSect(49)!.sheets[0]
    const b = makeSave()
    learnUniqueSkills(b, sheet, [21])
    const state = () => readSects(b).sheetSlots.find((s) => s.sheetId === sheet)!.states[21]
    expect(state()).toBe(3)
    expect(b[STANCE_STATES_OFFSET + STANCE * 128 + 21]).toBe(3)

    learnSheetSkills(b, sheet, [21])
    expect(state()).toBe(1)
    expect(b[STANCE_STATES_OFFSET + STANCE * 128 + 21]).toBe(1)

    learnUniqueSkills(b, sheet, [21])
    expect(state()).toBe(1)
    expect(b[STANCE_STATES_OFFSET + STANCE * 128 + 21]).toBe(1)
  })

  it('🟢 固有技を覚えられる流派は固有武器の流派だけ', () => {
    expect(sectHasUniqueSkill(findSect(49)!)).toBe(true) // 武業流剣術（乾坤一擲）
    expect(sectHasUniqueSkill(findSect(51)!)).toBe(false) // 鬼怒川流剣術（乾坤一擲が技の表にあるが覚えられない）
  })

  it('同じ操作を 2 回しても変わらない', () => {
    const b = makeSave()
    learnSheetSkills(b, SHEET)
    const once = b.slice()
    learnSheetSkills(b, SHEET)
    expect(b).toEqual(once)
  })
})

describe('forgetSheetSkill', () => {
  it('派生先を忘れると派生元は 1 に戻り、構えごとの状態も 0 になる', () => {
    const b = makeSave()
    learnSheetSkills(b, SHEET, [81])
    forgetSheetSkill(b, SHEET, 81)
    expect(b[sheetStateOffset(0) + 4 + 81]).toBe(0)
    expect(b[sheetStateOffset(0) + 4 + 80]).toBe(1)
    expect(b[STANCE_STATES_OFFSET + STANCE * 128 + 81]).toBe(0)
  })
})

describe('nextState', () => {
  it('🟢 ゲームの規則：0 なら書く、3→1 は書く、2 は必ず書く、1→3 は書かない', () => {
    expect(nextState(0, 1)).toBe(1)
    expect(nextState(3, 1)).toBe(1)
    expect(nextState(1, 2)).toBe(2)
    expect(nextState(1, 3)).toBe(1)
    expect(nextState(2, 1)).toBe(2)
  })
})

describe('writeSectValues', () => {
  it('🟢 修練度・段・倒した数を書き、読み出し→書き戻しでバイトが変わらない', () => {
    const b = makeSave()
    const r = readSects(b).records[1]
    const before = b.slice()
    writeSectValues(b, 51, { mastery: r.mastery, rank: r.rank, kills: r.kills })
    expect(b).toEqual(before)
    writeSectValues(b, 51, { mastery: 10000, rank: 5, kills: 12 })
    expect(readSects(b).records[1]).toMatchObject({ mastery: 10000, rank: 5, kills: 12 })
  })

  it('範囲外は拒否してバイト列を変えない', () => {
    const b = makeSave()
    const before = b.slice()
    expect(() => writeSectValues(b, 51, { mastery: 10001, rank: 0, kills: 0 })).toThrow()
    expect(() => writeSectValues(b, 51, { mastery: 0, rank: 6, kills: 0 })).toThrow()
    expect(() => writeSectValues(b, 1, { mastery: 0, rank: 0, kills: 0 })).toThrow()
    expect(b).toEqual(before)
  })

  it('🟢 修練度に見合う段（夜杯流体術 300・1000・2500・4500）', () => {
    const s = findSect(108)!
    expect([0, 299, 300, 2499, 4500, 10000].map((m) => rankForMastery(s, m))).toEqual([0, 0, 1, 2, 4, 4])
  })
})
