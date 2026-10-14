// 空の約束の枠に、夜の約束を作る。出典：docs/save_format/chunks/night-visit「約束の作り方」。
//
// 🟢 約束の枠 0x14038〜 に書く値（ゲームが約束するときと同じ）：
//   +0x00〜+0x1B  組の表（datatable/place/night-visit-row.csv）の1行の 28 B。+0x04 だけ相手の種類で上書きする
//   +0x1C u32  名前。名前のある相手は決まった ID、町の人は名前の候補（7000 台か 8000 台）のうち相手と同じ性別のもの
//   +0x20 u32  見た目。相手の種類ごとの候補から
//   +0x24 u8   年齢。名前のある相手は決まった値（255＝？）、町の人は十の位が決まっていて一の位が 0〜9
//   +0x25 u8   血液型。決まっていなければ 1〜4
//   +0x26 u16  FFFF
//   +0x28 u16  いまの経過日数 0x0BD8（違う日にすると、日付が変わったときにすっぽかしで消える）
//   +0x2A・+0x2B は書かない（初めての説明を見たかのビットなど。前の値を残す）
// 相手の種類は datatable/npc/night-visit-partner.csv（🟢）。
// ✅ [U] 2026-10-10：女中（町の女性）・町人（町の男性）・朱美の約束をこの作り方で書き、夜這いできた。
//    ほかの名前のある相手（先生・メリンダ・三姉妹・ローラ・さよ）は、ゲームが作った約束の実データと同じ値。
//    名前のある男性7人は 🟢 だけで、ゲーム内では確かめていない（要ゲーム内確認）。
// 🟢 町の人の組は、相手のまとまり（1・2）の行から、段階 0x13E30 の行（30% ずつ1段下がる）が選ばれる。
//    通常モードでは段階 0x13E30 以下の行だけ、上級者モードではまとまりの全行を選べる。
//    上級者モードでは、名前のある相手も含めて、場所と配置（+0x08・+0x0A）を場所で使える配置の組に上書きできる
//    （🟢 夜這いの場は場所と配置だけで作られ、相手は枠の値から作り直される）。
// 名前・見た目・年齢・血液型は、ゲームが選ぶ候補（defaultSpec・randomSpec）とは別に、約束の編集欄と同じ範囲で選べる
//    （✅ [U] 型・名前・見た目は別々に効く。見た目は datatable/npc/npc-look.csv の表）。
// 🟢 名前のある相手が死んでいても、約束を止める判定はない。エディタでは警告だけ出す。
//
// 書くのは +0x04 が FFFFFFFF（約束なし）の枠だけ。ファイルサイズが 0x48BB0 のときだけ書く。
import { readU16 } from "./binary";
import { type EditOpts } from "./field";
import { assertWritable } from "./layout";
import { DATE_OFFSETS } from "./scenario-date";
import { NIGHT_VISIT_PARTNER_TABLE } from "./master/dataset/night-visit-partner";
import { NIGHT_VISIT_ROW_TABLE } from "./master/dataset/night-visit-row";
import { NPC_NAMES } from "./master/npc-names";
import { PLACE_LAYOUTS, PROMISE_OFFSET, PROMISE_CODEC, validatePersonValue, layoutsForPlace, currentStage, createProblem } from "./yobai";
export { STAGE_MAX, currentStage, createProblem, partnerDeathWarning } from "./yobai";

/** 書くバイト数（+0x00〜+0x29） */
export const PROMISE_WRITE_LENGTH = 0x2a;

export type PromiseRow = {
  index: number;
  /** 段階。特別な相手の行は null */
  stage: number | null;
  /** まとまり（0＝特別な相手、1・2＝町の人、3＝使われない） */
  group: number;
  place: number;
  layout: number;
  /** 特別な相手の行の相手の名前 */
  partnerName: string;
  /** +0x00〜+0x1B */
  bytes: readonly number[];
};

export const PROMISE_ROWS: readonly PromiseRow[] = Object.values(NIGHT_VISIT_ROW_TABLE).map((r) => ({
  index: r.id_dec,
  stage: r.stage,
  group: r.group,
  place: r.place,
  layout: r.layout,
  partnerName: r.name_ja,
  bytes: r.save_bytes_le,
}));

export type PromisePartner = {
  /** 相手の種類（約束の枠の +0x04） */
  type: number;
  label: string;
  kind: "special" | "town";
  sex: "m" | "f";
  /** 町の人の名前の候補（7＝7000 台、8＝8000 台）。名前のある相手は null */
  nameList: 7 | 8 | null;
  /** 名前のある相手の名前の ID */
  name: number | null;
  looks: readonly number[];
  age: number;
  ageRandom: boolean;
  /** 0＝1〜4 から選ぶ */
  blood: number;
  group: number;
  /** 名前のある相手の行 */
  row: number | null;
  note: string;
};

