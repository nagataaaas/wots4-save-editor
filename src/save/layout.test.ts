import { describe, expect, it } from 'vitest'
import { assertWritable, checkLayout, TS_SAVE_SIZE } from './layout'
import { readUtf16Fixed, writeUtf16Fixed } from './binary'
import { fixedStringProblem, validateText } from './field'
import { writeAmount, writeGauge, writeLocation, writeName } from './hero'
import { TOOLS_AREA, writeItemBoxSlot } from './item-box'
import { writeValuable } from './valuables'
import { writeCompleteWeapon, writeWeaponPart } from './weapon'
import { writeFlag, validateKnownValue } from './flags/byte-flag'

describe('共通のレイアウト検査', () => {
  it('✅ ファイルサイズと領域の境界を検証する', () => {
    const bytes = new Uint8Array(TS_SAVE_SIZE)
    expect(checkLayout(bytes)).toBeNull()
    expect(() => assertWritable(bytes, TS_SAVE_SIZE - 1, 1)).not.toThrow()
    for (const [offset, size] of [[-1, 1], [0, -1], [TS_SAVE_SIZE, 1], [0.5, 1], [0, NaN], [Infinity, 1]])
      expect(() => assertWritable(bytes, offset, size)).toThrow(RangeError)
  })

  const writers = [
    (bytes: Uint8Array) => writeName(bytes, '侍'),
    (bytes: Uint8Array) => writeAmount(bytes, 'money', 1),
    (bytes: Uint8Array) => writeGauge(bytes, 'hpMax', 100),
    (bytes: Uint8Array) => writeLocation(bytes, 6),
    (bytes: Uint8Array) => writeItemBoxSlot(bytes, TOOLS_AREA, 0, 9, 1),
    (bytes: Uint8Array) => writeValuable(bytes, 0, 0x29, 1),
    (bytes: Uint8Array) => writeCompleteWeapon(bytes, 0xa4c8, 0),
    (bytes: Uint8Array) => writeWeaponPart(bytes, 0xa4c8, 'blade', '0'),
  ]
  it.each(writers)('UI を経由せずサイズの違うファイルに書いても、一切変更しない (%#)', write => {
    for (const size of [16, TS_SAVE_SIZE - 1, TS_SAVE_SIZE + 1]) {
      const bytes = new Uint8Array(size).fill(0x5a)
      const before = bytes.slice()
      expect(() => write(bytes)).toThrow(/ファイルサイズ/)
      expect(bytes.every((value, index) => value === before[index])).toBe(true)
    }
  })

  it('フラグの同時書き込み先が範囲外なら、先頭の値も変えない', () => {
    const bytes = new Uint8Array(TS_SAVE_SIZE)
    const before = bytes.slice()
    expect(() => writeFlag(bytes, { offset: 0, alsoAt: [TS_SAVE_SIZE], label: '状態', values: [{ value: 1, label: '入る' }] }, 1, { advanced: false })).toThrow(RangeError)
    expect(bytes.every((value, index) => value === before[index])).toBe(true)
  })
})

describe('共通のフィールド検査', () => {
  it('UTF-16LE の固定長文字列を読んで書き戻すと、バイトが一致する', () => {
    const bytes = new Uint8Array(64)
    writeUtf16Fixed(bytes, 0, 64, '侍😀')
    const before = bytes.slice()
    const value = readUtf16Fixed(bytes, 0, 64)
    expect(fixedStringProblem(value, '名前')).toBeNull()
    expect(validateText(value.text, 31)).toBeNull()
    writeUtf16Fixed(bytes, 0, 64, value.text)
    expect(bytes.every((value, index) => value === before[index])).toBe(true)
    expect(validateText('😀'.repeat(16), 31)).not.toBeNull()
  })

  it('終端・詰め物・制御文字・空欄を検査する', () => {
    expect(fixedStringProblem({ text: '侍', terminated: false, paddingClean: true }, '名前')).toContain('終わり')
    expect(fixedStringProblem({ text: '侍', terminated: true, paddingClean: false }, '名前')).toContain('後ろ')
    expect(fixedStringProblem({ text: '\n', terminated: true, paddingClean: true }, '名前')).toContain('制御文字')
    expect(validateText('', 31)).not.toBeNull()
    expect(validateText('侍\n', 31)).not.toBeNull()
  })

  it('表の値と格納範囲を別々に検証する', () => {
    const values = [{ value: 0 }, { value: 2 }]
    expect(validateKnownValue(2, values, { advanced: false })).toBeNull()
    expect(validateKnownValue(1, values, { advanced: false })).not.toBeNull()
    expect(validateKnownValue(1, values, { advanced: true })).toBeNull()
    for (const value of [-1, 256, 0.5, NaN]) expect(validateKnownValue(value, values, { advanced: true })).not.toBeNull()
  })
})
