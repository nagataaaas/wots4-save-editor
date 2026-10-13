// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 実セーブで読んだ俺流の技の表のバイト列は、定数として埋め込む。
import { describe, expect, it } from 'vitest'
import { readI16, readU16, writeI16, writeU16, writeU8 } from './binary'
import { TS_SAVE_SIZE } from './layout'
import { SKILL_NO_COUNT, findStanceSkill, stanceSkills } from './master/sect-data'
import {
  CUSTOM_COUNT_OFFSET,
  CUSTOM_OFFSET,
  CUSTOM_SHEET_COUNT_OFFSET,
  CUSTOM_SHEET_OFFSET,
  addCustomStance,
  buildCustomSkills,
  createCustomStyle,
  deleteCustomStyle,
  findSkillConflicts,
  initialStanceSkills,
  pickWithoutConflicts,
  readCustomStyles,
  removeCustomStance,
  writeCustomName,
  writeCustomSheetSkills,
  writeCustomValues,
} from './custom-style'
import {
  EQUIP_OFFSET,
  SCROLL_HELD_OFFSET,
  SCROLL_HELD_SLOTS,
  SCROLL_SLOT_BYTES,
  SCROLL_STORED_COUNT_OFFSET,
  SCROLL_STORED_OFFSET,
  SCROLL_STORED_SLOTS,
  SHEET_STATE_SLOTS,
  STANCE_STATES_OFFSET,
  sheetStateOffset,
} from './sects'

const hex = (s: string) => Uint8Array.from(s.trim().split(/\s+/).map((h) => parseInt(h, 16)))

/** 🟢 実セーブの俺流の技の表（生きた証の写し 4003、構え 1 中段、技 20 件）の先頭 8 B ＋ 技 */
const SHEET_4003 = hex(`
a3 0f 02 00 01 00 14 00 00 81 08 00 01 ff ff ff 01 01 09 00 02 ff ff ff 02 00 0a 00 ff ff ff ff 06 80 0e 00 ff ff ff ff
07 80 0f 00 ff ff ff ff 08 80 10 00 ff ff ff ff 09 80 12 00 ff ff ff ff 0d 81 17 00 0e ff ff ff 0e 01 18 00 0f ff ff ff
0f 00 19 00 ff ff ff ff 13 81 1d 00 14 ff ff ff 14 00 1e 00 ff ff ff ff 17 82 21 00 19 37 ff ff 19 01 21 00 1a ff ff ff
1a 00 22 00 ff ff ff ff 1e 80 26 00 ff ff ff ff 37 00 22 00 ff ff ff ff 57 80 f5 02 ff ff ff ff 59 80 f7 02 ff ff ff ff
5e 80 fc 02 ff ff ff ff`)
const SHEET_4003_SKILLS = [0, 1, 2, 6, 7, 8, 9, 13, 14, 15, 19, 20, 23, 25, 26, 30, 55, 87, 89, 94]

/** 🟢 構え 2 下段（俺流 4000 の構え）で覚えている技 */
const STANCE2_LEARNED = [3, 4, 5, 6, 7, 8, 9, 21, 23, 31]

function makeSave(): Uint8Array {
  const b = new Uint8Array(TS_SAVE_SIZE)
  for (let i = 0; i < SCROLL_HELD_SLOTS; i++) {
    writeI16(b, SCROLL_HELD_OFFSET + i * SCROLL_SLOT_BYTES, -1)
    writeI16(b, SCROLL_HELD_OFFSET + i * SCROLL_SLOT_BYTES + 2, -1)
  }
  for (let i = 0; i < SCROLL_STORED_SLOTS; i++) {
    writeI16(b, SCROLL_STORED_OFFSET + i * SCROLL_SLOT_BYTES, -1)
    writeI16(b, SCROLL_STORED_OFFSET + i * SCROLL_SLOT_BYTES + 2, -1)
  }
  for (let i = 0; i < SHEET_STATE_SLOTS; i++) writeI16(b, sheetStateOffset(i), -1)
  ;[51, 82, 99, 105, 106, 94].forEach((id, s) => writeI16(b, EQUIP_OFFSET + 2 * s, id))
  for (const no of STANCE2_LEARNED) writeU8(b, STANCE_STATES_OFFSET + 2 * 128 + no, 1)
  // 生きた証の写し 2003（技の表 4003）
  writeU16(b, CUSTOM_COUNT_OFFSET, 1)
  writeI16(b, CUSTOM_OFFSET, 2003)
  writeI16(b, CUSTOM_OFFSET + 0x48, 4003)
  writeI16(b, CUSTOM_OFFSET + 0x4a, -1)
  writeI16(b, CUSTOM_OFFSET + 0x4c, -1)
  writeU16(b, CUSTOM_SHEET_COUNT_OFFSET, 1)
  b.set(SHEET_4003, CUSTOM_SHEET_OFFSET)
  return b
}

