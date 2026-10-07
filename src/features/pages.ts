import type { ComponentType } from 'react'
import { BeltPage } from '@/features/belt/belt-page'
import { EventChartPage } from '@/features/event-chart/event-chart-page'
import { HeroPage } from '@/features/hero/hero-page'
import { ScenarioPage, WorldPage } from '@/features/scenario/scenario-page'
import { ChestPage, ToolsPage } from '@/features/tools/tools-page'
import { ValuablesPage } from '@/features/valuables/valuables-page'
import { YobaiPage } from '@/features/yobai/yobai-page'
import type { SectionId } from '@/features/sections'

/** 実装済みの画面。ここにない項目は仮表示になる */
export const pages: Partial<Record<SectionId, ComponentType>> = {
  hero: HeroPage,
  belt: BeltPage,
  tools: ToolsPage,
  chest: ChestPage,
  valuables: ValuablesPage,
  world: WorldPage,
  scenario: ScenarioPage,
  'event-chart': EventChartPage,
  yobai: YobaiPage,
}
