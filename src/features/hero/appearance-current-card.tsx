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
  heightWarning,
  SKIN_COLORS,
  readAppearanceCurrent,
  validateAppearanceCurrent,
  writeAppearanceCurrent,
  type AppearanceCurrentKey,
} from '@/save/appearance-current'

const selectRows = [
  { key: 'body', label: '体型', names: BODY_TYPES, hint: undefined },
  { key: 'skin', label: '肌色', names: SKIN_COLORS, hint: undefined },
] as const
const numberRows: { key: AppearanceCurrentKey; label: string; hint: string; advancedHint: string | undefined }[] = [
  { key: 'height', label: '身長（cm）', hint: '数値（小数可）', advancedHint: undefined },
  { key: 'related', label: '関連値（意味未確認）', hint: '観測した値：0・1・2。体型などとの関係は未確認（❓）', advancedHint: '0〜255' },
]

/** 体型・身長・肌色は ✅。関連値は ❓ として生の値を表示する。 */
export function AppearanceCurrentCard() {
  const { save, update } = useSave()
  const { advanced } = useAdvancedMode()
  const view = useMemo(() => save ? readAppearanceCurrent(save.working) : null, [save])
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          現在の見た目
          <CertaintyBadge mark="❓" text="関連値は意味未確認" />
        </CardTitle>
        <CardDescription>
          体型・身長・肌色の変更はゲーム内で確認済みです。関連値の意味は未確認です。
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
                warning={key === 'height' && field?.value != null ? heightWarning(field.value) : null}
                format={value => key === 'height' ? String(Number(value.toFixed(2))) : String(value)}
                parse={parse}
                apply={value => update(bytes => writeAppearanceCurrent(bytes, key, value, advanced))}
                inputMode={key === 'height' ? 'decimal' : 'numeric'}
                hint={<>{hint}{advanced && advancedHint && <><br />検証用範囲：{advancedHint}</>}</>}
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
