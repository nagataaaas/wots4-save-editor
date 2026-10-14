import { useContext, useState } from "react";
import { SaveContext } from "@/lib/save-context";
import { SelectRow } from "@/components/select-row";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { useWrite } from "@/lib/use-write";
import { formatWarnings } from "@/lib/format";
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

const OPTIONS = [
  { value: NONE, label: "なし" },
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
  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-4 sm:grid-cols-3">
        {rows.map((row, slot) => (
          <div key={slot} className="flex flex-col gap-2">
            <SelectRow
              label={`魅力 ${slot + 1}`}
              offset={weaponFieldOffset(offset, "charms")}
              value={weapon ? (row.id === null ? NONE : String(row.id)) : null}
              options={OPTIONS}
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
                label={`魅力 ${slot + 1} の個数`}
                offset={weaponFieldOffset(offset, "charms")}
                value={weapon ? String(row.count) : null}
                options={[1, 2, 3].map((count) => ({ value: String(count), label: `×${count}` }))}
                problem={field?.problem ?? null}
                disabled={row.id === null}
                hint="×1〜3（同じ魅力は合算して最大3）"
                onChange={(count) => change(slot, { count: Number(count) })}
              />
            )}
          </div>
        ))}
      </div>
      {advancedOnly && (
        <p className="text-muted-foreground text-xs">
          個数を保持しています。編集するには上級者モードをオンにしてください。
        </p>
      )}
      {(advanced || (field?.value.filter((id) => id !== null).length ?? 0) > 3) && (
        <p className="text-destructive text-xs" role="note">
          注意：魅力の合計4以上は、帯刀済みの武器で各魅力の効果が反映されますが、武器袋・武器箪笥での選択や帯刀への変更時にクラッシュする可能性があります。元のセーブをバックアップして使用してください。
          {advanced && " 同じ魅力を合算して4以上にする設定は拒否します。"}
        </p>
      )}
    </div>
  );
}
