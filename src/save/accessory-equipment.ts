// 🟢 装着・アンサンブルの64 Bレコード。docs/save_format/chunks/accessories/README.md。
// 固定オフセットを使い、サイズ・境界・ID・部位・数値を検証する。
// 🟢 状態A＝納刀、B＝抜刀。共通の選択は納刀7値を抜刀へコピーする。
// ❓ +00〜03・+3Dの意味は未確認。編集・初期化でも変更しない。
import { assertWritable, checkLayout } from './layout'
import { type EditOpts, NORMAL_EDIT_OPTS, type ViewStatus } from './field'
import { ACCESSORIES } from './master/accessory-names'
import { readF32, readU8, recordCodec, writeF32 } from './binary'
import { ACCESSORY_FLAGS_OFFSET } from './unlocks'
import { tr, type Localized } from '@/lib/i18n'

/** 🟢 取り付け先番号。標準位置により頭は顔も、胸は背中も含む。 */
export const ACCESSORY_ATTACHMENT_LABELS: readonly Localized[] = [
  { ja: '頭', en: 'Head' },
  { ja: '胸・背中', en: 'Chest/Back' },
  { ja: '腰', en: 'Waist' },
  { ja: '右肩', en: 'Right Shoulder' },
  { ja: '左肩', en: 'Left Shoulder' },
  { ja: '右腕', en: 'Right Arm' },
  { ja: '左腕', en: 'Left Arm' },
  { ja: '右足', en: 'Right Leg' },
  { ja: '左足', en: 'Left Leg' },
  { ja: '右ひざ', en: 'Right Knee' },
  { ja: '左ひざ', en: 'Left Knee' },
  { ja: '右手', en: 'Right Hand' },
  { ja: '左手', en: 'Left Hand' },
]

export const ACCESSORY_SLOT_COUNT = 10
export const ACCESSORY_RECORD_SIZE = 0x40
export const ACCESSORY_EQUIPMENT_BASES = [0x39cc, 0x3c4c, 0x3ecc, 0x414c, 0x43cc, 0x464c] as const
export const ACCESSORY_FLOAT_FIELDS = [
  { key: 'positionAX', kind: 'position', label: { ja: '位置 X', en: 'Position X' }, state: 'A', relative: 0x04, min: -10, max: 10 },
  { key: 'positionAY', kind: 'position', label: { ja: '位置 Y', en: 'Position Y' }, state: 'A', relative: 0x08, min: -10, max: 10 },
  { key: 'positionAZ', kind: 'position', label: { ja: '位置 Z', en: 'Position Z' }, state: 'A', relative: 0x0c, min: -10, max: 10 },
  { key: 'positionBX', kind: 'position', label: { ja: '位置 X', en: 'Position X' }, state: 'B', relative: 0x10, min: -10, max: 10 },
  { key: 'positionBY', kind: 'position', label: { ja: '位置 Y', en: 'Position Y' }, state: 'B', relative: 0x14, min: -10, max: 10 },
  { key: 'positionBZ', kind: 'position', label: { ja: '位置 Z', en: 'Position Z' }, state: 'B', relative: 0x18, min: -10, max: 10 },
  { key: 'rotationAX', kind: 'rotation', label: { ja: '回転 X（度）', en: 'Rotation X (deg)' }, state: 'A', relative: 0x1c, min: -180, max: 180 },
  { key: 'rotationAY', kind: 'rotation', label: { ja: '回転 Y（度）', en: 'Rotation Y (deg)' }, state: 'A', relative: 0x20, min: -180, max: 180 },
  { key: 'rotationAZ', kind: 'rotation', label: { ja: '回転 Z（度）', en: 'Rotation Z (deg)' }, state: 'A', relative: 0x24, min: -180, max: 180 },
  { key: 'rotationBX', kind: 'rotation', label: { ja: '回転 X（度）', en: 'Rotation X (deg)' }, state: 'B', relative: 0x28, min: -180, max: 180 },
  { key: 'rotationBY', kind: 'rotation', label: { ja: '回転 Y（度）', en: 'Rotation Y (deg)' }, state: 'B', relative: 0x2c, min: -180, max: 180 },
  { key: 'rotationBZ', kind: 'rotation', label: { ja: '回転 Z（度）', en: 'Rotation Z (deg)' }, state: 'B', relative: 0x30, min: -180, max: 180 },
  // 🟢 UIのサイズは保存補正+1。負の補正でもサイズが負という意味ではない。
  { key: 'sizeA', kind: 'size', label: { ja: '大きさ', en: 'Size' }, state: 'A', relative: 0x34, min: 0.2, max: 5 },
  { key: 'sizeB', kind: 'size', label: { ja: '大きさ', en: 'Size' }, state: 'B', relative: 0x38, min: 0.2, max: 5 },
] as const
export type AccessoryFloatKey = typeof ACCESSORY_FLOAT_FIELDS[number]['key']
/** 🟢 装着レコードの種類と符号付きフィールド。 */
export const ACCESSORY_FIELDS = {
  id: { relative: 0x3e, type: 'i16', min: -1, max: Math.max(...ACCESSORIES.map(a => a.id)) },
  joint: { relative: 0x3c, type: 'i8', min: 0, max: ACCESSORY_ATTACHMENT_LABELS.length - 1 },
} as const
type AccessoryIntKey = keyof typeof ACCESSORY_FIELDS
const INT_CODEC = recordCodec<AccessoryIntKey>({
  id: { rel: ACCESSORY_FIELDS.id.relative, type: ACCESSORY_FIELDS.id.type },
  joint: { rel: ACCESSORY_FIELDS.joint.relative, type: ACCESSORY_FIELDS.joint.type },
})
/** float32 の丸め（表示 0.2 は約 0.199999988）を許容する幅 */
const FLOAT_TOLERANCE = 0.000001
const outside = (value: number, { min, max }: { min: number; max: number }) =>
  value < min - FLOAT_TOLERANCE || value > max + FLOAT_TOLERANCE
