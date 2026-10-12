import type { ScoreTableId } from '@/save/score-tables'
import type { StatGroupId } from '@/save/stats'

// 箱の名前（useAnchor）

/** 主人公 / 侍評価・記録。数値のまとまりと、技・道具ごとの表のカード */
export const STATS_ANCHORS = {
  group: (id: StatGroupId) => `stat-${id}`,
  scoreTable: (id: ScoreTableId) => `score-${id}`,
} as const
