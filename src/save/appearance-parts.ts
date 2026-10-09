// 主人公の見た目のレコード（0x3AAD4〜0x3AB5B）のうち、人物・髪の色・タイプ・部品。出典：docs/save_format/chunks/appearance「主人公の見た目のレコード」。
//
// - 0x3AAD4 u16 人物の番号 🟢。人物を指している間は、表示は部品・髪の色ともその人物から作られる（✅ [U] 2026-10-08）。
//   部品や髪の色を変えるときは FFFF（個別に設定）にする ✅ [U]
// - 0x3AAD6 u16 人物ごとに決まる値（拷問などで着替えさせられる姿を引く人物）🟢。人物を選ぶときだけ書く
// - 0x3AADA u8 髪の色 ✅位置 [U]。0〜4 ✅ [U]、5〜9 🔶（U-19）
// - 0x3AADC u8 タイプ（体の種類）0＝男・1＝女 🔶、2＝ローラ・3＝子供・4＝動物 🟢。男・女の2値の性別ではない。
//   単独の書き込みは上級者モードだけ（ユーザー判断 2026-10-08）
// - 上半身・下半身の「なし」は、組み合わせによっては読み込めない（エラーになった例・読めた例とも ✅ [U]、条件は ❓）。
//   止めずに、その項目に警告を出す（ユーザー判断 2026-10-08）。部品 53 の上半身はクラッシュする ✅ [U]
// - 0x3AAE4 + 12k：部品の組。+0 部品の番号 u16、+2 使われていない 🔶（書かない）、+4〜+B モデルの値（層）u16 × 4 🟢
//   顔・髪型・小物4種・手（k＝4）は書き込みの反映を確認 ✅ [U]。上半身・下半身・足元は要ゲーム内確認（U-19）
//   モデルの値はテクスチャの番号で、形は部品の番号で決まる（✅ [U] 2026-10-08）。層ごとに「なし」か色違いを選ぶのは上級者モードだけ
//   （ユーザー判断 2026-10-08）。足元の層を外した書き込みの反映 ✅ [U] 2026-10-08
// 固定オフセットを使う。ファイルサイズを検証する。
import { readU16, readU8, writeF32, writeU16, writeU8, readF32 } from "./binary";
import { checkLayout } from "./hero";
import {
  BODY_KINDS,
  findPart,
  findPerson,
  PART_KIND_LABELS,
  PART_KINDS,
  PERSONS,
  type BodyKind,
  type PartKind,
} from "./master/appearance-parts";

export const APPEARANCE_PARTS_OFFSETS = {
  person: 0x3aad4,
  secondId: 0x3aad6,
  hairColor: 0x3aada,
  bodyKind: 0x3aadc,
  height: 0x3aae0,
  parts: 0x3aae4,
} as const;

/** 部品の組の長さ */
export const PART_RECORD_SIZE = 12;

/** 0x3AAD4 の「個別に設定」 */
export const PERSON_CUSTOM = 0xffff;

export function partOffset(kind: PartKind): number {
  return APPEARANCE_PARTS_OFFSETS.parts + PART_RECORD_SIZE * PART_KINDS.indexOf(kind);
}

/** 書き込みの反映をゲーム内で確認した部品（✅ [U] 2026-10-08）。ほかは要ゲーム内確認（U-19） */
export const PART_WRITE_CONFIRMED: Readonly<Record<PartKind, boolean>> = {
  upper: false,
  lower: false,
  face: true,
  hair: true,
  body: true,
  feet: false,
  gauntlet: true,
  leggings: true,
  apron: true,
  cape: true,
};

/**
 * 髪の色の名前。値＝主人公設定の一覧の左からの位置（1 起点）。
 * 0＝なし・1＝金髪・2＝茶髪・3＝黒・4＝銀髪 ✅ [U] 2026-10-08、5＝赤 🔶 [U]（「たぶん赤」）。
 * 6〜9 は特典で選べる色の並び（赤の後ろ）からの推定 🔶（U-19）。10 以上は色がつかない ✅ [U]
 */
