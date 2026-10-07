// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 値は docs/save_format/chunks/townsfolk（[U] 2026-10-06）で見たもの。
// ✅ [U] 2026-10-06：0x02C4＝寿司屋の店主、0x0444＝鍛冶屋のおやじ（どちらも 1＝死亡。0 に戻すと生き返った）。
// ✅ [U] 2026-10-06：0x0127＝鍛冶屋の後継者イベント・鍛冶屋の状態（値の表は書き換えで確認）、0x0264＝堂島の死亡。
import { describe, expect, it } from 'vitest'
import { writeU8 } from './binary'
import { TS_SAVE_SIZE } from './hero'
import {
  OCCUPATION_FLAG_OFFSETS,
  SERIES_VALUES,
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

/** 🔶 sample/S4-DATA_02 copy 5（踏み倒し・鍛冶屋のおやじと寿司屋の店主の殺害のあと）で 0 以外だったバイト */
const COPY5: Record<number, number> = { 0x0127: 0x6e, 0x012c: 1, 0x0258: 1, 0x02c4: 1, 0x0444: 1 }

function makeSave(size = TS_SAVE_SIZE): Uint8Array {
  const b = new Uint8Array(size)
  for (const [offset, value] of Object.entries(COPY5)) writeU8(b, Number(offset), value)
  // 前後のバイト（主人公名の最後 0x011B・0x0600）も置き、書き込みで変わらないことを見る
  writeU8(b, 0x011b, 7)
  writeU8(b, 0x0600, 7)
  return b
}

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i)
  return out
}

describe('🔶 町の人の状態の候補 0x011C〜0x05FF chunks/townsfolk', () => {
  it('🔶 0x011C〜0x05FF の1,252バイトを読む（🟢 始まりは主人公名の直後。終わりの位置は未確定）', () => {
    expect(TOWNSFOLK_START).toBe(0x011c)
    expect(TOWNSFOLK_LENGTH).toBe(1252)
    const view = readTownsfolk(makeSave())
    expect(view.problem).toBeNull()
    expect(view.values).toHaveLength(1252)
    expect(view.values[0x02c4 - TOWNSFOLK_START]).toBe(1)
    expect(view.values[0x0127 - TOWNSFOLK_START]).toBe(0x6e)
  })

  it('✅ [U] 0x02C4 は寿司屋の店主、0x0444 は鍛冶屋のおやじ、0x0264 は堂島（1＝死亡）', () => {
    expect(TOWNSFOLK_NOTES[0x02c4].name).toBe('寿司屋の店主')
    expect(TOWNSFOLK_NOTES[0x0444].name).toBe('鍛冶屋のおやじ')
    expect(TOWNSFOLK_NOTES[0x0264].name).toBe('堂島')
  })

  it('🔶 0x0528 はさよ（DLC）の死亡フラグ（[U] 2026-10-06 の判断。差分1回、生き返りは未確認）。0／1 を書ける', () => {
    expect(TOWNSFOLK_NOTES[0x0528].name).toBe('さよ（DLC）')
    const b = makeSave()
    writeTownsfolk(b, 0x0528, 1, { advanced: false })
    expect(b[0x0528]).toBe(1)
    expect(() => writeTownsfolk(b, 0x0528, 2, { advanced: false })).toThrow(RangeError)
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

  it('🟢 なりわいのフラグは 0x011C + 番号。✅ 0x0120（番号 4）は同心の続き物で、20・100 を通常モードで書ける', () => {
    expect(occupationFlagOffset(4)).toBe(0x0120)
    expect(occupationFlagOffset(31)).toBe(0x013b)
    expect(TOWNSFOLK_NOTES[0x0120].name).toBe('同心の続き物')
    const b = makeSave()
    writeTownsfolk(b, 0x0120, 20, { advanced: false })
    expect(b[0x0120]).toBe(20)
    writeTownsfolk(b, 0x0120, 100, { advanced: false })
    expect(b[0x0120]).toBe(100)
    // 表にない値（例：12）は上級者モードだけ
    expect(() => writeTownsfolk(b, 0x0120, 12, { advanced: false })).toThrow(RangeError)
  })

  it('🟢 続き物の値は 0・n0・n1（n＝1〜8）・90・91・97・99・100。❓ 90 番台の違いは未確認', () => {
    expect(SERIES_VALUES.map((v) => v.value)).toEqual([
      0, 10, 11, 20, 21, 30, 31, 40, 41, 50, 51, 60, 61, 70, 71, 80, 81, 90, 91, 97, 99, 100,
    ])
    for (const n of [4, 5, 6, 7]) expect(TOWNSFOLK_NOTES[occupationFlagOffset(n)].values).toBe(SERIES_VALUES)
  })

  it('🟢 なりわいの画面で扱う番号は 4〜9・25〜31。鍛冶屋（11）・堂島（22）は含めない', () => {
    expect(OCCUPATION_FLAG_OFFSETS.map((o) => o - 0x011c).sort((a, b) => a - b)).toEqual([
      4, 5, 6, 7, 8, 9, 25, 26, 27, 28, 29, 30, 31,
    ])
    expect(TOWNSFOLK_NOTES[0x0138].values?.map((v) => v.value)).toEqual([0, 1, 2])
    expect(TOWNSFOLK_NOTES[0x0135].values?.find((v) => v.value === 8)?.label).toBe('「四天王の証」を受け取った')
  })

  it('🟢 番号 26（0x0136）は最後のなりわいと熊神の病気。10＝治療、20＝阿弥浜八人衆を受注。❓ 最終戦に熊神が加わるかとの関係', () => {
    expect(TOWNSFOLK_NOTES[0x0136].values?.map((v) => v.value)).toEqual([0, 1, 2, 10, 11, 12, 15, 20, 99, 100])
    expect(TOWNSFOLK_NOTES[0x0136].values?.find((v) => v.value === 10)?.label).toBe('女将が薬代を出した（治療）')
    const b = makeSave()
    writeTownsfolk(b, 0x0136, 2, { advanced: false })
    expect(b[0x0136]).toBe(2)
    // 43 は医者の判定の境目で、書く場面はないので表にない
    expect(() => writeTownsfolk(b, 0x0136, 43, { advanced: false })).toThrow(RangeError)
  })

  it('❓ U-1：サイズが 0x48BB0 でなければ読み取り専用にする', () => {
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
