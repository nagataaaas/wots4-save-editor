import { anchorPath } from '@/lib/navigation-context'

// 箱の名前（useAnchor）。中にまとまりを持つ箱は card が自分の名前

/** 世界 / 阿弥浜 */
export const AMIHAMA_ANCHORS = {
  cycle: 'cycle',
  progress: 'progress',
  facilities: 'facilities',
  gates: { card: 'gates', recruit: 'recruit', close: 'close' },
} as const

/** 世界 / NPC */
export const NPC_ANCHORS = {
  factionExit: 'faction-exit',
  characters: 'characters',
  townsfolk: 'townsfolk',
  flags: { card: 'npc-flags', smith: 'smith', dojo: 'dojo', other: 'other' },
} as const

/** 世界 / イベント */
export const EVENTS_ANCHORS = {
  chart: 'chart',
  factions: 'factions',
  flags: 'event-flags',
} as const

/** ほかの画面からのリンク先 */
export const NPC_LINKS = {
  /** 「NPCイベントフラグ」の「道場・先生」（道場の画面からリンク） */
  dojoFlags: anchorPath(NPC_ANCHORS.flags.card, NPC_ANCHORS.flags.dojo),
} as const
