import { describe, expect, it } from 'vitest'
import { TS_SAVE_SIZE } from './layout'
import { ACCESSORY_EQUIPMENT_BASES, ACCESSORY_FLOAT_FIELDS, accessorySlotOffset, copySheathedAccessoryToDrawn, equipAccessory, readAccessorySlot, resetAccessoryDefaults, writeAccessoryField, writeCommonAccessoryField } from './accessory-equipment'
import { ACCESSORIES } from './master/accessory-names'

function syntheticSave() {
  const bytes = new Uint8Array(TS_SAVE_SIZE)
  const view = new DataView(bytes.buffer)
  for (const base of ACCESSORY_EQUIPMENT_BASES) for (let i = 0; i < 10; i++) view.setInt16(base + i * 64 + 62, -1, true)
  return bytes
}

// 300 KB を toEqual で比べると遅いので、長さと各バイトを直接比べる
function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

describe('装飾品の装着 🟢（固定位置、未知バイトの意味は未確認）', () => {
  it('上級者モードのユーザー指定範囲：位置−100〜100、表示サイズ0〜100', () => {
    const b = syntheticSave()
    for (const key of ['positionAX', 'positionAY', 'positionAZ', 'positionBX', 'positionBY', 'positionBZ'] as const) {
      for (const value of [-100, 100]) {
        writeAccessoryField(b, 0, 0, key, value, { advanced: true })
        expect(readAccessorySlot(b, 0, 0).values[key]).toBe(value)
      }
    }
    for (const key of ['sizeA', 'sizeB'] as const) for (const value of [0, 100]) {
      writeAccessoryField(b, 0, 0, key, value, { advanced: true })
      expect(readAccessorySlot(b, 0, 0).values[key]).toBe(value)
    }
    expect(new DataView(b.buffer).getFloat32(0x3a00, true)).toBe(99)
    expect(readAccessorySlot(b, 0, 0).warnings.length).toBeGreaterThan(0)
    expect(readAccessorySlot(b, 0, 0).problem).toBeNull()
    const original = b.slice()
    for (const [key, value] of [['positionAX', -101], ['positionBX', 101], ['sizeA', -0.1], ['sizeB', 101], ['rotationAX', 181], ['sizeA', NaN], ['positionAZ', Infinity]] as const) {
      expect(() => writeAccessoryField(b, 0, 0, key, value, { advanced: true })).toThrow()
      expect(sameBytes(b, original)).toBe(true)
    }
    expect(() => writeAccessoryField(b, 0, 0, 'positionAX', 20)).toThrow()
  })

  it('拡張範囲でも共通・部位変更・標準への復帰・ID変更を継続できる', () => {
    const b = syntheticSave()
    equipAccessory(b, 0, 0, 8)
    writeAccessoryField(b, 0, 0, 'positionAX', -100, { advanced: true })
    writeAccessoryField(b, 0, 0, 'sizeA', 0, { advanced: true })
    expect(new DataView(b.buffer).getFloat32(0x3a00, true)).toBe(-1)
    copySheathedAccessoryToDrawn(b, 0, 0, { advanced: true })
    expect(readAccessorySlot(b, 0, 0).values.sizeB).toBe(0)
    writeCommonAccessoryField(b, 0, 0, 'sizeA', 100, { advanced: true })
    expect(readAccessorySlot(b, 0, 0).values.sizeB).toBe(100)
    writeAccessoryField(b, 0, 0, 'joint', 0, { advanced: true })
    resetAccessoryDefaults(b, 0, 0)
    expect(readAccessorySlot(b, 0, 0).problem).toBeNull()
    writeCommonAccessoryField(b, 0, 0, 'positionAX', 100, { advanced: true })
    equipAccessory(b, 0, 0, 1, { advanced: true })
    expect(readAccessorySlot(b, 0, 0).values.positionAX).toBe(0)
    expect(readAccessorySlot(b, 0, 0).joint).toBe(0)
  })

  it('通常モードでは拡張範囲の入力を拒否する', () => {
    const b = syntheticSave(), original = b.slice()
    for (const [key, value] of [['positionAX', -100], ['positionBX', 100], ['sizeA', 0], ['sizeB', 100]] as const) {
      expect(() => writeAccessoryField(b, 0, 0, key, value)).toThrow()
      expect(sameBytes(b, original)).toBe(true)
    }
  })

  it('🟢 共通は納刀7値だけを抜刀へコピーし、その他のバイトを維持', () => {
    const b = syntheticSave()
    writeAccessoryField(b, 0, 0, 'positionAX', 2)
    writeAccessoryField(b, 0, 0, 'rotationAZ', -30)
    writeAccessoryField(b, 0, 0, 'sizeA', 1.5)
    writeAccessoryField(b, 0, 0, 'positionBX', -3)
    b.set([1, 2, 3, 4], 0x39cc)
    b[0x3a09] = 0xa5 // ❓ +3Dの意味は未確認。維持する。
    const original = b.slice()
    copySheathedAccessoryToDrawn(b, 0, 0)
    const entry = readAccessorySlot(b, 0, 0)
    expect(entry.values.positionBX).toBe(2)
    expect(entry.values.rotationBZ).toBe(-30)
    expect(entry.values.sizeB).toBe(1.5)
    for (const [start, end] of [[16, 28], [40, 52], [56, 60]]) b.set(original.subarray(0x39cc + start, 0x39cc + end), 0x39cc + start)
    expect(sameBytes(b, original)).toBe(true)
  })

  it('共通編集は両方に適用し、失敗時はどちらにも書かない', () => {
    const b = syntheticSave()
    copySheathedAccessoryToDrawn(b, 0, 0)
    writeCommonAccessoryField(b, 0, 0, 'positionAY', 4)
    writeCommonAccessoryField(b, 0, 0, 'rotationAX', -90)
    writeCommonAccessoryField(b, 0, 0, 'sizeA', 2)
    const e = readAccessorySlot(b, 0, 0)
    expect(e.values.positionAY).toBe(e.values.positionBY)
    expect(e.values.rotationAX).toBe(e.values.rotationBX)
    expect(e.values.sizeA).toBe(e.values.sizeB)
    const original = b.slice()
    expect(() => writeCommonAccessoryField(b, 0, 0, 'sizeA', 9)).toThrow()
    expect(() => writeCommonAccessoryField(b, 0, 0, 'positionBX', 1)).toThrow()
    expect(sameBytes(b, original)).toBe(true)
  })

  it.each([[1, 0], [8, 1], [157, 1], [155, 11], [151, 12]])('🟢 ID %sの標準部位%sを適用し、補正だけを0へ戻す', (id, joint) => {
    const b = syntheticSave()
    b[0x39cc] = 0xab
    b[0x3a09] = 0xcd // ❓ 未知バイトを維持
    writeAccessoryField(b, 0, 0, 'positionAX', 3)
    const original = b.slice()
    equipAccessory(b, 0, 0, id)
    const e = readAccessorySlot(b, 0, 0)
    expect(e.id).toBe(id)
    expect(e.joint).toBe(joint)
    for (const f of ACCESSORY_FLOAT_FIELDS) expect(e.values[f.key]).toBe(f.key.startsWith('size') ? 1 : 0)
    expect(b[0x39cc]).toBe(0xab)
    expect(b[0x3a09]).toBe(0xcd)
    expect(sameBytes(b.subarray(0, 0x39cc), original.subarray(0, 0x39cc))).toBe(true)
    expect(sameBytes(b.subarray(0x3a0c), original.subarray(0x3a0c))).toBe(true)
    writeAccessoryField(b, 0, 0, 'joint', 10)
    writeAccessoryField(b, 0, 0, 'rotationBY', 45)
    resetAccessoryDefaults(b, 0, 0)
    expect(readAccessorySlot(b, 0, 0).joint).toBe(joint)
    expect(readAccessorySlot(b, 0, 0).values.rotationBY).toBe(0)
  })

  it('🟢 全158件の標準設定と代表例の位置・回転を保持', () => {
    expect(ACCESSORIES).toHaveLength(158)
    for (const a of ACCESSORIES) {
      expect(a.defaultAttachment).toBeGreaterThanOrEqual(0)
      expect(a.defaultAttachment).toBeLessThanOrEqual(12)
      for (const v of [...a.defaultPosition, ...a.defaultRotation, a.defaultSize]) expect(Number.isFinite(v)).toBe(true)
    }
    expect(ACCESSORIES.find(a => a.id === 1)!.defaultPosition[1]).toBeCloseTo(0.82)
    expect(ACCESSORIES.find(a => a.id === 8)!.defaultPosition[2]).toBeCloseTo(-1.52)
    expect(ACCESSORIES.find(a => a.id === 8)!.defaultRotation[2]).toBe(-33)
  })

  it('なしは補正を維持し、不正な枠の共通・初期化・装着は書かない', () => {
    const b = syntheticSave()
    equipAccessory(b, 0, 0, 8)
    writeAccessoryField(b, 0, 0, 'positionAX', 5)
    equipAccessory(b, 0, 0, -1)
    expect(readAccessorySlot(b, 0, 0).values.positionAX).toBe(5)
    expect(() => resetAccessoryDefaults(b, 0, 0)).toThrow()
    b[0x3a08] = 255
    const original = b.slice()
    expect(() => copySheathedAccessoryToDrawn(b, 0, 0)).toThrow()
    expect(() => equipAccessory(b, 0, 0, 1)).toThrow()
    expect(() => resetAccessoryDefaults(b, 0, 0)).toThrow()
    expect(sameBytes(b, original)).toBe(true)
  })
  it('合成した標準のおんぶさよ人形を読み取る', () => {
    const b = syntheticSave()
    b[0x3a08] = 1
    b.set([157, 0], 0x3a0a)
    const slot = readAccessorySlot(b, 0, 0)
    expect(slot.problem).toBeNull()
    expect(slot.id).toBe(157)
    expect(slot.joint).toBe(1)
    expect(slot.values.sizeA).toBe(1)
    expect(slot.values.positionAX).toBe(0)
    expect(readAccessorySlot(b, 0, 1).id).toBe(-1)
  })

  it('全6組の読み出し→書き戻しでバイト一致（未知バイトを維持）', () => {
    const b = syntheticSave()
    const view = new DataView(b.buffer)
    for (let group = 0; group < 6; group++) for (let slot = 0; slot < 10; slot++) {
      const offset = accessorySlotOffset(group, slot)
      b.set([0xde, 0xad, 0xbe, 0xef], offset)
      b[offset + 61] = 0xa5
      b[offset + 60] = 12
      view.setInt16(offset + 62, 157, true)
      for (const f of ACCESSORY_FLOAT_FIELDS) view.setFloat32(offset + f.relative, f.key.startsWith('size') ? -0.8 : 1.25, true)
    }
    const original = b.slice()
    for (let group = 0; group < 6; group++) for (let slot = 0; slot < 10; slot++) {
      const entry = readAccessorySlot(b, group, slot)
      expect(entry.problem).toBeNull()
      writeAccessoryField(b, group, slot, 'id', entry.id!)
      writeAccessoryField(b, group, slot, 'joint', entry.joint!)
      for (const f of ACCESSORY_FLOAT_FIELDS) {
        // サイズ境界のfloat32丸めを表示値0.2に戻して再保存する。
        const value = entry.values[f.key]!
        writeAccessoryField(b, group, slot, f.key, f.key.startsWith('size') ? 0.2 : value)
      }
    }
    expect(sameBytes(b, original)).toBe(true)
  })

  it('1項目だけを変更し、所持・他の枠・未知領域・ファイルサイズを維持', () => {
    const b = syntheticSave()
    const original = b.slice()
    const offset = accessorySlotOffset(5, 9)
    writeAccessoryField(b, 5, 9, 'sizeB', 1.5)
    expect(new DataView(b.buffer).getFloat32(offset + 56, true)).toBe(0.5)
    expect(readAccessorySlot(b, 5, 9).values.sizeB).toBe(1.5)
    b.set(original.subarray(offset + 56, offset + 60), offset + 56)
    expect(sameBytes(b, original)).toBe(true)
    expect(b.length).toBe(TS_SAVE_SIZE)
  })

  it('外す操作はIDだけをFFFFにする', () => {
    const b = syntheticSave()
    writeAccessoryField(b, 0, 0, 'id', 157)
    writeAccessoryField(b, 0, 0, 'positionAX', 3)
    writeAccessoryField(b, 0, 0, 'id', -1)
    expect(readAccessorySlot(b, 0, 0).values.positionAX).toBe(3)
    expect(b.subarray(0x3a0a, 0x3a0c)).toEqual(new Uint8Array([255, 255]))
  })

  it.each([['id', 158], ['id', -2], ['joint', 13], ['joint', 0.5], ['positionAX', 11], ['rotationBY', -181], ['sizeA', 0.1], ['sizeB', 6], ['sizeA', NaN], ['positionBX', Infinity]] as const)('範囲外の%s=%sは書かない', (key, value) => {
    const b = syntheticSave(), original = b.slice()
    expect(() => writeAccessoryField(b, 0, 0, key, value)).toThrow()
    expect(sameBytes(b, original)).toBe(true)
  })

  it('サイズ・境界・既存値の検証失敗では読み取り専用', () => {
    for (const b of [syntheticSave().subarray(0, 100), new Uint8Array(TS_SAVE_SIZE + 1)]) {
      if (b.length < 0x39cc + 64) expect(() => readAccessorySlot(b, 0, 0)).toThrow(RangeError)
      else expect(readAccessorySlot(b, 0, 0).problem).not.toBeNull()
      expect(() => writeAccessoryField(b, 0, 0, 'id', 1)).toThrow()
    }
    for (const corrupt of [(b: Uint8Array) => { b[0x3a0a] = 200 }, (b: Uint8Array) => { b[0x3a08] = 255 }, (b: Uint8Array) => { new DataView(b.buffer).setFloat32(0x39d0, NaN, true) }]) {
      const b = syntheticSave(); corrupt(b)
      const original = b.slice()
      expect(readAccessorySlot(b, 0, 0).problem).not.toBeNull()
      expect(() => writeAccessoryField(b, 0, 0, 'id', -1)).toThrow()
      expect(sameBytes(b, original)).toBe(true)
    }
    for (const [group, slot] of [[-1, 0], [6, 0], [0, 10], [0, 0.5]]) expect(() => accessorySlotOffset(group, slot)).toThrow()
  })
})
