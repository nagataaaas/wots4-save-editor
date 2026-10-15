import { useCallback, useMemo } from 'react'
import { InfoTip } from '@/components/info-tip'
import { ItemSlotRow } from '@/components/item-slot-row'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CardContent } from '@/components/ui/card'
import { AnchoredCard } from '@/components/anchored-card'
import { ITEM_ANCHORS } from './anchors'
import { useAdvancedMode } from '@/lib/advanced-mode-context'
import { formatOffset } from '@/lib/format'
import { tr } from '@/lib/i18n'
import { useSaveView } from '@/lib/use-save-view'
import { useWrite } from '@/lib/use-write'
import { PageBanner } from '@/components/page-banner'
import { WriteError } from '@/components/write-error'
import {
  CHEST_AREA,
  TOOLS_AREA,
  itemBoxSlotOffset,
  itemCountMax,
  itemNormalCountMax,
  itemOptionGroups,
  readItemBox,
  repairItemMarks,
  slotsMissingMark,
  writeItemBoxSlot,
  type ItemBoxArea,
} from '@/save/item-box'
import { ITEM_SLOT_BYTES } from '@/save/item-slot'

/** 手持ちの道具（0x5B40〜、10件） */
export function ToolsPage() {
  return (
    <ItemBoxPage
      area={TOOLS_AREA}
      title={tr({ ja: '道具', en: 'Items' })}
      // 個数は1枠にまとめて持てる最大数まで（ほとんどの道具は 1）
      description={tr({ ja: '持ち歩いている道具と個数を設定できます。', en: 'Set the items you carry and their quantities.' })}
      // [U] 2026-10-05 +0x04 が 0x06 でないと、売却一覧でゲームが落ちた
      missingMarkNote={tr({
        ja: 'このままだと、店で売却一覧を開くときにゲームが落ちます。',
        en: 'If left as is, the game crashes when you open the sell list at a shop.',
      })}
    />
  )
}

/** 箪笥の通常アイテム（0x58C0〜、80件） */
export function ChestPage() {
  return (
    <ItemBoxPage
      area={CHEST_AREA}
      title={tr({ ja: '箪笥', en: 'Chest' })}
      description={tr({ ja: '道場の箪笥に入っている道具と個数を設定できます。', en: 'Set the items in the dojo chest and their quantities.' })}
      // ゲームが書く枠の +0x04 が 0x06 なのは 🟢。手持ちで 0x06 でないと落ちたのは [U]
      missingMarkNote={tr({
        ja: '手持ちの道具では、このままだと店で売却一覧を開くときにゲームが落ちます。',
        en: 'For carried items, if left as is, the game crashes when you open the sell list at a shop.',
      })}
    />
  )
}

function ItemBoxPage({
  area,
  title,
  description,
  missingMarkNote,
}: {
  area: ItemBoxArea
  title: string
  description: string
  missingMarkNote: string
}) {
  const { write: update, tryWrite, error: repairError } = useWrite()
  const { advanced } = useAdvancedMode()
  const groups = useMemo(() => itemOptionGroups({ advanced }), [advanced])

  const read = useCallback(
    (bytes: Uint8Array) => ({ view: readItemBox(bytes, area, { advanced }), missingMark: slotsMissingMark(bytes, area) }),
    [area, advanced],
  )
  const { view: result, error: readError, problem } = useSaveView(read, { problem: (v) => v.view.problem })
  const view = result?.view ?? null
  const missingMark = result?.missingMark ?? []

  return (
    <div className="flex flex-col gap-4">
      <PageBanner error={readError} problem={problem} />

      {missingMark.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>{tr({ ja: '道具として扱えない状態の枠があります', en: 'Some slots are not in a usable item state' })}</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            <p>
              {tr({
                ja: `${missingMark.map((i) => `${i + 1}件目`).join('、')} は道具として扱えない状態です。${missingMarkNote} 修復すると、これらの枠を道具として扱える状態にします。`,
                en: `${missingMark.length === 1 ? 'Slot' : 'Slots'} ${missingMark.map((i) => i + 1).join(', ')} ${missingMark.length === 1 ? 'is' : 'are'} not in a usable item state. ${missingMarkNote} Repairing makes these slots usable as items.`,
              })}
            </p>
            <Button size="sm" variant="outline" disabled={problem !== null} onClick={() => {
              tryWrite((b) => repairItemMarks(b, area))
            }}>
              {tr({ ja: '修復', en: 'Repair' })}
            </Button>
            <WriteError error={repairError} />
          </AlertDescription>
        </Alert>
      )}

      <AnchoredCard
        anchor={ITEM_ANCHORS.items}
        title={title}
        extra={
          // チップ・木札は ❓ U-12
          <InfoTip offset={`${formatOffset(area.offset)}〜${formatOffset(area.offset + ITEM_SLOT_BYTES * area.slotCount - 1)}`}>
            {tr({
              ja: '上級者モードでは、種別が料理（料理屋の料理）・宿・なし（手に入る経路がない）のものも選べ、個数も最大数を超えて書けます。 '
                + 'チップ・木札は書くとゲーム内でセーブできなくなるため、どのモードでも選べません。 '
                + '会談の手紙・鉄・鍵は「重要品」の画面で扱います',
              en: 'In Advanced mode you can also choose meals (served at restaurants), inn rooms, and items that cannot be obtained, and write quantities over the maximum. '
                + 'Casino Chips and Wooden Tags cannot be chosen in any mode because the game can no longer save once they are written. '
                + 'The Meeting Invitation, metals, and keys are handled on the Key Items screen',
            })}
          </InfoTip>
        }
        description={description}
      >
        <CardContent className="flex flex-col divide-y">
          {Array.from({ length: area.slotCount }, (_, i) => {
            const slot = view?.slots[i] ?? null
            return (
              <ItemSlotRow
                key={i}
                index={i}
                offset={itemBoxSlotOffset(area, i)}
                slot={slot}
                groups={groups}
                noun={title}
                searchPlaceholder={tr({ ja: '道具を検索', en: 'Search items' })}
                countMaxFor={(id) => itemCountMax(area, id, { advanced })}
                normalCountMaxFor={(id) => itemNormalCountMax(area, id)}
                onChange={(id, count) => update((b) => writeItemBoxSlot(b, area, i, id, count, { advanced }))}
              />
            )
          })}
        </CardContent>
      </AnchoredCard>

      {/* 各枠の +0x00〜+0x03（ID・個数）を書き換える。空き枠にアイテムを入れるときは +0x04〜+0x07 に 06 00 00 00
          （+0x04 はアイテムの種類で、道具は 0x06 は 🟢）、「なし」にするときは 00 00 00 00 を書く。
          既にアイテムが入っている枠の +0x04〜+0x07 は変えない。❓ +0x05〜+0x07 の意味。
          箪笥に書いた値をゲームで読めるかは要ゲーム内確認 */}
      <p className="text-muted-foreground text-xs">
        {tr({
          ja: '空き枠にアイテムを入れると、道具として扱える枠にします。「なし」にすると枠を空にします。',
          en: 'Putting an item in an empty slot makes the slot usable as an item. Choosing "None" empties the slot.',
        })}
      </p>
    </div>
  )
}
