// なりわいの受注。受注中の情報と、受注にあわせて書くなりわいのフラグ。出典：docs/save_format/chunks/occupation・chunks/townsfolk。
//
//   0x45F4E u16  受注中のなりわいの ID（受注していなければ 0）✅
//   0x45F52 u16  受注した日（経過日数 0x0BD8 と同じ数え方）✅（1日目昼・2日目昼・2日目夜の受注の差分 2026-10-07）
//   0x45F54 u8   受注した時間帯（0x0014 と同じ）✅（同上。2＝夜を確認、1＝夕は未観察）
//   0x45F55 u8   受注中だけ FF 🔶
//   状態の表 0x33A4 + ID×2 は、FFFF なら受注で 0 になる ✅（受注の差分 2026-10-06）
//
// 受注のとき、続き物の依頼主はなりわいのフラグ（0x011C + 番号）にも書く（🟢。ACCEPT_RULES）。
//   同心 4・泥棒さん 6     n 件目を受注すると n1（✅ 同心の 1件目 171 で 11 を差分で確認）
//   極道 5・おっつぁん 7   7件目まで n1。8件目（186・205）は書かず 80 のまま
//   おっつぁんの 203・206  202・205 を終えたその場で受けるので、フラグはそのとき（61・80）のまま
//   汁部 209〜212          27＝1。28〜31 は前の結果を汁部に話したときに 0 に戻っている（✅ 209 の受注の差分）
//   賭場・女将・最後のなりわい（163〜170・207・208）、基本のなりわい（3〜161）は受注でフラグを書かない
// 受注を外すときに書く値（onRelease）は 🔶：続き物の n1 を n0（依頼する前）に戻す。ゲームで受注を破棄したときの値は ❓
//
// 受注の書き込み・外す書き込みは、この1か所にまとめる（受注中の欄、続き物の欄、汁部の欄はここを呼ぶ）。
// 書き込みの反映は要ゲーム内確認。
// ❓ U-1 判定待ちのため固定オフセットで読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU16, readU8, writeU16, writeU8 } from "./binary";
import { occupationById } from "./master/occupation-names";
import { OCCUPATION_NOT_APPEARED, occupationStateOffset, readOccupations } from "./occupation";
import { readDate } from "./scenario-date";
import { occupationFlagOffset, readTownsfolk, writeTownsfolk } from "./townsfolk";

export const ACCEPT_OFFSETS = {
  /** u16 ✅ 受注中のなりわいの ID */
  id: 0x45f4e,
  /** u16 ✅ 受注した日（経過日数） */
  day: 0x45f52,
  /** u8 ✅ 受注した時間帯 */
  slot: 0x45f54,
  /** u8 🔶 受注中だけ FF */
  active: 0x45f55,
} as const;

/** 🔶 受注中の印 */
export const ACCEPT_ACTIVE = 0xff;

/** なりわいのフラグ（番号）に書く値 */
export type FlagWrite = { flag: number; value: number };

export type AcceptRule = {
  /** 受注するときに書く（ゲームの受注のときと同じ値） */
  onAccept: readonly FlagWrite[];
  /** 🔶 受注を外すときに書く */
  onRelease: readonly FlagWrite[];
};

const NO_FLAGS: AcceptRule = { onAccept: [], onRelease: [] };

/** 続き物：受注の順に並べたなりわい ID と、受注で n1 を書く件数（それより後は書かない） */
const SERIES: readonly { flag: number; ids: readonly number[]; writes: number }[] = [
  { flag: 4, ids: [171, 172, 173, 174, 175, 176, 177, 178], writes: 8 },
  { flag: 5, ids: [179, 180, 181, 182, 183, 184, 185, 186], writes: 7 },
  { flag: 6, ids: [187, 188, 189, 190, 191, 192, 193, 194], writes: 8 },
  { flag: 7, ids: [195, 196, 197, 199, 201, 202, 204, 205], writes: 7 },
];

function buildRules(): Map<number, AcceptRule> {
  const rules = new Map<number, AcceptRule>();
  for (const { flag, ids, writes } of SERIES) {
    ids.forEach((id, i) => {
      const n = (i + 1) * 10;
      rules.set(
        id,
        i < writes
          ? { onAccept: [{ flag, value: n + 1 }], onRelease: [{ flag, value: n }] }
          : // 8件目は受注でフラグを書かない。受けられるのは n0 のとき
            { onAccept: [{ flag, value: n }], onRelease: [] },
      );
    });
  }
  // おっつぁん：202・205 を終えたその場で 203・206 を受ける
  rules.set(203, { onAccept: [{ flag: 7, value: 61 }], onRelease: [] });
  rules.set(206, { onAccept: [{ flag: 7, value: 80 }], onRelease: [] });
  // 汁部：27＝1、28〜31＝0
  for (const id of [209, 210, 211, 212])
    rules.set(id, { onAccept: [27, 28, 29, 30, 31].map((flag) => ({ flag, value: flag === 27 ? 1 : 0 })), onRelease: [] });
  return rules;
}

/** 🟢 なりわいごとの、受注で書くフラグ。載っていないなりわいはフラグを書かない */
export const ACCEPT_RULES: ReadonlyMap<number, AcceptRule> = buildRules();

