import { CollapsibleCard } from '@/components/collapsible-card'
import { AccessoryEquipmentPage } from '@/features/accessory-equipment/accessory-equipment-page'
import { AppearanceCurrentCard } from './appearance-current-card'
import { AppearancePartsCard } from './appearance-parts-card'

export function HeroAppearancePage() {
  return (
    <div className="flex flex-col gap-4">
      <AppearanceCurrentCard />
      <AppearancePartsCard />
      <CollapsibleCard title="装飾品">
        <AccessoryEquipmentPage />
      </CollapsibleCard>
    </div>
  )
}
