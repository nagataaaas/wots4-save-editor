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
import { tr } from "@/lib/i18n";
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
  { key: "body", label: { ja: "体型", en: "Figure" }, names: BODY_TYPES, hint: undefined },
  { key: "skin", label: { ja: "肌色", en: "Skin color" }, names: SKIN_COLORS, hint: undefined },
  {
    key: "heightChoice",
    label: { ja: "身長の選択肢", en: "Height option" },
    names: HEIGHT_CHOICES,
    hint: {
      ja: "容姿設定を開いたときの表示。身長（cm）は変わらない",
      en: "What is shown when the Appearance settings open. Does not change the height (cm)",
    },
  },
] as const;

/** 体型・身長・肌色は ✅、身長の選択肢は 🟢。 */
export function AppearanceCurrentCard() {
  const { write: update } = useWrite();
  const { advanced } = useAdvancedMode();
  const { view, error } = useSaveView(readAppearanceCurrent);
  const height = view?.height;
  return (
    <AnchoredCard anchor={HERO_APPEARANCE_ANCHORS.current} title={tr({ ja: "体", en: "Body" })}>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <PageBanner error={error} className="sm:col-span-2" />
        {selectRows.map(({ key, label, names, hint }) => {
          const field = view?.[key];
          return (
            <div key={key} className="flex flex-col gap-1">
              <SelectRow
                label={tr(label)}
                offset={APPEARANCE_CURRENT_OFFSETS[key]}
                value={field ? String(field.value) : null}
                currentLabel={field ? tr({ ja: "不明", en: "Unknown" }) : undefined}
                options={names.map((name, i) => ({ value: String(i), label: tr(name) }))}
                problem={field?.problem ?? null}
                hint={hint && tr(hint)}
                note={tr(APPEARANCE_CURRENT_NOTES[key])}
                onChange={(v) =>
                  update((bytes) => writeAppearanceCurrent(bytes, key, Number(v), { advanced }))
                }
              />
            </div>
          );
        })}
        <div className="flex flex-col gap-1">
          <FieldRow
            label={tr({ ja: "身長（cm）", en: "Height (cm)" })}
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
            hint={tr({ ja: "数値（小数可）", en: "Number (decimals allowed)" })}
            note={tr(APPEARANCE_CURRENT_NOTES.height)}
          />
        </div>
      </CardContent>
    </AnchoredCard>
  );
}
