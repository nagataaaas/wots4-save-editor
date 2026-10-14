// なりわいの状態の表と、クリア数・受注中の ID。出典：docs/save_format/chunks/occupation。
//
//   0x33A4 + id*2  u16 × 256  なりわい ID ごとの記録（ID は datatable/occupation/occupation.csv、🟢 3〜212 の170件）
//     ✅ [U] 2026-10-07 周回をまたぐ統計としてゲーム内に出る（今の周回の進み具合ではない）
//     FFFF        まだ出ていない ✅
//     0           出た・未クリア 🔶（同心の「出頭命令」171 は受注の前から 0。FFFF のなりわいは受注で 0 になる ✅）
//     1 以上      これまでの周回を通してクリアした回数 ✅（受注・クリアの差分 209〜212。全 ID の合計がクリア数に等しい 🟢）
//     ✅ 209 を 1 にすると、なりわい一覧でクリア済みになった。FFFF・0 への書き込みの反映は要ゲーム内確認
//     🔶 上限の 999 は妥当性検証のための仮の値
//   0x433A6  u16  クリアしたなりわいの数（状態の表の合計）🟢。揃っていないときの動作は ❓
//   0x45F40  14 B  クリアのたびに変わる値 ❓（意味は分からない。周回の初期化で 0 🟢）
//   0x45F4E  u16  受注中のなりわいの ID。受注していなければ 0 🟢（ここでは読むだけ）
//     0x45F4E〜0x4626D は受注中のなりわいの表（16 B × 50 件）🟢。周回の初期化で 0
//     受注中の情報（0x45F4E〜0x45F55）の書き込みと、受注にあわせて書くなりわいのフラグは occupation-accept.ts にまとめる
//
// 連続なりわいの進み具合は状態の表ではなく、なりわいのフラグ（0x011C + 番号、townsfolk.ts）にある。
//
// 固定オフセットで読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU16, writeU16 } from "./binary";
import { type EditOpts, type ViewStatus } from "./field";
import { assertWritable, checkLayout } from "./layout";
import { occupationById } from "./master/occupation-names";

export const OCCUPATION_STATE_OFFSET = 0x33a4;
export const OCCUPATION_STATE_COUNT = 256;
/** ✅ まだ出ていない */
export const OCCUPATION_NOT_APPEARED = 0xffff;
/** 🔶 クリア回数の上限（仮の値。妥当性検証と通常モードの上限に使う） */
export const OCCUPATION_CLEAR_MAX = 999;

/** 🟢 クリアしたなりわいの数 */
export const OCCUPATION_CLEAR_COUNT_OFFSET = 0x433a6;
/** 🟢 受注中のなりわいの ID（読むだけ。書き込みは occupation-accept.ts） */
export const OCCUPATION_ACCEPTED_OFFSET = 0x45f4e;
/** 🟢 受注中のなりわいの表（16 B × 50 件、0x45F4E〜0x4626D）。1件目の +0 が OCCUPATION_ACCEPTED_OFFSET */
export const OCCUPATION_ACCEPTED_RECORD_BYTES = 16;
export const OCCUPATION_ACCEPTED_RECORD_COUNT = 50;
/** 受注中のなりわいの表の終わり（含まない） */
export const OCCUPATION_ACCEPTED_TABLE_END = OCCUPATION_ACCEPTED_OFFSET + OCCUPATION_ACCEPTED_RECORD_BYTES * OCCUPATION_ACCEPTED_RECORD_COUNT;
/** ❓ なりわいのクリアで変わる値（14 B、0x45F40〜0x45F4D。意味は分かっていない）。🟢 周回の初期化で 0 */
export const OCCUPATION_CLEAR_VALUES_OFFSET = 0x45f40;

export function occupationStateOffset(id: number): number {
  if (!Number.isInteger(id) || id < 0 || id >= OCCUPATION_STATE_COUNT) throw new RangeError(`なりわいが範囲外です`);
  return OCCUPATION_STATE_OFFSET + id * 2;
}

/** problem は、ファイルサイズか状態の表の値が想定外のとき（位置がずれている可能性がある） */
export type OccupationView = ViewStatus & {
  /** ID ごとの状態（OCCUPATION_STATE_COUNT 個） */
  states: number[];
  clearCount: number;
  /** 状態の表の合計（FFFF を除く） */
  stateSum: number;
  accepted: number;
};

