// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// バイト列は docs/save_format/chunks/night-visit（[U] 2026-10-06）で見たもの。
// ✅ [U] 書き換えで確認：約束の +0x04（型）・+0x08（場所）・+0x1C（名前）・+0x20（見た目と声）・+0x24（年齢）・+0x25（血液型）。
// 🔶 +0x0A（配置）は位置だけ確認、+0x28（約束した日、8人の約束で一致）・記録の各項目は差分からの推定（要ゲーム内確認）。
// ❓ +0x02（group）は日付ではない（✅ [U] 2026-10-07）。意味は不明。
// 🟢 名前の ID は master/npc-names.ts の表にあるものだけを通常モードで書ける。
import { describe, expect, it } from 'vitest'
import { TS_SAVE_SIZE } from './hero'
import {
  PLACES,
  PLACE_LAYOUTS,
  PROMISE_OFFSET,
  RECORDS_OFFSET,
  RECORD_COUNT_OFFSET,
  RECORD_EMPTY_BYTES,
  readYobai,
  validatePersonField,
  writePromiseField,
  writePromisePlace,
  writeRecordField,
} from './yobai'

const hex = (s: string) => Uint8Array.from(s.match(/../g)!.map((h) => Number.parseInt(h, 16)))

/** sample/S4-DATA_03 copy 8：かえで（町・長屋・稲荷前、2日目、24歳、O型）と約束中の 0x14038〜0x14067 */
const PROMISE_KAEDE = hex('00000100250000000c0006000a000b000e000f000c000d001d000100a51b00001c0000001803ffff0100070000000000')
/** sample/S4-DATA_03 copy 9：夜這いのあとの空の枠（年齢・血液型・+0x2A は前の値が残る） */
const PROMISE_EMPTY = hex('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff1803ffffffff070000000000')
/** sample/S4-DATA_03 copy 9：夜這いの記録の1件目（さよ）・2件目（かえで） */
const RECORD_SAYO = hex('1b030000d7000000180200000000ff05')
/** sample/S4-DATA_01 copy 4：ローラとの夜這いのあとの1件目（[U] 2026-10-07） */
const RECORD_LAURA = hex('c60100000b000000210200000200ff01')
const RECORD_KAEDE = hex('25000000a51b00001702000001001803')

function makeSave(opts: { promise?: Uint8Array; records?: Uint8Array[]; count?: number; size?: number } = {}): Uint8Array {
  const b = new Uint8Array(opts.size ?? TS_SAVE_SIZE)
  b.set(opts.promise ?? PROMISE_KAEDE, PROMISE_OFFSET)
  const records = opts.records ?? [RECORD_SAYO, RECORD_KAEDE]
  for (let i = 0; i < 100; i++) b.set(records[i] ?? RECORD_EMPTY_BYTES, RECORDS_OFFSET + i * 16)
  new DataView(b.buffer).setUint32(0x137ec, records.length, true)
  new DataView(b.buffer).setUint32(RECORD_COUNT_OFFSET, opts.count ?? records.length, true)
  b[0x37c8] = records.length
  return b
}

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i)
  return out
}

