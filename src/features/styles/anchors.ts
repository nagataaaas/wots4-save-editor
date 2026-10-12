// 箱の名前（useAnchor）

/** 流派 / 技一覧 */
export const SKILLS_ANCHORS = {
  overview: 'overview',
  /** 構えのタブと技の表 */
  stances: 'stances',
} as const

/** 流派 / 流派一覧。流派ごとのカード */
export const STYLES_ANCHORS = {
  overview: 'overview',
  sect: (id: number) => `sect-${id}`,
} as const

/** 流派 / 俺流。流派ごとのカード */
export const ORE_RYU_ANCHORS = {
  overview: 'overview',
  style: (id: number) => `style-${id}`,
  create: 'create',
} as const
