// 主人公の見た目の部品と人物（容姿）のマスターデータ。docs/save_format/datatable/appearance/*.csv から生成した dataset/*.ts を使う（表を二重に持たない）。
//
// 部品（face・hair・upper・lower・body・feet・extra.csv、全行 🟢。body.csv は手 🟢）：
// - id：部品の番号。部品の種類ごとに別の空間（セーブの部品の組の先頭 u16）
// - gender：使える性別（'男'・'女'。null はどちらでもない）
// - models：モデルの値 u16 × 4（−1＝なし）。部品の番号と組でセーブに書く 🟢（色違いまで ✅ [U] 2026-10-08、U-19）
// - unlockId：解除に必要な特典（unlock.csv の番号）、clothId：服の番号（容姿のビット）、dlc：DLC の番号
// - alias：名前のない部品の見た目（確度は CSV の備考）、crash：ロードでクラッシュする部品（✅ [U] 2026-10-08）
// - layers：層1〜4の形（メッシュ）の名前と、その形に張れるテクスチャ（色違い）🟢。models の値はテクスチャの番号
//
// 人物（person.csv、全行 🟢。主人公設定の一覧に全部出るかは 🔶）：
// - id：人物の番号（セーブの 0x3AAD4）。連番ではない
// - bodyKind：体の種類（0x3AADC）、secondId：0x3AAD6 に入る値 🔶（null＝FFFF）、hairColor：髪の色（0x3AADA）
// - selectable：主人公設定の一覧に出る人物。出ないローラ・男の子・女の子（✅ [U] 2026-10-08）は上級者モードだけ
// - parts：その人物の部品の番号（null＝なし）
import { BODY_TABLE } from "./dataset/body";
import { EXTRA_TABLE } from "./dataset/extra";
import { FACE_TABLE } from "./dataset/face";
import { FEET_TABLE } from "./dataset/feet";
import { HAIR_TABLE } from "./dataset/hair";
import { LOWER_TABLE } from "./dataset/lower";
import { PERSON_TABLE } from "./dataset/person";
import { UPPER_TABLE } from "./dataset/upper";

/**
 * 部品の組（セーブの 0x3AAE4 + 12k）の並び。k＝0 上半身 … 9 合羽。
 * 上半身・下半身・顔・髪型・足元 🟢、手甲・脚絆・前掛け・合羽 ✅ [U] 2026-10-08、k＝4 は手 🟢（J.J の手の書き込みの反映 ✅ [U] 2026-10-08）
 */
export const PART_KINDS = [
  "upper",
  "lower",
  "face",
  "hair",
  "body",
  "feet",
  "gauntlet",
  "leggings",
  "apron",
  "cape",
] as const;
export type PartKind = (typeof PART_KINDS)[number];

export const PART_KIND_LABELS: Record<PartKind, string> = {
  upper: "上半身",
  lower: "下半身",
  face: "顔・声",
  hair: "髪型",
  body: "手",
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
  /** 名前のない部品の見た目（ゲーム内で確認 ✅ [U]、選べる人物の部品 🟢、推定 🔶。確度は CSV の備考）。空文字はなし */
  alias: string;
  /** ✅ [U] ロードでクラッシュする。選択肢に出さない */
  crash: boolean;
  /** 層1〜4。null はその層なし。値（テクスチャ）は色違いの順 🟢 */
  layers: readonly [PartLayer | null, PartLayer | null, PartLayer | null, PartLayer | null];
};

/**
 * 部品の層1つ。形（メッシュ）は部品の番号で決まり、セーブの値（models）はテクスチャの番号
 * （✅ [U] 2026-10-08：形はそのまま別の部品の値でテクスチャだけ替わった）。
 */
export type PartLayer = {
  /** 「部位（持ち主）」。持ち主は区別のための呼び名 🟢 */
  mesh: string;
  /** その形に張れるテクスチャの番号（色違いの順） */
  textures: readonly number[];
};

export type PersonEntry = {
  id: number;
  ja: string;
  en: string;
  dlc: number | null;
  height: number;
  /** 体の種類（0x3AADC）。BODY_KINDS の添字：0＝男、1＝女、2＝ローラ、3＝子供 */
  bodyKind: number;
  /** null は FFFF */
  secondId: number | null;
  hairColor: number;
  parts: Record<PartKind, number | null>;
  /** 主人公設定の一覧に出る人物（🔶）。false は上級者モードだけで選べる見た目の組（ローラ・男の子・女の子 ✅ [U]） */
  selectable: boolean;
};

/** 0x3AADC の値の名前。0＝男・1＝女 🔶、2＝ローラ・3＝子供・4＝動物 🟢（U-19） */
export const BODY_KINDS = ["男", "女", "ローラ", "子供", "動物"] as const;

/** 部品の CSV（face・hair・upper・lower・body・feet・extra）の行。列は CSV ごとに少しずつ違う */
type PartRow = {
  id_dec: number;
  name_ja: string | null;
  name_en: string | null;
  gender: string | null;
  save_models: string;
  layer_meshes: string;
  layer_textures: string;
  unlock_id?: number | null;
  cloth_id?: number | null;
  dlc?: number | string | null;
  kind?: string;
  alias_ja?: string | null;
  crash?: number | null;
};

const optNum = (v: number | string | null | undefined) =>
  v === undefined || v === null || v === "" ? null : Number(v);

