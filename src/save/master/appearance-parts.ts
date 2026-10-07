// 主人公の見た目の部品と人物（容姿）のマスターデータ。docs/save_format/datatable/appearance/*.csv をビルド時に読み込む（表を二重に持たない）。
//
// 部品（face・hair・upper・lower・body・feet・extra.csv、全行 🟢。body.csv は部品の種類が ❓）：
// - id：部品の番号。部品の種類ごとに別の空間（セーブの部品の組の先頭 u16）
// - gender：使える性別（'男'・'女'。null はどちらでもない）
// - models：モデルの値 u16 × 4（−1＝なし）。部品の番号と組でセーブに書く 🟢（色違いまで ✅ [U] 2026-10-08、U-19）
// - unlockId：解除に必要な特典（unlock.csv の番号）、clothId：服の番号（容姿のビット）、dlc：DLC の番号
//
// 人物（person.csv、全行 🟢。主人公設定の一覧に全部出るかは 🔶）：
// - id：人物の番号（セーブの 0x3AAD4）。連番ではない
// - gender：0＝男、1＝女（0x3AADC）、secondId：0x3AAD6 に入る値 🔶（null＝FFFF）、hairColor：髪の色（0x3AADA）
// - parts：その人物の部品の番号（null＝なし）
import bodyCsv from "../../../docs/save_format/datatable/appearance/body.csv?raw";
import extraCsv from "../../../docs/save_format/datatable/appearance/extra.csv?raw";
import faceCsv from "../../../docs/save_format/datatable/appearance/face.csv?raw";
import feetCsv from "../../../docs/save_format/datatable/appearance/feet.csv?raw";
import hairCsv from "../../../docs/save_format/datatable/appearance/hair.csv?raw";
import lowerCsv from "../../../docs/save_format/datatable/appearance/lower.csv?raw";
import personCsv from "../../../docs/save_format/datatable/appearance/person.csv?raw";
import upperCsv from "../../../docs/save_format/datatable/appearance/upper.csv?raw";
import { parseCsv } from "./item-names";

/**
 * 部品の組（セーブの 0x3AAE4 + 12k）の並び。k＝0 上半身 … 9 合羽。
 * 上半身・下半身・顔・髪型・足元 🟢、手甲・脚絆・前掛け・合羽 ✅ [U] 2026-10-08、k＝4 の種類は ❓（U-19）
 */
export const PART_KINDS = ["upper", "lower", "face", "hair", "body", "feet", "gauntlet", "leggings", "apron", "cape"] as const;
export type PartKind = (typeof PART_KINDS)[number];

export const PART_KIND_LABELS: Record<PartKind, string> = {
  upper: "上半身",
  lower: "下半身",
  face: "顔",
  hair: "髪型",
  body: "部品 k＝4（種類不明）",
  feet: "足元",
  gauntlet: "手甲",
  leggings: "脚絆",
  apron: "前掛け",
  cape: "合羽",
};

export type Gender = "男" | "女";

export type PartEntry = {
  id: number;
  ja: string;
  en: string;
  gender: Gender | null;
  /** u16 × 4。−1 は FFFF */
  models: readonly [number, number, number, number];
  unlockId: number | null;
  clothId: number | null;
  dlc: number | null;
};

export type PersonEntry = {
  id: number;
  ja: string;
  en: string;
  dlc: number | null;
  height: number;
  /** 0＝男、1＝女 */
  gender: 0 | 1;
  /** null は FFFF */
  secondId: number | null;
  hairColor: number;
  parts: Record<PartKind, number | null>;
};

function table(text: string, file: string): { col: (name: string) => number; rows: string[][] } {
  const [header, ...rows] = parseCsv(text.replace(/^﻿/, ""));
  return {
    col: (name) => {
      const i = header.indexOf(name);
      if (i < 0) throw new Error(`${file} に ${name} 列がありません`);
      return i;
    },
    rows: rows.filter((r) => r.length > 1),
  };
}

const optNum = (s: string | undefined) => (s === undefined || s === "" ? null : Number(s));

/** "46 01 FF FF …" → [326, -1, …] */
function parseModels(text: string, file: string, id: number): PartEntry["models"] {
  const b = text.split(" ").map((x) => parseInt(x, 16));
  if (b.length !== 8 || b.some((x) => !Number.isInteger(x))) throw new Error(`${file} の ${id} の save_models が読めません`);
  const v = [0, 1, 2, 3].map((i) => {
    const u = b[i * 2] | (b[i * 2 + 1] << 8);
    return u === 0xffff ? -1 : u;
  });
  return [v[0], v[1], v[2], v[3]];
}

