/** [TS] が扱うファイルサイズ（docs/save_format/README.md §2） */
export const TS_SAVE_SIZE = 0x48bb0

export function checkLayout(bytes: Uint8Array): string | null {
  return bytes.byteLength === TS_SAVE_SIZE
    ? null
    : 'ファイルサイズが想定と異なります。読み取り専用にしています。'
}

/** UI を経由しない書き込みでも、サイズと指定領域の境界を検証する。 */
export function assertWritable(bytes: Uint8Array, offset = 0, length = bytes.byteLength): void {
  const problem = checkLayout(bytes)
  if (problem) throw new RangeError(problem)
  if (!Number.isInteger(offset) || !Number.isInteger(length) || offset < 0 || length < 0 || offset + length > bytes.byteLength)
    throw new RangeError('書き込む領域がファイル外です')
}