export const PROMISE_PARTNERS: readonly PromisePartner[] = Object.values(NIGHT_VISIT_PARTNER_TABLE).map((p) => ({
  type: p.id_dec,
  label: p.name_ja,
  kind: p.kind === "special" ? "special" : "town",
  sex: p.sex === "f" ? "f" : "m",
  nameList: p.name_list === 7 || p.name_list === 8 ? p.name_list : null,
  name: p.name,
  looks: p.looks,
  age: p.age,
  ageRandom: p.age_random === 1,
  blood: p.blood,
  group: p.group,
  row: p.row,
  note: p.note_ja,
}));

export function promisePartner(type: number): PromisePartner | undefined {
  return PROMISE_PARTNERS.find((p) => p.type === type);
}

export function requirePromisePartner(type: number): PromisePartner {
  const partner = promisePartner(type);
  if (!partner) throw new RangeError("約束できる相手の種類ではありません");
  return partner;
}

/** 🟢 名前のある相手の種類と、約束に付随する注意。 */
export const SPECIAL_PARTNERS = { mayu: 448, chika: 449, yuri: 450, laura: 454 } as const;
export const PARTNER_NOTES: Readonly<Record<number, string>> = {
  [SPECIAL_PARTNERS.mayu]: "ゲームで約束すると、その人の拷問のポイントが 0 になります（ここでは 0 になりません）",
  [SPECIAL_PARTNERS.chika]: "ゲームで約束すると、その人の拷問のポイントが 0 になります（ここでは 0 になりません）",
  [SPECIAL_PARTNERS.yuri]: "ゲームで約束すると、その人の拷問のポイントが 0 になります（ここでは 0 になりません）",
  [SPECIAL_PARTNERS.laura]: "読み込み直すとローラの印が消えるので、褒美が「掘り出し物」にならないことがあります",
};
/** 🟢 初めの相手は女中（chunks/night-visit）。 */
export const DEFAULT_PROMISE_PARTNER_TYPE = 0x25;
export function initialPromiseSpec(stage: number): PromiseSpec {
  return defaultSpec(requirePromisePartner(DEFAULT_PROMISE_PARTNER_TYPE), stage);
}

export function layoutForPlace(place: number, current: number): number {
  const layouts = layoutsForPlace(place);
  const layout = layouts.includes(current) ? current : layouts[0];
  if (layout === undefined) throw new RangeError("この場所で使える配置がありません");
  return layout;
}

/** 選べる組（rowsFor）のうち、場所と配置が一致する組 */
export function findPromiseRow(rows: readonly PromiseRow[], place: number, layout: number): PromiseRow | undefined {
  return rows.find((r) => r.place === place && r.layout === layout);
}

/** 場所と配置を選ぶ。この相手の組にあればその組、なければ今の組のまま場所と配置だけを上書きする */
export function choosePromisePlace(spec: PromiseSpec, rows: readonly PromiseRow[], place: number, layout: number): PromiseSpec {
  const row = findPromiseRow(rows, place, layout);
  return { ...spec, ...(row ? { row: row.index, place: undefined, layout: undefined } : { place, layout }) };
}

/**
 * 場所だけを選ぶ。その場所の組のうち今の段階にいちばん近いもの、なければその場所の最初の配置。
 * 組も配置もない場所なら null（選べない場所）
 */
export function choosePromiseAt(spec: PromiseSpec, rows: readonly PromiseRow[], place: number, stage: number): PromiseSpec | null {
  const row = rows.filter(r => r.place === place)
    .sort((a, b) => Math.abs((a.stage ?? 0) - stage) - Math.abs((b.stage ?? 0) - stage))[0];
  const layout = row?.layout ?? layoutsForPlace(place)[0];
  return layout === undefined ? null : choosePromisePlace(spec, rows, place, layout);
}

/** 選べる組。名前のある相手は決まった1行。町の人はまとまりの行のうち、通常モードでは段階 stage 以下のもの */
export function rowsFor(partner: PromisePartner, stage: number, opts: EditOpts): PromiseRow[] {
  if (partner.row !== null) return PROMISE_ROWS.filter((r) => r.index === partner.row);
  return PROMISE_ROWS.filter((r) => r.group === partner.group && r.stage !== null && (opts.advanced || r.stage <= stage));
}

/** 町の人の名前の候補（7000 台・8000 台のうち相手と同じ性別）。名前のある相手は決まった1つ */
export function nameCandidates(partner: PromisePartner): number[] {
  if (partner.name !== null) return [partner.name];
  const base = partner.nameList === 8 ? 8000 : 7000;
  return NPC_NAMES.filter((n) => n.id > base && n.id <= base + 999 && n.sex === partner.sex).map((n) => n.id);
}

export function ageCandidates(partner: PromisePartner): number[] {
  if (!partner.ageRandom) return [partner.age];
  const tens = partner.age - (partner.age % 10);
  return Array.from({ length: 10 }, (_, i) => tens + i);
}

export function bloodCandidates(partner: PromisePartner): number[] {
  return partner.blood === 0 ? [1, 2, 3, 4] : [partner.blood];
}

/**
 * row は +0x00〜+0x1B に写す組。place・layout は場所（+0x08）・配置（+0x0A）の上書きで、省くと組の値。
 * 上書きは上級者モードでだけ、場所で使える配置の組（PLACE_LAYOUTS）にできる（名前のある相手を別の場所にするときなど）
 */
