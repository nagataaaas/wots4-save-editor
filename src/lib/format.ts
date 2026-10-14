/** オフセットを `0x0000` 形式で表示する */
export function formatOffset(offset: number): string {
  return `0x${offset.toString(16).toUpperCase().padStart(4, '0')}`
}

/** 2バイトの値を `0x0000` 形式で表示する（中身は formatOffset と同じ） */
export const formatHex4: (value: number) => string = formatOffset

/** 警告の一覧を1つの文にする。警告がなければ null。順番は読み出し側が並べた順のまま */
export function formatWarnings(warnings: readonly string[] | null | undefined): string | null {
  return warnings?.length ? warnings.join('。') : null
}

/** 1バイトの値を `0x00` 形式で表示する */
export function formatHex2(value: number): string {
  return `0x${value.toString(16).toUpperCase().padStart(2, '0')}`
}
