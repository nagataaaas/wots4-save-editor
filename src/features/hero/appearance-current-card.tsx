import { FieldRow } from "@/components/field-row";
import { SelectRow } from "@/components/select-row";
import { CardContent } from "@/components/ui/card";
import { AnchoredCard } from "@/components/anchored-card";
import { HERO_APPEARANCE_ANCHORS } from "./anchors";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { parseDecimal } from "@/lib/parse";
import { useSaveView } from "@/lib/use-save-view";
import { useWrite } from "@/lib/use-write";
import { PageBanner } from "@/components/page-banner";
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

/** 体型・身長・肌色は ✅、身長の選択肢は 🟢。 */
export function AppearanceCurrentCard() {
  const { write: update } = useWrite();
  const { advanced } = useAdvancedMode();
  const { view, error } = useSaveView(readAppearanceCurrent);
  const height = view?.height;
  return (
    <AnchoredCard anchor={HERO_APPEARANCE_ANCHORS.current} title="体">
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <PageBanner error={error} className="sm:col-span-2" />
        {selectRows.map(({ key, label, names, hint }) => {
          const field = view?.[key];
          return (
            <div key={key} className="flex flex-col gap-1">
              <SelectRow
                label={label}
                offset={APPEARANCE_CURRENT_OFFSETS[key]}
                value={field ? String(field.value) : null}
                currentLabel={field ? "不明" : undefined}
                options={names.map((name, i) => ({ value: String(i), label: name }))}
                problem={field?.problem ?? null}
                hint={hint}
                note={APPEARANCE_CURRENT_NOTES[key]}
                onChange={(v) =>
                  update((bytes) => writeAppearanceCurrent(bytes, key, Number(v), { advanced }))
                }
              />
            </div>
          );
        })}
        <div className="flex flex-col gap-1">
          <FieldRow
            label="身長（cm）"
            offset={APPEARANCE_CURRENT_OFFSETS.height}
            value={height?.value ?? null}
            problem={height?.problem ?? null}
            warning={height ? heightWarning(height.value) : null}
            format={(value) => String(Number(value.toFixed(2)))}
            parse={(input) =>
              parseDecimal(input, (value) => validateAppearanceCurrent("height", value, { advanced }))
            }
            apply={(value) =>
              update((bytes) => writeAppearanceCurrent(bytes, "height", value, { advanced }))
            }
            inputMode="decimal"
            hint="数値（小数可）"
            note={APPEARANCE_CURRENT_NOTES.height}
          />
        </div>
      </CardContent>
    </AnchoredCard>
  );
}
