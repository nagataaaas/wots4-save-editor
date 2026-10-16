import type { Localized } from '@/lib/i18n'
import { Binary, ClipboardList, Globe, LayoutTemplate, Moon, Package, ScrollText, Shirt, Store, Sword, User, type LucideIcon } from 'lucide-react'

// サイドバーに並べる編集機能の一覧。
// 各領域の確度は docs/save_format/README.md §3 と各 chunk を参照。
// 各項目の上のコメントは、対応する解析ドキュメントの chunk（docs/save_format/chunks/{slug}）と、画面で扱う範囲。

export type SectionId =
  | 'hero'
  | 'hero-appearance'
  | 'records'
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
  | 'npc'
  | 'event-chart'
  | 'dojo'
  | 'occupation'
  | 'yobai'
  | 'styles'
  | 'ore-ryu'
  | 'skills'
  | 'circulating'
  | 'templates'
  | 'raw'

export type Section = {
  id: SectionId
  label: Localized
  /** 横に長い画面。本文の幅の上限（max-w-5xl）を外す */
  wide?: boolean
}

/** サイドバー直下に並ぶ項目（アイコンつき） */
export type TopSection = Section & { icon: LucideIcon }

/** サイドバーで子項目をまとめる親項目（それ自体は画面を持たない。子項目はアイコンなし） */
export type SectionFolder = {
  label: Localized
  icon: LucideIcon
  sections: Section[]
}

export type SectionNode = TopSection | SectionFolder

export type SectionGroup = {
  label: Localized
  items: SectionNode[]
}

export function isFolder(node: SectionNode): node is SectionFolder {
  return 'sections' in node
}

export const sectionGroups: SectionGroup[] = [
  {
    label: { ja: '編集', en: 'Edit' },
    items: [
      {
        label: { ja: '主人公', en: 'Hero' },
        icon: User,
        sections: [
          // money・player-name・stats・vitals（所持金・侍点・名前・活力・HP）、date-location（現在地・難易度・主人公設定のやり直し）
          { id: 'hero', label: { ja: '基本情報', en: 'Basics' } },
          // appearance（現在の見た目・人物・顔・髪型・服）、accessories（装着10枠・位置・回転・大きさ・俺のおしゃれ）。俺のおしゃれは 🟢 要ゲーム内確認
          { id: 'hero-appearance', label: { ja: '容姿', en: 'Appearance' } },
          // stats（侍評価・行動の回数・称号の回数・プレイ時間・移動距離・斬殺数・人物ごとの痛手）。🟢 要ゲーム内確認
          { id: 'records', label: { ja: '侍評価・記録', en: 'Evaluation & Records' } },
        ],
      },
      {
        label: { ja: '武器', en: 'Weapons' },
        icon: Sword,
        sections: [
          // weapon-record（帯刀 3本）、belt-state（帯刀の状態）
          { id: 'belt', label: { ja: '帯刀', en: 'Equipped' } },
          // weapon-record（武器袋 10本）
          { id: 'weapon-bag', label: { ja: '武器袋', en: 'Weapon Sack' } },
          // weapon-record（武器箪笥 200本と、本数と容量）。本数と容量は 🟢
          { id: 'weapon-chest', label: { ja: '刀箪笥', en: 'Weapon Chest' } },
        ],
      },
      {
        label: { ja: '道具', en: 'Items' },
        icon: Package,
        sections: [
          // items（手持ち 8 B × 10件）
          { id: 'tools', label: { ja: '所持', en: 'Inventory' } },
          // items（箪笥の通常アイテム 8 B × 80件）
          { id: 'chest', label: { ja: '箪笥', en: 'Chest' } },
          // items（貴重品 8 B × 10件。[TS] は先頭4件＝製錬用の鉄のみ編集）
          { id: 'valuables', label: { ja: '重要品', en: 'Key Items' } },
        ],
      },
      {
        label: { ja: '容姿・特典', en: 'Appearance & Unlocks' },
        icon: Shirt,
        sections: [
          // accessories（所持フラグ 1 B × 158）
          { id: 'accessories', label: { ja: '装飾品', en: 'Accessories' } },
          // appearance の服と unlocks の顔・髪型など。🔶 U-17
          { id: 'appearance', label: { ja: '容姿', en: 'Appearance' } },
          // unlocks（特典の状態）。🔶 U-17
          { id: 'unlocks', label: { ja: '特典解除', en: 'Unlocks' } },
        ],
      },
      {
        label: { ja: '世界', en: 'World' },
        icon: Globe,
        sections: [
          // difficulty・date-location・gates・facilities（難易度・治安・周回、段階・日数・時間帯、門・柵、施設）。一部 🔶
          { id: 'world', label: { ja: '阿弥浜', en: 'Amihama' } },
          // factions・characters・townsfolk・best-route（勢力の退場、人物の状態、町の人の生死、NPCイベントフラグ）。一部 🔶
          { id: 'npc', label: { ja: 'NPC', en: 'NPCs' } },
          // event-chart・best-route・factions・scenario-flags（イベントチャート〈真ルート・一括設定〉、勢力の状態、イベント関連フラグ）。一部 🔶
          { id: 'event-chart', label: { ja: 'イベント', en: 'Events' }, wide: true },
          // dojo（道場の評判・弟子の名簿・道場破り）。🟢 要ゲーム内確認
          { id: 'dojo', label: { ja: '道場', en: 'Dojo' } },
        ],
      },
      {
        label: { ja: '流派', en: 'Styles' },
        icon: ScrollText,
        sections: [
          // skill-states（構えごとの技の一覧と覚え状況）。覚え状況 ✅ [U]、固有技の状態 3 は 🟢
          { id: 'skills', label: { ja: '技一覧', en: 'Moves' } },
          // styles・skill-states・sect-scrolls（技の覚え状況・修練度・段）。技の覚え状況 ✅ [U]、修練度・段 🟢
          { id: 'styles', label: { ja: '流派一覧', en: 'Style List' } },
          // custom-style・belt-copy（俺流の技の表）。🟢 要ゲーム内確認
          { id: 'ore-ryu', label: { ja: '俺流', en: 'My Style' } },
        ],
      },
      // occupation・townsfolk（なりわいのフラグ）状態の表・クリア数・連続なりわいの進み具合
      { id: 'occupation', label: { ja: 'なりわい', en: 'Missions' }, icon: ClipboardList },
      // night-visit（夜の約束の場所・人物と、夜這いの記録）。一部 🔶
      { id: 'yobai', label: { ja: '夜這い', en: 'Night Crawling' }, icon: Moon },
      // market-weapons（持ち去られた武器・道具・部品。読み取り専用）。🟢
      { id: 'circulating', label: { ja: '流通', en: 'Reclamation' }, icon: Store },
      // scene-templates（決まった戦いの直前に書き換える）。剣術大会直前は ✅ [U]、なりわいは ❓ 要ゲーム内確認
      { id: 'templates', label: { ja: 'テンプレート', en: 'Presets' }, icon: LayoutTemplate },
    ],
  },
  {
    label: { ja: '解析', en: 'Analysis' },
    // ファイル全体の16進表示（README §3 の領域で色分け）・差分・検索。書き換えは上級者モードのみ
    items: [{ id: 'raw', label: { ja: '生データ', en: 'Raw Data' }, icon: Binary }],
  },
]

/** 画面を持つ項目と、属する親項目のラベル */
export const sections: (Section & { folder?: Localized })[] = sectionGroups.flatMap((g) =>
  g.items.flatMap((node): (Section & { folder?: Localized })[] => (isFolder(node) ? node.sections.map((s) => ({ ...s, folder: node.label })) : [node])),
)
