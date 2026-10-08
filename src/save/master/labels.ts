// 人物・イベント・アイテム・なりわいの表示名を ID から引く。
// 名前の文字列はマスター（datatable の CSV）にだけ持ち、画面やほかのモジュールは種別ごとの LabelId で参照する。
// マスターのモジュール（*-names.ts・chart-nodes.ts）はこのモジュールを読み込まない（循環させない）。
import { CHART_NODE_OWN_LABELS, type ChartNodeEntry } from "./chart-nodes";
import { EVENT_LABELS } from "./event-names";
import { ITEM_LABELS } from "./item-names";
import { NPC_LABELS } from "./npc-names";
import { OCCUPATION_LABELS, type OccupationGroup } from "./occupation-names";
import {
  eventLabelId,
  itemLabelId,
  npcLabelId,
  occupationLabelId,
  type EventLabelId,
  type ItemLabelId,
  type LabelRef,
  type Language,
  type LocalizedLabel,
  type NpcLabelId,
  type OccupationLabelId,
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

export function labelOf(ref: LabelRef, lang: Language = "ja", fallback?: string): string {
  const label = findLabel(ref);
  if (!label) return fallback ?? unknownLabel(ref);
  return label[lang] || label.ja;
}

export function unknownLabel(ref: LabelRef): string {
  return `不明（${ref.kind}:${Number(ref.id)}）`;
}

/** 検索に使う語（日本語・英語・読み）。表にない ID は空 */
export function labelKeywords(ref: LabelRef): string[] {
  const label = findLabel(ref);
  return label ? [label.ja, label.en, label.reading ?? ""].filter((k) => k !== "") : [];
}

export const itemLabel = (id: ItemLabelId, lang: Language = "ja"): string => labelOf({ kind: "item", id }, lang);
export const eventLabel = (id: EventLabelId, lang: Language = "ja"): string => labelOf({ kind: "event", id }, lang);
export const npcLabel = (id: NpcLabelId, lang: Language = "ja"): string => labelOf({ kind: "npc", id }, lang);
export const occupationLabel = (id: OccupationLabelId, lang: Language = "ja"): string =>
  labelOf({ kind: "occupation", id }, lang);

function strictLabel(ref: LabelRef): string {
  if (!findLabel(ref)) throw new Error(`表にない ID です: ${ref.kind}:${Number(ref.id)}`);
  return labelOf(ref);
}

/**
 * 説明文・注記の中で名前を引くための短い形。引数は各表の ID（数値リテラル）で、表にない ID は例外にする
 * （モジュールの読み込み時に気づけるように）。例：`${nameOf.event(38)}で${nameOf.npc(10)}に勝つと 1`
 * 値がデータから来るときは、型で区別できる npcLabel(NpcLabelId) などを使う。
 */
export const nameOf = {
  item: (id: number): string => strictLabel({ kind: "item", id: itemLabelId(id) }),
  event: (id: number): string => strictLabel({ kind: "event", id: eventLabelId(id) }),
  npc: (id: number): string => strictLabel({ kind: "npc", id: npcLabelId(id) }),
  occupation: (id: number): string => strictLabel({ kind: "occupation", id: occupationLabelId(id) }),
} as const;

/** ノードの名前。イベントの名前と違う名前を持つノード（町の薬師 など）はその名前 */
export function chartNodeLabel(
  node: Pick<ChartNodeEntry, "id" | "labelId">,
  fallback = `ノード ${node.id}`,
  lang: Language = "ja",
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