const floatFields = ACCESSORY_FLOAT_FIELDS
function floatField(key: AccessoryFloatKey) {
  const field = floatFields.find(f => f.key === key)
  if (!field) throw new RangeError(tr({ ja: '未知の調整項目です', en: 'Unknown adjustment field' }))
  return field
}
const pairedFields = floatFields.filter(f => f.state === 'A').map(field => {
  const other = floatFields.find(f => f.state === 'B' && f.kind === field.kind && f.label.ja === field.label.ja)
  if (!other) throw new Error('装飾品の調整項目が対応していません')
  return { field, other }
})
export type AccessoryEquipmentSlot = ViewStatus & {
  offset: number
  id: number
  joint: number
  values: Record<AccessoryFloatKey, number>
  owned: boolean
}

export function accessorySlotOffset(group: number, slot: number): number {
  if (!Number.isInteger(group) || group < 0 || group >= ACCESSORY_EQUIPMENT_BASES.length ||
      !Number.isInteger(slot) || slot < 0 || slot >= ACCESSORY_SLOT_COUNT)
    throw new RangeError(tr({ ja: '装飾品の枠が範囲外です', en: 'The accessory slot is out of range' }))
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
  if (offset + ACCESSORY_RECORD_SIZE > bytes.length)
    throw new RangeError(tr({ ja: '装飾品の領域がファイル外です', en: 'The accessory data is outside the file' }))
  const id = INT_CODEC.readField(bytes, offset, 'id')
  const joint = INT_CODEC.readField(bytes, offset, 'joint')
  const idKnown = id >= ACCESSORY_FIELDS.id.min && id <= ACCESSORY_FIELDS.id.max
  const problems: (string | null)[] = [
    checkLayout(bytes),
    idKnown ? null : tr({ ja: '不明な装飾品です', en: 'Unknown accessory' }),
    joint < ACCESSORY_FIELDS.joint.min || joint > ACCESSORY_FIELDS.joint.max
      ? tr({ ja: '不明な取り付け先です', en: 'Unknown attachment point' })
      : null,
  ]
  const warnings: string[] = []
  const values = {} as Record<AccessoryFloatKey, number>
  for (const field of floatFields) {
    const stored = readF32(bytes, offset + field.relative)
    const value = field.kind === 'size' ? stored + 1 : stored
    values[field.key] = value
    if (!Number.isFinite(stored) || outside(value, accessoryFloatRange(field.key, { advanced: true })))
      problems.push(tr({ ja: `${field.label.ja}が許容範囲外です`, en: `${field.label.en} is outside the allowed range` }))
    if (Number.isFinite(stored) && outside(value, accessoryFloatRange(field.key)))
      warnings.push(
        tr({
          ja: `${field.label.ja}が通常の範囲を超えています（上級者モードでだけ書けます）`,
          en: `${field.label.en} is outside the normal range (can only be written in Advanced mode)`,
        }),
      )
  }
  return {
    warnings, offset, id, joint, values,
    owned: idKnown && id >= 0 && readU8(bytes, ACCESSORY_FLAGS_OFFSET + id) === 1,
    problem: problems.find(p => p !== null) ?? null,
  }
}

