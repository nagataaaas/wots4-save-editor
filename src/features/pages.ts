import type { ComponentType } from 'react'
import { BeltPage } from '@/features/belt/belt-page'
import { HeroPage } from '@/features/hero/hero-page'
import { ScenarioPage } from '@/features/scenario/scenario-page'
import { ToolsPage } from '@/features/tools/tools-page'
import { ValuablesPage } from '@/features/valuables/valuables-page'
import type { SectionId } from '@/features/sections'

/** 実装済みの画面。ここにない項目は仮表示になる */
export const pages: Partial<Record<SectionId, ComponentType>> = {
  hero: HeroPage,
  belt: BeltPage,
  tools: ToolsPage,
  valuables: ValuablesPage,
  scenario: ScenarioPage,
}
