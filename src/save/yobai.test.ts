// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// バイト列は docs/save_format/chunks/night-visit（[U] 2026-10-06）で見たもの。
// ✅ [U] 書き換えで確認：約束の +0x04（型）・+0x08（場所）・+0x1C（名前）・+0x20（見た目と声）・+0x24（年齢）・+0x25（血液型）。
// 🔶 +0x0A（配置）は位置だけ確認。🟢 +0x28（約束した日）・記録の各項目・最初の空きに書く規則。書き換えの反映は要ゲーム内確認。
// 🟢 +0x02（group）は町の人の種類ごとのまとまり（日付ではない ✅ [U] 2026-10-07）。書き換えの効果は未確認。
// 🟢 名前の ID は master/npc-names.ts の表にあるものだけを通常モードで書ける。
import { describe, expect, it } from 'vitest'
import { TS_SAVE_SIZE } from './hero'
import {
  PLACES,
  PLACE_LAYOUTS,
  PARTNER_COUNTS_OFFSET,
  PROMISE_OFFSET,
  RECORDS_OFFSET,
  RECORD_EMPTY_BYTES,
  readYobai,
  validatePersonField,
  writePromiseField,
  writePromisePlace,
  writeRecordField,
  layoutLabel,
  layoutPeople,
  layoutsForPlace,
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

function makeSave(opts: { promise?: Uint8Array; records?: (Uint8Array | null)[]; size?: number } = {}): Uint8Array {
  const b = new Uint8Array(opts.size ?? TS_SAVE_SIZE)
  b.set(opts.promise ?? PROMISE_KAEDE, PROMISE_OFFSET)
  const records = opts.records ?? [RECORD_SAYO, RECORD_KAEDE]
  for (let i = 0; i < 100; i++) b.set(records[i] ?? RECORD_EMPTY_BYTES, RECORDS_OFFSET + i * 16)
  const dv = new DataView(b.buffer)
  dv.setUint32(0x137ec, records.length, true) // ✅ 夜這い回数
  dv.setUint32(0x13e30, 0, true) // 🟢 段階
  dv.setUint32(0x13e34, records.length, true) // 🟢 愛の証の回数
  b[0x37c8] = records.length // 🟢 褒美の順番
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
    expect(PLACES[promise.place]).toBe('町 長屋 稲荷前')
  })

  it('✅ [U] 場所は 0x00〜0x22 の35件', () => {
    expect(PLACES).toHaveLength(0x23)
    expect(PLACES[0x10]).toBe('町 お屋敷')
    expect(PLACES[0x22]).toBe('領事館 一階左の部屋')
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

  it('🟢 場所と配置の組は72組（候補75行の重なりを除く）。実データで見た14組は seen', () => {
    expect(PLACE_LAYOUTS).toHaveLength(72)
    expect(new Set(PLACE_LAYOUTS.map((p) => `${p.place}:${p.layout}`)).size).toBe(72)
    expect(PLACE_LAYOUTS.filter((p) => p.seen)).toHaveLength(14)
    // [U] 2026-10-07 1D＋01 は操作ミスとみられる。配置 00〜02 は組に出てこない
    expect(PLACE_LAYOUTS.some((p) => p.layout <= 0x02)).toBe(false)
    expect(PLACE_LAYOUTS.find((p) => p.place === 0x1b)).toMatchObject({ layout: 0x1f, seen: false }) // 鍛冶屋
    expect(PLACE_LAYOUTS.some((p) => p.place === 0x0c && p.layout === 0x07)).toBe(false) // ✅ [U] 布団がおかしくなった組
    expect(PLACE_LAYOUTS.every((p) => p.place <= 0x22)).toBe(true)
  })

  it('サイズが 0x48BB0 でなければ読み取り専用にする', () => {
    const b = makeSave({ size: TS_SAVE_SIZE + 4 })
    const view = readYobai(b)
    expect(view.promiseProblem).not.toBeNull()
    expect(view.recordsProblem).not.toBeNull()
    expect(() => writePromiseField(b, 'age', 30, { advanced: true })).toThrow(RangeError)
    expect(() => writeRecordField(b, 0, 'age', 30, { advanced: true })).toThrow(RangeError)
  })
})