/** 指定項目だけ上書き。ID変更でも部位・調整値・未知バイト・所持フラグは維持する。 */
export function writeAccessoryField(bytes: Uint8Array, group: number, slot: number, key: AccessoryFloatKey | 'id' | 'joint', value: number, opts: EditOpts = NORMAL_EDIT_OPTS): void {
  assertWritable(bytes)
  const current = readAccessorySlot(bytes, group, slot)
  if (current.problem) throw new RangeError(current.problem)
  if (!Number.isFinite(value)) throw new RangeError(tr({ ja: '有限の数値を入力してください', en: 'Enter a finite number' }))
  if (key === 'id' || key === 'joint') {
    const { min, max } = ACCESSORY_FIELDS[key]
    if (!Number.isInteger(value) || value < min || value > max)
      throw new RangeError(tr({ ja: '選べない値です', en: 'This value cannot be chosen' }))
    INT_CODEC.writeField(bytes, current.offset, key, value)
    return
  }
  const field = floatField(key)
  const { min, max } = accessoryFloatRange(key, opts)
  if (value < min || value > max)
    throw new RangeError(tr({ ja: `${min}〜${max}を入力してください`, en: `Enter a value from ${min} to ${max}` }))
  writeF32(bytes, current.offset + field.relative, field.kind === 'size' ? value - 1 : value)
}

/** 🟢 共通選択時の納刀→抜刀コピー。7値だけをバイト単位でコピーする。 */
export function copySheathedAccessoryToDrawn(bytes: Uint8Array, group: number, slot: number, opts: EditOpts = NORMAL_EDIT_OPTS): void {
  assertWritable(bytes)
  const current = readAccessorySlot(bytes, group, slot)
  if (current.problem) throw new RangeError(current.problem)
  for (const field of ACCESSORY_FLOAT_FIELDS.filter(field => field.state === 'A')) {
    if (outside(current.values[field.key], accessoryFloatRange(field.key, opts)))
      throw new RangeError(tr({ ja: `${field.label.ja}が入力範囲外です`, en: `${field.label.en} is outside the input range` }))
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
  if (!pair)
    throw new RangeError(tr({ ja: '共通の編集は納刀側の項目を指定してください', en: 'For Both, specify a Sheathed field' }))
  // 両状態の範囲は同じ。1回の検証後、対応する4 Bだけを複製する。
  writeAccessoryField(bytes, group, slot, key, value, opts)
  const base = accessorySlotOffset(group, slot)
  bytes.copyWithin(base + pair.other.relative, base + pair.field.relative, base + pair.field.relative + 4)
}

/** 両状態の補正を0にし、取り付け先を装飾品の標準部位にする。検証は呼び出し側で済ませる */
function applyAccessoryDefaults(bytes: Uint8Array, offset: number, accessory: (typeof ACCESSORIES)[number]): void {
  for (const field of ACCESSORY_FLOAT_FIELDS) writeF32(bytes, offset + field.relative, 0)
  INT_CODEC.writeField(bytes, offset, 'joint', accessory.defaultAttachment)
}

/** 🟢 標準部位をセットし、両状態の補正を0へ戻す。標準位置そのものはセーブへ書かない。 */
export function resetAccessoryDefaults(bytes: Uint8Array, group: number, slot: number): void {
  assertWritable(bytes)
  const current = readAccessorySlot(bytes, group, slot)
  if (current.problem) throw new RangeError(current.problem)
  const accessory = ACCESSORIES.find(a => a.id === current.id)
  if (!accessory) throw new RangeError(tr({ ja: '装飾品を選択してください', en: 'Choose an accessory' }))
  applyAccessoryDefaults(bytes, current.offset, accessory)
}

/** IDを変更した場合は新しい装飾品の標準部位と補正0を適用。なしはIDだけを変更する。 */
export function equipAccessory(bytes: Uint8Array, group: number, slot: number, id: number, opts: EditOpts = NORMAL_EDIT_OPTS): void {
  assertWritable(bytes)
  const accessory = ACCESSORIES.find(a => a.id === id)
  if (id !== -1 && !accessory) throw new RangeError(tr({ ja: '装飾品を選択してください', en: 'Choose an accessory' }))
  writeAccessoryField(bytes, group, slot, 'id', id, opts)
  if (accessory) applyAccessoryDefaults(bytes, accessorySlotOffset(group, slot), accessory)
}
