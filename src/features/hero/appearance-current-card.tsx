import { useMemo } from 'react'
import { CertaintyBadge } from '@/components/certainty-badge'
import { FieldRow, type ParseResult } from '@/components/field-row'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAdvancedMode } from '@/lib/advanced-mode-context'
import { useSave } from '@/lib/save-context'
import {
  APPEARANCE_CURRENT_NOTES,
  APPEARANCE_CURRENT_OFFSETS,
  readAppearanceCurrent,
  validateAppearanceCurrent,
  writeAppearanceCurrent,
  type AppearanceCurrentKey,
} from '@/save/appearance-current'

const rows: { key: AppearanceCurrentKey; label: string; hint: string }[] = [
  { key: 'body', label: '体型（生の値）', hint: '✅ 0＝ふつう、1＝細め、2＝太め' },
  { key: 'height', label: '身長（float32）', hint: '✅ 144・160・176の変更を確認済み。175も入力可（性別変更後の観測値）' },
  { key: 'skin', label: '肌色の候補（生の値）', hint: '0＝ふつう、1＝褐色、3＝白（🔶）' },
  { key: 'related', label: '関連値（意味未確認）', hint: '観測した値：0・1・2。体型などとの関係は未確認（❓）' },
]

/** 体型・身長は ✅。肌色・関連値は 🔶❓ U-18 として生の値と候補を表示する。 */
export function AppearanceCurrentCard() {
  const { save, update } = useSave()
  const { advanced } = useAdvancedMode()
  const view = useMemo(() => save ? readAppearanceCurrent(save.working) : null, [save])
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          現在の見た目
          <CertaintyBadge mark="🔶" text="U-18 肌色・関連値は確認中" />
        </CardTitle>
        <CardDescription>
          体型・身長の変更はゲーム内で確認済みです。肌色と関連値は1項目ずつ編集して確かめられます。
          関連値は個別に編集できます。通常モードは観測した値、上級者モードは追加の検証用の値を入力できます。
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {rows.map(({ key, label, hint }) => {
          const field = view?.[key]
          const parse = (input: string): ParseResult<number> => {
            const text = input.trim()
            if (!/^\d+(\.\d+)?$/.test(text)) return { ok: false, error: '数値を入力してください' }
            const value = Number(text)
            const error = validateAppearanceCurrent(key, value, advanced)
            return error ? { ok: false, error } : { ok: true, value }
          }
          return (
            <div key={`${save?.loadId ?? 0}-${key}`} className="flex flex-col gap-1">
              <FieldRow
                label={label}
                offset={APPEARANCE_CURRENT_OFFSETS[key]}
                value={field?.value ?? null}
                problem={field?.problem ?? null}
                format={String}
                parse={parse}
                apply={value => update(bytes => writeAppearanceCurrent(bytes, key, value, advanced))}
                inputMode={key === 'height' ? 'decimal' : 'numeric'}
                hint={<>{hint}{advanced && <><br />検証用範囲：{key === 'height' ? '100〜250（暫定）' : '0〜255'}</>}</>}
                note={APPEARANCE_CURRENT_NOTES[key]}
              />
              {field?.offset !== null && field?.offset !== undefined && <p className="text-muted-foreground font-mono text-xs">生バイト：{field.raw}</p>}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