export type PromiseSpec = {
  type: number;
  row: number;
  place?: number;
  layout?: number;
  name: number;
  look: number;
  age: number;
  blood: number;
};

/** 実際に書く場所と配置（上書きがなければ組の値） */
export function specPlace(spec: PromiseSpec): { place: number; layout: number } {
  const row = PROMISE_ROWS.find((r) => r.index === spec.row);
  return { place: spec.place ?? row?.place ?? 0, layout: spec.layout ?? row?.layout ?? 0 };
}

/** 候補の先頭で作る（町の人の組は、いまの段階の行の先頭） */
export function defaultSpec(partner: PromisePartner, stage: number): PromiseSpec {
  const rows = rowsFor(partner, stage, { advanced: false });
  const row = rows.find((r) => r.stage === stage) ?? rows[rows.length - 1];
  return {
    type: partner.type,
    row: row.index,
    name: nameCandidates(partner)[0],
    look: partner.looks[0],
    age: ageCandidates(partner)[0],
    blood: bloodCandidates(partner)[0],
  };
}

/**
 * 🟢 ゲームと同じくじで選ぶ。町の人の組は、段階 s から 70% でそのまま、30% で1段下げる（0 より下がったら最初の段階）。
 * その段階の行から等確率で1つ。名前・見た目・年齢の一の位・血液型（決まっていなければ）も等確率
 */
export function randomSpec(partner: PromisePartner, stage: number, rand: () => number = Math.random): PromiseSpec {
  const pick = <T>(xs: readonly T[]): T => xs[Math.min(Math.floor(rand() * xs.length), xs.length - 1)];
  let row: PromiseRow;
  if (partner.row !== null) {
    row = rowsFor(partner, stage, { advanced: false })[0];
  } else {
    let s = stage;
    while (s >= 0 && rand() >= 0.7) s--;
    if (s < 0) s = stage;
    row = pick(PROMISE_ROWS.filter((r) => r.group === partner.group && r.stage === s));
  }
  return {
    type: partner.type,
    row: row.index,
    name: pick(nameCandidates(partner)),
    look: pick(partner.looks),
    age: pick(ageCandidates(partner)),
    blood: pick(bloodCandidates(partner)),
  };
}

/**
 * 約束の中身の検証。問題がなければ null。
 * 組：通常モードは段階 0x13E30 以下、上級者モードはまとまりの全行。
 * 名前・見た目・年齢・血液型：validatePersonField と同じ（通常モードは表にある値、上級者モードは型の範囲で任意）
 */
export function validateSpec(spec: PromiseSpec, stage: number, opts: EditOpts): string | null {
  const partner = promisePartner(spec.type);
  if (!partner) return "約束できる相手の種類ではありません";
  if (!rowsFor(partner, stage, opts).some((r) => r.index === spec.row))
    return opts.advanced || partner.row !== null
      ? "この相手には使えない組です"
      : "いまの段階より上の組です（上級者モードで選べます）";
  const row = PROMISE_ROWS.find((r) => r.index === spec.row)!;
  const { place, layout } = specPlace(spec);
  if (place !== row.place || layout !== row.layout) {
    if (!opts.advanced) return "この相手の組と違う場所・配置は、上級者モードでだけ選べます";
    if (!PLACE_LAYOUTS.some((p) => p.place === place && p.layout === layout))
      return "その場所で使える配置ではありません";
  }
  // 名前・見た目と声・年齢・血液型は種類とは別々に効く（✅ [U]）ので、約束の編集欄と同じ範囲で選べる。
  for (const field of ["name", "look", "age", "blood"] as const) {
    const error = validatePersonValue(field, spec[field], opts);
    if (error) return error;
  }
  return null;
}

/** 約束の枠の +0x00〜+0x29 */
export function buildPromiseBytes(spec: PromiseSpec, day: number): Uint8Array {
  const row = PROMISE_ROWS.find((r) => r.index === spec.row);
  if (!row) throw new RangeError("組の表にない行です");
  const out = new Uint8Array(PROMISE_WRITE_LENGTH);
  out.set(row.bytes, 0);
  const { place, layout } = specPlace(spec);
  const values = { type: spec.type, place, layout, name: spec.name, look: spec.look, age: spec.age, blood: spec.blood, reserved: 0xffff, day };
  for (const field of Object.keys(values) as (keyof typeof values)[]) PROMISE_CODEC.writeField(out, 0, field, values[field]);
  return out;
}

/** 空の枠に約束を作る。約束した日はいまの経過日数 0x0BD8。+0x2A 以降は変えない */
export function createPromise(bytes: Uint8Array, spec: PromiseSpec, opts: EditOpts): void {
  assertWritable(bytes);
  const problem = createProblem(bytes);
  if (problem) throw new RangeError(problem);
  const error = validateSpec(spec, currentStage(bytes), opts);
  if (error) throw new RangeError(error);
  bytes.set(buildPromiseBytes(spec, readU16(bytes, DATE_OFFSETS.dayIndex)), PROMISE_OFFSET);
}
