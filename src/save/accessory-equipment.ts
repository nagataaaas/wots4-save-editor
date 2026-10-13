// 🟢 装着・アンサンブルの64 Bレコード。docs/save_format/chunks/accessories/README.md。
// 固定オフセットを使い、サイズ・境界・ID・部位・数値を検証する。
// 🟢 状態A＝納刀、B＝抜刀。共通の選択は納刀7値を抜刀へコピーする。
// ❓ +00〜03・+3Dの意味は未確認。編集・初期化でも変更しない。
import { assertWritable, checkLayout } from './layout'
import { type EditOpts, NORMAL_EDIT_OPTS, type ViewStatus } from './field'
import { ACCESSORIES } from './master/accessory-names'
import { readF32, readI16, readI8, readU8, writeF32, writeI16, writeI8 } from './binary'
import { ACCESSORY_FLAGS_OFFSET } from './unlocks'

/** 🟢 取り付け先番号。標準位置により頭は顔も、胸は背中も含む。 */
export const ACCESSORY_ATTACHMENT_LABELS = ['頭', '胸・背中', '腰', '右肩', '左肩', '右腕', '左腕', '右足', '左足', '右ひざ', '左ひざ', '右手', '左手'] as const

export const ACCESSORY_SLOT_COUNT = 10
export const ACCESSORY_RECORD_SIZE = 0x40
export const ACCESSORY_EQUIPMENT_BASES = [0x39cc, 0x3c4c, 0x3ecc, 0x414c, 0x43cc, 0x464c] as const
export const ACCESSORY_FLOAT_FIELDS = [
  { key: 'positionAX', kind: 'position', label: '位置 X', state: 'A', relative: 0x04, min: -10, max: 10 },
  { key: 'positionAY', kind: 'position', label: '位置 Y', state: 'A', relative: 0x08, min: -10, max: 10 },
  { key: 'positionAZ', kind: 'position', label: '位置 Z', state: 'A', relative: 0x0c, min: -10, max: 10 },
  { key: 'positionBX', kind: 'position', label: '位置 X', state: 'B', relative: 0x10, min: -10, max: 10 },
  { key: 'positionBY', kind: 'position', label: '位置 Y', state: 'B', relative: 0x14, min: -10, max: 10 },
  { key: 'positionBZ', kind: 'position', label: '位置 Z', state: 'B', relative: 0x18, min: -10, max: 10 },
  { key: 'rotationAX', kind: 'rotation', label: '回転 X（度）', state: 'A', relative: 0x1c, min: -180, max: 180 },
  { key: 'rotationAY', kind: 'rotation', label: '回転 Y（度）', state: 'A', relative: 0x20, min: -180, max: 180 },
  { key: 'rotationAZ', kind: 'rotation', label: '回転 Z（度）', state: 'A', relative: 0x24, min: -180, max: 180 },
  { key: 'rotationBX', kind: 'rotation', label: '回転 X（度）', state: 'B', relative: 0x28, min: -180, max: 180 },
  { key: 'rotationBY', kind: 'rotation', label: '回転 Y（度）', state: 'B', relative: 0x2c, min: -180, max: 180 },
  { key: 'rotationBZ', kind: 'rotation', label: '回転 Z（度）', state: 'B', relative: 0x30, min: -180, max: 180 },
  // 🟢 UIのサイズは保存補正+1。負の補正でもサイズが負という意味ではない。
  { key: 'sizeA', kind: 'size', label: '大きさ', state: 'A', relative: 0x34, min: 0.2, max: 5 },
  { key: 'sizeB', kind: 'size', label: '大きさ', state: 'B', relative: 0x38, min: 0.2, max: 5 },
] as const
export type AccessoryFloatKey = typeof ACCESSORY_FLOAT_FIELDS[number]['key']
/** 🟢 装着レコードの種類と符号付きフィールド。 */
export const ACCESSORY_FIELDS = {
  id: { relative: 0x3e, type: 'i16', min: -1, max: Math.max(...ACCESSORIES.map(a => a.id)) },
  joint: { relative: 0x3c, type: 'i8', min: 0, max: ACCESSORY_ATTACHMENT_LABELS.length - 1 },
} as const
type AccessoryIntKey = keyof typeof ACCESSORY_FIELDS
const INT_CODECS = {
  i16: { read: readI16, write: writeI16 },
  i8: { read: readI8, write: writeI8 },
} as const
const readIntField = (bytes: Uint8Array, offset: number, key: AccessoryIntKey) =>
  INT_CODECS[ACCESSORY_FIELDS[key].type].read(bytes, offset + ACCESSORY_FIELDS[key].relative)
const writeIntField = (bytes: Uint8Array, offset: number, key: AccessoryIntKey, value: number) =>
  INT_CODECS[ACCESSORY_FIELDS[key].type].write(bytes, offset + ACCESSORY_FIELDS[key].relative, value)
const floatFields = ACCESSORY_FLOAT_FIELDS
function floatField(key: AccessoryFloatKey) {
  const field = floatFields.find(f => f.key === key)
  if (!field) throw new RangeError('未知の調整項目です')
  return field
}
const pairedFields = floatFields.filter(f => f.state === 'A').map(field => {
  const other = floatFields.find(f => f.state === 'B' && f.kind === field.kind && f.label === field.label)
  if (!other) throw new Error('装飾品の調整項目が対応していません')
  return { field, other }
})
export type AccessoryEquipmentSlot = ViewStatus & {
  offset: number
  id: number | null
  joint: number | null
  values: Partial<Record<AccessoryFloatKey, number>>
  owned: boolean
}

