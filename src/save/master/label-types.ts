import { brand, type Brand } from "@/lib/brand";

export type Language = "ja" | "en";

export type ItemId = Brand<number, "ItemId">;
export type EventId = Brand<number, "EventId">;
export type NpcId = Brand<number, "NpcId">;
export type OccupationId = Brand<number, "OccupationId">;

export type ItemLabelId = Brand<number, "ItemLabelId">;
export type EventLabelId = Brand<number, "EventLabelId">;
export type NpcLabelId = Brand<number, "NpcLabelId">;
export type OccupationLabelId = Brand<number, "OccupationLabelId">;

export type LocalizedLabel = {
  ja: string;
  en: string;
  reading?: string;
};

export type LabelRef =
  | { kind: "item"; id: ItemLabelId }
  | { kind: "event"; id: EventLabelId }
  | { kind: "npc"; id: NpcLabelId }
  | { kind: "occupation"; id: OccupationLabelId };

export const itemId = (value: number): ItemId => brand<number, "ItemId">(value);
export const eventId = (value: number): EventId => brand<number, "EventId">(value);
export const npcId = (value: number): NpcId => brand<number, "NpcId">(value);
export const occupationId = (value: number): OccupationId => brand<number, "OccupationId">(value);

export const itemLabelId = (value: number): ItemLabelId => brand<number, "ItemLabelId">(value);
export const eventLabelId = (value: number): EventLabelId => brand<number, "EventLabelId">(value);
export const npcLabelId = (value: number): NpcLabelId => brand<number, "NpcLabelId">(value);
export const occupationLabelId = (value: number): OccupationLabelId => brand<number, "OccupationLabelId">(value);
