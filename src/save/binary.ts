// セーブのバイト列に対する読み書きの基本操作。PC版はリトルエンディアン（docs/save_format/README.md §2 ✅）。
// 書き込みはすべて既存バイトの上書きで、範囲外への書き込みは例外にする。

function view(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
}

function assertRange(bytes: Uint8Array, offset: number, length: number): void {
  if (!Number.isInteger(offset) || offset < 0 || offset + length > bytes.byteLength) {
    throw new RangeError(`範囲外のアクセスです（0x${offset.toString(16)} から ${length} B）`)
  }
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
  if (!Number.isInteger(value) || value < -128 || value > 127) throw new RangeError("入力できる範囲を超えています")
  view(bytes).setInt8(offset, value)
}

export type SizedField = { rel: number; size: 1 | 2 | 4 }

export function readSized(bytes: Uint8Array, offset: number, size: SizedField['size']): number {
  return size === 1 ? readU8(bytes, offset) : size === 2 ? readU16(bytes, offset) : readU32(bytes, offset)
}

export function writeSized(bytes: Uint8Array, offset: number, size: SizedField['size'], value: number): void {
  if (size === 1) writeU8(bytes, offset, value)
  else if (size === 2) writeU16(bytes, offset, value)
  else writeU32(bytes, offset, value)
}

/** レコードの相対位置と幅を、読み書きで共有する。 */
export function recordCodec<K extends string>(fields: Record<K, SizedField>) {
  return {
    offset: (base: number, key: K) => base + fields[key].rel,
    readField: (bytes: Uint8Array, base: number, key: K) => readSized(bytes, base + fields[key].rel, fields[key].size),
    writeField: (bytes: Uint8Array, base: number, key: K, value: number) => writeSized(bytes, base + fields[key].rel, fields[key].size, value),
    read: (bytes: Uint8Array, base: number): Record<K, number> => Object.fromEntries(
      (Object.keys(fields) as K[]).map(key => [key, readSized(bytes, base + fields[key].rel, fields[key].size)]),
    ) as Record<K, number>,
  }
}

export function writeU8(bytes: Uint8Array, offset: number, value: number): void {
  assertRange(bytes, offset, 1)
  if (!Number.isInteger(value) || value < 0 || value > 0xff) throw new RangeError("入力できる範囲を超えています")
  bytes[offset] = value
}

export function readU16(bytes: Uint8Array, offset: number): number {
  assertRange(bytes, offset, 2)
  return view(bytes).getUint16(offset, true)
}

export function writeU16(bytes: Uint8Array, offset: number, value: number): void {
  assertRange(bytes, offset, 2)
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) throw new RangeError("入力できる範囲を超えています")
  view(bytes).setUint16(offset, value, true)
}

export function readI16(bytes: Uint8Array, offset: number): number {
  assertRange(bytes, offset, 2)
  return view(bytes).getInt16(offset, true)
}

export function writeI16(bytes: Uint8Array, offset: number, value: number): void {
  assertRange(bytes, offset, 2)
  if (!Number.isInteger(value) || value < -0x8000 || value > 0x7fff) throw new RangeError("入力できる範囲を超えています")
  view(bytes).setInt16(offset, value, true)
}

export function readU32(bytes: Uint8Array, offset: number): number {
  assertRange(bytes, offset, 4)
  return view(bytes).getUint32(offset, true)
}

export function writeU32(bytes: Uint8Array, offset: number, value: number): void {
  assertRange(bytes, offset, 4)
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new RangeError("入力できる範囲を超えています")
  view(bytes).setUint32(offset, value, true)
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
  if (text.length > maxChars) throw new RangeError(`文字数が上限（${maxChars}文字）を超えています`)
  const v = view(bytes)
  for (let i = 0; i < byteLength / 2; i++) {
    v.setUint16(offset + i * 2, i < text.length ? text.charCodeAt(i) : 0, true)
  }
}
