import { Binary, ClipboardList, Flag, Globe, Moon, Package, ScrollText, Shirt, Store, Sword, User, Workflow, type LucideIcon } from 'lucide-react'

// サイドバーに並べる編集機能の一覧。
// 各領域の確度は docs/save_format/README.md §3 と各 chunk を参照（chunk 名を note に残す）。

export type SectionId =
  | 'hero'
  | 'hero-appearance'
  | 'belt'
  | 'weapon-bag'
  | 'weapon-chest'
  | 'tools'
  | 'chest'
  | 'valuables'
  | 'accessories'
  | 'appearance'
  | 'unlocks'
  | 'world'
  | 'scenario'
  | 'event-chart'
  | 'occupation'
  | 'yobai'
  | 'styles'
  | 'ore-ryu'
  | 'skills'
  | 'circulating'
  | 'raw'

export type Section = {
  id: SectionId
  label: string
  /** 対応する解析ドキュメントの chunk（docs/save_format/chunks/{slug}） */
  note: string
  /** 横に長い画面。本文の幅の上限（max-w-5xl）を外す */
  wide?: boolean
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
      {
        label: '主人公',
        icon: User,
        sections: [
          { id: 'hero', label: '基本情報', note: 'money・player-name・stats・vitals（所持金・侍点・名前・活力・HP）、date-location（現在地・難易度・主人公設定のやり直し）' },
          { id: 'hero-appearance', label: '容姿', note: 'appearance（現在の見た目・人物・顔・髪型・服）、accessories（装着10枠・位置・回転・大きさ・俺のおしゃれ 🟢 要ゲーム内確認）' },
        ],
      },
      {
        label: '武器',
        icon: Sword,
        sections: [
          { id: 'belt', label: '帯刀', note: 'weapon-record（帯刀 3本）、belt-state（帯刀の状態）' },
          { id: 'weapon-bag', label: '武器袋', note: 'weapon-record（武器袋 10本）' },
          { id: 'weapon-chest', label: '刀箪笥', note: 'weapon-record（武器箪笥 200本と、本数と容量 🟢）' },
        ],
      },
      {
        label: '道具',
        icon: Package,
        sections: [
          { id: 'tools', label: '所持', note: 'items（手持ち 8 B × 10件）' },
          { id: 'chest', label: '箪笥', note: 'items（箪笥の通常アイテム 8 B × 80件）' },
          { id: 'valuables', label: '重要品', note: 'items（貴重品 8 B × 10件。[TS] は先頭4件＝製錬用の鉄のみ編集）' },
        ],
      },
      {
        label: '容姿・特典',
        icon: Shirt,
        sections: [
          { id: 'accessories', label: '装飾品', note: 'accessories（所持フラグ 1 B × 158）' },
          { id: 'appearance', label: '容姿', note: 'appearance の服と unlocks の顔・髪型など（U-17）' },
          { id: 'unlocks', label: '特典解除', note: 'unlocks 🔶 特典の状態（U-17）' },
        ],
      },
      { id: 'world', label: '世界', icon: Globe, note: 'difficulty・date-location・factions・gates・facilities 🔶 難易度・周回、日数・時間帯、治安、勢力、門・柵、施設' },
      { id: 'scenario', label: 'シナリオ', icon: Flag, note: 'event-chart・scenario-flags・characters・best-route 🔶 イベントの状態、フラグ、人物、真ルート' },
      { id: 'event-chart', label: 'イベントチャート', icon: Workflow, note: 'event-chart イベントの状態とチャート表示の記録', wide: true },
      { id: 'occupation', label: 'なりわい', icon: ClipboardList, note: 'occupation・townsfolk（なりわいのフラグ）状態の表・クリア数・連続なりわいの進み具合' },
      { id: 'yobai', label: '夜這い', icon: Moon, note: 'night-visit 夜の約束（場所・人物）と夜這いの記録 🔶' },
      {
        label: '流派',
        icon: ScrollText,
        sections: [
          { id: 'skills', label: '技一覧', note: 'skill-states（構えごとの技の一覧と覚え状況 ✅ [U]、固有技の状態 3 は 🟢）' },
          { id: 'styles', label: '流派', note: 'styles・skill-states・sect-scrolls（技の覚え状況 ✅ [U]、修練度・段 🟢）' },
          { id: 'ore-ryu', label: '俺流', note: 'custom-style・belt-copy（俺流の技の表）🟢 要ゲーム内確認' },
        ],
      },
      { id: 'circulating', label: '流通', icon: Store, note: 'market-weapons 🟢 持ち去られた武器・道具・部品（読み取り専用）' },
    ],
  },
  {
    label: '解析',
    items: [{ id: 'raw', label: '生データ', icon: Binary, note: 'ファイル全体の16進表示（README §3 の領域で色分け）・差分・検索。書き換えは上級者モードのみ' }],
  },
]

/** 画面を持つ項目と、属する親項目のラベル */
export const sections: (Section & { folder?: string })[] = sectionGroups.flatMap((g) =>
  g.items.flatMap((node): (Section & { folder?: string })[] => (isFolder(node) ? node.sections.map((s) => ({ ...s, folder: node.label })) : [node])),
)
