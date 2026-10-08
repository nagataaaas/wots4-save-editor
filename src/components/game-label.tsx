import type { ExactlyOne } from "@/lib/exactly-one";
import { labelOf } from "@/save/master/labels";
import type { EventLabelId, ItemLabelId, Language, NpcLabelId, OccupationLabelId } from "@/save/master/label-types";

type LabelTarget = {
  item: ItemLabelId;
  event: EventLabelId;
  npc: NpcLabelId;
  occupation: OccupationLabelId;
};

export type GameLabelProps = ExactlyOne<LabelTarget> & {
  lang?: Language;
  fallback?: string;
  className?: string;
};

export function GameLabel(props: GameLabelProps) {
  const { lang = "ja", fallback, className } = props;
  const ref = labelRefOf(props);
  const text = ref ? labelOf(ref, lang, fallback) : (fallback ?? "不明");
  return <span className={className}>{text}</span>;
}

function labelRefOf(props: GameLabelProps) {
  if (props.item !== undefined) return { kind: "item", id: props.item } as const;
  if (props.event !== undefined) return { kind: "event", id: props.event } as const;
  if (props.npc !== undefined) return { kind: "npc", id: props.npc } as const;
  if (props.occupation !== undefined) return { kind: "occupation", id: props.occupation } as const;
  return null;
}
