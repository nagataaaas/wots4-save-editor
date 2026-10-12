// 箱の名前（useAnchor）

/** 主人公 / 基本情報 */
export const HERO_ANCHORS = {
  name: 'name',
  money: 'money',
  vitals: 'vitals',
  difficulty: 'difficulty',
  location: 'location',
} as const

/** 主人公 / 容姿 */
export const HERO_APPEARANCE_ANCHORS = {
  current: 'current',
  parts: 'parts',
  accessories: 'accessories',
} as const
