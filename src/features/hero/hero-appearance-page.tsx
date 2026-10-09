import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AccessoryEquipmentPage } from '@/features/accessory-equipment/accessory-equipment-page'
import { AppearanceCurrentCard } from './appearance-current-card'
import { AppearancePartsCard } from './appearance-parts-card'

export function HeroAppearancePage() {
  return (
    <div className="flex flex-col gap-4">
      <AppearanceCurrentCard />
      <AppearancePartsCard />
      <Card>
        <CardHeader>
          <CardTitle>装飾品</CardTitle>
        </CardHeader>
        <CardContent>
          <AccessoryEquipmentPage />
        </CardContent>
      </Card>
    </div>
  )
}