export const HAIR_COLOR_NAMES: Readonly<Record<number, string>> = {
  0: "なし",
  1: "金髪",
  2: "茶髪",
  3: "黒",
  4: "銀髪",
  5: "赤",
  6: "黄緑",
  7: "ピンク",
  8: "藍",
  9: "紫",
};
/** 名前をゲーム内で確認した髪の色 ✅ [U] */
export const HAIR_COLOR_CONFIRMED: ReadonlySet<number> = new Set([0, 1, 2, 3, 4]);
/** 通常モードで書ける髪の色の範囲（主人公設定の一覧にある色）。0・10 以上は上級者モードだけ */
export const HAIR_COLOR_MIN = 1;
export const HAIR_COLOR_MAX = 9;

/**
 * 0x3AADC（タイプ）の値の名前。0＝男・1＝女 🔶（主人公設定の人物）。
 * 2＝ローラ・3＝子供（✅ [U] 2026-10-08 人物として表示を確認）・4＝動物は、その見た目の組の値 🟢
 */
export const BODY_KIND_NAMES = BODY_KINDS;

/** 主人公に書くとロードでクラッシュするタイプ ✅ [U] 2026-10-08（動物 4。人間の部品のままでも、下半身まで外してもクラッシュ）。選択肢に出さない */
export const BODY_KIND_CRASH: readonly number[] = [4];

export type PartValue = {
  offset: number;
  /** −1 は FFFF（なし） */
  id: number;
  models: [number, number, number, number];
  raw: string;
};

export type AppearancePartsView = {
  /** レイアウトの検証に落ちた理由。あれば読み取り専用 */
  problem: string | null;
  /** 0xFFFF は個別に設定 */
  person: number;
  secondId: number;
  hairColor: number;
  /** タイプ（体の種類）。BODY_KIND_NAMES の添字 */
  bodyKind: number;
  parts: Record<PartKind, PartValue>;
};

const hex = (bytes: Uint8Array, offset: number, length: number) =>
  Array.from(bytes.subarray(offset, offset + length), (b) =>
    b.toString(16).padStart(2, "0").toUpperCase(),
  ).join(" ");

const i16 = (u: number) => (u === 0xffff ? -1 : u);

export function readAppearanceParts(bytes: Uint8Array): AppearancePartsView | null {
  const end = APPEARANCE_PARTS_OFFSETS.parts + PART_RECORD_SIZE * PART_KINDS.length;
  if (bytes.length < end) return null;
  const parts = {} as Record<PartKind, PartValue>;
  for (const kind of PART_KINDS) {
    const offset = partOffset(kind);
    parts[kind] = {
      offset,
      id: i16(readU16(bytes, offset)),
      models: [0, 1, 2, 3].map((i) =>
        i16(readU16(bytes, offset + 4 + i * 2)),
      ) as PartValue["models"],
      raw: hex(bytes, offset, PART_RECORD_SIZE),
    };
  }
  return {
    problem: checkLayout(bytes),
    person: readU16(bytes, APPEARANCE_PARTS_OFFSETS.person),
    secondId: readU16(bytes, APPEARANCE_PARTS_OFFSETS.secondId),
    hairColor: readU8(bytes, APPEARANCE_PARTS_OFFSETS.hairColor),
    bodyKind: readU8(bytes, APPEARANCE_PARTS_OFFSETS.bodyKind),
    parts,
  };
}

function requireWritable(bytes: Uint8Array): AppearancePartsView {
  const view = readAppearanceParts(bytes);
  if (!view) throw new RangeError("ファイルが小さすぎて読めません");
  if (view.problem) throw new RangeError(view.problem);
  return view;
}

/** 0x3AADC の値をタイプの名前にする。0〜4 以外は null */
export function bodyKindName(value: number): BodyKind | null {
  return BODY_KINDS[value] ?? null;
}

/**
 * 「なし」にしていると、組み合わせによっては読み込めない部品（❓ U-19）。
 * 個別に設定で上半身・下半身を FFFF にしてエラー・クラッシュした例と、男の子（上半身 41・足元 19）で下半身なしでも読めた例がある（✅ [U] 2026-10-08）
 */
export const NONE_RISKY: readonly PartKind[] = ["upper", "lower"];

