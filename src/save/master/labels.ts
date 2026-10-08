import { CHART_NODES } from "./chart-nodes";
import { ITEMS } from "./item-names";
import { NPC_NAMES } from "./npc-names";
import { OCCUPATIONS } from "./occupation-names";
import { eventLabelId, type LabelRef, type Language, type LocalizedLabel } from "./label-types";

export const ITEM_LABELS: ReadonlyMap<number, LocalizedLabel> = new Map(
  ITEMS.map((it) => [it.labelId, { ja: it.ja, en: it.en, reading: it.reading }]),
);

export const EVENT_LABELS: ReadonlyMap<number, LocalizedLabel> = new Map(
  CHART_NODES.flatMap((node) =>
    node.ja === null || node.en === null ? [] : [[eventLabelId(node.id), { ja: node.ja, en: node.en }]],
  ),
);

export const NPC_LABELS: ReadonlyMap<number, LocalizedLabel> = new Map(
  NPC_NAMES.map((npc) => [npc.labelId, { ja: npc.ja, en: npc.en }]),
);

export const OCCUPATION_LABELS: ReadonlyMap<number, LocalizedLabel> = new Map(
  OCCUPATIONS.map((occupation) => [occupation.labelId, { ja: occupation.ja, en: occupation.en }]),
);

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
