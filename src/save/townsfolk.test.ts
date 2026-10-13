// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 値は docs/save_format/chunks/townsfolk（[U] 2026-10-06）で見たもの。
// ✅ [U] 2026-10-06：0x02C4＝寿司屋の店主、0x0444＝鍛冶屋のおやじ（どちらも 1＝死亡。0 に戻すと生き返った）、0x0264＝堂島の死亡。
// 🟢 なりわいのフラグ 64 件と、町の人 12 B × 210 件（+0x00 bit0＝死亡）の並び。
// なりわいのフラグの値の表は src/save/flags/（flags.test.ts）。
import { describe, expect, it } from 'vitest'
import { writeU8 } from './binary'
import { TS_SAVE_SIZE } from './layout'
import {
  OCCUPATION_FLAG_COUNT,
  OCCUPATION_FLAG_START,
  PERSON_COUNT,
  PERSON_RECORDS_START,
  TOWNSFOLK_END,
  TOWNSFOLK_LENGTH,
  TOWNSFOLK_PEOPLE,
  TOWNSFOLK_START,
  UNUSED_OCCUPATION_FLAGS,
  isPersonDead,
  occupationFlagOffset,
  personName,
  personOffset,
  readPeople,
  readTownsfolk,
  reviveNote,
  writePersonDead,
} from './townsfolk'

/** 実セーブ（踏み倒し・鍛冶屋のおやじと寿司屋の店主の殺害のあと）で 0 以外だったバイト。0x0258 はメリンダの死亡 🟢 */
const COPY5: Record<number, number> = { 0x0127: 0x6e, 0x012c: 1, 0x0258: 1, 0x02c4: 1, 0x0444: 1 }

function makeSave(size = TS_SAVE_SIZE): Uint8Array {
  const b = new Uint8Array(size)
  for (const [offset, value] of Object.entries(COPY5)) writeU8(b, Number(offset), value)
  // 前後のバイト（主人公名の最後 0x011B・侍評価の先頭 0x0B34）も置き、書き込みで変わらないことを見る
  writeU8(b, 0x011b, 7)
  writeU8(b, 0x0b34, 7)
  return b
}

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i)
  return out
}

describe('🟢 町の人の状態 0x011C〜0x0B33 chunks/townsfolk', () => {
  it('🟢 0x011C〜0x0B33 の2,584バイトを読む（なりわいのフラグ 64 B ＋ 町の人 12 B × 210）', () => {
    expect(TOWNSFOLK_START).toBe(0x011c)
    expect(TOWNSFOLK_LENGTH).toBe(2584)
    expect(OCCUPATION_FLAG_START + OCCUPATION_FLAG_COUNT).toBe(PERSON_RECORDS_START)
    expect(personOffset(PERSON_COUNT) - 1).toBe(TOWNSFOLK_END)
    const view = readTownsfolk(makeSave())
    expect(view.problem).toBeNull()
    expect(view.values).toHaveLength(2584)
    expect(view.values[0x02c4 - TOWNSFOLK_START]).toBe(1)
    expect(view.values[0x0127 - TOWNSFOLK_START]).toBe(0x6e)
  })

  it('🟢 なりわいのフラグは 0x011C + 番号。使われていない番号は 35 件', () => {
    expect(occupationFlagOffset(4)).toBe(0x0120)
    expect(occupationFlagOffset(31)).toBe(0x013b)
    expect(UNUSED_OCCUPATION_FLAGS).toHaveLength(35)
  })

  it('✅ [U] 死亡の位置：堂島 0x0264・寿司屋 0x02C4・鍛冶屋のおやじ 0x0444。🟢 同じ表で小暮 0x01E0・メリンダ 0x0258・さよ 0x0528', () => {
    const at = (p: number) => personOffset(p)
    expect([at(22), at(30), at(62)]).toEqual([0x0264, 0x02c4, 0x0444])
    expect([at(11), at(21), at(81)]).toEqual([0x01e0, 0x0258, 0x0528])
    expect([22, 30, 62].map(personName)).toEqual(['堂島', '寿司屋', '鍛冶屋（おやじ）'])
    expect(TOWNSFOLK_PEOPLE).toHaveLength(56)
    expect(personName(0)).toBe('人物 0（空き）')
  })

  it('🟢 死亡のビットを読む（実セーブの踏み倒し・殺害のあとで見た並び）', () => {
    const dead = readPeople(makeSave())
      .filter((x) => x.dead)
      .map((x) => x.p)
    expect(dead).toEqual([21, 30, 62])
  })

  it('🟢 isPersonDead は view から bit0 だけを見る（ほかのビットが立っていても死亡にしない）', () => {
    const b = makeSave()
    writeU8(b, personOffset(81), 0x80)
    const view = readTownsfolk(b)
    expect([21, 30, 62, 81, 0].map((p) => isPersonDead(view, p))).toEqual([true, true, true, false, false])
  })

  it('🟢 死亡のビットだけを書く。ほかのビットは変えない。名前のない番号（0〜209）にも書ける', () => {
    const before = makeSave()
    const after = before.slice()
    writePersonDead(after, 81, true)
    expect(diffOffsets(before, after)).toEqual([0x0528])
    expect(after[0x0528]).toBe(1)
    writePersonDead(after, 30, false)
    expect(after[0x02c4]).toBe(0)
    after[0x0444] = 0x81
    writePersonDead(after, 62, false)
    expect(after[0x0444]).toBe(0x80)
    expect(readPeople(after).find((x) => x.p === 62)?.unusedBitsSet).toBe(true)
    writePersonDead(after, 209, true)
    expect(after[personOffset(209)]).toBe(1)
    expect(() => writePersonDead(after, 210, true)).toThrow(RangeError)
    expect(() => writePersonDead(after, -1, true)).toThrow(RangeError)
  })

  it('🟢 ビットを外すだけでは生き返らない人物（重要人物・寿司屋・薬屋）には一緒に戻す値を示す（要ゲーム内確認）', () => {
    // 重要人物（p 10〜23）は 0x3744 + p の人物の状態も戻す。アドレスは画面に出さない
    for (const p of [11, 22, 23]) expect(reviveNote(p)).toMatch(/人物の状態/)
    for (const p of [11, 22, 23, 30, 55]) expect(reviveNote(p)).not.toMatch(/0x/)
    expect(reviveNote(30)).toMatch(/人物の状態/)
    expect(reviveNote(55)).toMatch(/人物の状態/)
    expect(reviveNote(62)).toBeNull()
    expect(reviveNote(81)).toBeNull()
  })

  it('サイズが 0x48BB0 でなければ読み取り専用にし、死亡のビットも書かない', () => {
    const b = makeSave(TS_SAVE_SIZE + 4)
    expect(readTownsfolk(b).problem).not.toBeNull()
    expect(() => writePersonDead(b, 30, false)).toThrow(RangeError)
  })

  it('読み出し→書き戻しでバイト列が一致する', () => {
    const before = makeSave()
    const after = before.slice()
    for (const x of readPeople(after)) writePersonDead(after, x.p, x.dead)
    expect(diffOffsets(before, after)).toEqual([])
  })
})
