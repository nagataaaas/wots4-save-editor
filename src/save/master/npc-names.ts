// 人物の名前のマスターデータ。夜の約束の +0x1C・夜這いの記録の +0x04（名前）の ID と名前。
// docs/save_format/datatable/npc/npc-name.csv（全行 🟢）をビルド時に読み込む（表を二重に持たない）。
//
// - 1〜215：固有の名前（赤城・朱美・さよ など）
// - 1001〜6002：勢力ごとの仮の名前（まちお・まちこ など）
// - 7001〜7150・8001〜8200：町の女性の名前の候補（約束の相手の名前はここから選ばれる 🔶）
// 名前の文字列は NPC_LABELS にだけ持つ。画面やほかのモジュールでは labels.ts の npcLabel(NpcLabelId) で引く。
import npcCsv from "../../../docs/save_format/datatable/npc/npc-name.csv?raw";
import { parseCsv } from "./item-names";
import { npcId, npcLabelId, type LocalizedLabel, type NpcId, type NpcLabelId } from "./label-types";

export type NpcSex = "m" | "f";
export type NpcNameEntry = { id: NpcId; labelId: NpcLabelId; sex: NpcSex };

function loadNpcs(text: string): { entries: NpcNameEntry[]; labels: Map<NpcLabelId, LocalizedLabel> } {
  const [header, ...rows] = parseCsv(text.replace(/^﻿/, ""));
  const col = (name: string) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`npc-name.csv に ${name} 列がありません`);
    return i;
  };
  const c = { id: col("id_dec"), ja: col("name_ja"), en: col("name_en"), sex: col("sex") };
  const entries: NpcNameEntry[] = [];
  const labels = new Map<NpcLabelId, LocalizedLabel>();
  for (const r of rows.filter((r) => r.length > 1)) {
    const sex = r[c.sex];
    if (sex !== "m" && sex !== "f") throw new Error(`npc-name.csv の sex が不正です: ${r[c.id]}`);
    const id = Number(r[c.id]);
    entries.push({ id: npcId(id), labelId: npcLabelId(id), sex });
    labels.set(npcLabelId(id), { ja: r[c.ja], en: r[c.en] });
  }
  return { entries, labels };
}

const loaded = loadNpcs(npcCsv);

/** ID 昇順 */
export const NPC_NAMES: readonly NpcNameEntry[] = loaded.entries;

/** 名前の表示名（日本語・英語） */
export const NPC_LABELS: ReadonlyMap<NpcLabelId, LocalizedLabel> = loaded.labels;

const BY_ID = new Map<number, NpcNameEntry>(NPC_NAMES.map((n) => [n.id, n]));

export function npcName(id: number): NpcNameEntry | undefined {
  return BY_ID.get(id);
}

/** 名前の ID の区分（選択肢の見出しに使う） */
export function npcNameGroup(id: number): string {
  if (id <= 215) return "固有の名前";
  if (id < 7000) return "仮の名前";
  return "町の女性の名前";
}
