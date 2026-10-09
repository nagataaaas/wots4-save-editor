import { CHARM_SLOTS, validateCharms } from "@/save/weapon";

export type CharmSelection = { id: number | null; count: number };

/** 通常の3個は項目×1に展開する。上級者設定の合計4以上は種類ごとに表示する。 */
export function charmSelections(values: readonly (number | null)[]): CharmSelection[] {
  const ids = values.filter((id): id is number => id !== null);
  const rows: CharmSelection[] = [];
  if (ids.length <= CHARM_SLOTS) {
    rows.push(...ids.map((id) => ({ id, count: 1 })));
  } else {
    for (const id of ids) {
      const row = rows.find((r) => r.id === id);
      if (row) row.count++;
      else rows.push({ id, count: 1 });
    }
  }
  while (rows.length < CHARM_SLOTS) rows.push({ id: null, count: 1 });
  return rows;
}

/** 選択項目を個数分に展開する。保存時に同じIDを合算するため、合算後も検証する。 */
export function expandCharmSelections(rows: readonly CharmSelection[], advanced: boolean): (number | null)[] {
  if (rows.length > CHARM_SLOTS) throw new RangeError("魅力項目は3つまでです");
  const values: (number | null)[] = [];
  for (const { id, count } of rows) {
    if (!Number.isInteger(count) || count < 1 || count > 3) throw new RangeError("個数は1〜3の整数で入力してください");
    if (!advanced && id !== null && count !== 1) throw new RangeError("個数を変更するには上級者モードをオンにしてください");
    if (id === null) values.push(null);
    else for (let i = 0; i < count; i++) values.push(id);
  }
  const error = validateCharms(values, { advanced });
  if (error) throw new RangeError(error);
  return values;
}

/** 保存後の合算順序に合わせた比較キー。空き枠の数による違いは無視する。 */
export function charmSelectionKey(values: readonly (number | null)[]): string {
  const counts = new Map<number, number>();
  for (const id of values) if (id !== null) counts.set(id, (counts.get(id) ?? 0) + 1);
  return JSON.stringify([...counts]);
}
