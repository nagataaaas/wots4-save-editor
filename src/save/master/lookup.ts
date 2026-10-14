// 生成した表（dataset/*.ts）を数値の ID で引く。
// 表は id_dec をキーにした `as const` のオブジェクトなので、`TABLE[id as keyof typeof TABLE]` と書かずにすむようにする。

/** 表の行の型 */
export type DatasetRow<T> = T[keyof T];

/** 表から ID の行を引く。表にない ID（整数でない値・負の値を含む）は undefined */
export function lookup<T extends Readonly<Record<number, unknown>>>(table: T, id: number): DatasetRow<T> | undefined {
  return Object.hasOwn(table, id) ? (table as Readonly<Record<number, DatasetRow<T>>>)[id] : undefined;
}
