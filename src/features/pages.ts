import type { ComponentType } from 'react'
import { BeltPage } from '@/features/belt/belt-page'
import { EventChartPage } from '@/features/event-chart/event-chart-page'
import { HeroPage } from '@/features/hero/hero-page'
import { MarketWeaponsPage } from '@/features/market-weapons/market-weapons-page'
import { OccupationPage } from '@/features/occupation/occupation-page'
import { ScenarioPage, WorldPage } from '@/features/scenario/scenario-page'
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
  belt: BeltPage,
  'weapon-bag': WeaponBagPage,
  'weapon-chest': WeaponChestPage,
  tools: ToolsPage,
  chest: ChestPage,
  valuables: ValuablesPage,
  accessories: AccessoriesPage,
  appearance: AppearancePage,
  unlocks: UnlocksPage,
  world: WorldPage,
  scenario: ScenarioPage,
  'event-chart': EventChartPage,
  occupation: OccupationPage,
  yobai: YobaiPage,
  circulating: MarketWeaponsPage,
  raw: RawPage,
}
