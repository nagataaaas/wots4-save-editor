// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
import { describe, expect, it } from 'vitest'
import { readI16, readU16, writeI16, writeU16, writeU8 } from './binary'
import { TS_SAVE_SIZE } from './layout'
import {
  EQUIP_OFFSET,
  SCROLL_HELD_OFFSET,
  SCROLL_HELD_SLOTS,
  SCROLL_STORED_OFFSET,
  SCROLL_STORED_SLOTS,
  SECT_COUNT_OFFSET,
  SECT_RECORDS_OFFSET,
  SKILL_POINTS_OFFSET,
  SKILL_STATE,
  SHEET_STATE_SLOTS,
  STANCE_STATES_OFFSET,
  countLearned,
  isLearned,
  learnSheetSkill,
  learnStanceSkills,
  forgetSheetSkill,
  forgetStanceSkill,
  isUniqueStanceSkill,
  isUsableInOreRyu,
  learnStanceSkill,
  showStanceSkillInOreRyu,
  stanceSkillSheets,
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
  skillActions,
  writeSectValues,
  writeSkillPoints,
} from './sects'
import { SECTS, STANCE_SKILLS, findSect, findSkillSheet, findStance } from './master/sect-data'
import { SCROLL_SLOT_BYTES } from './sect-record'

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
  it('🟢 複数の流派・技の表に同じ異常があっても問題文は1回ずつ出す', () => {
    const b = makeSave()
    writeI16(b, SECT_RECORDS_OFFSET, 999)
    writeI16(b, SECT_RECORDS_OFFSET + 16, 998)
    writeU8(b, sheetStateOffset(0) + 4, 9)
    writeU8(b, sheetStateOffset(1) + 4, 9)
    expect(readSects(b).problem).toBe('流派の表に知らない流派があります ／ 技の覚え状況に不明な値があります')
  })
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

  it('サイズが違えば読み取り専用', () => {
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

  it('🟢 技の表の全部の技を覚えさせても、固有技（技の番号 21 乾坤一擲）は覚えさせない', () => {
    const b = makeSave()
    learnSheetSkills(b, SHEET)
    expect(b[sheetStateOffset(0) + 4 + 21]).toBe(0)
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

  it('🟢 枠がない技の表が2つ以上あっても、1回の書き込みで別々の空き枠に割り当てる', () => {
    const b = makeSave()
    const used = new Set(readSects(b).sheetSlots.map((s) => s.sheetId))
    const sect = SECTS.find((s) => s.sheets.length >= 2 && s.sheets.every((id) => !used.has(id)))!
    learnSectSkills(b, sect.id)
    const slots = readSects(b).sheetSlots
    const assigned = sect.sheets.map((id) => slots.findIndex((s) => s.sheetId === id))
    expect(assigned.every((i) => i >= 0)).toBe(true)
    expect(new Set(assigned).size).toBe(sect.sheets.length)
    expect(readSects(b).problem).toBeNull()
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

  it('🟢 固有技は覚えられる流派でだけ出し、ほかの流派では技を全部習得しても書かない', () => {
    // 乾坤一擲（技の番号 21）は脇の技の表に入っているが、覚えられるのは武業流剣術（49）だけ
    const sheet = findSkillSheet(SHEET)!
    expect(sheet.skills.some((s) => s.skillNo === 21)).toBe(true)
    expect(sectSheetSkills(findSect(51)!, sheet).some((s) => s.skillNo === 21)).toBe(false)
    const own = findSect(49)!
    expect(sectSheetSkills(own, findSkillSheet(own.sheets[0])!).some((s) => s.skillNo === 21)).toBe(true)

    const b = makeSave()
    learnSectSkills(b, 51)
    expect(b[sheetStateOffset(0) + 4 + 21]).toBe(0)
    expect(b[STANCE_STATES_OFFSET + STANCE * 128 + 21]).toBe(0)

    // 🟢 要ゲーム内確認：固有技は状態 3（習得済・俺流には未組み込み）にする
    learnSectSkills(b, 49)
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

  it('🟢 腕前点は 0x189FE の u16。通常は 9999 まで、上級者モードは 65535 まで。ほかのバイトは変えない', () => {
    const b = makeSave()
    const before = b.slice()
    writeSkillPoints(b, 9999)
    expect(readU16(b, SKILL_POINTS_OFFSET)).toBe(9999)
    expect(readSects(b).skillPoints).toBe(9999)
    expect(() => writeSkillPoints(b, 10000)).toThrow()
    expect(() => writeSkillPoints(b, -1)).toThrow()
    writeSkillPoints(b, 65535, { advanced: true })
    expect(readU16(b, SKILL_POINTS_OFFSET)).toBe(65535)
    expect(() => writeSkillPoints(b, 65536, { advanced: true })).toThrow()
    writeSkillPoints(b, 0)
    expect(b).toEqual(before)
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

describe('learnStanceSkill', () => {
  const stateIn = (b: Uint8Array, sheetId: number, no: number) =>
    readSects(b).sheetSlots.find((s) => s.sheetId === sheetId)?.states[no] ?? 0

  it('🟢 構えの技を、その技が入っている技の表すべてと構えごとの状態で習得する', () => {
    const b = makeSave()
    // 技の表 29 で覚えていない技のうち、ほかの技の表にも入っている技
    const no = findSkillSheet(SHEET)!.skills.find(
      (s) => !LEARNED_BEFORE.includes(s.skillNo) && stanceSkillSheets(STANCE, s.skillNo).length > 1,
    )!.skillNo
    const sheets = stanceSkillSheets(STANCE, no)
    expect(sheets.every((s) => s.stance === STANCE && s.skills.some((x) => x.skillNo === no))).toBe(true)
    learnStanceSkill(b, STANCE, no)
    for (const sheet of sheets) expect(stateIn(b, sheet.id, no)).not.toBe(0)
    expect(b[STANCE_STATES_OFFSET + STANCE * 128 + no]).not.toBe(0)
  })

  it('🟢 固有技は覚えられる流派の技の表だけで状態 3（要ゲーム内確認）、俺流で表示で 1', () => {
    const own = findSect(49)!.sheets[0]
    expect(isUniqueStanceSkill(STANCE, 21)).toBe(true)
    expect(isUniqueStanceSkill(STANCE, 0)).toBe(false)
    expect(stanceSkillSheets(STANCE, 21).map((s) => s.id)).toContain(own)
    expect(stanceSkillSheets(STANCE, 21).map((s) => s.id)).not.toContain(SHEET)

    const b = makeSave()
    learnStanceSkill(b, STANCE, 21)
    expect(stateIn(b, own, 21)).toBe(3)
    expect(stateIn(b, SHEET, 21)).toBe(0)
    expect(b[STANCE_STATES_OFFSET + STANCE * 128 + 21]).toBe(3)

    showStanceSkillInOreRyu(b, STANCE, 21)
    expect(stateIn(b, own, 21)).toBe(1)
    expect(b[STANCE_STATES_OFFSET + STANCE * 128 + 21]).toBe(1)
  })

  it('どの技の表にもない技は拒否してバイト列を変えない', () => {
    const missing = STANCE_SKILLS.find((s) => stanceSkillSheets(s.stance, s.skillNo).length === 0)
    if (!missing) return
    const b = makeSave()
    const before = b.slice()
    expect(() => learnStanceSkill(b, missing.stance, missing.skillNo)).toThrow()
    expect(b).toEqual(before)
  })

  it('忘れさせると、すべての技の表と構えごとの状態が 0 になる', () => {
    const b = makeSave()
    learnStanceSkill(b, STANCE, 3)
    forgetStanceSkill(b, STANCE, 3)
    for (const sheet of stanceSkillSheets(STANCE, 3)) expect(stateIn(b, sheet.id, 3)).toBe(0)
    expect(b[STANCE_STATES_OFFSET + STANCE * 128 + 3]).toBe(0)
  })
})

describe('learnSheetSkill', () => {
  it('🟢 通常の技は learnSheetSkills と、固有技は learnUniqueSkills と同じバイト列になる', () => {
    const own = findSect(49)!.sheets[0]
    const normal = findSkillSheet(SHEET)!.skills.find((s) => !LEARNED_BEFORE.includes(s.skillNo) && s.parent !== null && s.skillNo !== 21)!
    for (const [sheetId, no] of [
      [SHEET, normal.skillNo],
      [own, 21],
    ]) {
      const a = makeSave()
      const b = makeSave()
      learnSheetSkill(a, sheetId, no)
      if (no === 21) learnUniqueSkills(b, sheetId, [no])
      else learnSheetSkills(b, sheetId, [no])
      expect(a).toEqual(b)
    }
    const b = makeSave()
    learnSheetSkill(b, own, 21)
    expect(b[STANCE_STATES_OFFSET + STANCE * 128 + 21]).toBe(3)
  })

  it('技の表にない技・知らない技の表は拒否してバイト列を変えない', () => {
    const b = makeSave()
    const before = b.slice()
    const missing = Array.from({ length: 128 }, (_, no) => no).find((no) => !findSkillSheet(SHEET)!.skills.some((s) => s.skillNo === no))!
    expect(() => learnSheetSkill(b, SHEET, missing)).toThrow()
    expect(() => learnSheetSkill(b, 9999, 0)).toThrow()
    expect(b).toEqual(before)
  })
})

describe('learnStanceSkills', () => {
  it('🟢 まとめて習得すると、1 つずつ learnStanceSkill したときと同じバイト列になる', () => {
    const nos = findSkillSheet(SHEET)!.skills.map((s) => s.skillNo).filter((no) => stanceSkillSheets(STANCE, no).length > 0)
    const a = makeSave()
    const b = makeSave()
    learnStanceSkills(a, STANCE, nos)
    for (const no of nos) learnStanceSkill(b, STANCE, no)
    expect(a).toEqual(b)
    expect(readSects(a).problem).toBeNull()
  })

  it('どの技の表にもない技が 1 つでもあれば、ほかの技も書かずに拒否する', () => {
    const missing = STANCE_SKILLS.find((s) => s.stance === STANCE && stanceSkillSheets(s.stance, s.skillNo).length === 0)
    if (!missing) return
    const b = makeSave()
    const before = b.slice()
    expect(() => learnStanceSkills(b, STANCE, [3, missing.skillNo])).toThrow()
    expect(b).toEqual(before)
  })
})

describe('流派・技の表のそろい', () => {
  it('🟢 流派の技の表はすべて技の表にあり、構えも構えの表にある（流派の画面はこれを前提に技の表を引く）', () => {
    for (const sect of SECTS) {
      for (const id of sect.sheets) {
        const sheet = findSkillSheet(id)
        expect(sheet, `流派 ${sect.id} の技の表 ${id}`).toBeDefined()
        expect(findStance(sheet!.stance)).toBeDefined()
      }
    }
  })
})

describe('技の状態', () => {
  it('🟢 状態 1・2・3 が覚えている技。countLearned は指定した番号のうち覚えている数', () => {
    expect([0, 1, 2, 3].map(isLearned)).toEqual([false, true, true, true])
    expect(SKILL_STATE).toEqual({ notLearned: 0, learned: 1, learnedParent: 2, notInOreRyu: 3 })
    const states = [0, 1, 2, 3, 0]
    expect(countLearned(states, [0, 1, 2, 3, 4])).toBe(3)
    expect(countLearned(states, [0, 4])).toBe(0)
  })
})

describe('技の操作の候補', () => {
  it('🟢 未習得と通常技の状態3は習得、固有技の状態3は俺流への表示を選ぶ', () => {
    expect(skillActions(null, false, false)).toMatchObject({ learn: true, showInOreRyu: false })
    expect(skillActions(0, true, false)).toMatchObject({ learn: true, showInOreRyu: false })
    expect(skillActions(3, false, false)).toMatchObject({ learn: true, showInOreRyu: false })
    expect(skillActions(3, true, false)).toMatchObject({ learn: false, showInOreRyu: true })
    for (const state of [1, 2]) expect(skillActions(state, true, false)).toEqual({ learn: false, showInOreRyu: false, forget: false })
  })
  it('❓ 忘れさせる操作は上級者モードで習得後だけに出す', () => {
    for (const state of [1, 2, 3]) {
      expect(skillActions(state, true, true).forget).toBe(true)
      expect(skillActions(state, true, false).forget).toBe(false)
    }
    for (const state of [null, 0]) expect(skillActions(state, false, true).forget).toBe(false)
  })
  it('🟢 俺流で使えるのは状態1・2だけ', () => {
    expect([0, 1, 2, 3, 255].map(isUsableInOreRyu)).toEqual([false, true, true, false, false])
  })
})