export function acceptRuleOf(id: number): AcceptRule {
  return ACCEPT_RULES.get(id) ?? NO_FLAGS;
}

/** 続き物のフラグの値（n1＝n 件目を依頼済み）が、どのなりわいの受注にあたるか */
export function seriesAcceptOf(flag: number, value: number): number | undefined {
  const series = SERIES.find((s) => s.flag === flag);
  if (!series || value % 10 !== 1) return undefined;
  const i = (value - 1) / 10 - 1;
  return i >= 0 && i < series.writes ? series.ids[i] : undefined;
}

export type AcceptedView = {
  id: number;
  day: number;
  slot: number;
  active: number;
  /** 妥当性検証に落ちた理由。あれば読み取り専用 */
  problem: string | null;
};

export function readAccepted(bytes: Uint8Array): AcceptedView {
  if (bytes.byteLength < ACCEPT_OFFSETS.active + 1) throw new RangeError("ファイルが小さすぎて受注中のなりわいを読めません");
  return {
    id: readU16(bytes, ACCEPT_OFFSETS.id),
    day: readU16(bytes, ACCEPT_OFFSETS.day),
    slot: readU8(bytes, ACCEPT_OFFSETS.slot),
    active: readU8(bytes, ACCEPT_OFFSETS.active),
    problem: readOccupations(bytes).layoutProblem ?? readTownsfolk(bytes).problem,
  };
}

function assertEditable(bytes: Uint8Array): void {
  const problem = readAccepted(bytes).problem;
  if (problem) throw new RangeError(problem);
}

function writeFlags(bytes: Uint8Array, writes: readonly FlagWrite[]): void {
  for (const w of writes) writeTownsfolk(bytes, occupationFlagOffset(w.flag), w.value, { advanced: false });
}

/** 受注中の情報（4か所）だけを 0 にする。フラグには触らない */
function clearAccepted(bytes: Uint8Array): void {
  writeU16(bytes, ACCEPT_OFFSETS.id, 0);
  writeU16(bytes, ACCEPT_OFFSETS.day, 0);
  writeU8(bytes, ACCEPT_OFFSETS.slot, 0);
  writeU8(bytes, ACCEPT_OFFSETS.active, 0);
}

/**
 * id のなりわいを、今の日・時間帯に受注したことにする。
 * ほかのなりわいを受注中なら、先にそのなりわいの onRelease を書いて外す。
 * 書くのは onAccept のフラグ、受注中の情報、状態の表（FFFF のときだけ 0）
 */
export function acceptOccupation(bytes: Uint8Array, id: number): void {
  assertEditable(bytes);
  if (!occupationById(id)) throw new RangeError(`表にないなりわいの ID です: ${id}`);
  const date = readDate(bytes);
  if (date.problem) throw new RangeError(`日付を読めないので受注を書けません：${date.problem}`);
  if (date.raw.dayIndex > 0xffff) throw new RangeError(`経過日数が u16 を超えています: ${date.raw.dayIndex}`);

  const current = readU16(bytes, ACCEPT_OFFSETS.id);
  if (current !== 0 && current !== id) writeFlags(bytes, acceptRuleOf(current).onRelease);
  writeFlags(bytes, acceptRuleOf(id).onAccept);
  const stateOffset = occupationStateOffset(id);
  if (readU16(bytes, stateOffset) === OCCUPATION_NOT_APPEARED) writeU16(bytes, stateOffset, 0);
  writeU16(bytes, ACCEPT_OFFSETS.id, id);
  writeU16(bytes, ACCEPT_OFFSETS.day, date.raw.dayIndex);
  writeU8(bytes, ACCEPT_OFFSETS.slot, date.raw.slot);
  writeU8(bytes, ACCEPT_OFFSETS.active, ACCEPT_ACTIVE);
}

/** 受注を外す。受注中のなりわいの onRelease を書き、受注中の情報を 0 にする */
export function releaseOccupation(bytes: Uint8Array): void {
  assertEditable(bytes);
  const current = readU16(bytes, ACCEPT_OFFSETS.id);
  if (current === 0) return;
  writeFlags(bytes, acceptRuleOf(current).onRelease);
  clearAccepted(bytes);
}

/**
 * 続き物の欄などから、なりわいのフラグをまとめて書く。
 * - accept があれば、そのなりわいを受注する（フラグは accept の onAccept に flags を重ねる）
 * - なければ flags を書き、受注中のなりわいの onAccept がそのフラグを使っていたら受注中の情報だけを 0 にする
 */
export function writeSeriesState(
  bytes: Uint8Array,
  flags: readonly FlagWrite[],
  accept: number | undefined,
  opts: { advanced: boolean },
): void {
  assertEditable(bytes);
  if (accept !== undefined) {
    acceptOccupation(bytes, accept);
    writeFlags(bytes, flags);
    return;
  }
  for (const w of flags) writeTownsfolk(bytes, occupationFlagOffset(w.flag), w.value, opts);
  const current = readU16(bytes, ACCEPT_OFFSETS.id);
  if (current !== 0 && acceptRuleOf(current).onAccept.some((a) => flags.some((w) => w.flag === a.flag))) clearAccepted(bytes);
}
