import type { MouseEvent } from 'react'

/** 開閉する領域内のボタンは、そのボタン自身の動作だけを行う。 */
export const isOnButton = (e: MouseEvent<HTMLElement>) => e.target instanceof Element && e.target.closest('button') !== null
