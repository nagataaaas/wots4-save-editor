// 道場（主人公が師範の道場）。出典：docs/save_format/chunks/dojo（🟢。実セーブの弟子 19 人・点 74 と構造が一致 ✅）。
//
// 0x14064 u8   🟢 道場破りが来ている（0／1）
// 0x14065 u8   🟢 弟子の数（0〜20）
// 0x14066 u8   🟢 道場の評判の段階＝☆の数（0〜5）。点を REPUTATION_RANGES で区切った値
// 0x14067      🟢 詰め物
// 0x14068 u16  🟢 評判の点。弟子ごとの点（+0x0A）の合計
// 0x1406A i16  🟢 来ている道場破りの人数（0〜8）
// 0x1406C      🟢 弟子の名簿 12 B × 20。空きは +0x00 が −1（12 B すべて FF か、+0x0B だけ 0）
//   +0x00 i32 種類（町の人の種類。datatable/npc/pupil.csv）
//   +0x04 i32 名前（npc-name.csv。種類の name 列と同じ値）
//   +0x08 u16 見た目（npc-look.csv。種類の looks 列の候補）
//   +0x0A u8  その弟子の評判の点（種類の point 列）
//   +0x0B u8  今いる地域に出した印（地域を移ると 0。セーブではふつう 0）
// 0x1415C i32 × 8 🟢 来ている道場破りの種類（空きは −1）。どれも名前は「道場破り」
//
// ゲームは弟子入り・破門のたびに数・点・段階を決め直す（🟢）。エディタも名簿を書いたら同じ規則で決め直す。
// 段階 5 になったときにゲームが立てる特典 57（0x43351）は、ここでは書かない（次に弟子が増減したときにゲームが立てる 🟢）。
// 名簿の書き換え・道場破りを帰す操作がゲームに反映されるかは要ゲーム内確認。
import { tr, type Localized } from "@/lib/i18n";
import { readI16, readU16, readU8, writeI16, writeI32, writeU16, writeU8, recordCodec } from "./binary";
import { type EditOpts, type ViewStatus } from "./field";
import { assertWritable, checkLayout } from "./layout";
import { PUPIL_TABLE } from "./master/dataset/pupil";
import { NPC_LOOK_TABLE } from "./master/dataset/npc-look";
import { lookup } from "./master/lookup";

export const DOJO_OFFSET = 0x14064;
export const DOJO_END = 0x1417b;
export const RAID_OFFSET = 0x14064;
export const PUPIL_COUNT_OFFSET = 0x14065;
export const RANK_OFFSET = 0x14066;
export const POINTS_OFFSET = 0x14068;
export const RAIDER_COUNT_OFFSET = 0x1406a;
export const PUPILS_OFFSET = 0x1406c;
export const PUPIL_SIZE = 12;
export const PUPIL_MAX = 20;
export const RAIDERS_OFFSET = 0x1415c;
export const RAIDER_MAX = 8;
export const REPUTATION_RANK_MAX = 5;

/** 🟢 弟子の種類・道場破りの種類（i32）の空き */
const EMPTY = -1;

/** 🟢 弟子のレコード（chunks/dojo）。読み書き・再集計・InfoTip で共有。 */
export const PUPIL_CODEC = recordCodec({
  kind: { rel: 0, type: 'i32' },
  name: { rel: 4, type: 'i32' },
  look: { rel: 8, type: 'u16' },
  point: { rel: 0x0a, type: 'u8' },
  shown: { rel: 0x0b, type: 'u8' },
});

/** 🟢 評判の段階ごとの点の範囲（段階 0〜5） */
export const REPUTATION_RANGES: readonly (readonly [number, number])[] = [
  [0, 4],
  [5, 24],
  [25, 39],
  [40, 54],
  [55, 70],
  [71, 9999],
];

export type PupilKind = {
  id: number;
  label: Localized;
  sex: "f" | "m";
  /** 評判の点（1〜5） */
  point: number;
  /** 名前の ID */
  name: number;
  /** 見た目の候補 */
  looks: readonly number[];
};

/** 🟢 弟子にできる町の人の種類（datatable/npc/pupil.csv） */
export const PUPIL_KINDS: readonly PupilKind[] = Object.values(PUPIL_TABLE).map((r) => ({
  id: r.id_dec,
  label: { ja: r.name_ja, en: r.name_en },
  sex: r.sex === "f" ? "f" : "m",
  point: r.point,
  name: r.name,
  looks: r.looks,
}));

export function pupilKind(id: number): PupilKind | undefined {
  return PUPIL_KINDS.find((k) => k.id === id);
}