/** 「なし」を選べる部品。通常モードでは人物の部品で「なし」があり得る種類だけ、上級者モードではどれでも */
export const NONE_ALLOWED: Readonly<Record<PartKind, boolean>> = Object.fromEntries(
  PART_KINDS.map((k) => [k, PERSONS.some((p) => p.parts[k] === null)]),
) as Record<PartKind, boolean>;

/**
 * タイプがローラ（2）・子供（3）のときに通常モードで選べる部品（ユーザー判断 2026-10-09。表から引かず決め打ち）。
 * 名前のない部品で、層の形がそのタイプのもの（ローラ・男の子・女の子）🟢。見た目はゲーム内で確認 ✅ [U] 2026-10-08。
 * 部品だけを書いたときの反映は、顔・髪型 ✅ [U]、上半身・足元は要ゲーム内確認（U-19）。
 * 手（ローラ 1・子供 12、🔶）は、手の欄が通常モードに出ないので入れない。下半身・小物はその見た目の部品がなく「なし」だけ
 */
export const BODY_KIND_PARTS: Readonly<Record<number, Partial<Record<PartKind, readonly number[]>>>> =
  {
    2: { upper: [6], face: [5], hair: [5], feet: [4] },
    3: { upper: [41, 75, 76, 77], face: [27, 36], hair: [27, 28], feet: [19, 23] },
  };

/**
 * 部品の番号を検証する。−1 はなし。
 * どのモードでも：表にない番号（モデルの値が決まらない）とクラッシュする部品は拒否する。
 * 通常モード：
 * - タイプが男・女：名前のある部品で、部品の性別の指定がないか主人公のタイプと同じもの（ユーザー判断 2026-10-08）
 * - タイプがローラ・子供：BODY_KIND_PARTS の部品だけ（ユーザー判断 2026-10-09）。名前のある部品はどれも男用か女用なので合わない
 * 手（k＝4）は全部名前がないので上級者モードだけ。
 * 上半身・下半身の「なし」は拒否せず、partNoneWarning で警告する（ユーザー判断 2026-10-08）。
 */
export function validatePart(
  kind: PartKind,
  id: number,
  heroBodyKind: number,
  advanced: boolean,
): string | null {
  if (id === -1)
    return advanced || NONE_ALLOWED[kind] ? null : "通常モードでは「なし」にできません";
  const part = findPart(kind, id);
  if (!part) return `${id} は部品の表にありません`;
  if (part.crash) return "この部品はロードでクラッシュします";
  if (advanced) return null;
  const only = BODY_KIND_PARTS[heroBodyKind];
  if (only)
    return only[kind]?.includes(id)
      ? null
      : `通常モードでは${bodyKindName(heroBodyKind)}用の部品だけ選べます`;
  if (part.ja === "") return "名前のない部品は上級者モードでだけ選べます";
  if (part.gender !== null && part.gender !== bodyKindName(heroBodyKind))
    return "通常モードでは主人公のタイプに合う部品だけ選べます";
  return null;
}

function writePartRecord(
  bytes: Uint8Array,
  kind: PartKind,
  id: number,
  models?: readonly number[],
): void {
  const offset = partOffset(kind);
  const m = models ?? (id === -1 ? [-1, -1, -1, -1] : findPart(kind, id)!.models);
  writeU16(bytes, offset, id === -1 ? 0xffff : id);
  // +2 は意味が分からないので書かない（❓）
  m.forEach((v, i) => writeU16(bytes, offset + 4 + i * 2, v === -1 ? 0xffff : v));
}

/**
 * 上裸・下裸：服の部品のモデルの値から服の層を外し、体の層だけにする（✅ [U] 2026-10-08 の MN・FN）。
 * タイプごとの部品の番号とモデルの値。男・女だけ（ユーザー判断 2026-10-08）
 */
export const NUDE_PRESETS: Readonly<
  Record<
    "upper" | "lower",
    Readonly<Record<0 | 1, { part: number; models: readonly [number, number, number, number] }>>
  >
> = {
  // 男：117 裸（110）。女：98 コルセット（152, 180）の体の層 152
  upper: {
    0: { part: 117, models: [110, -1, -1, -1] },
    1: { part: 98, models: [152, -1, -1, -1] },
  },
  // 男：88 ふんどし（196, 255）の体の層 196。女：26 さらし（233, 276）の体の層 233
  lower: { 0: { part: 88, models: [196, -1, -1, -1] }, 1: { part: 26, models: [233, -1, -1, -1] } },
};

