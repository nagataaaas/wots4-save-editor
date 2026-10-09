// [TS] のレイアウトに沿って合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
import { describe, expect, it } from 'vitest'
import { writeF32, writeU32, writeU8, writeUtf16Fixed } from './binary'
import {
  AMOUNT_PLAUSIBLE_MAX,
  HERO_OFFSETS,
  NAME_BYTES,
  TS_SAVE_SIZE,
  readHero,
  writeAmount,
  writeGauge,
  writeLocation,
  writeName,
} from './hero'

function makeSave(size = TS_SAVE_SIZE): Uint8Array {
  const b = new Uint8Array(size)
  writeU32(b, HERO_OFFSETS.money, 1234)
  writeU32(b, HERO_OFFSETS.cashbox, 5678)
  writeU32(b, HERO_OFFSETS.samuraiPoint, 42)
  writeUtf16Fixed(b, HERO_OFFSETS.name, NAME_BYTES, '侍')
  writeF32(b, HERO_OFFSETS.hp, 250.5)
  writeF32(b, HERO_OFFSETS.vitalityMax, 1000)
  writeU8(b, HERO_OFFSETS.location, 0x06)
  return b
}

/** 書き込みで変わったバイトの位置を返す */
function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i)
  return out
}

describe('readHero', () => {
  it('✅ 所持金・金庫・侍点・名前を読む', () => {
    const v = readHero(makeSave())
    expect(v.layoutProblem).toBeNull()
    expect(v.money).toEqual({ value: 1234, problem: null, warning: null })
    expect(v.cashbox).toEqual({ value: 5678, problem: null, warning: null })
    expect(v.samuraiPoint).toEqual({ value: 42, problem: null, warning: null })
    expect(v.name).toEqual({ value: '侍', problem: null })
  })

  it('✅ [U] 最大HP（0x35A8）と最大活力（0x35B0）を読む', () => {
    const v = readHero(makeSave())
    expect(v.hp).toEqual({ value: 250.5, problem: null })
    expect(v.vitalityMax).toEqual({ value: 1000, problem: null })
  })

  it('✅ U-7：開始地点を 0x13 の u8 として読む', () => {
    const v = readHero(makeSave())
    expect(v.location).toEqual({ value: 0x06, problem: null })
  })

  it('サイズが 0x48BB0 でなければ全フィールドを読み取り専用にする', () => {
    const v = readHero(makeSave(TS_SAVE_SIZE + 4))
    expect(v.layoutProblem).not.toBeNull()
    expect(v.money.value).toBe(1234)
    expect(v.money.problem).not.toBeNull()
    expect(v.name.problem).not.toBeNull()
    expect(v.location.problem).not.toBeNull()
  })

  it('🔶 妥当性の上限（推測）を超える値は読み取り専用にする', () => {
    const b = makeSave()
    writeU32(b, HERO_OFFSETS.money, AMOUNT_PLAUSIBLE_MAX + 1)
    writeF32(b, HERO_OFFSETS.hp, Number.NaN)
    const v = readHero(b)
    expect(v.money.problem).not.toBeNull()
    expect(v.hp.problem).not.toBeNull()
    expect(v.cashbox.problem).toBeNull()
  })

  it('[U] 正規の上限を超える既存の値は、編集可能のまま警告を出す', () => {
    const b = makeSave()
    writeU32(b, HERO_OFFSETS.money, 150_000)
    const v = readHero(b)
    expect(v.money.problem).toBeNull()
    expect(v.money.warning).toMatch(/上限/)
    expect(v.cashbox.warning).toBeNull()
  })

  it('名前の終端がない・終端以降が 0 でない場合は読み取り専用にする', () => {
    const b = makeSave()
    b.fill(0x41, HERO_OFFSETS.name, HERO_OFFSETS.name + NAME_BYTES)
    expect(readHero(b).name.problem).toMatch(/終端/)
    const c = makeSave()
    c[HERO_OFFSETS.name + NAME_BYTES - 1] = 1
    expect(readHero(c).name.problem).toMatch(/0 で埋まって/)
  })

  it('クラッシュが報告されている開始地点の値は読み取り専用にする', () => {
    const b = makeSave()
    writeU8(b, HERO_OFFSETS.location, 0x24)
    expect(readHero(b).location.problem).not.toBeNull()
  })
})

