// セーブのバイト列に対する読み書きの基本操作。PC版はリトルエンディアン（docs/save_format/README.md §2 ✅）。
// 書き込みはすべて既存バイトの上書きで、範囲外への書き込みは例外にする。
import { tr } from '@/lib/i18n'

function view(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
}

function assertRange(bytes: Uint8Array, offset: number, length: number): void {
  if (!Number.isInteger(offset) || offset < 0 || offset + length > bytes.byteLength) {
    const at = offset.toString(16)
    throw new RangeError(tr({ ja: `範囲外のアクセスです（0x${at} から ${length} B）`, en: `Access out of range (${length} B from 0x${at})` }))
  }
}

/** 値が型に収まらないときの例外 */
function valueOutOfRange(): RangeError {
  return new RangeError(tr({ ja: '入力できる範囲を超えています', en: 'The value is out of range' }))
}

export function readU8(bytes: Uint8Array, offset: number): number {
  assertRange(bytes, offset, 1)
  return bytes[offset]
}

export function readI8(bytes: Uint8Array, offset: number): number {
  assertRange(bytes, offset, 1)
  return view(bytes).getInt8(offset)
}

export function writeI8(bytes: Uint8Array, offset: number, value: number): void {
  assertRange(bytes, offset, 1)
  if (!Number.isInteger(value) || value < -128 || value > 127) throw valueOutOfRange()
  view(bytes).setInt8(offset, value)
}

/** 数値の型。符号なし・符号つきの整数と float32（どれもリトルエンディアン） */
export type NumType = 'u8' | 'i8' | 'u16' | 'i16' | 'u32' | 'i32' | 'f32'

/** 型ごとの幅（バイト数） */
export const NUM_TYPE_SIZE: Readonly<Record<NumType, 1 | 2 | 4>> = {
  u8: 1, i8: 1, u16: 2, i16: 2, u32: 4, i32: 4, f32: 4,
}

/** float32 で表せるいちばん大きな有限の値 */
export const F32_MAX = 3.4028234663852886e38

/** 型ごとに書ける値の範囲。整数の型は整数だけ、f32 は有限の値だけを書ける */
export const NUM_TYPE_RANGE: Readonly<Record<NumType, { min: number; max: number }>> = {
  u8: { min: 0, max: 0xff },
  i8: { min: -0x80, max: 0x7f },
  u16: { min: 0, max: 0xffff },
  i16: { min: -0x8000, max: 0x7fff },
  u32: { min: 0, max: 0xffff_ffff },
  i32: { min: -0x8000_0000, max: 0x7fff_ffff },
  f32: { min: -F32_MAX, max: F32_MAX },
}

export function readNum(bytes: Uint8Array, offset: number, type: NumType): number {
  switch (type) {
    case 'u8': return readU8(bytes, offset)
    case 'i8': return readI8(bytes, offset)
    case 'u16': return readU16(bytes, offset)
    case 'i16': return readI16(bytes, offset)
    case 'u32': return readU32(bytes, offset)
    case 'i32': return readI32(bytes, offset)
    case 'f32': return readF32(bytes, offset)
  }
}

export function writeNum(bytes: Uint8Array, offset: number, type: NumType, value: number): void {
  switch (type) {
    case 'u8': return writeU8(bytes, offset, value)
    case 'i8': return writeI8(bytes, offset, value)
    case 'u16': return writeU16(bytes, offset, value)
    case 'i16': return writeI16(bytes, offset, value)
    case 'u32': return writeU32(bytes, offset, value)
    case 'i32': return writeI32(bytes, offset, value)
    case 'f32':
      // 有限で float32 に収まる値だけ（収まらない値は Infinity になる）。writeF32 そのものは NaN なども書ける（テストの合成用）
      if (!Number.isFinite(value) || Math.abs(value) > F32_MAX) throw valueOutOfRange()
      return writeF32(bytes, offset, value)
  }
}

/** 幅だけで指定する欄（符号なし整数として読む） */
export type SizedField = { rel: number; size: 1 | 2 | 4 }
/** 型で指定する欄 */
export type TypedField = { rel: number; type: NumType }
export type FieldSpec = SizedField | TypedField

const UNSIGNED_OF_SIZE = { 1: 'u8', 2: 'u16', 4: 'u32' } as const

/** 幅（1・2・4 → u8・u16・u32）か型を、型にする */
export function numTypeOf(sizeOrType: SizedField['size'] | NumType): NumType {
  return typeof sizeOrType === 'number' ? UNSIGNED_OF_SIZE[sizeOrType] : sizeOrType
}

/** 欄の型。size だけの欄は符号なし整数 */
export function fieldType(field: FieldSpec): NumType {
  return 'type' in field ? field.type : UNSIGNED_OF_SIZE[field.size]
}

export function readSized(bytes: Uint8Array, offset: number, sizeOrType: SizedField['size'] | NumType): number {
  return readNum(bytes, offset, numTypeOf(sizeOrType))
}

