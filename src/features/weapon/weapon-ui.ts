// 帯刀・武器袋・刀箪笥の画面で共通の定数と小さな関数（コンポーネントは weapon-rows.tsx）。

export const NONE = "none";

/** 武器1件のレコードの先頭を受けて書き込む関数を渡す */
export type WeaponUpdate = (mutate: (bytes: Uint8Array, offset: number) => void) => void;
