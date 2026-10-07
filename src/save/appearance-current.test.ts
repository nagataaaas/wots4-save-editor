// 🔶❓ U-18・❓ U-1：差分で観測した値を固定位置に合成する。sample/ のファイルは読まない。
import { describe, expect, it } from 'vitest'
import { writeF32, writeU32, writeUtf16Fixed } from './binary'
import { TS_SAVE_SIZE } from './hero'
import { readAppearanceCurrent, writeAppearanceCurrent } from './appearance-current'

function makeSave(header = 0x3aad4, relatedHeader = 0x46334) {
  const bytes = new Uint8Array(TS_SAVE_SIZE)
  bytes.set([0xff, 0xff, 0xf5, 0, 0, 0, 3, 0, 1, 0, 0, 0], header)
  writeF32(bytes, header + 12, 160)
  writeU32(bytes, header + 0x154, 0xffff)
  writeUtf16Fixed(bytes, header + 0x158, 64, '名無し侍')
  bytes.set([1, 0, 0, 0, 0, 0, 0x20, 0x43, 0, 0, 0, 0, 0x22, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], relatedHeader)
  return bytes
}

describe('🔶❓ U-18 現在の見た目の候補（❓ U-1 固定位置）', () => {
  it('✅ 体型・身長の反映を確認。🔶 U-18 性別変更後も固定位置を読み、編集後も保持する', () => {
    const bytes = makeSave()
    // copy 5 の観測値を合成。容姿ID、性別側の値、現在・関連領域の身長が変わる。
    bytes.set([0xee, 0, 0xff, 0xff, 0, 0, 3, 0, 0, 0, 0, 0], 0x3aad4)
    writeF32(bytes, 0x3aae0, 175)
    writeF32(bytes, 0x46338, 175)
    const before = bytes.slice()
    const view = readAppearanceCurrent(bytes)
    expect(Object.values(view).every(field => field.problem === null)).toBe(true)
    expect(view.height.value).toBe(175)
    writeAppearanceCurrent(bytes, 'body', 2)
    writeAppearanceCurrent(bytes, 'height', 176)
    expect(Object.values(readAppearanceCurrent(bytes)).every(field => field.problem === null)).toBe(true)
    expect(bytes[0x3aadc]).toBe(0)
    expect(readAppearanceCurrent(bytes).related.value).toBe(0)
    writeAppearanceCurrent(bytes, 'body', 0)
    writeAppearanceCurrent(bytes, 'height', 175)
    expect(bytes).toEqual(before)
  })

  it('🔶 U-18 見た目の写しがあっても固定位置だけを編集する', () => {
    const bytes = makeSave()
    bytes.set([0xee, 0, 0xff, 0xff, 0, 0, 3, 0, 0, 0, 0, 0], 0x3aad4)
    writeF32(bytes, 0x3aae0, 175)
    for (const offset of [0x3ac6c, 0x3db88]) bytes.set(bytes.subarray(0x3aad4, 0x3aae4), offset)
    expect(readAppearanceCurrent(bytes).body.offset).toBe(0x3aadd)
    writeAppearanceCurrent(bytes, 'body', 2)
    expect(bytes[0x3ac6c + 9]).toBe(0)
    expect(bytes[0x3db88 + 9]).toBe(0)
  })

  it('❓ U-1・🔶 U-18 周辺のID・区切り・名前の並びに依存せず固定位置を読む', () => {
    const bytes = makeSave()
    bytes.fill(0xaa, 0x3aad4, 0x3aad8)
    bytes.fill(0xbb, 0x3aad9, 0x3aadd)
    bytes.fill(0xcc, 0x3aad4 + 0x154, 0x3aad4 + 0x198)
    bytes.fill(0xdd, 0x46334, 0x4633c)
    const view = readAppearanceCurrent(bytes)
    expect(view.body).toMatchObject({ offset: 0x3aadd, value: 0, raw: '00', problem: null })
    expect(view.skin.offset).toBe(0x3aad8)
    expect(view.height).toMatchObject({ offset: 0x3aae0, value: 160, raw: '00 00 20 43' })
    expect(view.related.offset).toBe(0x4633c)
    writeAppearanceCurrent(bytes, 'body', 2)
    expect(bytes[0x3aadd]).toBe(2)
  })

  it.each([
    ['body', 2, [0x3aadd]],
    ['skin', 3, [0x3aad8]],
    ['height', 176, [0x3aae2]],
    ['related', 1, [0x4633c]],
  ] as const)('🔶❓ U-18 %s の変更は指定バイトのみで、読み出し→書き戻しで全バイト一致', (key, value, offsets) => {
    const before = makeSave()
    const bytes = before.slice()
    const original = readAppearanceCurrent(bytes)[key].value!
    writeAppearanceCurrent(bytes, key, value)
    expect(bytes.length).toBe(before.length)
    expect(Array.from(bytes.keys()).filter(i => bytes[i] !== before[i])).toEqual(offsets)
    expect(readAppearanceCurrent(bytes)[key].value).toBe(value)
    writeAppearanceCurrent(bytes, key, original)
    expect(bytes).toEqual(before)
  })

  it('🔶 U-18 低い・細め・褐色の観測値を合成したデータで読む', () => {
    const bytes = makeSave()
    bytes[0x3aadd] = 1
    bytes[0x3aad8] = 1
    writeF32(bytes, 0x3aae0, 144)
    const view = readAppearanceCurrent(bytes)
    expect([view.body.value, view.height.value, view.skin.value]).toEqual([1, 144, 1])
  })

  it('🔶❓ U-18 通常モードで未観測の値を拒否し、上級者モードでは範囲内で許可する', () => {
    const bytes = makeSave()
    const before = bytes.slice()
    expect(() => writeAppearanceCurrent(bytes, 'skin', 2)).toThrow()
    expect(() => writeAppearanceCurrent(bytes, 'height', 170)).toThrow()
    expect(() => writeAppearanceCurrent(bytes, 'body', 3)).toThrow()
    expect(bytes).toEqual(before)
    writeAppearanceCurrent(bytes, 'skin', 2, true)
    writeAppearanceCurrent(bytes, 'body', 3, true)
    writeAppearanceCurrent(bytes, 'height', 170, true)
    expect(readAppearanceCurrent(bytes).body.value).toBe(3)
    expect(() => writeAppearanceCurrent(bytes, 'related', 256, true)).toThrow()
    expect(() => writeAppearanceCurrent(bytes, 'height', Infinity, true)).toThrow()
    expect(() => writeAppearanceCurrent(bytes, 'height', 99, true)).toThrow()
  })

  it('❓ U-1 サイズ違い・短いファイルと、🔶 U-18 不正な身長では書き込まない', () => {
    const wrongSize = makeSave().slice(0, -1)
    expect(readAppearanceCurrent(wrongSize).body.problem).toMatch(/U-1/)
    expect(() => writeAppearanceCurrent(wrongSize, 'body', 1)).toThrow()
    const short = new Uint8Array(16)
    expect(readAppearanceCurrent(short).body.value).toBeNull()
    expect(() => writeAppearanceCurrent(short, 'body', 1)).toThrow()
    for (const value of [NaN, Infinity, 99, 251]) {
      const invalid = makeSave()
      writeF32(invalid, 0x3aae0, value)
      const before = invalid.slice()
      expect(readAppearanceCurrent(invalid).height.problem).toMatch(/U-18/)
      expect(() => writeAppearanceCurrent(invalid, 'height', 160)).toThrow()
      expect(invalid).toEqual(before)
    }
    const shifted = makeSave(0x12000, 0x23000)
    expect(readAppearanceCurrent(shifted).height.offset).toBe(0x3aae0)
    expect(() => writeAppearanceCurrent(shifted, 'height', 160)).toThrow()
  })
})