const isValidState = (v: number) => v === OCCUPATION_NOT_APPEARED || v <= OCCUPATION_CLEAR_MAX;

export type OccupationStateKind = "hidden" | "open" | "cleared";
/** ✅ FFFF とクリア回数、🔶 0＝出た・未クリア（chunks/occupation）。 */
export const occupationStateKind = (value: number): OccupationStateKind =>
  value === OCCUPATION_NOT_APPEARED ? "hidden" : value === 0 ? "open" : "cleared";
export const occupationValueForKind = (kind: OccupationStateKind, current: number): number =>
  kind === "hidden" ? OCCUPATION_NOT_APPEARED : kind === "open" ? 0 : occupationStateKind(current) === "cleared" ? current : 1;

export function sumClears(states: readonly number[]): number {
  return states.reduce((sum, v) => (v === OCCUPATION_NOT_APPEARED ? sum : sum + v), 0);
}

export function readOccupations(bytes: Uint8Array): OccupationView {
  if (bytes.byteLength < OCCUPATION_ACCEPTED_OFFSET + 2) throw new RangeError("ファイルが小さすぎてなりわいを読めません");
  const states = Array.from({ length: OCCUPATION_STATE_COUNT }, (_, id) => readU16(bytes, OCCUPATION_STATE_OFFSET + id * 2));
  const bad = states.findIndex((v) => !isValidState(v));
  const layoutProblem =
    checkLayout(bytes) ??
    (bad >= 0
      ? `なりわいの記録に想定外の値があります。位置がずれている可能性があるため読み取り専用にしています。`
      : null);
  return {
    warnings: [],
    states,
    clearCount: readU16(bytes, OCCUPATION_CLEAR_COUNT_OFFSET),
    stateSum: sumClears(states),
    accepted: readU16(bytes, OCCUPATION_ACCEPTED_OFFSET),
    problem: layoutProblem,
  };
}

/**
 * 通常モードは、表にある ID に FFFF か 0〜999 だけ。上級者モードは任意の ID・u16。
 * 今の値と同じ値の書き戻しは許す。問題がなければ null
 */
export function validateOccupationState(id: number, value: number, current: number, opts: EditOpts): string | null {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) return `指定できる範囲を超えています: ${value}`;
  if (opts.advanced || value === current) return null;
  if (!occupationById(id)) return `表にないなりわいです`;
  if (!isValidState(value)) return `クリア回数は ${OCCUPATION_CLEAR_MAX} 回までです: ${value}`;
  return null;
}

function assertEditable(bytes: Uint8Array): void {
  const problem = readOccupations(bytes).problem;
  if (problem) throw new RangeError(problem);
}

/** id の状態（2 B）だけを書く */
export function writeOccupationState(bytes: Uint8Array, id: number, value: number, opts: EditOpts): void {
  assertWritable(bytes);
  assertEditable(bytes);
  const offset = occupationStateOffset(id);
  const error = validateOccupationState(id, value, readU16(bytes, offset), opts);
  if (error) throw new RangeError(error);
  writeU16(bytes, offset, value);
}

/** ids の状態をまとめて書く（通常モードの範囲） */
export function writeOccupationStates(bytes: Uint8Array, ids: readonly number[], value: number | OccupationStateKind): void {
  assertWritable(bytes);
  const view = readOccupations(bytes);
  if (view.problem) throw new RangeError(view.problem);
  const offsets = ids.map(occupationStateOffset);
  const values = ids.map(id => typeof value === "number" ? value : occupationValueForKind(value, view.states[id]));
  for (const [i, id] of ids.entries()) {
    const problem = validateOccupationState(id, values[i], view.states[id], { advanced: false });
    if (problem) throw new RangeError(problem);
  }
  for (const [i, offset] of offsets.entries()) writeU16(bytes, offset, values[i]);
}

/** クリア数（0x433A6）を状態の表の合計に揃える */
export function syncClearCount(bytes: Uint8Array): void {
  assertEditable(bytes);
  const sum = readOccupations(bytes).stateSum;
  if (sum > 0xffff) throw new RangeError(`クリア回数の合計が大きすぎて書けません: ${sum}`);
  writeU16(bytes, OCCUPATION_CLEAR_COUNT_OFFSET, sum);
}