describe('夜の約束 0x14038〜 chunks/night-visit', () => {
  it('かえでの約束を読む', () => {
    const { promise, promiseProblem } = readYobai(makeSave())
    expect(promiseProblem).toBeNull()
    expect(promise).toEqual({
      active: true,
      group: 1, // ✅ [U] 2026-10-07 日付ではない。❓ 町の人は 1〜3
      day: 1, // 🔶 +0x28 約束した日（2日目）
      type: 0x25,
      place: 0x0c,
      layout: 0x06,
      name: 0x1ba5,
      look: 0x1c,
      age: 24,
      blood: 3,
    })
    expect(PLACES[promise.place]).toBe('町　長屋　稲荷前')
  })

  it('✅ [U] 場所は 0x00〜0x22 の35件', () => {
    expect(PLACES).toHaveLength(0x23)
    expect(PLACES[0x10]).toBe('町　お屋敷')
    expect(PLACES[0x22]).toBe('領事館　一階左の部屋')
  })

  it('+0x04 が FFFFFFFF なら約束なし。空の枠には書かない', () => {
    const b = makeSave({ promise: PROMISE_EMPTY })
    expect(readYobai(b).promise.active).toBe(false)
    expect(() => writePromiseField(b, 'age', 30, { advanced: true })).toThrow(RangeError)
    expect(() => writePromisePlace(b, 0x0c, 0x06, { advanced: true })).toThrow(RangeError)
  })

  it('✅ [U] 名前・見た目・型をさよの値にする（その項目の4バイトだけが変わる）', () => {
    for (const [field, value, rel] of [
      ['name', 0xd7, 0x1c],
      ['look', 0xf5, 0x20],
      ['type', 0x031b, 0x04],
    ] as const) {
      const before = makeSave()
      const after = before.slice()
      writePromiseField(after, field, value, { advanced: false })
      expect(readYobai(after).promise[field]).toBe(value)
      const changed = diffOffsets(before, after)
      expect(changed.every((o) => o >= PROMISE_OFFSET + rel && o < PROMISE_OFFSET + rel + 4)).toBe(true)
    }
  })

  it('✅ [U] 年齢 0x30＝48歳、血液型 1〜4＝A・B・O・AB', () => {
    const b = makeSave()
    writePromiseField(b, 'age', 0x30, { advanced: false })
    writePromiseField(b, 'blood', 4, { advanced: false })
    expect(b[PROMISE_OFFSET + 0x24]).toBe(48)
    expect(b[PROMISE_OFFSET + 0x25]).toBe(4)
  })

  it('通常モードは確認済みの値だけ。上級者モードは任意（型の FFFFFFFF だけは書かない）', () => {
    expect(validatePersonField('name', 0x1234, 0x1ba5, { advanced: false })).not.toBeNull()
    expect(validatePersonField('name', 0x1234, 0x1ba5, { advanced: true })).toBeNull()
    expect(validatePersonField('name', 0x1234, 0x1234, { advanced: false })).toBeNull() // 書き戻し
    expect(validatePersonField('age', 100, 24, { advanced: false })).not.toBeNull()
    expect(validatePersonField('age', 255, 24, { advanced: false })).toBeNull() // ？
    expect(validatePersonField('blood', 0, 3, { advanced: false })).not.toBeNull()
    expect(validatePersonField('blood', 5, 3, { advanced: false })).toBeNull() // ？
    // 🟢 名前は表にある ID なら通常モードで書ける（7041＝みき）。表にない ID は上級者モードだけ
    expect(validatePersonField('name', 7041, 0x1ba5, { advanced: false })).toBeNull()
    expect(validatePersonField('name', 9999, 0x1ba5, { advanced: false })).not.toBeNull()
    // 🔶 約束した日（+0x28）は通常モードで 0〜98（1〜99日目）
    expect(validatePersonField('day', 98, 1, { advanced: false })).toBeNull()
    expect(validatePersonField('day', 99, 1, { advanced: false })).not.toBeNull()
    // ❓ +0x02／+0x0C（group）は通常モードでは今の値の書き戻しだけ
    expect(validatePersonField('group', 1, 1, { advanced: false })).toBeNull()
    expect(validatePersonField('group', 2, 1, { advanced: false })).not.toBeNull()
    expect(validatePersonField('group', 2, 1, { advanced: true })).toBeNull()
    expect(validatePersonField('type', 0xffffffff, 0x25, { advanced: true })).not.toBeNull()
    expect(validatePersonField('age', 256, 24, { advanced: true })).not.toBeNull()
  })

  it('✅ [U] 場所と配置は組で書く。通常モードは確認済みの組だけ（0C＋07 は布団がおかしくなった）', () => {
    const before = makeSave()
    const after = before.slice()
    writePromisePlace(after, 0x00, 0x03, { advanced: false })
    expect(diffOffsets(before, after)).toEqual([PROMISE_OFFSET + 0x08, PROMISE_OFFSET + 0x0a])
    expect(() => writePromisePlace(after, 0x0c, 0x07, { advanced: false })).toThrow(RangeError)
    writePromisePlace(after, 0x0c, 0x07, { advanced: true })
    expect(readYobai(after).promise.layout).toBe(0x07)
    expect(PLACE_LAYOUTS.find((p) => p.place === 0x0c)?.layout).toBe(0x06)
  })

  it('✅ [U] 2026-10-07 メリンダ・三姉妹の約束で見た場所と配置の組', () => {
    const pairs = PLACE_LAYOUTS.map((p) => [p.place, p.layout])
    expect(pairs).toContainEqual([0x20, 0x1e]) // メリンダ・黒船
    expect(pairs).toContainEqual([0x1d, 0x19]) // 万由・代官所の離れ
    expect(pairs).toContainEqual([0x1d, 0x1a]) // 千佳
    expect(pairs).toContainEqual([0x1d, 0x1b]) // 百合
    expect(pairs).toContainEqual([0x11, 0x20]) // 先生・提灯の掛かった家
  })

  it('❓ U-1：サイズが 0x48BB0 でなければ読み取り専用にする', () => {
    const b = makeSave({ size: TS_SAVE_SIZE + 4 })
    const view = readYobai(b)
    expect(view.promiseProblem).not.toBeNull()
    expect(view.recordsProblem).not.toBeNull()
    expect(() => writePromiseField(b, 'age', 30, { advanced: true })).toThrow(RangeError)
    expect(() => writeRecordField(b, 0, 'age', 30, { advanced: true })).toThrow(RangeError)
  })
})

