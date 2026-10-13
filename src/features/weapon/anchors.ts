/** 武器袋・刀箪笥 */
export const WEAPON_LIST_ANCHORS = { capacity: 'capacity', weapons: 'weapons' } as const

/** 帯刀・武器袋・刀箪笥の武器1件 */
export const WEAPON_ANCHORS = { weapon: (index: number) => `weapon-${index + 1}` } as const

/** 武器の編集欄のまとまり */
export const WEAPON_EDITOR_ANCHORS = {
  numbers: 'numbers', titleCharms: 'title-charms', kills: 'kills', durability: 'durability',
} as const
