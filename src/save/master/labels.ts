// 人物・イベント・アイテム・なりわいの表示名を ID から引く。
// 名前の文字列はマスター（datatable の CSV）にだけ持ち、画面やほかのモジュールは種別ごとの LabelId で参照する。
// マスターのモジュール（*-names.ts・chart-nodes.ts）はこのモジュールを読み込まない（循環させない）。
import { getLanguage, tr } from "@/lib/i18n";
import { CHART_NODE_OWN_LABELS, type ChartNodeEntry } from "./chart-nodes";
import { EVENT_TABLE } from "./dataset/event";
import { ITEM_TABLE } from "./dataset/item";
import { NPC_NAME_TABLE } from "./dataset/npc-name";
import { OCCUPATION_TABLE } from "./dataset/occupation";
import { EVENT_LABELS } from "./event-names";
import { ITEM_LABELS } from "./item-names";
import { NPC_LABELS } from "./npc-names";
import { OCCUPATION_LABELS, type OccupationGroup } from "./occupation-names";
import type {
  EventLabelId,
  ItemLabelId,
  LabelRef,
  Language,
  LocalizedLabel,
  NpcLabelId,
  OccupationLabelId,
} from "./label-types";

export function findLabel(ref: LabelRef): LocalizedLabel | undefined {
  switch (ref.kind) {
    case "item":
      return ITEM_LABELS.get(ref.id);
    case "event":
      return EVENT_LABELS.get(ref.id);
    case "npc":
      return NPC_LABELS.get(ref.id);
    case "occupation":
      return OCCUPATION_LABELS.get(ref.id);
  }
}

export function labelOf(ref: LabelRef, lang: Language = getLanguage(), fallback?: string): string {
  const label = findLabel(ref);
  if (!label) return fallback ?? unknownLabel(ref);
  return label[lang] || label.ja;
}

/** 表にない ID の表示。ID は画面に出さない（生の値は「生データ」画面で見る） */
export function unknownLabel(_ref: LabelRef): string {
  return tr({ ja: "不明", en: "Unknown" });
}

/** 検索に使う語（日本語・英語・読み）。表にない ID は空 */
export function labelKeywords(ref: LabelRef): string[] {
  const label = findLabel(ref);
  return label ? [label.ja, label.en, label.reading ?? ""].filter((k) => k !== "") : [];
}

export const itemLabel = (id: ItemLabelId, lang: Language = getLanguage()): string => labelOf({ kind: "item", id }, lang);
export const eventLabel = (id: EventLabelId, lang: Language = getLanguage()): string => labelOf({ kind: "event", id }, lang);
export const npcLabel = (id: NpcLabelId, lang: Language = getLanguage()): string => labelOf({ kind: "npc", id }, lang);
export const occupationLabel = (id: OccupationLabelId, lang: Language = getLanguage()): string =>
  labelOf({ kind: "occupation", id }, lang);

type NameTable = Readonly<Record<number, { readonly name_ja: string }>>;
/** 名前のある ID（名前が空の行は除く） */
type NamedId<T extends NameTable> = { [K in keyof T]: T[K] extends { name_ja: "" } ? never : K }[keyof T];
type NameAt<T extends NameTable, I extends keyof T> = T[I] extends { name_ja: infer N } ? N : never;

function nameFrom<T extends NameTable>(table: T) {
  return <const I extends NamedId<T>>(id: I): NameAt<T, I> => (table[id] as { name_ja: string }).name_ja as NameAt<T, I>;
}

/**
 * コードに ID を直接書いて名前を引く形。引数は各表の ID の数値リテラルで、表にない ID・名前のない ID は型エラーになる。
 * 返り値の型は名前の文字列そのもの（nameOf.npc(40) にカーソルを当てると "野戸仏"）。
 * 値がデータから来るとき（number）は、型で区別できる npcLabel(NpcLabelId) などを使う。
 */
export const nameOf = {
  item: nameFrom(ITEM_TABLE),
  event: nameFrom(EVENT_TABLE),
  npc: nameFrom(NPC_NAME_TABLE),
  occupation: nameFrom(OCCUPATION_TABLE),
} as const;

/** ノードの名前。イベントの名前と違う名前を持つノード（町の薬師 など）はその名前 */
export function chartNodeLabel(
  node: Pick<ChartNodeEntry, "id" | "labelId">,
  fallback = "不明",
  lang: Language = getLanguage(),
): string {
  const own = CHART_NODE_OWN_LABELS.get(node.id);
  if (own) return own[lang] || own.ja;
  return node.labelId !== null ? labelOf({ kind: "event", id: node.labelId }, lang, fallback) : fallback;
}

/** なりわいのまとまりの見出し。依頼主のいるまとまりは「【役目】名前」 */
export function occupationGroupLabel(group: Pick<OccupationGroup, "title">): string {
  const { title } = group;
  return typeof title === "string" ? title : `【${title.role}】${npcLabel(title.npc)}`;
}
