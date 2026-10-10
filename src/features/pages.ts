import type { ComponentType } from 'react'
import { HeroAppearancePage } from '@/features/hero/hero-appearance-page'
import { BeltPage } from '@/features/belt/belt-page'
import { HeroPage } from '@/features/hero/hero-page'
import { MarketWeaponsPage } from '@/features/market-weapons/market-weapons-page'
import { OccupationPage } from '@/features/occupation/occupation-page'
import { OreRyuPage } from '@/features/styles/ore-ryu-page'
import { SkillsPage } from '@/features/styles/skills-page'
import { StylesPage } from '@/features/styles/styles-page'
import { AmihamaPage, EventsPage, NpcPage } from '@/features/scenario/scenario-page'
import { StatsPage } from '@/features/stats/stats-page'
import { ChestPage, ToolsPage } from '@/features/tools/tools-page'
import { AccessoriesPage, AppearancePage, UnlocksPage } from '@/features/unlocks/unlocks-page'
import { RawPage } from '@/features/raw/raw-page'
import { ValuablesPage } from '@/features/valuables/valuables-page'
import { WeaponBagPage } from '@/features/weapon-bag/weapon-bag-page'
import { WeaponChestPage } from '@/features/weapon-chest/weapon-chest-page'
import { YobaiPage } from '@/features/yobai/yobai-page'
import type { SectionId } from '@/features/sections'

/** 実装済みの画面。ここにない項目は仮表示になる */
export const pages: Partial<Record<SectionId, ComponentType>> = {
  hero: HeroPage,
  'hero-appearance': HeroAppearancePage,
  records: StatsPage,
  belt: BeltPage,
  'weapon-bag': WeaponBagPage,
  'weapon-chest': WeaponChestPage,
  tools: ToolsPage,
  chest: ChestPage,
  valuables: ValuablesPage,
  accessories: AccessoriesPage,
  appearance: AppearancePage,
  unlocks: UnlocksPage,
  world: AmihamaPage,
  npc: NpcPage,
  'event-chart': EventsPage,
  occupation: OccupationPage,
  yobai: YobaiPage,
  styles: StylesPage,
  'ore-ryu': OreRyuPage,
  skills: SkillsPage,
  circulating: MarketWeaponsPage,
  raw: RawPage,
}
