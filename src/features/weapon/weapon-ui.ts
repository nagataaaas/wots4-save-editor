// 帯刀・武器袋・刀箪笥の画面で共通の定数と小さな関数（コンポーネントは weapon-rows.tsx）。
import { WEAPON_FIELDS } from "@/save/weapon";

export const NONE = "none";

/**
 * 欄の位置（丸ハテナに出す）。offset はレコードの先頭。
 * レコードの位置がない欄（索引に載せるためだけに描く欄）では undefined にして、位置を出さない
 */
export const weaponFieldOffset = (offset: number | undefined, key: keyof typeof WEAPON_FIELDS) =>
  offset === undefined ? undefined : offset + WEAPON_FIELDS[key];

/** 書き込み先のレコードの先頭。位置のない欄からは書き込まない */
export function weaponRecordOffset(offset: number | undefined): number {
  if (offset === undefined) throw new Error("セーブファイルが読み込まれていません");
  return offset;
}