describe('書き込み', () => {
  it('✅ 所持金の書き込みは 0x08〜0x0B だけを変える', () => {
    const before = makeSave()
    const after = before.slice()
    writeAmount(after, 'money', 0x00012345)
    expect(diffOffsets(before, after)).toEqual([0x08, 0x09, 0x0a])
    expect(readHero(after).money.value).toBe(0x00012345)
  })

  it('[U] 所持金は 99,999、金庫は 999,999 まで（ゲーム内の上限、ユーザー確認）', () => {
    const b = makeSave()
    expect(() => writeAmount(b, 'money', 99_999)).not.toThrow()
    expect(() => writeAmount(b, 'money', 100_000)).toThrow(RangeError)
    expect(() => writeAmount(b, 'cashbox', 999_999)).not.toThrow()
    expect(() => writeAmount(b, 'cashbox', 1_000_000)).toThrow(RangeError)
    expect(readHero(b).money.value).toBe(99_999)
    expect(readHero(b).cashbox.value).toBe(999_999)
  })

  it('🟢 侍点は 999,999 まで（ゲームが足すときの上限）', () => {
    const b = makeSave()
    expect(() => writeAmount(b, 'samuraiPoint', 999_999)).not.toThrow()
    expect(() => writeAmount(b, 'samuraiPoint', 1_000_000)).toThrow(RangeError)
  })

  it('✅ 名前は 64 B の範囲だけを変え、31文字まで受け付ける [I-1]', () => {
    const before = makeSave()
    const after = before.slice()
    writeName(after, 'あ'.repeat(31))
    for (const i of diffOffsets(before, after)) {
      expect(i).toBeGreaterThanOrEqual(HERO_OFFSETS.name)
      expect(i).toBeLessThan(HERO_OFFSETS.name + NAME_BYTES)
    }
    expect(readHero(after).name.value).toBe('あ'.repeat(31))
    expect(() => writeName(after, 'あ'.repeat(32))).toThrow(RangeError)
    expect(() => writeName(after, '')).toThrow(RangeError)
  })

  it('✅ [U] 最大HP の書き込みは 0x35A8〜0x35AB だけを変える', () => {
    const before = makeSave()
    const after = before.slice()
    writeGauge(after, 'hp', 300)
    for (const i of diffOffsets(before, after)) {
      expect(i).toBeGreaterThanOrEqual(0x35a8)
      expect(i).toBeLessThan(0x35ac)
    }
    expect(readHero(after).hp.value).toBe(300)
    expect(() => writeGauge(after, 'hp', -1)).toThrow(RangeError)
  })

  it('✅ [U] 最大活力の書き込みは 0x35B0〜0x35B3 だけを変える', () => {
    const before = makeSave()
    const after = before.slice()
    writeGauge(after, 'vitalityMax', 120)
    for (const i of diffOffsets(before, after)) {
      expect(i).toBeGreaterThanOrEqual(0x35b0)
      expect(i).toBeLessThan(0x35b4)
    }
    expect(readHero(after).vitalityMax.value).toBe(120)
  })

  it('0x35A4・0x35AC（意味未確定）は扱わず、書き換えない', () => {
    const before = makeSave()
    before.fill(0x11, 0x35a4, 0x35a8)
    before.fill(0x22, 0x35ac, 0x35b0)
    const after = before.slice()
    writeGauge(after, 'hp', 1)
    writeGauge(after, 'vitalityMax', 1)
    expect([...after.slice(0x35a4, 0x35a8)]).toEqual([...before.slice(0x35a4, 0x35a8)])
    expect([...after.slice(0x35ac, 0x35b0)]).toEqual([...before.slice(0x35ac, 0x35b0)])
  })

  it('最大HP・最大活力は 99,999 まで（ユーザー指定の暫定上限）', () => {
    const b = makeSave()
    expect(() => writeGauge(b, 'hp', 99_999)).not.toThrow()
    expect(() => writeGauge(b, 'vitalityMax', 99_999)).not.toThrow()
    expect(() => writeGauge(b, 'hp', 100_000)).toThrow(RangeError)
    expect(() => writeGauge(b, 'vitalityMax', 100_000)).toThrow(RangeError)
  })

  it('✅ U-7：開始地点は 0x13 の1バイトだけを書き、クラッシュ値・未調査の値は拒否する', () => {
    const before = makeSave()
    const after = before.slice()
    writeLocation(after, 0x15)
    expect(diffOffsets(before, after)).toEqual([0x13])
    for (const bad of [0x00, 0x13, 0x24, 0x28, 0x29, 0x2c, 0xc4, 0xc5]) {
      expect(() => writeLocation(after, bad)).toThrow(RangeError)
    }
    expect(after[0x13]).toBe(0x15)
  })

  it('書き込みを何もしなければバイト列は一致したまま', () => {
    const b = makeSave()
    const copy = b.slice()
    readHero(copy)
    expect(diffOffsets(b, copy)).toEqual([])
  })
})
