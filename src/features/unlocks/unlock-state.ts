/** 🔶 U-17：0 非表示 → 1 未取得 → 2 取得済み → 0。未知の値は 0 に戻す。 */
export function nextUnlockState(value: number): number {
  return value >= 0 && value <= 2 ? (value + 1) % 3 : 0;
}
