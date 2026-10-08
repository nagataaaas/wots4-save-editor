// ✅ [U] 体型・身長・肌色、🟢 身長の選択肢、❓ U-1：差分で観測した値を固定位置に合成する。sample/ のファイルは読まない。
import { describe, expect, it } from 'vitest'
import { writeF32, writeU32, writeUtf16Fixed } from './binary'
import { TS_SAVE_SIZE } from './hero'
import { HEIGHT_CHOICES, heightWarning, readAppearanceCurrent, writeAppearanceCurrent } from './appearance-current'

// relatedHeader：0x46338 基準の身長（float32）、0x4633C 身長の選択肢（int32）を含む領域。
function makeSave(header = 0x3aad4, relatedHeader = 0x46334) {
  const bytes = new Uint8Array(TS_SAVE_SIZE)
  bytes.set([0xff, 0xff, 0xf5, 0, 0, 0, 3, 0, 1, 0, 0, 0], header)
  writeF32(bytes, header + 12, 160)
  writeU32(bytes, header + 0x154, 0xffff)
  writeUtf16Fixed(bytes, header + 0x158, 64, '名無し侍')
  bytes.set([1, 0, 0, 0, 0, 0, 0x20, 0x43, 0, 0, 0, 0, 0x22, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], relatedHeader)
  return bytes
}