describe('readCustomStyles', () => {
  it('🟢 複数の技・参照に同じ異常があっても問題文は1回ずつ出す', () => {
    const b = makeSave()
    writeU8(b, CUSTOM_SHEET_OFFSET + 9, 0x7f)
    writeU8(b, CUSTOM_SHEET_OFFSET + 17, 0x7f)
    writeI16(b, CUSTOM_OFFSET + 0x48, 999)
    writeI16(b, CUSTOM_OFFSET + 0x4a, 998)
    writeI16(b, CUSTOM_OFFSET + 0x4c, 997)
    const messages = readCustomStyles(b).problem!.split(' ／ ')
    expect(messages.filter(m => m === '俺流の技の表の、続けて出す技の数が多すぎます')).toHaveLength(1)
    expect(messages.filter(m => m === '俺流に対応する技の表がありません')).toHaveLength(1)
    expect(new Set(messages).size).toBe(messages.length)
  })
  it('🟢 俺流と俺流の技の表を読む', () => {
    const v = readCustomStyles(makeSave())
    expect(v.problem).toBeNull()
    expect(v.styles[0]).toMatchObject({ id: 2003, kind: 'live-proof', name: '', sheetIds: [4003, -1, -1], scroll: null })
    expect(v.sheets[0]).toMatchObject({ id: 4003, stance: 1 })
    expect(v.sheets[0].skills.map((s) => s.skillNo)).toEqual(SHEET_4003_SKILLS)
    expect(v.sheets[0].skills.find((s) => s.skillNo === 23)).toMatchObject({ first: true, skillId: 33, next: [25, 55] })
  })

  it('俺流が指す技の表がなければ読み取り専用', () => {
    const b = makeSave()
    writeI16(b, CUSTOM_OFFSET + 0x48, 4999)
    expect(readCustomStyles(b).problem).toMatch(/対応する技の表がありません/)
  })
})

describe('buildCustomSkills', () => {
  it('🟢 構えの技の表から作った技が、実セーブの俺流の技の表と同じバイト列になる', () => {
    const b = makeSave()
    b.fill(0, CUSTOM_SHEET_OFFSET + 8, CUSTOM_SHEET_OFFSET + 0x408)
    writeCustomSheetSkills(b, 4003, SHEET_4003_SKILLS, { advanced: true })
    expect(b.slice(CUSTOM_SHEET_OFFSET, CUSTOM_SHEET_OFFSET + SHEET_4003.length)).toEqual(SHEET_4003)
    expect(b.slice(CUSTOM_SHEET_OFFSET + SHEET_4003.length, CUSTOM_SHEET_OFFSET + 0x408).every((x) => x === 0)).toBe(true)
  })

  it('繋がる技は入れた技だけ', () => {
    expect(buildCustomSkills(1, [23, 25]).map((s) => s.next)).toEqual([[25], []])
  })
})

describe('findSkillConflicts', () => {
  const nosWithProblems = (stance: number, nos: number[]) => [...findSkillConflicts(stance, nos).byNo.keys()].sort((a, b) => a - b)

  it('🟢 ゲームが作った俺流の技の表（4003）には問題がない', () => {
    const c = findSkillConflicts(1, SHEET_4003_SKILLS)
    expect(c.byNo.size).toBe(0)
    expect(c.sheet).toEqual([])
  })

  it('🟢 初段の攻撃技どうしのコマンドの重なり（弐號玉・壱號玉はどちらも 強）', () => {
    expect(nosWithProblems(2, [12, 13, 3])).toEqual([12, 13])
  })

  it('🟢 同じ技から続く技どうしのコマンドの重なり（流影転身の次の 天狗蹴り・赤べこ はどちらも →＋強）', () => {
    expect(nosWithProblems(2, [21, 23, 48])).toEqual([23, 48])
  })

  it('🟢 同じ組の防御技は 1 つまで、攻撃技が 1 つもない表は不可', () => {
    expect(nosWithProblems(2, [3, 75, 76])).toEqual([75, 76])
    expect(findSkillConflicts(2, [75]).sheet).toEqual(['攻撃技が 1 つもありません'])
  })

  it('🟢 前に出す技がない技', () => {
    expect(nosWithProblems(2, [4])).toEqual([4])
  })

  it('重ならないように入れられるだけ選ぶと、問題のない選び方になる', () => {
    const all = stanceSkills(2).map((s) => s.skillNo)
    const picked = pickWithoutConflicts(2, all, new Set())
    expect(picked.size).toBeGreaterThan(20)
    const c = findSkillConflicts(2, [...picked])
    expect(c.byNo.size).toBe(0)
    expect(c.sheet).toEqual([])
  })

  it('通常モードでは重なりを拒否し、上級者モードでは書ける', () => {
    const b = makeSave()
    for (const no of [12, 13]) writeU8(b, STANCE_STATES_OFFSET + 2 * 128 + no, 1)
    expect(() => createCustomStyle(b, { name: 'A', stance: 2, skillNos: [12, 13] })).toThrow(/重なって/)
    createCustomStyle(b, { name: 'A', stance: 2, skillNos: [12, 13] }, { advanced: true })
  })
})

