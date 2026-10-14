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
// - selectable：主人公設定の一覧に出る人物。出ないローラ・男の子・女の子（✅ [U] 2026-10-08）は、エディタでは別の組に分けて出す
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

/** 部品の性別（CSV の gender）。部品は男用・女用・どちらでもない（null）のどれか。主人公のタイプ（BodyKind）とは別 */
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
  /** タイプ（体の種類、0x3AADC）。BODY_KINDS の添字：0＝男、1＝女、2＝ローラ、3＝子供（4＝動物の人物は表にない） */
  bodyKind: number;
  /** null は FFFF */
  secondId: number | null;
  hairColor: number;
  parts: Record<PartKind, number | null>;
  /** 主人公設定の一覧に出る人物（🔶）。false は主人公設定に出ない見た目の組（ローラ・男の子・女の子 ✅ [U]） */
  selectable: boolean;
};

/** タイプ（体の種類、0x3AADC）の値の名前。添字が値。0＝男・1＝女 🔶、2＝ローラ・3＝子供・4＝動物 🟢（U-19） */
export const BODY_KINDS = ["男", "女", "ローラ", "子供", "動物"] as const;
export type BodyKind = (typeof BODY_KINDS)[number];

/**
 * 部品の生成表（face・hair・upper・lower・body・feet・extra）の行のうち、使う列。どの表の行もこの形に当てはまる。
 * 生成器は数値の列を number | null、文字列の列を空文字で出す。body.csv には特典・服・DLC の列が、extra.csv には別名・クラッシュの列がなく、extra.csv だけが種類の列を持つ
 */
type PartRow = {
  id_dec: number;
  name_ja: string;
  name_en: string;
  gender: "" | Gender;
  save_models: PartEntry['models'];
  layer_meshes: readonly [string, string, string, string];
  layer_textures: readonly [readonly number[], readonly number[], readonly number[], readonly number[]];
  unlock_id?: number | null;
  cloth_id?: number | null;
  dlc?: number | null;
  kind?: string;
  alias_ja?: string;
  crash?: number | null;
};

function loadParts(
  table: Readonly<Record<number, PartRow>>,
  kind?: string,
): PartEntry[] {
  return Object.values(table)
    .filter((r) => kind === undefined || r.kind === kind)
    .map((r) => {
      const layer = (i: number): PartLayer | null => r.layer_meshes[i] === '' ? null
        : { mesh: r.layer_meshes[i], textures: r.layer_textures[i] };
      const layers: PartEntry['layers'] = [layer(0), layer(1), layer(2), layer(3)];
      return {
        id: r.id_dec,
        ja: r.name_ja,
        en: r.name_en,
        gender: r.gender === "" ? null : r.gender,
        models: r.save_models,
        unlockId: r.unlock_id ?? null,
        clothId: r.cloth_id ?? null,
        dlc: r.dlc ?? null,
        alias: r.alias_ja ?? "",
        crash: r.crash === 1,
        layers,
      };
    });
}

function loadPersons(): PersonEntry[] {
  return Object.values(PERSON_TABLE).map((r) => {
    const bodyKind = BODY_KINDS.indexOf(r.body_kind);
    if (bodyKind < 0) throw new Error(`person.csv の ${r.id_dec} の body_kind が読めません`);
    return {
      id: r.id_dec,
      ja: r.name_ja,
      en: r.name_en,
      dlc: r.dlc,
      height: r.height,
      bodyKind,
      secondId: r.second_id,
      hairColor: r.hair_color,
      parts: {
        upper: r.upper,
        lower: r.lower,
        face: r.face,
        hair: r.hair,
        body: r.body,
        feet: r.feet,
        gauntlet: r.gauntlet,
        leggings: r.leggings,
        apron: r.apron,
        cape: r.cape,
      },
      selectable: r.selectable === 1,
    };
  });
}

/** 部品の種類ごとの表（番号順） */
export const PARTS: Readonly<Record<PartKind, readonly PartEntry[]>> = {
  upper: loadParts(UPPER_TABLE),
  lower: loadParts(LOWER_TABLE),
  face: loadParts(FACE_TABLE),
  hair: loadParts(HAIR_TABLE),
  body: loadParts(BODY_TABLE),
  feet: loadParts(FEET_TABLE),
  gauntlet: loadParts(EXTRA_TABLE, "手甲"),
  leggings: loadParts(EXTRA_TABLE, "脚絆"),
  apron: loadParts(EXTRA_TABLE, "前掛け"),
  cape: loadParts(EXTRA_TABLE, "合羽"),
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