describe('現在の見た目（❓ U-1 固定位置）', () => {
  it('✅ 体型・身長の反映を確認。性別変更後も固定位置を読み、編集後も保持する', () => {
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
    expect(readAppearanceCurrent(bytes).heightChoice.value).toBe(0)
    writeAppearanceCurrent(bytes, 'body', 0)
    writeAppearanceCurrent(bytes, 'height', 175)
    expect(bytes).toEqual(before)
  })

  it('見た目の写しがあっても固定位置だけを編集する', () => {
    const bytes = makeSave()
    bytes.set([0xee, 0, 0xff, 0xff, 0, 0, 3, 0, 0, 0, 0, 0], 0x3aad4)
    writeF32(bytes, 0x3aae0, 175)
    for (const offset of [0x3ac6c, 0x3db88]) bytes.set(bytes.subarray(0x3aad4, 0x3aae4), offset)
    expect(readAppearanceCurrent(bytes).body.offset).toBe(0x3aadd)
    writeAppearanceCurrent(bytes, 'body', 2)
    expect(bytes[0x3ac6c + 9]).toBe(0)
    expect(bytes[0x3db88 + 9]).toBe(0)
  })

  it('❓ U-1・周辺のID・区切り・名前の並びに依存せず固定位置を読む', () => {
    const bytes = makeSave()
    bytes.fill(0xaa, 0x3aad4, 0x3aad8)
    bytes.fill(0xbb, 0x3aad9, 0x3aadd)
    bytes.fill(0xcc, 0x3aad4 + 0x154, 0x3aad4 + 0x198)
    bytes.fill(0xdd, 0x46334, 0x4633c)
    const view = readAppearanceCurrent(bytes)
    expect(view.body).toMatchObject({ offset: 0x3aadd, value: 0, raw: '00', problem: null })
    expect(view.skin.offset).toBe(0x3aad8)
    expect(view.height).toMatchObject({ offset: 0x3aae0, value: 160, raw: '00 00 20 43' })
    expect(view.heightChoice.offset).toBe(0x4633c)
    writeAppearanceCurrent(bytes, 'body', 2)
    expect(bytes[0x3aadd]).toBe(2)
  })

  it.each([
    ['body', 2, [0x3aadd]],
    ['skin', 3, [0x3aad8]],
    ['height', 176, [0x3aae2]],
    ['heightChoice', 1, [0x4633c]],
  ] as const)('%s の変更は指定バイトのみで、読み出し→書き戻しで全バイト一致', (key, value, offsets) => {
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

  it('低い・細め・褐色の観測値を合成したデータで読む', () => {
    const bytes = makeSave()
    bytes[0x3aadd] = 1
    bytes[0x3aad8] = 1
    writeF32(bytes, 0x3aae0, 144)
    writeU32(bytes, 0x4633c, 2)
    const view = readAppearanceCurrent(bytes)
    expect([view.body.value, view.height.value, view.skin.value, view.heightChoice.value]).toEqual([1, 144, 1, 2])
  })

  it('🟢 身長の選択肢は int32 LE（4 B）。0＝ふつう・1＝高い・2＝低い', () => {
    expect(HEIGHT_CHOICES).toEqual(['ふつう', '高い', '低い'])
    const bytes = makeSave()
    bytes.set([2, 0, 0, 0], 0x4633c)
    expect(readAppearanceCurrent(bytes).heightChoice).toMatchObject({ offset: 0x4633c, value: 2, raw: '02 00 00 00', problem: null })
    // 上位バイトが 0 でない値も 4 B で読み、書き込みでは 4 B を上書きする。
    bytes.set([1, 0, 0, 1], 0x4633c)
    expect(readAppearanceCurrent(bytes).heightChoice.value).toBe(0x01000001)
    writeAppearanceCurrent(bytes, 'heightChoice', 1)
    expect(Array.from(bytes.subarray(0x4633c, 0x46340))).toEqual([1, 0, 0, 0])
  })

  it('✅ [U] 肌色0〜7・体型0〜2と、ふつうの0.9倍・1.1倍の身長を通常モードで書ける', () => {
    const bytes = makeSave()
    for (let skin = 0; skin <= 7; skin++) {
      writeAppearanceCurrent(bytes, 'skin', skin)
      expect(readAppearanceCurrent(bytes).skin.value).toBe(skin)
    }
    for (const height of [157.5, 175, 192.5]) {
      writeAppearanceCurrent(bytes, 'height', height)
      expect(readAppearanceCurrent(bytes).height.value).toBe(height)
    }
  })

  it('通常モードで意味の分からない値を拒否し、上級者モードでは範囲内で許可する', () => {
    const bytes = makeSave()
    const before = bytes.slice()
    expect(() => writeAppearanceCurrent(bytes, 'skin', 8)).toThrow()
    expect(() => writeAppearanceCurrent(bytes, 'body', 3)).toThrow()
    expect(() => writeAppearanceCurrent(bytes, 'heightChoice', 3)).toThrow()
    expect(bytes).toEqual(before)
    writeAppearanceCurrent(bytes, 'skin', 8, true)
    writeAppearanceCurrent(bytes, 'body', 3, true)
    expect(readAppearanceCurrent(bytes).body.value).toBe(3)
    expect(() => writeAppearanceCurrent(bytes, 'heightChoice', 256, true)).toThrow()
  })

  it('身長は有限の数値なら書き込み、135〜220cmの外では警告だけ出す', () => {
    const bytes = makeSave()
    for (const value of [50, 134.9, 220.1, 300]) {
      writeAppearanceCurrent(bytes, 'height', value)
      expect(readAppearanceCurrent(bytes).height.problem).toBeNull()
      expect(heightWarning(readAppearanceCurrent(bytes).height.value!)).toMatch(/135~220cm/)
    }
    for (const value of [135, 160, 220]) expect(heightWarning(value)).toBeNull()
    expect(() => writeAppearanceCurrent(bytes, 'height', Infinity)).toThrow()
    expect(() => writeAppearanceCurrent(bytes, 'height', NaN, true)).toThrow()
  })

  it('❓ U-1 サイズ違い・短いファイルと、有限でない身長では書き込まない', () => {
    const wrongSize = makeSave().slice(0, -1)
    expect(readAppearanceCurrent(wrongSize).body.problem).toMatch(/U-1/)
    expect(() => writeAppearanceCurrent(wrongSize, 'body', 1)).toThrow()
    const short = new Uint8Array(16)
    expect(readAppearanceCurrent(short).body.value).toBeNull()
    expect(() => writeAppearanceCurrent(short, 'body', 1)).toThrow()
    for (const value of [NaN, Infinity]) {
      const invalid = makeSave()
      writeF32(invalid, 0x3aae0, value)
      const before = invalid.slice()
      expect(readAppearanceCurrent(invalid).height.problem).toMatch(/有限/)
      expect(() => writeAppearanceCurrent(invalid, 'height', 160)).toThrow()
      expect(invalid).toEqual(before)
    }
    const shifted = makeSave(0x12000, 0x23000)
    expect(readAppearanceCurrent(shifted).height.offset).toBe(0x3aae0)
    // 固定位置の外に並びがあっても固定位置を読む。0 cm は範囲外の警告だけ出る。
    expect(heightWarning(readAppearanceCurrent(shifted).height.value!)).not.toBeNull()
  })
})
