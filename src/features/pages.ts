import type { ComponentType } from 'react'
import { HeroPage } from '@/features/hero/hero-page'
import { ValuablesPage } from '@/features/valuables/valuables-page'
import type { SectionId } from '@/features/sections'

/** 実装済みの画面。ここにない項目は仮表示になる */
export const pages: Partial<Record<SectionId, ComponentType>> = {
  hero: HeroPage,
  valuables: ValuablesPage,
}
