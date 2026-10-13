// 🟢 装着・アンサンブルの64 Bレコード。docs/save_format/chunks/accessories/README.md。
// 固定オフセットを使い、サイズ・境界・ID・部位・数値を検証する。
// 🟢 状態A＝納刀、B＝抜刀。共通の選択は納刀7値を抜刀へコピーする。
// ❓ +00〜03・+3Dの意味は未確認。編集・初期化でも変更しない。
import { assertWritable, checkLayout } from './layout'
import { type EditOpts, NORMAL_EDIT_OPTS, type ViewStatus } from './field'
import { ACCESSORIES } from './master/accessory-names'

/** 🟢 取り付け先番号。標準位置により頭は顔も、胸は背中も含む。 */
export const ACCESSORY_ATTACHMENT_LABELS = ['頭', '胸・背中', '腰', '右肩', '左肩', '右腕', '左腕', '右足', '左足', '右ひざ', '左ひざ', '右手', '左手'] as const

export const ACCESSORY_SLOT_COUNT = 10
export const ACCESSORY_RECORD_SIZE = 0x40
export const ACCESSORY_EQUIPMENT_BASES = [0x39cc, 0x3c4c, 0x3ecc, 0x414c, 0x43cc, 0x464c] as const
export const ACCESSORY_FLOAT_FIELDS = [
  { key: 'positionAX', label: '位置 X', state: 'A', relative: 0x04, min: -10, max: 10 },
  { key: 'positionAY', label: '位置 Y', state: 'A', relative: 0x08, min: -10, max: 10 },
  { key: 'positionAZ', label: '位置 Z', state: 'A', relative: 0x0c, min: -10, max: 10 },
  { key: 'positionBX', label: '位置 X', state: 'B', relative: 0x10, min: -10, max: 10 },
  { key: 'positionBY', label: '位置 Y', state: 'B', relative: 0x14, min: -10, max: 10 },
  { key: 'positionBZ', label: '位置 Z', state: 'B', relative: 0x18, min: -10, max: 10 },
  { key: 'rotationAX', label: '回転 X（度）', state: 'A', relative: 0x1c, min: -180, max: 180 },
  { key: 'rotationAY', label: '回転 Y（度）', state: 'A', relative: 0x20, min: -180, max: 180 },
  { key: 'rotationAZ', label: '回転 Z（度）', state: 'A', relative: 0x24, min: -180, max: 180 },
  { key: 'rotationBX', label: '回転 X（度）', state: 'B', relative: 0x28, min: -180, max: 180 },
  { key: 'rotationBY', label: '回転 Y（度）', state: 'B', relative: 0x2c, min: -180, max: 180 },
  { key: 'rotationBZ', label: '回転 Z（度）', state: 'B', relative: 0x30, min: -180, max: 180 },
  // 🟢 UIのサイズは保存補正+1。負の補正でもサイズが負という意味ではない。
  { key: 'sizeA', label: '大きさ', state: 'A', relative: 0x34, min: 0.2, max: 5 },
  { key: 'sizeB', label: '大きさ', state: 'B', relative: 0x38, min: 0.2, max: 5 },
] as const
export type AccessoryFloatKey = typeof ACCESSORY_FLOAT_FIELDS[number]['key']
export type AccessoryEquipmentSlot = ViewStatus & {
  offset: number
  id: number | null
  joint: number | null
  values: Partial<Record<AccessoryFloatKey, number>>
  raw: string
}

export function accessorySlotOffset(group: number, slot: number): number {
  if (!Number.isInteger(group) || group < 0 || group >= ACCESSORY_EQUIPMENT_BASES.length ||
      !Number.isInteger(slot) || slot < 0 || slot >= ACCESSORY_SLOT_COUNT) throw new RangeError('装飾品の枠が範囲外です')
  return ACCESSORY_EQUIPMENT_BASES[group] + ACCESSORY_RECORD_SIZE * slot
}

/** 上級者モードの範囲はユーザー指定。ゲーム内での安全性を示すものではない。 */
export function accessoryFloatRange(key: AccessoryFloatKey, opts: EditOpts = NORMAL_EDIT_OPTS): { min: number; max: number } {
  const field = ACCESSORY_FLOAT_FIELDS.find(f => f.key === key)!
  if (opts.advanced && key.startsWith('position')) return { min: -100, max: 100 }
  if (opts.advanced && key.startsWith('size')) return { min: 0, max: 100 }
  return { min: field.min, max: field.max }
}

export function readAccessorySlot(bytes: Uint8Array, group: number, slot: number): AccessoryEquipmentSlot {
  const offset = accessorySlotOffset(group, slot)
  const result: AccessoryEquipmentSlot = { warnings: [], offset, id: null, joint: null, values: {}, raw: '', problem: checkLayout(bytes) }
  if (offset + ACCESSORY_RECORD_SIZE > bytes.length) throw new RangeError('装飾品の領域がファイル外です')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  result.id = view.getInt16(offset + 0x3e, true)
  result.joint = view.getInt8(offset + 0x3c)
  result.raw = Array.from(bytes.subarray(offset, offset + ACCESSORY_RECORD_SIZE), b => b.toString(16).padStart(2, '0')).join(' ')
  if (result.id < -1 || result.id > 157) result.problem ??= '不明な装飾品です'
  if (result.joint < 0 || result.joint > 12) result.problem ??= '不明な取り付け先です'
  for (const field of ACCESSORY_FLOAT_FIELDS) {
    const stored = view.getFloat32(offset + field.relative, true)
    const value = field.key.startsWith('size') ? stored + 1 : stored
    result.values[field.key] = value
    const { min, max } = accessoryFloatRange(field.key, { advanced: true })
    // float32の丸め（表示0.2は約0.199999988）を許容する。
    if (!Number.isFinite(stored) || value < min - 0.000001 || value > max + 0.000001)
      result.problem ??= `${field.label}が許容範囲外です`
    const normal = accessoryFloatRange(field.key)
    if (Number.isFinite(stored) && (value < normal.min - 0.000001 || value > normal.max + 0.000001))
      result.warnings.push(`${field.label}が通常の範囲を超えています（上級者モードでだけ書けます）`)
  }
  return result
}