export function writeSized(bytes: Uint8Array, offset: number, sizeOrType: SizedField['size'] | NumType, value: number): void {
  writeNum(bytes, offset, numTypeOf(sizeOrType), value)
}

/** レコードの相対位置と型（または幅）を、読み書きで共有する。 */
export function recordCodec<K extends string>(fields: Record<K, FieldSpec>) {
  const at = (base: number, key: K) => base + fields[key].rel
  return {
    offset: at,
    type: (key: K) => fieldType(fields[key]),
    readField: (bytes: Uint8Array, base: number, key: K) => readNum(bytes, at(base, key), fieldType(fields[key])),
    writeField: (bytes: Uint8Array, base: number, key: K, value: number) =>
      writeNum(bytes, at(base, key), fieldType(fields[key]), value),
    read: (bytes: Uint8Array, base: number): Record<K, number> => Object.fromEntries(
      (Object.keys(fields) as K[]).map(key => [key, readNum(bytes, at(base, key), fieldType(fields[key]))]),
    ) as Record<K, number>,
  }
}

export function writeU8(bytes: Uint8Array, offset: number, value: number): void {
  assertRange(bytes, offset, 1)
  if (!Number.isInteger(value) || value < 0 || value > 0xff) throw valueOutOfRange()
  bytes[offset] = value
}

export function readU16(bytes: Uint8Array, offset: number): number {
  assertRange(bytes, offset, 2)
  return view(bytes).getUint16(offset, true)
}

export function writeU16(bytes: Uint8Array, offset: number, value: number): void {
  assertRange(bytes, offset, 2)
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) throw valueOutOfRange()
  view(bytes).setUint16(offset, value, true)
}

export function readI16(bytes: Uint8Array, offset: number): number {
  assertRange(bytes, offset, 2)
  return view(bytes).getInt16(offset, true)
}

export function writeI16(bytes: Uint8Array, offset: number, value: number): void {
  assertRange(bytes, offset, 2)
  if (!Number.isInteger(value) || value < -0x8000 || value > 0x7fff) throw valueOutOfRange()
  view(bytes).setInt16(offset, value, true)
}

export function readU32(bytes: Uint8Array, offset: number): number {
  assertRange(bytes, offset, 4)
  return view(bytes).getUint32(offset, true)
}

export function writeU32(bytes: Uint8Array, offset: number, value: number): void {
  assertRange(bytes, offset, 4)
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw valueOutOfRange()
  view(bytes).setUint32(offset, value, true)
}

export function readI32(bytes: Uint8Array, offset: number): number {
  assertRange(bytes, offset, 4)
  return view(bytes).getInt32(offset, true)
}

export function writeI32(bytes: Uint8Array, offset: number, value: number): void {
  assertRange(bytes, offset, 4)
  if (!Number.isInteger(value) || value < -0x8000_0000 || value > 0x7fff_ffff) throw valueOutOfRange()
  view(bytes).setInt32(offset, value, true)
}

export function readF32(bytes: Uint8Array, offset: number): number {
  assertRange(bytes, offset, 4)
  return view(bytes).getFloat32(offset, true)
}

export function writeF32(bytes: Uint8Array, offset: number, value: number): void {
  assertRange(bytes, offset, 4)
  view(bytes).setFloat32(offset, value, true)
}

/**
 * 固定長の UTF-16LE 文字列を読む。最初の NUL（0x0000）までを文字列とする。
 * `terminated` は NUL が見つかったか、`paddingClean` は NUL 以降がすべて 0 か。
 */
export function readUtf16Fixed(
  bytes: Uint8Array,
  offset: number,
  byteLength: number,
): { text: string; terminated: boolean; paddingClean: boolean } {
  assertRange(bytes, offset, byteLength)
  const v = view(bytes)
  const units: number[] = []
  let end = -1
  for (let i = 0; i < byteLength / 2; i++) {
    const u = v.getUint16(offset + i * 2, true)
    if (u === 0) {
      end = i
      break
    }
    units.push(u)
  }
  let paddingClean = true
  if (end >= 0) {
    for (let i = offset + end * 2; i < offset + byteLength; i++) {
      if (bytes[i] !== 0) {
        paddingClean = false
        break
      }
    }
  }
  return { text: String.fromCharCode(...units), terminated: end >= 0, paddingClean }
}

/**
 * 固定長の UTF-16LE 文字列を書く。残りは 0 で埋める。
 * 終端の NUL を含めてフィールドに収まらない文字列は拒否する。
 */
export function writeUtf16Fixed(bytes: Uint8Array, offset: number, byteLength: number, text: string): void {
  assertRange(bytes, offset, byteLength)
  const maxChars = byteLength / 2 - 1
  if (text.length > maxChars) throw new RangeError(tr({ ja: `文字数が上限（${maxChars}文字）を超えています`, en: `Longer than the limit (${maxChars} characters)` }))
  const v = view(bytes)
  for (let i = 0; i < byteLength / 2; i++) {
    v.setUint16(offset + i * 2, i < text.length ? text.charCodeAt(i) : 0, true)
  }
}