describe('createCustomStyle', () => {
  it('🟢 流派 ID 1000・技の表 2000 で作り、持ち歩きの最初の空きに書を入れる', () => {
    const b = makeSave()
    const id = createCustomStyle(b, { name: 'My流', stance: 2, skillNos: [3, 4, 5, 21, 23] })
    expect(id).toBe(1000)
    const v = readCustomStyles(b)
    expect(v.problem).toBeNull()
    expect(v.styles[1]).toMatchObject({ id: 1000, kind: 'player', name: 'My流', sheetIds: [2000, -1, -1], mastery: 0, rank: 0 })
    expect(v.styles[1].scroll).toMatchObject({ place: 'held', index: 0 })
    expect(readU16(b, CUSTOM_COUNT_OFFSET)).toBe(2)
    expect(readU16(b, CUSTOM_SHEET_COUNT_OFFSET)).toBe(2)
    // 書の +4〜 に名前の写し
    expect(readU16(b, SCROLL_HELD_OFFSET + 4)).toBe('M'.charCodeAt(0))
    expect(v.sheets[1].skills.map((s) => [s.skillNo, s.first, s.next])).toEqual([
      [3, true, [4]],
      [4, false, [5]],
      [5, false, []],
      [21, true, [23]],
      [23, false, []],
    ])
  })

  it('持ち歩きが満杯なら箪笥の末尾に入れて件数を増やす', () => {
    const b = makeSave()
    for (let i = 0; i < SCROLL_HELD_SLOTS; i++) writeI16(b, SCROLL_HELD_OFFSET + i * SCROLL_SLOT_BYTES, 438)
    writeI16(b, SCROLL_STORED_OFFSET, 434)
    writeU16(b, SCROLL_STORED_COUNT_OFFSET, 1)
    createCustomStyle(b, { name: 'A', stance: 2, skillNos: [3] })
    expect(readI16(b, SCROLL_STORED_OFFSET + SCROLL_SLOT_BYTES + 2)).toBe(1000)
    expect(readU16(b, SCROLL_STORED_COUNT_OFFSET)).toBe(2)
  })

  it('通常モードでは覚えていない技・前の技がない技・11 文字以上の名前は拒否してバイト列を変えない', () => {
    const b = makeSave()
    const before = b.slice()
    expect(() => createCustomStyle(b, { name: 'A', stance: 2, skillNos: [10] })).toThrow(/入れられません/)
    expect(() => createCustomStyle(b, { name: 'A', stance: 2, skillNos: [4] })).toThrow(/前に出す技/)
    expect(() => createCustomStyle(b, { name: 'あいうえおかきくけこさ', stance: 2, skillNos: [3] })).toThrow(/10文字/)
    expect(b).toEqual(before)
    // 上級者モードでは覚えていない技も入れられる
    createCustomStyle(b, { name: 'A', stance: 2, skillNos: [10, 4] }, { advanced: true })
  })
})

