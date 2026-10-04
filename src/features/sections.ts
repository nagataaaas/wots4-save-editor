import { Anvil, Binary, Package, ScrollText, Store, Sword, Swords, User, type LucideIcon } from 'lucide-react'

// サイドバーに並べる編集機能の一覧。
// 各領域の確度は docs/wos4_save_format.md を参照（節番号を note に残す）。

export type SectionId = 'hero' | 'items' | 'jigane' | 'weapons' | 'styles' | 'ore-ryu' | 'circulating' | 'raw'

export type Section = {
  id: SectionId
  label: string
  icon: LucideIcon
  /** 対応する解析ノートの節 */
  note: string
}

export type SectionGroup = {
  label: string
  sections: Section[]
}

export const sectionGroups: SectionGroup[] = [
  {
    label: '編集',
    sections: [
      { id: 'hero', label: '主人公', icon: User, note: '§3.1（所持金・侍点・名前・活力・HP）' },
      { id: 'items', label: 'アイテム', icon: Package, note: '§4（箪笥・手持ち・貴重品）' },
      { id: 'jigane', label: '地金', icon: Anvil, note: '§4（貴重品の先頭4件＝製錬用の鉄）' },
      { id: 'weapons', label: '刀', icon: Sword, note: '§5（帯刀・武器袋・武器箪笥）' },
      { id: 'styles', label: '流派', icon: ScrollText, note: '§3.1 🔶 0x018BC0 付近' },
      { id: 'ore-ryu', label: '俺流', icon: Swords, note: '§8.2 ❓ U-6' },
      { id: 'circulating', label: '流通中の刀', icon: Store, note: '§8.1 ❓ U-11' },
    ],
  },
  {
    label: '解析',
    sections: [{ id: 'raw', label: '生データ', icon: Binary, note: '未確認領域のバイト表示' }],
  },
]

export const sections: Section[] = sectionGroups.flatMap((g) => g.sections)
