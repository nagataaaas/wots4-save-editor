import { useMemo } from 'react'
import { InfoTip } from '@/components/info-tip'
import { ItemSlotRow } from '@/components/item-slot-row'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScopeAnchorLink } from '@/components/anchor-link'
import { AnchoredCard } from '@/components/anchored-card'
import { ITEM_ANCHORS } from './anchors'
import { useAdvancedMode } from '@/lib/advanced-mode-context'
import { formatOffset } from '@/lib/format'
import { useSave } from '@/lib/save-context'
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
  type ItemBoxView,
} from '@/save/item-box'
import { ITEM_SLOT_BYTES } from '@/save/item-slot'

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e))

/** 手持ちの道具（0x5B40〜、10件） */
export function ToolsPage() {
  return (
    <ItemBoxPage
      area={TOOLS_AREA}
      title="道具"
      // 個数は1枠にまとめて持てる最大数まで（ほとんどの道具は 1）
      description="持ち歩いている道具と個数を設定できます。"
      // [U] 2026-10-05 +0x04 が 0x06 でないと、売却一覧でゲームが落ちた
      missingMarkNote="このままだと、店で売却一覧を開くときにゲームが落ちます。"
    />
  )
}

/** 箪笥の通常アイテム（0x58C0〜、80件） */
export function ChestPage() {
  return (
    <ItemBoxPage
      area={CHEST_AREA}
      title="箪笥"
      description="道場の箪笥に入っている道具と個数を設定できます。"
      // ゲームが書く枠の +0x04 が 0x06 なのは 🟢。手持ちで 0x06 でないと落ちたのは [U]
      missingMarkNote="手持ちの道具では、このままだと店で売却一覧を開くときにゲームが落ちます。"
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
  const { save, update } = useSave()
  const { advanced } = useAdvancedMode()
  const groups = useMemo(() => itemOptionGroups({ advanced }), [advanced])

  const result = useMemo((): { view: ItemBoxView; missingMark: number[] } | { error: string } | null => {
    if (!save) return null
    try {
      return { view: readItemBox(save.working, area, { advanced }), missingMark: slotsMissingMark(save.working, area) }
    } catch (e) {
      return { error: errorMessage(e) }
    }
  }, [save, area, advanced])

  if (result && 'error' in result) {
    return (
      <Alert variant="destructive">
        <AlertTitle>読み込めません</AlertTitle>
        <AlertDescription>{result.error}</AlertDescription>
      </Alert>
    )
  }

  const view = result?.view ?? null
  const missingMark = result?.missingMark ?? []
  const k = save?.loadId ?? 0

  return (
    <div className="flex flex-col gap-4">
      {view?.layoutProblem && (
        <Alert variant="destructive">
          <AlertTitle>読み取り専用</AlertTitle>
          <AlertDescription>{view.layoutProblem}</AlertDescription>
        </Alert>
      )}

      {missingMark.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>道具として扱えない状態の枠があります</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            <p>
              {missingMark.map((i) => `${i + 1}件目`).join('、')} は道具として扱えない状態です。{missingMarkNote}
              修復すると、これらの枠を道具として扱える状態にします。
            </p>
            <Button size="sm" variant="outline" onClick={() => update((b) => void repairItemMarks(b, area))}>
              修復
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <AnchoredCard anchor={ITEM_ANCHORS.items} searchLabel={title}>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <ScopeAnchorLink />
            {title}
            {/* チップ・木札は ❓ U-12 */}
            <InfoTip offset={`${formatOffset(area.offset)}〜${formatOffset(area.offset + ITEM_SLOT_BYTES * area.slotCount - 1)}`}>
              上級者モードでは、種別が料理（料理屋の料理）・宿・なし（手に入る経路がない）のものも選べ、個数も最大数を超えて書けます。
              チップ・木札は書くとゲーム内でセーブできなくなるため、どのモードでも選べません。
              会談の手紙・鉄・鍵は「重要品」の画面で扱います
            </InfoTip>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y">
          {Array.from({ length: area.slotCount }, (_, i) => {
            const slot = view?.slots[i] ?? null
            return (
              <ItemSlotRow
                // 読み込み直しと ID の変更で、入力途中の値を捨てる
                key={`${k}-${i}-${slot?.id ?? ''}-${advanced}`}
                index={i}
                offset={itemBoxSlotOffset(area, i)}
                slot={slot}
                groups={groups}
                noun={title}
                searchPlaceholder="道具を検索"
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
        空き枠にアイテムを入れると、道具として扱える枠にします。「なし」にすると枠を空にします。
      </p>
    </div>
  )
}
