import { Binary, Flag, Moon, Package, ScrollText, Store, Sword, Swords, User, type LucideIcon } from 'lucide-react'

// サイドバーに並べる編集機能の一覧。
// 各領域の確度は docs/save_format/README.md §3 と各 chunk を参照（chunk 名を note に残す）。

export type SectionId =
  | 'hero'
  | 'belt'
  | 'weapon-bag'
  | 'weapon-chest'
  | 'tools'
  | 'chest'
  | 'valuables'
  | 'scenario'
  | 'yobai'
  | 'styles'
  | 'ore-ryu'
  | 'circulating'
  | 'raw'

export type Section = {
  id: SectionId
  label: string
  /** 対応する解析ドキュメントの chunk（docs/save_format/chunks/{slug}） */
  note: string
}

/** サイドバー直下に並ぶ項目（アイコンつき） */
export type TopSection = Section & { icon: LucideIcon }

/** サイドバーで子項目をまとめる親項目（それ自体は画面を持たない。子項目はアイコンなし） */
export type SectionFolder = {
  label: string
  icon: LucideIcon
  sections: Section[]
}

export type SectionNode = TopSection | SectionFolder

export type SectionGroup = {
  label: string
  items: SectionNode[]
}

export function isFolder(node: SectionNode): node is SectionFolder {
  return 'sections' in node
}

export const sectionGroups: SectionGroup[] = [
  {
    label: '編集',
    items: [
      { id: 'hero', label: '主人公', icon: User, note: 'money・player-name・stats・vitals（所持金・侍点・名前・活力・HP）' },
      {
        label: '武器',
        icon: Sword,
        sections: [
          { id: 'belt', label: '帯刀', note: 'weapon-record（帯刀 3本）、belt-state（帯刀の状態）' },
          { id: 'weapon-bag', label: '武器袋', note: 'weapon-record（武器袋 10本）' },
          { id: 'weapon-chest', label: '刀箪笥', note: 'weapon-record（武器箪笥 200本）' },
        ],
      },
      {
        label: '道具',
        icon: Package,
        sections: [
          { id: 'tools', label: '所持', note: 'items（手持ち 8 B × 10件）' },
          { id: 'chest', label: '箪笥', note: 'items（箪笥の通常アイテム）' },
          { id: 'valuables', label: '重要品', note: 'items（貴重品 8 B × 10件。[TS] は先頭4件＝製錬用の鉄のみ編集）' },
        ],
      },
      { id: 'scenario', label: 'シナリオ', icon: Flag, note: 'date-location・event-chart・factions 🔶 日数・時間帯、イベントの状態、勢力の記録' },
      { id: 'yobai', label: '夜這い', icon: Moon, note: 'night-visit 夜の約束（場所・人物）と夜這いの記録 🔶' },
      { id: 'styles', label: '流派', icon: ScrollText, note: 'styles 🔶 0x018BC0 付近' },
      { id: 'ore-ryu', label: '俺流', icon: Swords, note: 'custom-style ❓ U-6' },
      { id: 'circulating', label: '流通中の刀', icon: Store, note: 'market-weapons ❓ U-11' },
    ],
  },
  {
    label: '解析',
    items: [{ id: 'raw', label: '生データ', icon: Binary, note: '未確認領域のバイト表示' }],
  },
]

/** 画面を持つ項目と、属する親項目のラベル */
export const sections: (Section & { folder?: string })[] = sectionGroups.flatMap((g) =>
  g.items.flatMap((node): (Section & { folder?: string })[] => (isFolder(node) ? node.sections.map((s) => ({ ...s, folder: node.label })) : [node])),
)
