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
import { tr, type Localized } from "@/lib/i18n";
import { OCCUPATION_TABLE } from "./dataset/occupation";
import { seriesRange, SHIRUBE_SERIES, type SeriesGroupKey } from "./occupation-series";
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
  clientEn: string;
  type: string;
  alignment: string;
  reward: number;
  bonus: number;
  deadlineDays: number | null;
  noteJa: string;
  noteEn: string;
};

const ROWS = Object.values(OCCUPATION_TABLE);

/** ID 順 */
export const OCCUPATIONS: readonly OccupationEntry[] = ROWS.map((r) => ({
  id: occupationId(r.id_dec),
  labelId: occupationLabelId(r.id_dec),
  client: r.client_ja,
  clientEn: r.client_en,
  type: r.type,
  alignment: r.alignment,
  reward: r.reward,
  bonus: r.bonus,
  deadlineDays: r.deadline_days,
  noteJa: r.note_ja,
  noteEn: r.note_en,
}));

/** なりわいの表示名（日本語・英語） */
export const OCCUPATION_LABELS: ReadonlyMap<OccupationLabelId, LocalizedLabel> = new Map(
  ROWS.map((r) => [occupationLabelId(r.id_dec), { ja: r.name_ja, en: r.name_en }]),
);

const BY_ID = new Map<number, OccupationEntry>(OCCUPATIONS.map((o) => [o.id, o]));

export function occupationById(id: number): OccupationEntry | undefined {
  return BY_ID.get(id);
}

// 種類・善悪の英語。表（CSV）の種類・善悪の列は日本語だけなので、日本語の値ごとに英語を持つ。
// 依頼主・備考の英語は表の列（client_en・note_en）を使う。表にない値は日本語のまま出す
const TYPE_EN: Readonly<Record<string, string>> = {
  "討伐": "Kill",
  "破壊": "Destruction",
  "配達": "Delivery",
  "伝言・説得": "Message",
  "説得": "Persuasion",
  "盗み": "Theft",
};

const ALIGNMENT_EN: Readonly<Record<string, string>> = {
  "善良": "Virtuous",
  "悪質": "Seedy",
};

const localize = (table: Readonly<Record<string, string>>, ja: string): string => tr({ ja, en: table[ja] ?? "" });

/** 今の言語の依頼主 */
export const occupationClient = (entry: Pick<OccupationEntry, "client" | "clientEn">): string =>
  tr({ ja: entry.client, en: entry.clientEn });
/** 今の言語の種類（討伐・配達 など） */
export const occupationType = (entry: Pick<OccupationEntry, "type">): string => localize(TYPE_EN, entry.type);
/** 今の言語の善悪（善良・悪質）。ふつうは空 */
export const occupationAlignment = (entry: Pick<OccupationEntry, "alignment">): string =>
  entry.alignment && localize(ALIGNMENT_EN, entry.alignment);
/** 今の言語の備考。なければ空 */
export const occupationNote = (entry: Pick<OccupationEntry, "noteJa" | "noteEn">): string =>
  tr({ ja: entry.noteJa, en: entry.noteEn });
/** 検索に使う語（依頼主・種類の日本語と英語） */
export const occupationKeywords = (entry: Pick<OccupationEntry, "client" | "clientEn" | "type">): string[] =>
  [entry.client, entry.clientEn, entry.type, TYPE_EN[entry.type] ?? ""].filter((k) => k !== "");

/**
 * まとまりの見出し。依頼主のいるまとまりは「【役目】名前」で表示する（labels.ts の occupationGroupLabel）。
 * 表はモジュールの定数なので、見出しの文言は読むたびに今の言語で返す（OCCUPATION_GROUPS の getter）
 */
export type OccupationGroupTitle = string | { role: string; npc: NpcLabelId };

/** 読むたびに今の言語の見出しを返す title を持つまとまり */
function group(
  key: OccupationGroupKey,
  title: Localized | { role: Localized; npc: NpcLabelId },
  range: { from: number; to: number },
): OccupationGroup {
  return {
    key,
    get title(): OccupationGroupTitle {
      return "role" in title ? { role: tr(title.role), npc: title.npc } : tr(title);
    },
    ...range,
  };
}

export type OccupationGroupKey = 'basic' | 'sakotsu' | 'okami' | SeriesGroupKey | 'final' | 'shirube';
export type OccupationGroup = { key: OccupationGroupKey; title: OccupationGroupTitle; from: number; to: number };

/**
 * 画面で使うなりわいのまとまり。from〜to は ID の範囲で、欠番を含み隙間なく続く。
 * 🟢 3〜161 は町の基本のなりわい、162 は欠番（表にない。範囲は佐古津に含める）、163〜166 は代官所の佐古津・167〜170 は賭場の女将の治安なりわい、171〜206 は4つの連続なりわい、
 * 207・208 は最終なりわい、209〜212 は汁部（DLC）
 */
export const OCCUPATION_GROUPS: readonly OccupationGroup[] = [
  group("basic", { ja: "町のなりわい", en: "Town missions" }, { from: 3, to: 161 }),
  group("sakotsu", { role: { ja: "同心頭", en: "Head Constable" }, npc: npcLabelId(37) }, { from: 162, to: 166 }),
  group("okami", { role: { ja: "賭場", en: "Gambling Den" }, npc: npcLabelId(44) }, { from: 167, to: 170 }),
  group("police", { role: { ja: "岡っ引き", en: "Thief-taker" }, npc: npcLabelId(40) }, seriesRange('police')),
  group("gangster", { role: { ja: "極道", en: "Scoundrel" }, npc: npcLabelId(45) }, seriesRange('gangster')),
  group("thief", { role: { ja: "泥棒", en: "Thief" }, npc: npcLabelId(169) }, seriesRange('thief')),
  group("homeless", { role: { ja: "宿無し", en: "Vagabond" }, npc: npcLabelId(76) }, seriesRange('homeless')),
  group("final", { ja: "最終なりわい", en: "Final missions" }, { from: 207, to: 208 }),
  group(
    "shirube",
    { ja: "汁部（DLC）", en: "Shirube (DLC)" },
    { from: SHIRUBE_SERIES.ids[0], to: SHIRUBE_SERIES.ids[SHIRUBE_SERIES.ids.length - 1] },
  ),
];

export function occupationGroupOf(id: number): OccupationGroupKey {
  return OCCUPATION_GROUPS.find((g) => id >= g.from && id <= g.to)?.key ?? "basic";
}

export function occupationGroupByKey(key: OccupationGroupKey): OccupationGroup | undefined {
  return OCCUPATION_GROUPS.find((g) => g.key === key);
}
