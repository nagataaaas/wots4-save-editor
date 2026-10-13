import { HERO_APPEARANCE_ANCHORS } from './anchors'
import { CollapsibleCard } from '@/components/collapsible-card'
import { AccessoryEquipmentEditor } from '@/features/accessory-equipment/accessory-equipment-page'
import { AppearanceCurrentCard } from './appearance-current-card'
import { AppearancePartsCard } from './appearance-parts-card'

export function HeroAppearancePage() {
  return (
    <div className="flex flex-col gap-4">
      <AppearanceCurrentCard />
      <AppearancePartsCard />
      <CollapsibleCard anchor={HERO_APPEARANCE_ANCHORS.accessories} title="装飾品">
        <AccessoryEquipmentEditor />
      </CollapsibleCard>
    </div>
  )
}
