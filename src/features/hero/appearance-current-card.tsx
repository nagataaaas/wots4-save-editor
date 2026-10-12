import { useMemo } from "react";
import { FieldRow, type ParseResult } from "@/components/field-row";
import { SelectRow } from "@/components/select-row";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScopeAnchorLink } from "@/components/anchor-link";
import { AnchoredCard } from "@/components/anchored-card";
import { HERO_APPEARANCE_ANCHORS } from "./anchors";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { useSave } from "@/lib/save-context";
import {
  APPEARANCE_CURRENT_NOTES,
  APPEARANCE_CURRENT_OFFSETS,
  BODY_TYPES,
  HEIGHT_CHOICES,
  heightWarning,
  SKIN_COLORS,
  readAppearanceCurrent,
  validateAppearanceCurrent,
  writeAppearanceCurrent,
  type AppearanceCurrentKey,
} from "@/save/appearance-current";

const selectRows = [
  { key: "body", label: "体型", names: BODY_TYPES, hint: undefined },
  { key: "skin", label: "肌色", names: SKIN_COLORS, hint: undefined },
  {
    key: "heightChoice",
    label: "身長の選択肢",
    names: HEIGHT_CHOICES,
    hint: "容姿設定を開いたときの表示。身長（cm）は変わらない",
  },
] as const;
const numberRows: {
  key: AppearanceCurrentKey;
  label: string;
  hint: string;
  advancedHint: string | undefined;
}[] = [{ key: "height", label: "身長（cm）", hint: "数値（小数可）", advancedHint: undefined }];

/** 体型・身長・肌色は ✅、身長の選択肢は 🟢。 */
export function AppearanceCurrentCard() {
  const { save, update } = useSave();
  const { advanced } = useAdvancedMode();
  const view = useMemo(() => (save ? readAppearanceCurrent(save.working) : null), [save]);
  return (
    <AnchoredCard anchor={HERO_APPEARANCE_ANCHORS.current}>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2"><ScopeAnchorLink />体</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {selectRows.map(({ key, label, names, hint }) => {
          const field = view?.[key];
          return (
            <div key={`${save?.loadId ?? 0}-${key}`} className="flex flex-col gap-1">
              <SelectRow
                label={label}
                offset={APPEARANCE_CURRENT_OFFSETS[key]}
                value={
                  field?.value === null || field?.value === undefined ? null : String(field.value)
                }
                currentLabel={
                  field?.value === null || field?.value === undefined
                    ? undefined
                    : "不明"
                }
                options={names.map((name, i) => ({ value: String(i), label: name }))}
                problem={field?.problem ?? null}
                hint={hint}
                note={APPEARANCE_CURRENT_NOTES[key]}
                onChange={(v) =>
                  update((bytes) => writeAppearanceCurrent(bytes, key, Number(v), advanced))
                }
              />
            </div>
          );
        })}
        {numberRows.map(({ key, label, hint, advancedHint }) => {
          const field = view?.[key];
          const parse = (input: string): ParseResult<number> => {
            const text = input.trim();
            if (!/^\d+(\.\d+)?$/.test(text)) return { ok: false, error: "数値を入力してください" };
            const value = Number(text);
            const error = validateAppearanceCurrent(key, value, advanced);
            return error ? { ok: false, error } : { ok: true, value };
          };
          return (
            <div key={`${save?.loadId ?? 0}-${key}`} className="flex flex-col gap-1">
              <FieldRow
                label={label}
                offset={APPEARANCE_CURRENT_OFFSETS[key]}
                value={field?.value ?? null}
                problem={field?.problem ?? null}
                warning={
                  key === "height" && field?.value != null ? heightWarning(field.value) : null
                }
                format={(value) =>
                  key === "height" ? String(Number(value.toFixed(2))) : String(value)
                }
                parse={parse}
                apply={(value) =>
                  update((bytes) => writeAppearanceCurrent(bytes, key, value, advanced))
                }
                inputMode={key === "height" ? "decimal" : "numeric"}
                hint={
                  <>
                    {hint}
                    {advanced && advancedHint && (
                      <>
                        <br />
                        検証用範囲：{advancedHint}
                      </>
                    )}
                  </>
                }
                note={APPEARANCE_CURRENT_NOTES[key]}
              />
            </div>
          );
        })}
      </CardContent>
    </AnchoredCard>
  );
}