function loadParts(text: string, file: string, kind?: string): PartEntry[] {
  const { col, rows } = table(text, file);
  const has = (name: string) => {
    try {
      return col(name);
    } catch {
      return -1;
    }
  };
  const c = {
    id: col("id_dec"),
    ja: col("name_ja"),
    en: col("name_en"),
    gender: col("gender"),
    models: col("save_models"),
    unlock: has("unlock_id"),
    cloth: has("cloth_id"),
    dlc: has("dlc"),
    kind: has("kind"),
  };
  return rows
    .filter((r) => kind === undefined || r[c.kind] === kind)
    .map((r) => {
      const id = Number(r[c.id]);
      const g = r[c.gender];
      return {
        id,
        ja: r[c.ja],
        en: r[c.en],
        gender: g === "男" || g === "女" ? g : null,
        models: parseModels(r[c.models], file, id),
        unlockId: c.unlock < 0 ? null : optNum(r[c.unlock]),
        clothId: c.cloth < 0 ? null : optNum(r[c.cloth]),
        dlc: c.dlc < 0 ? null : optNum(r[c.dlc]),
      };
    });
}

const PERSON_PART_COLUMNS: Record<PartKind, string> = {
  upper: "upper",
  lower: "lower",
  face: "face",
  hair: "hair",
  body: "body",
  feet: "feet",
  gauntlet: "gauntlet",
  leggings: "leggings",
  apron: "apron",
  cape: "cape",
};

function loadPersons(text: string): PersonEntry[] {
  const { col, rows } = table(text, "person.csv");
  const c = {
    id: col("id_dec"),
    ja: col("name_ja"),
    en: col("name_en"),
    dlc: col("dlc"),
    height: col("height"),
    gender: col("gender"),
    secondId: col("second_id"),
    hairColor: col("hair_color"),
  };
  return rows.map((r) => {
    const parts = {} as Record<PartKind, number | null>;
    for (const k of PART_KINDS) parts[k] = optNum(r[col(PERSON_PART_COLUMNS[k])]);
    return {
      id: Number(r[c.id]),
      ja: r[c.ja],
      en: r[c.en],
      dlc: optNum(r[c.dlc]),
      height: Number(r[c.height]),
      gender: r[c.gender] === "女" ? 1 : 0,
      secondId: optNum(r[c.secondId]),
      hairColor: Number(r[c.hairColor]),
      parts,
    };
  });
}

/** 部品の種類ごとの表（番号順） */
export const PARTS: Readonly<Record<PartKind, readonly PartEntry[]>> = {
  upper: loadParts(upperCsv, "upper.csv"),
  lower: loadParts(lowerCsv, "lower.csv"),
  face: loadParts(faceCsv, "face.csv"),
  hair: loadParts(hairCsv, "hair.csv"),
  body: loadParts(bodyCsv, "body.csv"),
  feet: loadParts(feetCsv, "feet.csv"),
  gauntlet: loadParts(extraCsv, "extra.csv", "手甲"),
  leggings: loadParts(extraCsv, "extra.csv", "脚絆"),
  apron: loadParts(extraCsv, "extra.csv", "前掛け"),
  cape: loadParts(extraCsv, "extra.csv", "合羽"),
};

/** 人物の番号順 */
export const PERSONS: readonly PersonEntry[] = loadPersons(personCsv);

export function findPart(kind: PartKind, id: number): PartEntry | undefined {
  return PARTS[kind].find((p) => p.id === id);
}

export function findPerson(id: number): PersonEntry | undefined {
  return PERSONS.find((p) => p.id === id);
}

/** 部品の組の分け方（ユーザー判断 2026-10-08） */
export type PartGroup = "男" | "女" | "共通" | "セット用" | "未使用";

const usedByPerson: Record<PartKind, Set<number>> = Object.fromEntries(
  PART_KINDS.map((k) => [k, new Set(PERSONS.flatMap((p) => (p.parts[k] === null ? [] : [p.parts[k]])))]),
) as Record<PartKind, Set<number>>;

/**
 * 名前のある部品は性別の組（性別の指定がなければ「共通」）。
 * 名前のない部品は、人物で使われるか特典の服・服の番号を持てば「セット用」、それ以外は「未使用」。
 */
export function partGroup(kind: PartKind, part: PartEntry): PartGroup {
  if (part.ja !== "") return part.gender ?? "共通";
  return usedByPerson[kind].has(part.id) || part.unlockId !== null || part.clothId !== null ? "セット用" : "未使用";
}
