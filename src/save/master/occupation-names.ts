// なりわいのマスターデータ。docs/save_format/datatable/occupation/occupation.csv をビルド時に読み込む（表を二重に持たない）。
//
// 🟢 ID 3〜212 のうち170件。ID がそのままセーブの状態の表の添字（chunks/occupation）。
// ✅ 209〜212 は受注・クリアの差分で添字と受注中の ID が一致した。
// - client：依頼主。組合なりわいは「同心 野戸仏新太郎」のように名前つき
// - type：討伐・破壊・配達・伝言・説得・盗み など
// - alignment：善良・悪質・空（ふつう）
// - reward・bonus：成功報酬・追加報酬（文）
// - deadlineDays：期限（日）。空は期限なし（null）
import occupationCsv from "../../../docs/save_format/datatable/occupation/occupation.csv?raw";
import { parseCsv } from "./item-names";

export type OccupationEntry = {
  id: number;
  ja: string;
  en: string;
  client: string;
  type: string;
  alignment: string;
  reward: number;
  bonus: number;
  deadlineDays: number | null;
  noteJa: string;
};

function loadOccupations(text: string): OccupationEntry[] {
  const [header, ...rows] = parseCsv(text.replace(/^﻿/, ""));
  const col = (name: string) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`occupation.csv に ${name} 列がありません`);
    return i;
  };
  const c = {
    id: col("id_dec"),
    ja: col("name_ja"),
    en: col("name_en"),
    client: col("client_ja"),
    type: col("type"),
    alignment: col("alignment"),
    reward: col("reward"),
    bonus: col("bonus"),
    deadline: col("deadline_days"),
    note: col("備考"),
  };
  return rows
    .filter((r) => r.length > 1)
    .map((r) => ({
      id: Number(r[c.id]),
      ja: r[c.ja],
      en: r[c.en],
      client: r[c.client],
      type: r[c.type],
      alignment: r[c.alignment],
      reward: Number(r[c.reward]),
      bonus: Number(r[c.bonus]),
      deadlineDays: r[c.deadline] === "" ? null : Number(r[c.deadline]),
      noteJa: r[c.note] ?? "",
    }));
}

/** ID 順 */
export const OCCUPATIONS: readonly OccupationEntry[] = loadOccupations(occupationCsv);

const BY_ID = new Map(OCCUPATIONS.map((o) => [o.id, o]));

export function occupationById(id: number): OccupationEntry | undefined {
  return BY_ID.get(id);
}

/**
 * 画面で使うなりわいのまとまり。ids は ID の範囲（欠番を含む）。
 * 🟢 3〜161 は町の基本のなりわい、163〜166 は代官所の佐古津、167〜170 は賭場の女将（治安なりわい）、171〜206 は4つの組合なりわい、
 * 207・208 は最後のなりわい、209〜212 は汁部（DLC）
 */
export const OCCUPATION_GROUPS: readonly { key: string; label: string; from: number; to: number }[] = [
  { key: "basic", label: "町のなりわい", from: 3, to: 161 },
  { key: "sakotsu", label: "【同心頭】佐古津", from: 162, to: 166 },
  { key: "okami", label: "【賭場】女将", from: 167, to: 170 },
  { key: "police", label: "【岡っ引き】野戸仏", from: 171, to: 178 },
  { key: "gangster", label: "【極道】小鳩", from: 179, to: 186 },
  { key: "thief", label: "【泥棒】泥棒さん", from: 187, to: 194 },
  { key: "homeless", label: "【宿無し】おっつぁん", from: 195, to: 206 },
  { key: "final", label: "最後のなりわい", from: 207, to: 208 },
  { key: "shirube", label: "汁部（DLC）", from: 209, to: 212 },
];

export function occupationGroupOf(id: number): string {
  return OCCUPATION_GROUPS.find((g) => id >= g.from && id <= g.to)?.key ?? "basic";
}
