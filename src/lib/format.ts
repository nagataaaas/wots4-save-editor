/** オフセットを `0x0000` 形式で表示する */
export function formatOffset(offset: number): string {
  return `0x${offset.toString(16).toUpperCase().padStart(4, '0')}`
}

/** 1バイトの値を `0x00` 形式で表示する */
export function formatHex2(value: number): string {
  return `0x${value.toString(16).toUpperCase().padStart(2, '0')}`
}