export function accessorySlotOffset(group: number, slot: number): number {
  if (!Number.isInteger(group) || group < 0 || group >= ACCESSORY_EQUIPMENT_BASES.length ||
      !Number.isInteger(slot) || slot < 0 || slot >= ACCESSORY_SLOT_COUNT) throw new RangeError('装飾品の枠が範囲外です')
  return ACCESSORY_EQUIPMENT_BASES[group] + ACCESSORY_RECORD_SIZE * slot
}

/** 上級者モードの範囲はユーザー指定。ゲーム内での安全性を示すものではない。 */
export function accessoryFloatRange(key: AccessoryFloatKey, opts: EditOpts = NORMAL_EDIT_OPTS): { min: number; max: number } {
  const field = floatField(key)
  if (opts.advanced && field.kind === 'position') return { min: -100, max: 100 }
  if (opts.advanced && field.kind === 'size') return { min: 0, max: 100 }
  return { min: field.min, max: field.max }
}

export function readAccessorySlot(bytes: Uint8Array, group: number, slot: number): AccessoryEquipmentSlot {
  const offset = accessorySlotOffset(group, slot)
  const result: AccessoryEquipmentSlot = { warnings: [], offset, id: null, joint: null, values: {}, owned: false, problem: checkLayout(bytes) }
  if (offset + ACCESSORY_RECORD_SIZE > bytes.length) throw new RangeError('装飾品の領域がファイル外です')
  result.id = readIntField(bytes, offset, 'id')
  result.joint = readIntField(bytes, offset, 'joint')
  if (result.id < ACCESSORY_FIELDS.id.min || result.id > ACCESSORY_FIELDS.id.max) result.problem ??= '不明な装飾品です'
  else if (result.id >= 0) result.owned = readU8(bytes, ACCESSORY_FLAGS_OFFSET + result.id) === 1
  if (result.joint < ACCESSORY_FIELDS.joint.min || result.joint > ACCESSORY_FIELDS.joint.max) result.problem ??= '不明な取り付け先です'
  for (const field of floatFields) {
    const stored = readF32(bytes, offset + field.relative)
    const value = field.kind === 'size' ? stored + 1 : stored
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
  if (key === 'id' || key === 'joint') {
    const { min, max } = ACCESSORY_FIELDS[key]
    if (!Number.isInteger(value) || value < min || value > max) throw new RangeError('選べない値です')
    writeIntField(bytes, current.offset, key, value)
    return
  }
  const field = floatField(key)
  const { min, max } = accessoryFloatRange(key, opts)
  if (value < min || value > max) throw new RangeError(`${min}〜${max}を入力してください`)
  writeF32(bytes, current.offset + field.relative, field.kind === 'size' ? value - 1 : value)
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
  for (const { field, other } of pairedFields)
    bytes.copyWithin(base + other.relative, base + field.relative, base + field.relative + 4)
}

/** 共通選択中は同じ値を両状態へ書く（選択時に両状態を同期済み）。検証失敗時は全体を維持する。 */
export function writeCommonAccessoryField(bytes: Uint8Array, group: number, slot: number, key: AccessoryFloatKey, value: number, opts: EditOpts = NORMAL_EDIT_OPTS): void {
  assertWritable(bytes)
  // pairedFields は納刀側の項目すべてに抜刀側の対応を持つ（モジュールの読み込み時に検査済み）
  const pair = pairedFields.find(p => p.field.key === key)
  if (!pair) throw new RangeError('共通の編集は納刀側の項目を指定してください')
  // 両状態の範囲は同じ。1回の検証後、対応する4 Bだけを複製する。
  writeAccessoryField(bytes, group, slot, key, value, opts)
  const base = accessorySlotOffset(group, slot)
  bytes.copyWithin(base + pair.other.relative, base + pair.field.relative, base + pair.field.relative + 4)
}

/** 両状態の補正を0にし、取り付け先を装飾品の標準部位にする。検証は呼び出し側で済ませる */
function applyAccessoryDefaults(bytes: Uint8Array, offset: number, accessory: (typeof ACCESSORIES)[number]): void {
  for (const field of ACCESSORY_FLOAT_FIELDS) writeF32(bytes, offset + field.relative, 0)
  writeIntField(bytes, offset, 'joint', accessory.defaultAttachment)
}

/** 🟢 標準部位をセットし、両状態の補正を0へ戻す。標準位置そのものはセーブへ書かない。 */
export function resetAccessoryDefaults(bytes: Uint8Array, group: number, slot: number): void {
  assertWritable(bytes)
  const current = readAccessorySlot(bytes, group, slot)
  if (current.problem) throw new RangeError(current.problem)
  const accessory = ACCESSORIES.find(a => a.id === current.id)
  if (!accessory) throw new RangeError('装飾品を選択してください')
  applyAccessoryDefaults(bytes, current.offset, accessory)
}

/** IDを変更した場合は新しい装飾品の標準部位と補正0を適用。なしはIDだけを変更する。 */
export function equipAccessory(bytes: Uint8Array, group: number, slot: number, id: number, opts: EditOpts = NORMAL_EDIT_OPTS): void {
  assertWritable(bytes)
  const accessory = ACCESSORIES.find(a => a.id === id)
  if (id !== -1 && !accessory) throw new RangeError('装飾品を選択してください')
  writeAccessoryField(bytes, group, slot, 'id', id, opts)
  if (accessory) applyAccessoryDefaults(bytes, accessorySlotOffset(group, slot), accessory)
}
