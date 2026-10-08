// なりわいのマスターデータ。docs/save_format/datatable/occupation/occupation.csv から生成した dataset/occupation.ts を使う（表を二重に持たない）。
//
// 🟢 ID 3〜212 のうち170件。ID がそのままセーブの状態の表の添字（chunks/occupation）。
// ✅ 209〜212 は受注・クリアの差分で添字と受注中の ID が一致した。
// - 名前（ja・en）は OCCUPATION_LABELS にだけ持つ。画面やほかのモジュールでは labels.ts の occupationLabel(OccupationLabelId) で引く
// - client：依頼主。連続なりわいは「同心 野戸仏新太郎」のように名前つき
// - type：討伐・破壊・配達・伝言・説得・盗み など
// - alignment：善良・悪質・空（ふつう）
// - reward・bonus：成功報酬・追加報酬（文）
// - deadlineDays：期限（日）。空は期限なし（null）
import { OCCUPATION_TABLE } from "./dataset/occupation";
import {
  npcLabelId,
  occupationId,
  occupationLabelId,
  type LocalizedLabel,
  type NpcLabelId,
  type OccupationId,
  type OccupationLabelId,
} from "./label-types";

export type OccupationEntry = {
  id: OccupationId;
  labelId: OccupationLabelId;
  client: string;
  type: string;
  alignment: string;
  reward: number;
  bonus: number;
  deadlineDays: number | null;
  noteJa: string;
};

const ROWS = Object.values(OCCUPATION_TABLE);

/** ID 順 */
export const OCCUPATIONS: readonly OccupationEntry[] = ROWS.map((r) => ({
  id: occupationId(r.id_dec),
  labelId: occupationLabelId(r.id_dec),
  client: r.client_ja,
  type: r.type,
  alignment: r.alignment,
  reward: Number(r.reward),
  bonus: Number(r.bonus),
  deadlineDays: r.deadline_days,
  noteJa: r.備考,
}));

/** なりわいの表示名（日本語・英語） */
export const OCCUPATION_LABELS: ReadonlyMap<OccupationLabelId, LocalizedLabel> = new Map(
  ROWS.map((r) => [occupationLabelId(r.id_dec), { ja: r.name_ja, en: r.name_en }]),
);

const BY_ID = new Map<number, OccupationEntry>(OCCUPATIONS.map((o) => [o.id, o]));

export function occupationById(id: number): OccupationEntry | undefined {
  return BY_ID.get(id);
}

/** まとまりの見出し。依頼主のいるまとまりは「【役目】名前」で表示する（labels.ts の occupationGroupLabel） */
export type OccupationGroupTitle = string | { role: string; npc: NpcLabelId };

export type OccupationGroup = { key: string; title: OccupationGroupTitle; from: number; to: number };

/**
 * 画面で使うなりわいのまとまり。ids は ID の範囲（欠番を含む）。
 * 🟢 3〜161 は町の基本のなりわい、163〜166 は代官所の佐古津・167〜170 は賭場の女将の治安なりわい、171〜206 は4つの連続なりわい、
 * 207・208 は最終なりわい、209〜212 は汁部（DLC）
 */
export const OCCUPATION_GROUPS: readonly OccupationGroup[] = [
  { key: "basic", title: "町のなりわい", from: 3, to: 161 },
  { key: "sakotsu", title: { role: "同心頭", npc: npcLabelId(37) }, from: 162, to: 166 },
  { key: "okami", title: { role: "賭場", npc: npcLabelId(44) }, from: 167, to: 170 },
  { key: "police", title: { role: "岡っ引き", npc: npcLabelId(40) }, from: 171, to: 178 },
  { key: "gangster", title: { role: "極道", npc: npcLabelId(45) }, from: 179, to: 186 },
  { key: "thief", title: { role: "泥棒", npc: npcLabelId(169) }, from: 187, to: 194 },
  { key: "homeless", title: { role: "宿無し", npc: npcLabelId(76) }, from: 195, to: 206 },
  { key: "final", title: "最終なりわい", from: 207, to: 208 },
  { key: "shirube", title: "汁部（DLC）", from: 209, to: 212 },
];

export function occupationGroupOf(id: number): string {
  return OCCUPATION_GROUPS.find((g) => id >= g.from && id <= g.to)?.key ?? "basic";
}

export function occupationGroupByKey(key: string): OccupationGroup | undefined {
  return OCCUPATION_GROUPS.find((g) => g.key === key);
}