/** 🟢 見た目の名前（npc-look.csv。今の言語）。表にない値は undefined */
export function lookLabel(look: number): string | undefined {
  const row = lookup(NPC_LOOK_TABLE, look);
  return row ? tr({ ja: row.name_ja, en: row.name_en }) : undefined;
}

/** 🟢 見た目の一覧（上級者モードで種類の候補以外も選べる） */
export const ALL_LOOKS: readonly number[] = Object.values(NPC_LOOK_TABLE).map((l) => l.id_dec);

export type PupilView = {
  kind: number;
  name: number;
  look: number;
  point: number;
  shown: number;
};

export type DojoView = ViewStatus & {
  raid: boolean;
  count: number;
  rank: number;
  points: number;
  raiderCount: number;
  /** 空きは null */
  pupils: (PupilView | null)[];
};

export function pupilOffset(index: number): number {
  return PUPILS_OFFSET + index * PUPIL_SIZE;
}

/**
 * 🟢 空きは +0x00 が −1（ゲームはこれだけで空きを判定する）。
 * 破門すると 12 B すべて FF になるが、地域を移るたびにゲームが空きの枠も含めて全 20 枠の +0x0B を 0 にするので、
 * 空きの枠は FF ×11 + 00 にもなる（✅ 実セーブ）
 */
function isEmptySlot(bytes: Uint8Array, index: number): boolean {
  return PUPIL_CODEC.readField(bytes, pupilOffset(index), 'kind') === EMPTY;
}

/** 点から段階を決める（🟢 ゲームと同じ。どの範囲にも入らなければ今の段階のまま） */
export function rankForPoints(points: number, current: number): number {
  const i = REPUTATION_RANGES.findIndex(([lo, hi]) => lo <= points && points <= hi);
  return i < 0 ? current : i;
}

export function readDojo(bytes: Uint8Array): DojoView {
  if (bytes.byteLength <= DOJO_END)
    throw new RangeError(tr({ ja: "ファイルが小さすぎて道場の領域を読めません", en: "The file is too small to read the dojo" }));
  const pupils = Array.from({ length: PUPIL_MAX }, (_, i): PupilView | null => {
    if (isEmptySlot(bytes, i)) return null;
    const o = pupilOffset(i);
    return PUPIL_CODEC.read(bytes, o);
  });
  const view: DojoView = {
    warnings: [],
    raid: readU8(bytes, RAID_OFFSET) !== 0,
    count: readU8(bytes, PUPIL_COUNT_OFFSET),
    rank: readU8(bytes, RANK_OFFSET),
    points: readU16(bytes, POINTS_OFFSET),
    raiderCount: readI16(bytes, RAIDER_COUNT_OFFSET),
    pupils,
    problem: null,
  };
  view.problem = checkLayout(bytes) ?? validateDojo(bytes, view);
  return view;
}

function validateDojo(bytes: Uint8Array, view: DojoView): string | null {
  const raid = readU8(bytes, RAID_OFFSET);
  if (raid > 1) return tr({ ja: "道場破りの状態が想定外の値です", en: "Unexpected challenger status" });
  const occupied = view.pupils.filter((p) => p !== null);
  if (view.count > PUPIL_MAX) return tr({ ja: "弟子の数が多すぎます", en: "Too many pupils" });
  if (view.count !== occupied.length)
    return tr({ ja: "弟子の数と名簿の人数が合いません", en: "The number of pupils does not match the roster" });
  if (view.rank > REPUTATION_RANK_MAX) return tr({ ja: "評判の段階が想定外の値です", en: "Unexpected reputation level" });
  if (view.raiderCount < 0 || view.raiderCount > RAIDER_MAX)
    return tr({ ja: "道場破りの人数が想定外の値です", en: "Unexpected number of challengers" });
  if (occupied.some((p) => p.point < 1 || p.point > 5)) return tr({ ja: "名簿に想定外の値があります", en: "The roster contains an unexpected value" });
  const sum = occupied.reduce((s, p) => s + p.point, 0);
  if (sum !== view.points)
    return tr({ ja: "評判の点と名簿の合計が合いません", en: "Reputation points do not match the roster total" });
  return null;
}

function assertEditable(bytes: Uint8Array): DojoView {
  const view = readDojo(bytes);
  if (view.problem) throw new RangeError(view.problem);
  return view;
}