describe('編集と削除', () => {
  function withPlayerStyle(): Uint8Array {
    const b = makeSave()
    createCustomStyle(b, { name: 'My流', stance: 2, skillNos: [3, 4] })
    return b
  }

  it('名前・修練度を書き、読み出し→書き戻しでバイトが変わらない', () => {
    const b = withPlayerStyle()
    const s = readCustomStyles(b).styles[1]
    const before = b.slice()
    writeCustomName(b, 1000, s.name)
    writeCustomValues(b, 1000, { mastery: s.mastery, rank: s.rank, kills: s.kills })
    expect(b).toEqual(before)
    writeCustomName(b, 1000, '夜杯')
    writeCustomValues(b, 1000, { mastery: 10000, rank: 5, kills: 3 })
    expect(readCustomStyles(b).styles[1]).toMatchObject({ name: '夜杯', mastery: 10000, rank: 5, kills: 3 })
  })

  it('🟢 構えは同じ構えの組だけ足せる。外すと技の表を前に詰める', () => {
    const b = withPlayerStyle()
    expect(() => addCustomStance(b, 1000, 7, [0], { advanced: true })).toThrow(/構えの組/)
    addCustomStance(b, 1000, 3, [0], { advanced: true })
    let v = readCustomStyles(b)
    expect(v.styles[1].sheetIds).toEqual([2000, 2001, -1])
    removeCustomStance(b, 1000, 2000)
    v = readCustomStyles(b)
    expect(v.problem).toBeNull()
    expect(v.styles[1].sheetIds).toEqual([2001, -1, -1])
    expect(v.sheets.map((s) => s.id)).toEqual([4003, 2001])
  })

  it('🟢 消すと俺流・技の表・書が消え、件数が減る。装備中・生きた証の写しは消せない', () => {
    const b = withPlayerStyle()
    expect(() => deleteCustomStyle(b, 2003)).toThrow(/上級者/)
    writeI16(b, EQUIP_OFFSET + 4, 1000)
    expect(() => deleteCustomStyle(b, 1000)).toThrow(/装備/)
    writeI16(b, EQUIP_OFFSET + 4, 99)
    deleteCustomStyle(b, 1000)
    const v = readCustomStyles(b)
    expect(v.problem).toBeNull()
    expect(v.styles.map((s) => s.id)).toEqual([2003])
    expect(v.sheets.map((s) => s.id)).toEqual([4003])
    expect(readI16(b, SCROLL_HELD_OFFSET + 2)).toBe(-1)
    expect(b.slice(CUSTOM_OFFSET + 80, CUSTOM_OFFSET + 160).every((x) => x === 0)).toBe(true)
  })

  it('🟢 構えが2つの俺流を消すと、2つ目の技の表も前に詰めた位置で消え、ほかの技の表はバイトごと残る', () => {
    const b = withPlayerStyle()
    addCustomStance(b, 1000, 3, [0], { advanced: true })
    expect(readCustomStyles(b).sheets.map((s) => s.id)).toEqual([4003, 2000, 2001])
    deleteCustomStyle(b, 1000)
    const v = readCustomStyles(b)
    expect(v.problem).toBeNull()
    expect(v.styles.map((s) => s.id)).toEqual([2003])
    expect(v.sheets.map((s) => s.id)).toEqual([4003])
    expect(readU16(b, CUSTOM_SHEET_COUNT_OFFSET)).toBe(1)
    expect([...b.subarray(CUSTOM_SHEET_OFFSET, CUSTOM_SHEET_OFFSET + SHEET_4003.length)]).toEqual([...SHEET_4003])
  })
})

describe('initialStanceSkills', () => {
  // 構えの技の表から、初段の技 2 つと初段でない技 1 つを選んで使う
  const STANCE = 2
  const nos = Array.from({ length: SKILL_NO_COUNT }, (_, no) => no)
  const [usableFirst, unusableFirst] = nos.filter((no) => findStanceSkill(STANCE, no)?.first)
  const notFirst = nos.find((no) => findStanceSkill(STANCE, no) && !findStanceSkill(STANCE, no)?.first)!

  it('🟢 構えを足すときは、俺流で使える（状態 1・2）初段の技だけを選ぶ。上級者モードでは状態を問わない', () => {
    const states = Array<number>(SKILL_NO_COUNT).fill(0)
    states[usableFirst] = 1
    states[unusableFirst] = 3
    states[notFirst] = 2
    const before = [...states]
    expect(initialStanceSkills(states, STANCE, { advanced: false })).toEqual([usableFirst])
    const advanced = initialStanceSkills(states, STANCE, { advanced: true })
    expect(advanced).toContain(usableFirst)
    expect(advanced).toContain(unusableFirst)
    // 初段でない技は、使える状態でも上級者モードでも選ばない
    expect(advanced).not.toContain(notFirst)
    expect(states).toEqual(before)
  })
})