/** 指定項目だけ上書き。ID変更でも部位・調整値・未知バイト・所持フラグは維持する。 */
export function writeAccessoryField(bytes: Uint8Array, group: number, slot: number, key: AccessoryFloatKey | 'id' | 'joint', value: number, opts: EditOpts = NORMAL_EDIT_OPTS): void {
  assertWritable(bytes)
  const current = readAccessorySlot(bytes, group, slot)
  if (current.problem) throw new RangeError(current.problem)
  if (!Number.isFinite(value)) throw new RangeError('有限の数値を入力してください')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (key === 'id' || key === 'joint') {
    const min = key === 'id' ? -1 : 0
    const max = key === 'id' ? 157 : 12
    if (!Number.isInteger(value) || value < min || value > max) throw new RangeError('選べない値です')
    if (key === 'id') view.setInt16(current.offset + 0x3e, value, true)
    else view.setInt8(current.offset + 0x3c, value)
    return
  }
  const field = ACCESSORY_FLOAT_FIELDS.find(f => f.key === key)
  if (!field) throw new RangeError('未知の調整項目です')
  const { min, max } = accessoryFloatRange(key, opts)
  if (value < min || value > max) throw new RangeError(`${min}〜${max}を入力してください`)
  view.setFloat32(current.offset + field.relative, key.startsWith('size') ? value - 1 : value, true)
}

/** 🟢 共通選択時の納刀→抜刀コピー。7値だけをバイト単位でコピーする。 */
export function copySheathedAccessoryToDrawn(bytes: Uint8Array, group: number, slot: number, opts: EditOpts = NORMAL_EDIT_OPTS): void {
  assertWritable(bytes)
  const current = readAccessorySlot(bytes, group, slot)
  if (current.problem) throw new RangeError(current.problem)
  for (const field of ACCESSORY_FLOAT_FIELDS.filter(field => field.state === 'A')) {
    const value = current.values[field.key]!
    const { min, max } = accessoryFloatRange(field.key, opts)
    if (value < min - 0.000001 || value > max + 0.000001) throw new RangeError(`${field.label}が入力範囲外です`)
  }
  const base = current.offset
  bytes.set(bytes.slice(base + 4, base + 16), base + 16)
  bytes.set(bytes.slice(base + 28, base + 40), base + 40)
  bytes.set(bytes.slice(base + 52, base + 56), base + 56)
}

/** 共通選択中は同じ値を両状態へ書く（選択時に両状態を同期済み）。検証失敗時は全体を維持する。 */
export function writeCommonAccessoryField(bytes: Uint8Array, group: number, slot: number, key: AccessoryFloatKey, value: number, opts: EditOpts = NORMAL_EDIT_OPTS): void {
  assertWritable(bytes)
  const field = ACCESSORY_FLOAT_FIELDS.find(f => f.key === key)
  if (!field || field.state !== 'A') throw new RangeError('共通の編集は納刀側の項目を指定してください')
  const other = ACCESSORY_FLOAT_FIELDS.find(f => f.state === 'B' && f.label === field.label)!
  const next = bytes.slice()
  writeAccessoryField(next, group, slot, field.key, value, opts)
  writeAccessoryField(next, group, slot, other.key, value, opts)
  bytes.set(next.subarray(accessorySlotOffset(group, slot), accessorySlotOffset(group, slot) + ACCESSORY_RECORD_SIZE), accessorySlotOffset(group, slot))
}

/** 🟢 標準部位をセットし、両状態の補正を0へ戻す。標準位置そのものはセーブへ書かない。 */
export function resetAccessoryDefaults(bytes: Uint8Array, group: number, slot: number): void {
  assertWritable(bytes)
  const current = readAccessorySlot(bytes, group, slot)
  if (current.problem) throw new RangeError(current.problem)
  const accessory = ACCESSORIES.find(a => a.id === current.id)
  if (!accessory) throw new RangeError('装飾品を選択してください')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  for (const field of ACCESSORY_FLOAT_FIELDS) view.setFloat32(current.offset + field.relative, 0, true)
  view.setInt8(current.offset + 0x3c, accessory.defaultAttachment)
}

/** IDを変更した場合は新しい装飾品の標準部位と補正0を適用。なしはIDだけを変更する。 */
export function equipAccessory(bytes: Uint8Array, group: number, slot: number, id: number, opts: EditOpts = NORMAL_EDIT_OPTS): void {
  assertWritable(bytes)
  const next = bytes.slice()
  writeAccessoryField(next, group, slot, 'id', id, opts)
  if (id !== -1) resetAccessoryDefaults(next, group, slot)
  const offset = accessorySlotOffset(group, slot)
  bytes.set(next.subarray(offset, offset + ACCESSORY_RECORD_SIZE), offset)
}
