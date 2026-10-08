import type { MouseEvent } from "react";

// 帯刀・武器袋・刀箪笥の画面で共通の定数と小さな関数（コンポーネントは weapon-rows.tsx）。

export const hex = (v: number, digits: number) =>
  `0x${v.toString(16).toUpperCase().padStart(digits, "0")}`;

export const NONE = "none";

/** 武器1件のレコードの先頭を受けて書き込む関数を渡す */
export type WeaponUpdate = (mutate: (bytes: Uint8Array, offset: number) => void) => void;

/**
 * 開閉で高さが伸び縮みする中身（Base UI の --collapsible-panel-height を transition する）。
 * 高さ 0 でも余白が残らないよう、間隔は中に置いた要素の padding で取る
 */
export const COLLAPSIBLE_ANIMATION =
  "h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0";

/** クリックがボタン（開閉の Trigger、丸ハテナなど）の上か。ボタンは自分の動作だけをさせる */
export const isOnButton = (e: MouseEvent<HTMLElement>) =>
  e.target instanceof Element && e.target.closest("button") !== null;
