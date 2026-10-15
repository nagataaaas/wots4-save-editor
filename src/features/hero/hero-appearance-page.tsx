import { HERO_APPEARANCE_ANCHORS } from './anchors'
import { CollapsibleCard } from '@/components/collapsible-card'
import { AccessoryEquipmentEditor } from '@/features/accessory-equipment/accessory-equipment-page'
import { AppearanceCurrentCard } from './appearance-current-card'
import { AppearancePartsCard } from './appearance-parts-card'
import { tr } from '@/lib/i18n'

export function HeroAppearancePage() {
  return (
    <div className="flex flex-col gap-4">
      <AppearanceCurrentCard />
      <AppearancePartsCard />
      <CollapsibleCard anchor={HERO_APPEARANCE_ANCHORS.accessories} title={tr({ ja: '装飾品', en: 'Accessories' })}>
        <AccessoryEquipmentEditor />
      </CollapsibleCard>
    </div>
  )
}