function nudePreset(bodyKind: number, kind: "upper" | "lower") {
  return bodyKind === 0 || bodyKind === 1 ? NUDE_PRESETS[kind][bodyKind] : null;
}

/** 上半身・下半身が今のタイプの裸のときに true */
export function isNude(view: AppearancePartsView, kind: "upper" | "lower"): boolean {
  const p = nudePreset(view.bodyKind, kind);
  return (
    p !== null &&
    view.parts[kind].id === p.part &&
    view.parts[kind].models.every((m, i) => m === p.models[i])
  );
}

/** 上半身・下半身を裸にし、人物の番号を「個別に設定」にする。タイプが男・女のときだけ */
export function writeNude(bytes: Uint8Array, kind: "upper" | "lower"): void {
  const view = requireWritable(bytes);
  const p = nudePreset(view.bodyKind, kind);
  if (!p) throw new RangeError("裸にできるのはタイプが男・女のときだけです");
  writeU16(bytes, APPEARANCE_PARTS_OFFSETS.person, PERSON_CUSTOM);
  writePartRecord(bytes, kind, p.part, p.models);
}

/** その部品が「なし」のときの警告文（ユーザー判断 2026-10-08。止めない）。なければ null */
export function partNoneWarning(kind: PartKind, id: number): string | null {
  return id === -1 && NONE_RISKY.includes(kind)
    ? "「なし」にしていると、組み合わせによっては読み込めないかもしれません"
    : null;
}

/** 部品1つを書き、人物の番号を「個別に設定」にする（✅ [U] 2026-10-08 の手順） */
export function writePart(bytes: Uint8Array, kind: PartKind, id: number, advanced = false): void {
  const view = requireWritable(bytes);
  const error = validatePart(kind, id, view.bodyKind, advanced);
  if (error) throw new RangeError(error);
  writeU16(bytes, APPEARANCE_PARTS_OFFSETS.person, PERSON_CUSTOM);
  writePartRecord(bytes, kind, id);
}

/** 層の番号（0〜3）。部品の組の +4 + 2·layer */
export const LAYER_COUNT = 4;

/**
 * 層（モデルの値）1つを検証する。上級者モードだけ（ユーザー判断 2026-10-08）。
 * 値はテクスチャの番号で、形は部品の番号で決まる（✅ [U] 2026-10-08）。
 * −1（なし）か、その部品のその層の形の色違いだけを許す。別の形のテクスチャは崩れる（✅ [U] 髪型・足元）
 */
export function validateLayer(
  kind: PartKind,
  partId: number,
  layer: number,
  value: number,
  advanced: boolean,
): string | null {
  if (!advanced) return "層の組み合わせは上級者モードでだけ変更できます";
  if (!Number.isInteger(layer) || layer < 0 || layer >= LAYER_COUNT)
    return `層は 0〜${LAYER_COUNT - 1} です`;
  if (partId === -1) return "部品が「なし」のときは層を選べません。先に部品を選んでください";
  const part = findPart(kind, partId);
  if (!part) return `${partId} は${PART_KIND_LABELS[kind]}の表にない部品です`;
  const def = part.layers[layer];
  if (!def) return `この部品には層${layer + 1}がありません`;
  if (value === -1 || def.textures.includes(value)) return null;
  return `${value} は層${layer + 1}（${def.mesh}）の色違いではありません`;
}

/**
 * 部品の層（モデルの値）1つだけを書き、人物の番号を「個別に設定」にする。部品の番号とほかの層は変えない。
 * なし（FFFF）にするとその層が消える（足元の層2で履物が消えた ✅ [U] 2026-10-08）
 */
export function writeLayer(
  bytes: Uint8Array,
  kind: PartKind,
  layer: number,
  value: number,
  advanced = false,
): void {
  const view = requireWritable(bytes);
  const error = validateLayer(kind, view.parts[kind].id, layer, value, advanced);
  if (error) throw new RangeError(error);
  writeU16(bytes, APPEARANCE_PARTS_OFFSETS.person, PERSON_CUSTOM);
  writeU16(bytes, partOffset(kind) + 4 + layer * 2, value === -1 ? 0xffff : value);
}

