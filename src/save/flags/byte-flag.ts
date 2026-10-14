// 1バイトの値を、値の表から選んで書くフラグの共通の型と読み書き。
//
// 門・施設・人物の状態・勢力の退場・NPC のイベント・イベント関連・なりわいのフラグは、どれも
// 「固定オフセットの u8 を、値の表（values）から選ぶ」形なので、この1つの型で定義する。
// 画面のどの欄に出すかは、src/save/flags/ の各ファイルにある配列で決める（配列1つ＝画面の1ブロック）。
// 同じ位置を2つの配列に入れない（flags.test.ts で確かめる）。
//
// 規則（どの配列でも同じ）：
//   - 書けるのはファイルサイズが 0x48BB0 のときだけ（checkLayout）。違えば読み取り専用
//   - 通常モードで書けるのは values の値だけ。上級者モードでは任意の u8
//   - values にない値は、画面では「不明」と出して警告を付ける。編集はできる（AGENTS.md「未確認データの扱い」）
//   - alsoAt があれば、同じ値をそこにも書く（通常のプレイで必ず同じ値になるバイト）。食い違っていたら「不明」と同じ扱い
import { readU8, writeU8 } from "../binary";
import { validateRange, type EditOpts } from "../field";
import { assertWritable, checkLayout } from "../layout";

export type FlagValue = {
  value: number;
  label: string;
  /** ドロップダウンの見出し */
  group?: string;
};

export type ByteFlag = {
  /** セーブ先頭からのオフセット */
  offset: number;
  /** offset と同じ値を一緒に書く位置 */
  alsoAt?: readonly number[];
  label: string;
  /** 項目の説明（丸ハテナに出す） */
  note?: string;
  /** 欄の下に常に出す一言 */
  hint?: string;
  /** 選択肢。通常モードではこの値だけを書ける */
  values: readonly FlagValue[];
};

export type FlagState = {
  value: number;
  /** values にある値で、alsoAt とも食い違っていない */
  known: boolean;
  /** alsoAt のどれかが offset と違う値 */
  mismatch: boolean;
};

/** 0／1 の値の表 */
export const yesNo = (no: string, yes: string): FlagValue[] => [
  { value: 0, label: no },
  { value: 1, label: yes },
];

/** 0＝生存、1＝死亡 */
export const ALIVE_DEAD: readonly FlagValue[] = yesNo("生存", "死亡");

function positionsOf(flag: ByteFlag): number[] {
  return [flag.offset, ...(flag.alsoAt ?? [])];
}

export function readFlag(bytes: Uint8Array, flag: ByteFlag): FlagState {
  for (const o of positionsOf(flag))
    if (bytes.byteLength <= o) throw new RangeError(`ファイルが小さすぎて「${flag.label}」を読めません`);
  const value = readU8(bytes, flag.offset);
  const mismatch = (flag.alsoAt ?? []).some((o) => readU8(bytes, o) !== value);
  const known = !mismatch && flag.values.some((v) => v.value === value);
  return { value, known, mismatch };
}

/** 書き込めない理由。問題がなければ null */
export function flagProblem(bytes: Uint8Array): string | null {
  return checkLayout(bytes);
}

/** 通常モードは values の値だけ、上級者モードは任意の u8。問題がなければ null */
export function validateFlag(flag: ByteFlag, value: number, opts: EditOpts): string | null {
  return validateKnownValue(value, flag.values, opts, 0xff, `通常モードでは「${flag.label}」に指定できない状態です`);
}

/** 値の表と整数の格納範囲を共通に検証する。上級者モードでも格納範囲は超えられない。 */
export function validateKnownValue(
  value: number,
  known: readonly { value: number }[],
  opts: EditOpts,
  max = 0xff,
  unknownProblem = "通常モードでは指定できない状態です",
): string | null {
  const rangeProblem = validateRange(value, { systemMax: max }, opts);
  if (rangeProblem) return rangeProblem;
  if (!opts.advanced && !known.some((v) => v.value === value)) return unknownProblem;
  return null;
}

/** flag の位置（alsoAt を含む）だけに value を書く */
export function writeFlag(
  bytes: Uint8Array,
  flag: ByteFlag,
  value: number,
  opts: EditOpts,
): void {
  assertWritable(bytes);
  const positions = positionsOf(flag);
  for (const offset of positions) assertWritable(bytes, offset, 1);
  const problem = validateFlag(flag, value, opts);
  if (problem) throw new RangeError(problem);
  for (const o of positions) writeU8(bytes, o, value);
}
