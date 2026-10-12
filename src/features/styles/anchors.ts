// 箱の名前（useAnchor）

/** 流派 / 流派一覧。流派ごとのカード */
export const STYLES_ANCHORS = {
  sect: (id: number) => `sect-${id}`,
} as const

/** 流派 / 俺流。流派ごとのカード */
export const ORE_RYU_ANCHORS = {
  style: (id: number) => `style-${id}`,
} as const
