// 箱の名前（useAnchor）

/** 帯刀 */
export const BELT_ANCHORS = {
  state: 'state',
} as const

/** 武器袋・刀箪笥 */
export const WEAPON_LIST_ANCHORS = {
  /** 刀箪笥の本数と容量 */
  capacity: 'capacity',
  /** 武器の一覧 */
  weapons: 'weapons',
} as const

/** 帯刀・武器袋・刀箪笥の武器1件（i 枠目。名前は 1 から数える） */
export const WEAPON_ANCHORS = {
  weapon: (index: number) => `weapon-${index + 1}`,
} as const

/** 武器の編集欄の中のまとまり（帯刀・武器袋・刀箪笥で共通） */
export const WEAPON_EDITOR_ANCHORS = {
  numbers: 'numbers',
  titleCharms: 'title-charms',
  kills: 'kills',
  durability: 'durability',
} as const