/** 名簿から数・点・段階を決め直す（🟢 ゲームが弟子入り・破門のたびにすること） */
function recompute(bytes: Uint8Array): void {
  let count = 0;
  let points = 0;
  for (let i = 0; i < PUPIL_MAX; i++) {
    if (isEmptySlot(bytes, i)) continue;
    count++;
    points += PUPIL_CODEC.readField(bytes, pupilOffset(i), 'point');
  }
  writeU8(bytes, PUPIL_COUNT_OFFSET, count);
  writeU16(bytes, POINTS_OFFSET, points);
  writeU8(bytes, RANK_OFFSET, rankForPoints(points, readU8(bytes, RANK_OFFSET)));
}

/**
 * 枠 index の弟子の種類を書く。null なら空きにする。
 * 名前・評判の点は種類で決まる値を書く。見た目は今の見た目が新しい種類の候補にあれば残し、なければ候補の先頭にする。
 * 書いたあと、弟子の数・評判の点・段階を決め直す
 */
export function writePupilKind(bytes: Uint8Array, index: number, kindId: number | null): void {
  assertWritable(bytes);
  assertEditable(bytes);
  if (!Number.isInteger(index) || index < 0 || index >= PUPIL_MAX) throw new RangeError(tr({ ja: "枠の番号が範囲外です", en: "Slot is out of range" }));
  const o = pupilOffset(index);
  if (kindId === null) {
    bytes.fill(0xff, o, o + PUPIL_SIZE);
    recompute(bytes);
    return;
  }
  const kind = pupilKind(kindId);
  if (!kind) throw new RangeError(tr({ ja: "弟子にできない種類です", en: "This type cannot be a pupil" }));
  const current = isEmptySlot(bytes, index) ? null : PUPIL_CODEC.readField(bytes, o, 'look');
  const look = current !== null && kind.looks.includes(current) ? current : kind.looks[0];
  PUPIL_CODEC.writeField(bytes, o, 'kind', kind.id);
  PUPIL_CODEC.writeField(bytes, o, 'name', kind.name);
  PUPIL_CODEC.writeField(bytes, o, 'look', look);
  PUPIL_CODEC.writeField(bytes, o, 'point', kind.point);
  PUPIL_CODEC.writeField(bytes, o, 'shown', 0);
  recompute(bytes);
}

/**
 * 見た目の検証。通常モードは種類の候補だけ、上級者モードは見た目の表（npc-look.csv）にあるもの。
 * 今の値の書き戻しは許す
 */
export function validatePupilLook(kindId: number, look: number, current: number, opts: EditOpts): string | null {
  if (!Number.isInteger(look) || look < 0 || look > 0xffff) return tr({ ja: "範囲外の値です", en: "Value is out of range" });
  if (look === current) return null;
  if (opts.advanced) return lookLabel(look) !== undefined ? null : tr({ ja: "見た目の表にない値です", en: "Not in the list of looks" });
  return pupilKind(kindId)?.looks.includes(look)
    ? null
    : tr({ ja: "この種類の見た目ではありません（上級者モードで選べます）", en: "Not a look for this type (available in Advanced mode)" });
}

export function writePupilLook(bytes: Uint8Array, index: number, look: number, opts: EditOpts): void {
  assertWritable(bytes);
  const view = assertEditable(bytes);
  const pupil = view.pupils[index];
  if (!pupil) throw new RangeError(tr({ ja: "空きの枠です", en: "This slot is empty" }));
  const error = validatePupilLook(pupil.kind, look, pupil.look, opts);
  if (error) throw new RangeError(error);
  PUPIL_CODEC.writeField(bytes, pupilOffset(index), 'look', look);
}

/**
 * 道場破りが来ているかを書く。
 * 来ていないにするときは、ゲームが追い払ったときと同じく来ている印・人数を 0、道場破りの枠を −1 にする（🟢）。
 * 来ているにするときは印だけを 1 にする。道場破りの種類と人数は、道場に入るたびにゲームが評判の段階ごとの組から
 * 選び直して書くので（🟢）、ここでは書かない。弟子がいないと、ゲームは場面が変わったときに印を消す（🟢）ので書かない
 */
export function writeRaid(bytes: Uint8Array, on: boolean): void {
  assertWritable(bytes);
  const view = assertEditable(bytes);
  if (!on) {
    writeU8(bytes, RAID_OFFSET, 0);
    writeI16(bytes, RAIDER_COUNT_OFFSET, 0);
    for (let j = 0; j < RAIDER_MAX; j++) writeI32(bytes, RAIDERS_OFFSET + j * 4, EMPTY);
    return;
  }
  if (view.raid) return;
  if (view.count === 0) throw new RangeError(tr({ ja: "弟子がいないと道場破りは来ません", en: "Challengers do not come when there are no pupils" }));
  writeU8(bytes, RAID_OFFSET, 1);
}
