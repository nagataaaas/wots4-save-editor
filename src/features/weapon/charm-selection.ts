import { tr } from "@/lib/i18n";
import { CHARM_SLOTS, countCharms, validateCharms } from "@/save/weapon";

export type CharmSelection = { id: number | null; count: number };

/** 通常の3個は項目×1に展開する。上級者設定の合計4以上は種類ごとに表示する。 */
export function charmSelections(values: readonly (number | null)[]): CharmSelection[] {
  const ids = values.filter((id): id is number => id !== null);
  const rows: CharmSelection[] =
    ids.length <= CHARM_SLOTS ? ids.map((id) => ({ id, count: 1 })) : countCharms(ids);
  while (rows.length < CHARM_SLOTS) rows.push({ id: null, count: 1 });
  return rows;
}

/** 選択項目を個数分に展開する。保存時に同じIDを合算するため、合算後も検証する。 */
export function expandCharmSelections(rows: readonly CharmSelection[], advanced: boolean): (number | null)[] {
  if (rows.length > CHARM_SLOTS) throw new RangeError(tr({ ja: "魅力項目は3つまでです", en: "Up to 3 charm slots." }));
  const values: (number | null)[] = [];
  for (const { id, count } of rows) {
    if (!Number.isInteger(count) || count < 1 || count > 3)
      throw new RangeError(tr({ ja: "個数は1〜3の整数で入力してください", en: "Enter a whole number from 1 to 3 for the count." }));
    if (!advanced && id !== null && count !== 1)
      throw new RangeError(
        tr({ ja: "個数を変更するには上級者モードをオンにしてください", en: "Turn on Advanced mode to change the count." }),
      );
    if (id === null) values.push(null);
    else for (let i = 0; i < count; i++) values.push(id);
  }
  const error = validateCharms(values, { advanced });
  if (error) throw new RangeError(error);
  return values;
}

/** 保存後の合算順序に合わせた比較キー。空き枠の数による違いは無視する。 */
export function charmSelectionKey(values: readonly (number | null)[]): string {
  return JSON.stringify(countCharms(values).map(({ id, count }) => [id, count]));
}
