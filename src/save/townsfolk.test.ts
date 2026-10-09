// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 値は docs/save_format/chunks/townsfolk（[U] 2026-10-06）で見たもの。
// ✅ [U] 2026-10-06：0x02C4＝寿司屋の店主、0x0444＝鍛冶屋のおやじ（どちらも 1＝死亡。0 に戻すと生き返った）。
// ✅ [U] 2026-10-06：0x0127＝鍛冶屋の後継者イベント・鍛冶屋の状態（値の表は書き換えで確認）、0x0264＝堂島の死亡。
// 🟢 なりわいのフラグ 64 件と、町の人 12 B × 210 件（+0x00 bit0＝死亡）の並び。フラグ 23 の値と場面の割り当ては 🔶。
import { describe, expect, it } from 'vitest'
import { writeU8 } from './binary'
import { TS_SAVE_SIZE } from './hero'
import {
  OCCUPATION_FLAG_COUNT,
  OCCUPATION_FLAG_OFFSETS,
  OCCUPATION_FLAG_START,
  PERSON_COUNT,
  PERSON_RECORDS_START,
  GANGSTER_SERIES_VALUES,
  HOMELESS_SERIES_VALUES,
  POLICE_SERIES_VALUES,
  THIEF_SERIES_VALUES,
  TOWNSFOLK_PEOPLE,
  UNUSED_OCCUPATION_FLAGS,
  personName,
  personOffset,
  readPeople,
  reviveNote,
  writePersonDead,
  SMITH_STATES,
  SMITH_STATE_OFFSET,
  TOWNSFOLK_END,
  TOWNSFOLK_LENGTH,
  TOWNSFOLK_NOTES,
  TOWNSFOLK_START,
  occupationFlagOffset,
  readTownsfolk,
  validateTownsfolk,
  writeTownsfolk,
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

  it('✅ [U] 死亡の位置：堂島 0x0264・寿司屋 0x02C4・鍛冶屋のおやじ 0x0444。🟢 同じ表で小暮 0x01E0・メリンダ 0x0258・さよ 0x0528', () => {
    const at = (p: number) => personOffset(p)
    expect([at(22), at(30), at(62)]).toEqual([0x0264, 0x02c4, 0x0444])
    expect([at(11), at(21), at(81)]).toEqual([0x01e0, 0x0258, 0x0528])
    expect([22, 30, 62].map(personName)).toEqual(['堂島', '寿司屋', '鍛冶屋（おやじ）'])
    expect(TOWNSFOLK_PEOPLE.filter((x) => x.certainty === '✅').map((x) => x.p)).toEqual([22, 30, 62])
    expect(TOWNSFOLK_PEOPLE).toHaveLength(56)
    expect(personName(0)).toBe('人物 0（空き）')
  })

  it('🟢 死亡のビットを読む（実セーブの踏み倒し・殺害のあとで見た並び）', () => {
    const dead = readPeople(makeSave())
      .filter((x) => x.dead)
      .map((x) => x.p)
    expect(dead).toEqual([21, 30, 62])
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
    expect(reviveNote(11)).toMatch(/0x374F/)
    expect(reviveNote(22)).toMatch(/0x3799/)
    expect(reviveNote(23)).toMatch(/0x379A/)
    expect(reviveNote(30)).toMatch(/0x37F9/)
    expect(reviveNote(55)).toMatch(/0x375C/)
    expect(reviveNote(62)).toBeNull()
    expect(reviveNote(81)).toBeNull()
  })

  it('🟢 佐古津（番号 8）・女将（番号 9）との話の段階', () => {
    expect(TOWNSFOLK_NOTES[occupationFlagOffset(8)].values?.map((v) => v.value)).toEqual([0, 10, 20, 30])
    expect(TOWNSFOLK_NOTES[occupationFlagOffset(9)].values?.map((v) => v.value)).toEqual([0, 1, 10, 20, 21])
  })

  it('🟢 意味の分かったなりわいのフラグは値の表。エリア移動・ロードで消えるもの（1〜3・15）は載せない', () => {
    const b = makeSave()
    for (const n of [1, 2, 3, 15]) expect(TOWNSFOLK_NOTES[occupationFlagOffset(n)]).toBeUndefined()
    expect(() => writeTownsfolk(b, occupationFlagOffset(1), 5, { advanced: false })).toThrow(RangeError)
    expect(TOWNSFOLK_NOTES[occupationFlagOffset(13)].values?.map((v) => v.value)).toEqual([0, 1, 10, 20, 30, 40, 50, 60, 70])
    expect(TOWNSFOLK_NOTES[occupationFlagOffset(23)].note).toMatch(/🔶/)
    expect(() => writeTownsfolk(b, occupationFlagOffset(21), 3, { advanced: false })).toThrow(RangeError)
    writeTownsfolk(b, occupationFlagOffset(21), 2, { advanced: false })
    expect(b[0x0131]).toBe(2)
    expect(UNUSED_OCCUPATION_FLAGS).toHaveLength(35)
  })

  it('🟢 ぢぢい（番号 13）の値は、東急流の段ではなく聞いた話を表示する', () => {
    const note = TOWNSFOLK_NOTES[0x0129]
    expect(note.values?.map(({ value, label }) => [value, label])).toEqual([
      [0, '師範でない'],
      [1, '師範に任命された'],
      [10, '東急流剣術の目録を受け取った'],
      [20, '道場破りを倒すと技を覚える話を聞いた'],
      [30, '東急流の由来（天奈の伝説の侍とその末裔）を聞いた'],
      [40, '道場破りに見知った者がいる話を聞いた'],
      [50, 'かつて大勢いた門下生がいなくなった話を聞いた'],
      [60, '東急流を究め、道場破りが元弟子だったと聞いた'],
      [70, '皆伝後に「まだ弟子はいる、油断するな」と言われた'],
    ])
    expect(note.note).toContain('流派の段そのものではない')
    expect(note.note).toContain('目録の入手や技の習得は反映されない')
    // 🔶 100 の使われる場面は未確認なので、通常モードには出さない。
    expect(note.note).toContain('🔶 100')
    expect(() => writeTownsfolk(makeSave(), 0x0129, 100, { advanced: false })).toThrow(RangeError)
    for (const { value } of note.values!) {
      const b = makeSave()
      b[0x0128] = 0xa5
      b[0x0129] = value
      b[0x012a] = 0x5a
      const original = b.slice()
      const view = readTownsfolk(b)
      writeTownsfolk(b, 0x0129, view.values[0x0129 - TOWNSFOLK_START], { advanced: false })
      expect(diffOffsets(original, b)).toEqual([])
      writeTownsfolk(b, 0x0129, value === 0 ? 1 : 0, { advanced: false })
      expect(diffOffsets(original, b)).toEqual([0x0129])
    }
  })

  it('✅ [U] 0x0132 は堂島が鍛冶屋を継いだフラグ（0／1 を表から選ぶ）', () => {
    expect(TOWNSFOLK_NOTES[0x0132].name).toBe('堂島が鍛冶屋を継いだ')
    expect(TOWNSFOLK_NOTES[0x0132].values?.map((v) => v.value)).toEqual([0, 1])
    const b = makeSave()
    writeTownsfolk(b, 0x0132, 1, { advanced: false })
    expect(b[0x0132]).toBe(1)
    expect(() => writeTownsfolk(b, 0x0132, 2, { advanced: false })).toThrow(RangeError)
  })

  it('✅ [U] 0x0127 は鍛冶屋の後継者イベント・鍛冶屋の状態。踏み倒しの差分で見た 110 も表にある', () => {
    expect(SMITH_STATE_OFFSET).toBe(0x0127)
    expect(SMITH_STATES.map((s) => s.value)).toEqual([0, 10, 20, 30, 40, 50, 60, 61, 69, 70, 81, 110, 119, 120])
    expect(SMITH_STATES.find((s) => s.value === 0x6e)?.label).toBe('鍛冶屋のおやじから踏み倒した')
  })

  it('通常モードでは、0x0127 に表の値を書ける。表にない値は上級者モードだけ', () => {
    const b = makeSave()
    writeTownsfolk(b, 0x0127, 81, { advanced: false })
    expect(b[0x0127]).toBe(81)
    expect(() => writeTownsfolk(b, 0x0127, 1, { advanced: false })).toThrow(RangeError)
    // 0x0127 以外では表の値は使えない
    expect(() => writeTownsfolk(b, 0x0264, 81, { advanced: false })).toThrow(RangeError)
    writeTownsfolk(b, 0x0127, 1, { advanced: true })
    expect(b[0x0127]).toBe(1)
  })

  it('🟢 なりわいのフラグは 0x011C + 番号。✅ 0x0120（番号 4）は【岡っ引き】野戸仏の連続なりわいで、20・100 を通常モードで書ける', () => {
    expect(occupationFlagOffset(4)).toBe(0x0120)
    expect(occupationFlagOffset(31)).toBe(0x013b)
    expect(TOWNSFOLK_NOTES[0x0120].name).toBe('【岡っ引き】野戸仏')
    expect([0x0121, 0x0122, 0x0123].map((o) => TOWNSFOLK_NOTES[o].name)).toEqual([
      '【極道】小鳩',
      '【泥棒】泥棒さん',
      '【宿無し】おっつぁん',
    ])
    const b = makeSave()
    writeTownsfolk(b, 0x0120, 20, { advanced: false })
    expect(b[0x0120]).toBe(20)
    writeTownsfolk(b, 0x0120, 100, { advanced: false })
    expect(b[0x0120]).toBe(100)
    // 表にない値（例：12）は上級者モードだけ
    expect(() => writeTownsfolk(b, 0x0120, 12, { advanced: false })).toThrow(RangeError)
  })

  it('🟢 連続なりわいの値は依頼主ごと。0・n0・n1 と、8件目のあとの値（野戸仏 90・91・97・99・101・102、小鳩 90・91・101、泥棒さん 90〜92・101・102、おっつぁん 90・91）と 100', () => {
    const steps = (last: number) => [0, ...Array.from({ length: last }, (_, i) => [(i + 1) * 10, (i + 1) * 10 + 1]).flat()]
    expect(POLICE_SERIES_VALUES.map((v) => v.value)).toEqual([...steps(8), 90, 91, 97, 99, 100, 101, 102])
    expect(GANGSTER_SERIES_VALUES.map((v) => v.value)).toEqual([...steps(8), 90, 91, 100, 101])
    expect(THIEF_SERIES_VALUES.map((v) => v.value)).toEqual([...steps(8), 90, 91, 92, 100, 101, 102])
    expect(HOMELESS_SERIES_VALUES.map((v) => v.value)).toEqual([...steps(8), 90, 91, 100])
    const tables = [POLICE_SERIES_VALUES, GANGSTER_SERIES_VALUES, THIEF_SERIES_VALUES, HOMELESS_SERIES_VALUES]
    tables.forEach((table, i) => expect(TOWNSFOLK_NOTES[occupationFlagOffset(4 + i)].values).toBe(table))
    expect(POLICE_SERIES_VALUES.find((v) => v.value === 97)?.label).toBe('出された浪人（虎鉄）に礼を言われた（野戸仏の話はまだ）')
  })

  it('🟢 なりわいの画面で扱う番号は 4〜9・25〜31。鍛冶屋（11）・堂島（22）は含めない', () => {
    expect(OCCUPATION_FLAG_OFFSETS.map((o) => o - 0x011c).sort((a, b) => a - b)).toEqual([
      4, 5, 6, 7, 8, 9, 25, 26, 27, 28, 29, 30, 31,
    ])
    expect(TOWNSFOLK_NOTES[0x0138].values?.map((v) => v.value)).toEqual([0, 1, 2])
    // 🟢 28〜31 は汁部の 209〜212 それぞれの進み具合。27 は知り合ったか（組んだか）
    expect(TOWNSFOLK_NOTES[0x013b].values?.map((v) => v.label)).toEqual([
      '受注前', '成功', '成功……？（失敗を成功扱いにしてもらった）',
    ])
    expect(TOWNSFOLK_NOTES[0x0137].values?.map((v) => v.value)).toEqual([0, 1])
    expect(TOWNSFOLK_NOTES[0x0135].values?.map((v) => v.value)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 50, 60, 99, 100])
    expect(TOWNSFOLK_NOTES[0x0135].values?.find((v) => v.value === 10)?.label).toBe('熊神十兵衛から「四天王の証」を受け取り、後を継いだ')
  })

  it('🟢 番号 26（0x0136）は最終なりわいと熊神の病気。10＝治療、20＝阿弥浜八人衆を受注。🔶 治療すると 207 から 208 に発展', () => {
    expect(TOWNSFOLK_NOTES[0x0136].values?.map((v) => v.value)).toEqual([0, 1, 2, 10, 11, 12, 15, 20, 99, 100])
    expect(TOWNSFOLK_NOTES[0x0136].values?.find((v) => v.value === 10)?.label).toBe('女将に熊神のことを話し、薬代を引き受けてもらった')
    const b = makeSave()
    writeTownsfolk(b, 0x0136, 2, { advanced: false })
    expect(b[0x0136]).toBe(2)
    // 43 は医者の判定の境目で、書く場面はないので表にない
    expect(() => writeTownsfolk(b, 0x0136, 43, { advanced: false })).toThrow(RangeError)
  })

  it('サイズが 0x48BB0 でなければ読み取り専用にする', () => {
    const b = makeSave(TS_SAVE_SIZE + 4)
    expect(readTownsfolk(b).problem).not.toBeNull()
    expect(() => writeTownsfolk(b, 0x0444, 0, { advanced: true })).toThrow(RangeError)
  })

  it('書き込みは、そのオフセットの1バイトだけを変える', () => {
    for (const offset of [TOWNSFOLK_START, 0x02c4, 0x0444, TOWNSFOLK_END]) {
      const before = makeSave()
      const after = before.slice()
      writeTownsfolk(after, offset, before[offset] === 1 ? 0 : 1, { advanced: false })
      expect(diffOffsets(before, after)).toEqual([offset])
    }
  })

  it('主人公名（0x00DC〜0x011B）には書かない', () => {
    const b = makeSave()
    for (const offset of [0x00dc, 0x0100, 0x011b])
      expect(() => writeTownsfolk(b, offset, 0, { advanced: true })).toThrow(RangeError)
  })

  it('範囲の外には書かない', () => {
    const b = makeSave()
    expect(() => writeTownsfolk(b, TOWNSFOLK_START - 1, 0, { advanced: true })).toThrow(RangeError)
    expect(() => writeTownsfolk(b, TOWNSFOLK_END + 1, 0, { advanced: true })).toThrow(RangeError)
  })

  it('通常モードは 0・1 と今の値の書き戻しだけ。上級者モードでは任意の u8', () => {
    expect(validateTownsfolk(0x02c4, 1, 0, { advanced: false })).toBeNull()
    expect(validateTownsfolk(0x02c4, 2, 0, { advanced: false })).not.toBeNull()
    expect(validateTownsfolk(0x02c4, 0x6e, 0x6e, { advanced: false })).toBeNull()
    expect(validateTownsfolk(0x02c4, 255, 0, { advanced: true })).toBeNull()
    expect(validateTownsfolk(0x02c4, 256, 0, { advanced: true })).not.toBeNull()
  })

  it('読み出し→書き戻しでバイト列が一致する', () => {
    const before = makeSave()
    const after = before.slice()
    readTownsfolk(after).values.forEach((v, i) => writeTownsfolk(after, TOWNSFOLK_START + i, v, { advanced: false }))
    expect(diffOffsets(before, after)).toEqual([])
  })
})
