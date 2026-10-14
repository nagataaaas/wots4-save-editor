/** 値が違う位置。長さの差も違いとして扱う。比較範囲を指定した場合はそこまで。 */
export function* changedByteOffsets(a: Uint8Array, b: Uint8Array, length = Math.max(a.length, b.length)): Generator<number> {
  for (let i = 0; i < length; i++) if (a[i] !== b[i]) yield i
}

/** 値が違うバイトの数。編集のたびにセーブ全体を数えるので、ジェネレータを通さずに数える */
export function countChangedBytes(a: Uint8Array, b: Uint8Array): number {
  const length = Math.max(a.length, b.length)
  let count = 0
  for (let i = 0; i < length; i++) if (a[i] !== b[i]) count++
  return count
}

export function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  return changedByteOffsets(a, b).next().done === true
}
