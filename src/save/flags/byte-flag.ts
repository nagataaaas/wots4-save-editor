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
import { tr, type Localized } from "@/lib/i18n";
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

/**
 * obj の key を、読むたびに今の言語の文言を返すプロパティにする。
 * モジュールの最上位の表（フラグの配列）を、言語を切り替えたあとも今の言語で読めるようにする（型は string のまま）
 */
export function defineLocalized<T extends object>(obj: T, key: string, text: Localized | (() => string)): T {
  Object.defineProperty(obj, key, {
    get: typeof text === "function" ? text : () => tr(text),
    enumerable: true,
    configurable: true,
  });
  return obj;
}

/** 要素を読むたびに今の言語の文言を返す配列 */
export function localizedStrings(texts: readonly Localized[]): readonly string[] {
  const out = texts.map(() => "");
  texts.forEach((t, i) => defineLocalized(out, String(i), t));
  return out;
}

/** 文言を { ja, en } で書く選択肢 */
export type LocalizedFlagValue = { value: number; label: Localized; group?: Localized };

/** 文言を { ja, en } で書いた選択肢を、読むたびに今の言語の文言を返す FlagValue にする */
export function flagValue(v: LocalizedFlagValue): FlagValue {
  const out = defineLocalized({ value: v.value } as FlagValue, "label", v.label);
  return v.group ? defineLocalized(out, "group", v.group) : out;
}

export const flagValues = (values: readonly LocalizedFlagValue[]): FlagValue[] => values.map(flagValue);

/** 文言を { ja, en }（または今の言語の文言を返す関数）で書くフラグ */
export type LocalizedByteFlagSpec = Omit<ByteFlag, "label" | "note" | "hint"> & {
  label: Localized | (() => string);
  note?: Localized;
  hint?: Localized;
};

/**
 * 文言を { ja, en } で書いたフラグを、読むたびに今の言語の文言を返す ByteFlag にする。
 * spec のほかのプロパティ（FacilityFlag の slots など）はそのまま残す
 */
export function localizedFlag<T extends LocalizedByteFlagSpec>(
  spec: T,
): Omit<T, "label" | "note" | "hint"> & ByteFlag {
  const { label, note, hint, ...rest } = spec;
  const out = defineLocalized({ ...rest } as unknown as Omit<T, "label" | "note" | "hint"> & ByteFlag, "label", label);
  if (note) defineLocalized(out, "note", note);
  if (hint) defineLocalized(out, "hint", hint);
  return out;
}

/** 0／1 の値の表 */
export const yesNo = (no: string | Localized, yes: string | Localized): FlagValue[] => [
  typeof no === "string" ? { value: 0, label: no } : flagValue({ value: 0, label: no }),
  typeof yes === "string" ? { value: 1, label: yes } : flagValue({ value: 1, label: yes }),
];

/** 0＝生存、1＝死亡 */
export const ALIVE_DEAD: readonly FlagValue[] = yesNo({ ja: "生存", en: "Alive" }, { ja: "死亡", en: "Dead" });

function positionsOf(flag: ByteFlag): number[] {
  return [flag.offset, ...(flag.alsoAt ?? [])];
}

export function readFlag(bytes: Uint8Array, flag: ByteFlag): FlagState {
  for (const o of positionsOf(flag))
    if (bytes.byteLength <= o)
      throw new RangeError(
        tr({ ja: `ファイルが小さすぎて「${flag.label}」を読めません`, en: `The file is too small to read "${flag.label}"` }),
      );
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
  return validateKnownValue(
    value,
    flag.values,
    opts,
    0xff,
    tr({
      ja: `通常モードでは「${flag.label}」に指定できない状態です`,
      en: `This state can't be set for "${flag.label}" outside Advanced mode`,
    }),
  );
}

/** 値の表と整数の格納範囲を共通に検証する。上級者モードでも格納範囲は超えられない。 */
export function validateKnownValue(
  value: number,
  known: readonly { value: number }[],
  opts: EditOpts,
  max = 0xff,
  unknownProblem = tr({ ja: "通常モードでは指定できない状態です", en: "This state can't be set outside Advanced mode" }),
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
