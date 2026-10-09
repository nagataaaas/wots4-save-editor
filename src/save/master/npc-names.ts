// 人物の名前のマスターデータ。夜の約束の +0x1C・夜這いの記録の +0x04（名前）の ID と名前。
// docs/save_format/datatable/npc/npc-name.csv（全行 🟢）から生成した dataset/npc-name.ts を使う（表を二重に持たない）。
//
// - 1〜215：固有の名前（赤城・朱美・さよ など）
// - 1001〜6002：勢力ごとの仮の名前（まちお・まちこ など）
// - 7001〜7150・8001〜8200：町の人の名前の候補。約束の相手の町の人の名前はここから選ばれる 🟢
//   （女性 7001〜7100・8001〜8104、男性 7101〜7150・8105〜8200。8000 台は外国人の町の人）
// 名前の文字列は NPC_LABELS にだけ持つ。画面やほかのモジュールでは labels.ts の npcLabel(NpcLabelId) で引く。
import { NPC_NAME_TABLE } from "./dataset/npc-name";
import { npcId, npcLabelId, type LocalizedLabel, type NpcId, type NpcLabelId } from "./label-types";

export type NpcSex = "m" | "f";
export type NpcNameEntry = { id: NpcId; labelId: NpcLabelId; sex: NpcSex };

const ROWS = Object.values(NPC_NAME_TABLE);

/** ID 昇順 */
export const NPC_NAMES: readonly NpcNameEntry[] = ROWS.map((r) => ({
  id: npcId(r.id_dec),
  labelId: npcLabelId(r.id_dec),
  sex: r.sex,
}));

/** 名前の表示名（日本語・英語） */
export const NPC_LABELS: ReadonlyMap<NpcLabelId, LocalizedLabel> = new Map(
  ROWS.map((r) => [npcLabelId(r.id_dec), { ja: r.name_ja, en: r.name_en }]),
);

const BY_ID = new Map<number, NpcNameEntry>(NPC_NAMES.map((n) => [n.id, n]));

export function npcName(id: number): NpcNameEntry | undefined {
  return BY_ID.get(id);
}

/** 名前の ID の区分（選択肢の見出しに使う） */
export function npcNameGroup(id: number): string {
  if (id <= 215) return "固有の名前";
  if (id < 7000) return "仮の名前";
  return "町の人の名前";
}