describe('🔶 夜這いの記録 0x137F0〜（16 B × 100件、件数 0x13E34）chunks/night-visit', () => {
  it('件数ぶんの記録を読む', () => {
    const view = readYobai(makeSave())
    expect(view.recordsProblem).toBeNull()
    expect(view.count).toBe(2)
    // 🟢 +0x08 は建物の番号（さよ＝お屋敷 0x218、かえで＝稲荷前 0x217）
    expect(view.records[0]).toEqual({ index: 0, type: 0x031b, name: 0xd7, building: 0x218, day: 0, age: 0xff, blood: 5 })
    expect(view.records[1]).toEqual({ index: 1, type: 0x25, name: 0x1ba5, building: 0x217, day: 1, age: 24, blood: 3 })
    // ✅ [U] 2026-10-07 約束の画面の夜這い回数は先頭の 0x137EC。🔶 記録の件数は 0x13E34
    expect(RECORD_COUNT_OFFSET).toBe(0x13e34)
    expect(view.counters.map((c) => c.offset)).toEqual([0x137ec, 0x13e34, 0x13e4c, 0x37c8])
    expect(view.counters.map((c) => c.value)).toEqual([2, 2, 0, 2])
  })

  it('記録の項目を書く（その項目のバイトだけが変わる）。使用中でない件には書かない', () => {
    const before = makeSave()
    const after = before.slice()
    writeRecordField(after, 1, 'age', 30, { advanced: false })
    expect(diffOffsets(before, after)).toEqual([RECORDS_OFFSET + 16 + 0x0e])
    expect(() => writeRecordField(after, 2, 'age', 30, { advanced: true })).toThrow(RangeError)
  })

  it('🔶 [U] 2026-10-07 夜這い回数 0x137EC が記録の件数とずれていても、0x13E34 の件数どおりなら編集できる（ローラとの夜這いのあと）', () => {
    const b = makeSave({ records: [RECORD_LAURA] })
    new DataView(b.buffer).setUint32(0x137ec, 2, true)
    const view = readYobai(b)
    expect(view.recordsProblem).toBeNull()
    expect(view.records[0]).toEqual({ index: 0, type: 0x01c6, name: 0x0b, building: 0x221, day: 2, age: 0xff, blood: 1 })
    expect(view.counters[0].value).toBe(2)
  })

  it('件数と使用中の件が合わなければ読み取り専用', () => {
    expect(readYobai(makeSave({ count: 3 })).recordsProblem).not.toBeNull()
    expect(readYobai(makeSave({ count: 1 })).recordsProblem).not.toBeNull()
    expect(readYobai(makeSave({ count: 101 })).recordsProblem).not.toBeNull()
    expect(readYobai(makeSave({ records: [], count: 0 })).recordsProblem).toBeNull()
  })

  it('読み出し→書き戻しでバイト列が一致する', () => {
    const before = makeSave()
    const after = before.slice()
    const view = readYobai(after)
    for (const f of ['group', 'day', 'type', 'name', 'look', 'age', 'blood'] as const)
      writePromiseField(after, f, view.promise[f], { advanced: false })
    writePromisePlace(after, view.promise.place, view.promise.layout, { advanced: false })
    for (const r of view.records)
      for (const f of ['day', 'type', 'name', 'age', 'blood'] as const) writeRecordField(after, r.index, f, r[f], { advanced: false })
    expect(diffOffsets(before, after)).toEqual([])
  })
})
