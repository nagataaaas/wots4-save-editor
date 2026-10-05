import { useMemo } from 'react'
import { InfoTip } from '@/components/info-tip'
import { ItemSlotRow } from '@/components/item-slot-row'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatOffset } from '@/lib/format'
import { useSave } from '@/lib/save-context'
import {
  TOOL_OPTION_GROUPS,
  TOOL_SLOT_COUNT,
  TOOLS_OFFSET,
  TOOL_MARK,
  readTools,
  repairToolMarks,
  slotsMissingMark,
  toolSlotOffset,
  writeTool,
  type ToolsView,
} from '@/save/tools'

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e))

export function ToolsPage() {
  const { save, update } = useSave()

  const result = useMemo((): { view: ToolsView; missingMark: number[] } | { error: string } | null => {
    if (!save) return null
    try {
      return { view: readTools(save.working), missingMark: slotsMissingMark(save.working) }
    } catch (e) {
      return { error: errorMessage(e) }
    }
  }, [save])

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
      {!view && (
        <Alert>
          <AlertTitle>セーブファイルが読み込まれていません</AlertTitle>
          <AlertDescription>サイドバーの「ファイルを開く」から読み込むと、下の項目を編集できます。</AlertDescription>
        </Alert>
      )}

      {view?.layoutProblem && (
        <Alert variant="destructive">
          <AlertTitle>読み取り専用</AlertTitle>
          <AlertDescription>{view.layoutProblem}</AlertDescription>
        </Alert>
      )}

      {missingMark.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>売却一覧でゲームが落ちる枠があります</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            <p>
              {missingMark.map((i) => `${i + 1}件目`).join('、')} は +0x04 が 0x{TOOL_MARK.toString(16).padStart(2, '0')}{' '}
              ではありません。このままだと、店で売却一覧を開くときにゲームが落ちます（[U] 2026-10-05）。
              修復すると、これらの枠の +0x04〜+0x07 に 06 00 00 00 を書きます。
            </p>
            <Button size="sm" variant="outline" onClick={() => update((b) => void repairToolMarks(b))}>
              修復
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            道具
            <InfoTip offset={`${formatOffset(TOOLS_OFFSET)} から 8 B × ${TOOL_SLOT_COUNT} 件`}>
              「🔶 手持ちでは未確認」の道具は、重要品の枠で名前だけ確認した ID です（U-14）
            </InfoTip>
          </CardTitle>
          <CardDescription>手持ちの道具。各枠の道具を設定できます（1枠に1個）。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y">
          {Array.from({ length: TOOL_SLOT_COUNT }, (_, i) => {
            const slot = view?.slots[i] ?? null
            return (
              <ItemSlotRow
                // 読み込み直しと ID の変更で、入力途中の値を捨てる
                key={`${k}-${i}-${slot?.id ?? ''}`}
                index={i}
                offset={toolSlotOffset(i)}
                slot={slot}
                groups={TOOL_OPTION_GROUPS}
                noun="道具"
                showCount={false}
                onChange={(id) => update((b) => writeTool(b, i, id))}
              />
            )
          })}
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">
        各枠の +0x00〜+0x03（ID・個数）を書き換えます。ゲームは道具を枠にまとめない（同じ道具も1枠に1個ずつ入る 🔶）ため、
        個数は常に 1 を書きます。+0x04〜+0x07 は意味が分かっていません（❓）が、
        空き枠に道具を入れるときは 06 00 00 00 を、「なし」にするときは 00 00 00 00 を書きます（ゲームが書く値に合わせるため [U]）。
        既に道具が入っている枠の +0x04〜+0x07 は変えません。
      </p>
    </div>
  )
}
