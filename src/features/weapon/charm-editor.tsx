import { useContext, useState } from "react";
import { SaveContext } from "@/lib/save-context";
import { SelectRow } from "@/components/select-row";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { useWrite } from "@/lib/use-write";
import { formatWarnings } from "@/lib/format";
import { tr } from "@/lib/i18n";
import { CHARMS, writeWeaponCharms } from "@/save/weapon";
import type { WeaponFieldProps } from "./weapon-fields";
import { charmIcon } from "./effect-icons";
import {
  charmSelectionKey,
  charmSelections,
  expandCharmSelections,
  type CharmSelection,
} from "./charm-selection";
import { NONE, weaponFieldOffset, weaponRecordOffset } from "./weapon-ui";

/** 選択肢（描画のたびに今の言語で作る） */
const charmOptions = () => [
  { value: NONE, label: tr({ ja: "なし", en: "None" }) },
  ...CHARMS.map((c) => ({ value: String(c.id), label: c.label, icon: charmIcon(c.id) })),
];

/** 魅力の3枠。offset はレコードの先頭（省くと丸ハテナに位置を出さない。WeaponFieldProps と同じ） */
export function CharmEditor({ weapon, offset }: WeaponFieldProps) {
  const { advanced } = useAdvancedMode();
  const { write } = useWrite();
  const field = weapon?.charms;
  const loadId = useContext(SaveContext)?.save?.loadId;
  const source = `${loadId}:${offset}:${charmSelectionKey(field?.value ?? [])}`;
  const [state, setState] = useState(() => ({ source, rows: charmSelections(field?.value ?? []) }));
  // 保存時の合算で表示項目を潰さない。外部から値が変わったときだけ同期する。
  if (state.source !== source) {
    setState({ source, rows: charmSelections(field?.value ?? []) });
  }
  // source が変わる描画は React が上の更新でやり直すため、二重の同期は不要。
  const rows = state.rows;

  function change(slot: number, patch: Partial<CharmSelection>) {
    const next = rows.map((row, i) => (i === slot ? { ...row, ...patch } : row));
    const values = expandCharmSelections(next, advanced);
    write((bytes) => writeWeaponCharms(bytes, weaponRecordOffset(offset), values, { advanced }));
    setState({ source: `${loadId}:${offset}:${charmSelectionKey(values)}`, rows: next });
  }

  const advancedOnly = !advanced && rows.some((row) => row.id !== null && row.count !== 1);
  const options = charmOptions();
  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-4 sm:grid-cols-3">
        {rows.map((row, slot) => (
          <div key={slot} className="flex flex-col gap-2">
            <SelectRow
              label={tr({ ja: `魅力 ${slot + 1}`, en: `Charm ${slot + 1}` })}
              offset={weaponFieldOffset(offset, "charms")}
              value={weapon ? (row.id === null ? NONE : String(row.id)) : null}
              options={options}
              problem={field?.problem ?? null}
              disabled={advancedOnly}
              warning={formatWarnings(field?.warnings)}
              badges={
                !advanced ? (
                  <span className="text-muted-foreground text-xs">×{row.count}</span>
                ) : undefined
              }
              onChange={(value) =>
                change(slot, {
                  id: value === NONE ? null : Number(value),
                  ...(value === NONE ? { count: 1 } : {}),
                })
              }
            />
            {advanced && (
              <SelectRow
                label={tr({ ja: `魅力 ${slot + 1} の個数`, en: `Charm ${slot + 1} count` })}
                offset={weaponFieldOffset(offset, "charms")}
                value={weapon ? String(row.count) : null}
                options={[1, 2, 3].map((count) => ({ value: String(count), label: `×${count}` }))}
                problem={field?.problem ?? null}
                disabled={row.id === null}
                hint={tr({ ja: "×1〜3（同じ魅力は合算して最大3）", en: "×1–3 (up to 3 of the same charm in total)" })}
                onChange={(count) => change(slot, { count: Number(count) })}
              />
            )}
          </div>
        ))}
      </div>
      {advancedOnly && (
        <p className="text-muted-foreground text-xs">
          {tr({
            ja: "個数を保持しています。編集するには上級者モードをオンにしてください。",
            en: "The charm counts are kept as they are. Turn on Advanced mode to edit them.",
          })}
        </p>
      )}
      {(advanced || (field?.value.filter((id) => id !== null).length ?? 0) > 3) && (
        <p className="text-destructive text-xs" role="note">
          {tr({
            ja: "注意：魅力の合計4以上は、帯刀済みの武器で各魅力の効果が反映されますが、武器袋・武器箪笥での選択や帯刀への変更時にクラッシュする可能性があります。元のセーブをバックアップして使用してください。",
            en: "Caution: with 4 or more charms in total, each charm works on an equipped weapon, but the game may crash when you select the weapon in the weapon sack or weapon chest or equip it. Back up your original save before using this.",
          })}
          {advanced &&
            tr({
              ja: " 同じ魅力を合算して4以上にする設定は拒否します。",
              en: " Setting 4 or more of the same charm in total is refused.",
            })}
        </p>
      )}
    </div>
  );
}