/** 部品の層が、その部品の標準の値（表の save_models）と違うときに true。表にない部品は false */
export function layersCustomized(kind: PartKind, part: PartValue): boolean {
  if (part.id === -1) return false;
  const entry = findPart(kind, part.id);
  return entry !== undefined && part.models.some((m, i) => m !== entry.models[i]);
}

export function validateHairColor(value: number, advanced: boolean): string | null {
  if (!Number.isInteger(value) || value < 0 || value > 255) return "0〜255の整数を入力してください";
  if (!advanced && (value < HAIR_COLOR_MIN || value > HAIR_COLOR_MAX))
    return `通常モードでは${HAIR_COLOR_MIN}〜${HAIR_COLOR_MAX}を選んでください`;
  return null;
}

/** 髪の色を書き、人物の番号を「個別に設定」にする（人物を指している間は人物の色で表示されるため ✅ [U]） */
export function writeHairColor(bytes: Uint8Array, value: number, advanced = false): void {
  requireWritable(bytes);
  const error = validateHairColor(value, advanced);
  if (error) throw new RangeError(error);
  writeU16(bytes, APPEARANCE_PARTS_OFFSETS.person, PERSON_CUSTOM);
  writeU8(bytes, APPEARANCE_PARTS_OFFSETS.hairColor, value);
}

/** タイプだけを書く。上級者モードだけ（ユーザー判断 2026-10-08）。🔶 タイプに合わない部品と組み合わさると表示が崩れるおそれがある */
export function writeBodyKind(bytes: Uint8Array, value: number, advanced: boolean): void {
  requireWritable(bytes);
  if (!advanced)
    throw new RangeError("タイプは上級者モードでだけ変更できます。通常は人物を選んでください");
  if (!Number.isInteger(value) || value < 0 || value > 255)
    throw new RangeError("0〜255の整数を入力してください");
  if (BODY_KIND_CRASH.includes(value))
    throw new RangeError(`タイプ ${value}（${bodyKindName(value)}）はロードでクラッシュします`);
  writeU8(bytes, APPEARANCE_PARTS_OFFSETS.bodyKind, value);
}

/** 身長の倍率（低い・ふつう・高い ✅ [U]） */
const HEIGHT_RATIOS = [0.9, 1, 1.1];

/**
 * 人物を選ぶ（✅ [U] 2026-10-08 H1・H2）。人物の番号・0x3AAD6・タイプ・身長・髪の色・全部の部品とモデルの値を、その人物の値で書く。
 * 身長は、今の人物の身長に対する低い・高いの倍率を引き継ぐ（今が個別に設定のときや倍率が分からないときはふつう）。体型・肌色は変えない。
 * 主人公設定に出ない見た目の組（ローラ・男の子・女の子 ✅ [U]）も、どのモードでも選べる（ユーザー判断 2026-10-09）。
 */
export function writePerson(bytes: Uint8Array, personId: number): void {
  const view = requireWritable(bytes);
  const person = findPerson(personId);
  if (!person) throw new RangeError(`${personId} は人物の表にありません`);
  const current = findPerson(view.person);
  const height = readF32(bytes, APPEARANCE_PARTS_OFFSETS.height);
  const ratio = current
    ? (HEIGHT_RATIOS.find((r) => Math.abs(height - current.height * r) < 0.01) ?? 1)
    : 1;
  writeU16(bytes, APPEARANCE_PARTS_OFFSETS.person, person.id);
  writeU16(bytes, APPEARANCE_PARTS_OFFSETS.secondId, person.secondId ?? 0xffff);
  writeU8(bytes, APPEARANCE_PARTS_OFFSETS.hairColor, person.hairColor);
  writeU8(bytes, APPEARANCE_PARTS_OFFSETS.bodyKind, person.bodyKind);
  writeF32(bytes, APPEARANCE_PARTS_OFFSETS.height, person.height * ratio);
  for (const kind of PART_KINDS) writePartRecord(bytes, kind, person.parts[kind] ?? -1);
}
