// 🟢 連続なりわいの ID・受注の順・フラグ。chunks/occupation「受注で書かれる値」。
// ✅ 野戸仏の171、汁部の209は受注の差分でも確認。
export type SeriesGroupKey = 'police' | 'gangster' | 'thief' | 'homeless';

type Series = {
  flag: number;
  ids: readonly number[];
  writesUntil: number;
  /** 順番に依頼される8件とは別に、同じまとまりにある仕事 */
  extraJobs: readonly number[];
  /** 前の仕事を終えたその場で受ける仕事と、そのときのフラグ */
  followups: readonly { id: number; value: number }[];
};

export const OCCUPATION_SERIES: Readonly<Record<SeriesGroupKey, Series>> = {
  police: { flag: 4, ids: [171, 172, 173, 174, 175, 176, 177, 178], writesUntil: 8, extraJobs: [], followups: [] },
  gangster: { flag: 5, ids: [179, 180, 181, 182, 183, 184, 185, 186], writesUntil: 7, extraJobs: [], followups: [] },
  thief: { flag: 6, ids: [187, 188, 189, 190, 191, 192, 193, 194], writesUntil: 8, extraJobs: [], followups: [] },
  homeless: { flag: 7, ids: [195, 196, 197, 199, 201, 202, 204, 205], writesUntil: 7, extraJobs: [198, 200], followups: [{ id: 203, value: 61 }, { id: 206, value: 80 }] },
};

export function seriesJobs(key: SeriesGroupKey): number[] {
  const s = OCCUPATION_SERIES[key];
  return [...s.ids, ...s.extraJobs, ...s.followups.map(f => f.id)].sort((a, b) => a - b);
}

export function seriesRange(key: SeriesGroupKey): { from: number; to: number } {
  const ids = seriesJobs(key);
  return { from: ids[0], to: ids[ids.length - 1] };
}

/** 🟢 汁部の依頼順と、知り合った印・各仕事の結果のフラグ */
export const SHIRUBE_SERIES = { flag: 27, ids: [209, 210, 211, 212], resultFlags: [28, 29, 30, 31] } as const;