/** "46 01 FF FF …" → [326, -1, …] */
function parseModels(text: string, file: string, id: number): PartEntry["models"] {
  const b = text.split(" ").map((x) => parseInt(x, 16));
  if (b.length !== 8 || b.some((x) => !Number.isInteger(x)))
    throw new Error(`${file} の ${id} の save_models が読めません`);
  const v = [0, 1, 2, 3].map((i) => {
    const u = b[i * 2] | (b[i * 2 + 1] << 8);
    return u === 0xffff ? -1 : u;
  });
  return [v[0], v[1], v[2], v[3]];
}

/** layer_meshes "足（浪人）|小物1（浪人）||" と layer_textures "299 300|309||" → 層4つ */
function parseLayers(
  meshes: string,
  textures: string,
  file: string,
  id: number,
): PartEntry["layers"] {
  const m = meshes.split("|");
  const t = textures.split("|");
  if (m.length !== 4 || t.length !== 4)
    throw new Error(`${file} の ${id} の layer_meshes・layer_textures が読めません`);
  const layers = m.map((mesh, i): PartLayer | null => {
    if (mesh === "") return null;
    const values = t[i].split(" ").map(Number);
    if (values.length === 0 || values.some((v) => !Number.isInteger(v)))
      throw new Error(`${file} の ${id} の layer_textures が読めません`);
    return { mesh, textures: values };
  });
  return [layers[0], layers[1], layers[2], layers[3]];
}

function loadParts(
  table: Readonly<Record<number, PartRow>>,
  file: string,
  kind?: string,
): PartEntry[] {
  return Object.values(table)
    .filter((r) => kind === undefined || r.kind === kind)
    .map((r) => {
      const g = r.gender;
      return {
        id: r.id_dec,
        ja: r.name_ja ?? "",
        en: r.name_en ?? "",
        gender: g === "男" || g === "女" ? g : null,
        models: parseModels(r.save_models, file, r.id_dec),
        unlockId: optNum(r.unlock_id),
        clothId: optNum(r.cloth_id),
        dlc: optNum(r.dlc),
        alias: r.alias_ja ?? "",
        crash: r.crash === 1,
        layers: parseLayers(r.layer_meshes ?? "", r.layer_textures ?? "", file, r.id_dec),
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

function loadPersons(): PersonEntry[] {
  return Object.values(PERSON_TABLE).map((r) => {
    const row: Readonly<Record<string, unknown>> = r;
    const parts = {} as Record<PartKind, number | null>;
    for (const k of PART_KINDS) parts[k] = optNum(row[PERSON_PART_COLUMNS[k]] as number | null);
    const bodyKind = BODY_KINDS.indexOf(r.body_kind);
    if (bodyKind < 0) throw new Error(`person.csv の ${r.id_dec} の body_kind が読めません`);
    return {
      id: r.id_dec,
      ja: r.name_ja,
      en: r.name_en,
      dlc: optNum(r.dlc),
      height: r.height,
      bodyKind,
      secondId: optNum(r.second_id),
      hairColor: r.hair_color,
      parts,
      selectable: r.selectable === 1,
    };
  });
}

/** 部品の種類ごとの表（番号順） */
export const PARTS: Readonly<Record<PartKind, readonly PartEntry[]>> = {
  upper: loadParts(UPPER_TABLE, "upper.csv"),
  lower: loadParts(LOWER_TABLE, "lower.csv"),
  face: loadParts(FACE_TABLE, "face.csv"),
  hair: loadParts(HAIR_TABLE, "hair.csv"),
  body: loadParts(BODY_TABLE, "body.csv"),
  feet: loadParts(FEET_TABLE, "feet.csv"),
  gauntlet: loadParts(EXTRA_TABLE, "extra.csv", "手甲"),
  leggings: loadParts(EXTRA_TABLE, "extra.csv", "脚絆"),
  apron: loadParts(EXTRA_TABLE, "extra.csv", "前掛け"),
  cape: loadParts(EXTRA_TABLE, "extra.csv", "合羽"),
};

/** 人物の番号順 */
export const PERSONS: readonly PersonEntry[] = loadPersons();

export function findPart(kind: PartKind, id: number): PartEntry | undefined {
  return PARTS[kind].find((p) => p.id === id);
}

export function findPerson(id: number): PersonEntry | undefined {
  return PERSONS.find((p) => p.id === id);
}

/** 部品の組の分け方（ユーザー判断 2026-10-08） */
export type PartGroup = "男" | "女" | "共通" | "セット用" | "未使用";

const usedByPerson: Record<PartKind, Set<number>> = Object.fromEntries(
  PART_KINDS.map((k) => [
    k,
    new Set(PERSONS.flatMap((p) => (p.parts[k] === null ? [] : [p.parts[k]]))),
  ]),
) as Record<PartKind, Set<number>>;

/**
 * 名前のある部品は性別の組（性別の指定がなければ「共通」）。
 * 名前のない部品は、人物で使われるか特典の服・服の番号を持てば「セット用」、それ以外は「未使用」。
 */
export function partGroup(kind: PartKind, part: PartEntry): PartGroup {
  if (part.ja !== "") return part.gender ?? "共通";
  return usedByPerson[kind].has(part.id) || part.unlockId !== null || part.clothId !== null
    ? "セット用"
    : "未使用";
}
