import { useMemo } from 'react'
import { CertaintyBadge } from '@/components/certainty-badge'
import { FieldRow, type ParseResult } from '@/components/field-row'
import { SelectRow } from '@/components/select-row'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAdvancedMode } from '@/lib/advanced-mode-context'
import { useSave } from '@/lib/save-context'
import {
  APPEARANCE_CURRENT_NOTES,
  APPEARANCE_CURRENT_OFFSETS,
  BODY_TYPES,
  HEIGHT_NORMAL_RANGE,
  SKIN_COLORS,
  readAppearanceCurrent,
  validateAppearanceCurrent,
  writeAppearanceCurrent,
  type AppearanceCurrentKey,
} from '@/save/appearance-current'

const selectRows = [
  { key: 'body', label: '体型', names: BODY_TYPES, hint: undefined },
  { key: 'skin', label: '肌色', names: SKIN_COLORS, hint: '色黒は黒人の容姿を選んだときに入る値。書き込みの反映は要ゲーム内確認（🔶 U-18）' },
] as const
const numberRows: { key: AppearanceCurrentKey; label: string; hint: string; advancedHint: string }[] = [
  { key: 'height', label: '身長（float32）', hint: `${HEIGHT_NORMAL_RANGE.join('〜')}の数値`, advancedHint: '100〜250（暫定）' },
  { key: 'related', label: '関連値（意味未確認）', hint: '観測した値：0・1・2。体型などとの関係は未確認（❓）', advancedHint: '0〜255' },
]

/** 体型・身長・肌色の値は ✅。肌色の書き込み反映と関連値は 🔶❓ U-18。 */
export function AppearanceCurrentCard() {
  const { save, update } = useSave()
  const { advanced } = useAdvancedMode()
  const view = useMemo(() => save ? readAppearanceCurrent(save.working) : null, [save])
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          現在の見た目
          <CertaintyBadge mark="🔶" text="U-18 肌色の反映・関連値は確認中" />
        </CardTitle>
        <CardDescription>
          体型・身長の変更はゲーム内で確認済みです。肌色の書き込みの反映と関連値は確認中です。
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {selectRows.map(({ key, label, names, hint }) => {
          const field = view?.[key]
          return (
            <div key={`${save?.loadId ?? 0}-${key}`} className="flex flex-col gap-1">
              <SelectRow
                label={label}
                offset={APPEARANCE_CURRENT_OFFSETS[key]}
                value={field?.value === null || field?.value === undefined ? null : String(field.value)}
                currentLabel={field?.value === null || field?.value === undefined ? undefined : `不明な値 ${field.value}`}
                options={names.map((name, i) => ({ value: String(i), label: `${name}（${i}）` }))}
                problem={field?.problem ?? null}
                hint={hint}
                note={APPEARANCE_CURRENT_NOTES[key]}
                onChange={v => update(bytes => writeAppearanceCurrent(bytes, key, Number(v), advanced))}
              />
              {field?.offset !== null && field?.offset !== undefined && <p className="text-muted-foreground font-mono text-xs">生バイト：{field.raw}</p>}
            </div>
          )
        })}
        {numberRows.map(({ key, label, hint, advancedHint }) => {
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
                format={value => key === 'height' ? String(Number(value.toFixed(2))) : String(value)}
                parse={parse}
                apply={value => update(bytes => writeAppearanceCurrent(bytes, key, value, advanced))}
                inputMode={key === 'height' ? 'decimal' : 'numeric'}
                hint={<>{hint}{advanced && <><br />検証用範囲：{advancedHint}</>}</>}
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