describe('🟢 夜這いの記録 0x137F0〜0x13E2F（16 B × 100件、最初の空きに書く）chunks/night-visit', () => {
  it('先頭から続く使用中の記録を読む', () => {
    const view = readYobai(makeSave())
    expect(view.recordsProblem).toBeNull()
    expect(view.count).toBe(2)
    // 🟢 +0x08 は建物の番号（さよ＝お屋敷 0x218、かえで＝稲荷前 0x217）
    expect(view.records[0]).toEqual({ index: 0, type: 0x031b, name: 0xd7, building: 0x218, day: 0, age: 0xff, blood: 5 })
    expect(view.records[1]).toEqual({ index: 1, type: 0x25, name: 0x1ba5, building: 0x217, day: 1, age: 24, blood: 3 })
    // ✅ [U] 2026-10-07 約束の画面の夜這い回数は 0x137EC。🟢 0x13E30 段階・0x13E34 愛の証の回数・0x37C8 褒美の順番
    expect(view.counters.map((c) => c.offset)).toEqual([0x137ec, 0x13e30, 0x13e34, 0x37c8])
    expect(view.counters.map((c) => c.value)).toEqual([2, 0, 2, 2])
  })

  it('🟢 記録の件数は 0x13E34 ではない（0x13E34 がずれていても使用中の件で数える）', () => {
    const b = makeSave()
    new DataView(b.buffer).setUint32(0x13e34, 48, true)
    const view = readYobai(b)
    expect(view.recordsProblem).toBeNull()
    expect(view.count).toBe(2)
  })

  it('🟢 100件すべて使用中でも読める', () => {
    const view = readYobai(makeSave({ records: Array.from({ length: 100 }, () => RECORD_KAEDE) }))
    expect(view.recordsProblem).toBeNull()
    expect(view.count).toBe(100)
  })

  it('🟢 相手ごとの夜這い回数 0x13E38〜（14人、u32）', () => {
    const b = makeSave({ records: [RECORD_LAURA] })
    new DataView(b.buffer).setUint32(0x13e4c, 1, true) // ✅ [U] 2026-10-07 ローラとの夜這いで 0 → 1
    const { partners } = readYobai(b)
    expect(PARTNER_COUNTS_OFFSET).toBe(0x13e38)
    expect(partners).toHaveLength(14)
    expect(partners[partners.length - 1].offset).toBe(0x13e6c)
    expect(partners.filter((p) => p.value !== 0)).toEqual([{ offset: 0x13e4c, npc: 11, label: 'ローラ', value: 1 }]) // 11＝ローラ
  })

  it('記録の項目を書く（その項目のバイトだけが変わる）。使用中でない件には書かない', () => {
    const before = makeSave()
    const after = before.slice()
    writeRecordField(after, 1, 'age', 30, { advanced: false })
    expect(diffOffsets(before, after)).toEqual([RECORDS_OFFSET + 16 + 0x0e])
    expect(() => writeRecordField(after, 2, 'age', 30, { advanced: true })).toThrow(RangeError)
  })

  it('[U] 2026-10-07 夜這い回数 0x137EC が記録の数とずれていても編集できる（ローラとの夜這いのあと）', () => {
    const b = makeSave({ records: [RECORD_LAURA] })
    new DataView(b.buffer).setUint32(0x137ec, 2, true)
    const view = readYobai(b)
    expect(view.recordsProblem).toBeNull()
    expect(view.records[0]).toEqual({ index: 0, type: 0x01c6, name: 0x0b, building: 0x221, day: 2, age: 0xff, blood: 1 })
    expect(view.counters[0].value).toBe(2)
  })

  it('🟢 途中に空きがある並びはゲームが作らないので読み取り専用', () => {
    const view = readYobai(makeSave({ records: [RECORD_SAYO, null, RECORD_KAEDE] }))
    expect(view.recordsProblem).not.toBeNull()
    expect(view.count).toBe(1)
    expect(() => writeRecordField(makeSave({ records: [RECORD_SAYO, null, RECORD_KAEDE] }), 0, 'age', 30, { advanced: true })).toThrow(
      RangeError,
    )
    expect(readYobai(makeSave({ records: [] })).recordsProblem).toBeNull()
    expect(readYobai(makeSave({ records: [] })).count).toBe(0)
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

describe('配置の家の中の人 datatable/place/night-visit-layout.csv（🟢）', () => {
  it('配置ごとの同心・岡っ引きの人数', () => {
    expect(layoutPeople(0x06)).toEqual({ doshin: 0, okappiki: 1 }) // 稲荷前（女中・娘の実データ）
    expect(layoutPeople(0x3d)).toEqual({ doshin: 1, okappiki: 5 }) // お屋敷（さよ）
    expect(layoutLabel(0x20)).toBe('同心1人・岡っ引き4人') // 提灯の掛かった家（先生）
    expect(layoutLabel(0x99)).toBe('配置 0x99') // 表にない
  })

  it('場所ごとに使える配置だけを、家の中の人が少ない順に返す', () => {
    // 提灯の掛かった家 0x11：0x0A・0x0B・0x35（3人）、0x20（5人）
    expect(layoutsForPlace(0x11)).toEqual([0x0a, 0x0b, 0x35, 0x20])
    expect(layoutsForPlace(0x0c)).toEqual([0x06])
  })
})
