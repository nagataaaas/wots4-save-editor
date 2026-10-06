// 門・柵の開閉フラグ。出典：解析ノート §3.5（[U] 2026-10-05 のシナリオ差分）。
//
// 0x3750〜0x3800 あたりには小さな値のバイトが並び、場所の状態を持っていると推定（🔶）。
//   0x37FA  ✅ [U] 代官所の門（1＝閉じている）。大寄せのあと、根無し草（03 copy 9・04 copy 11）では 1、幕府ルート（04 copy 12）では 0。
//              04 copy 11（代官所・領事館・神社の3つの門がすべて閉じている）で 0 にすると、代官所の門だけが開いた（2026-10-06）
//   0x3764  ✅ [U] 居留地の門（1＝閉じている）。大寄せで 0 → 1。04 copy 11 で 0 にすると開いた（2026-10-06）
//   0x37C3  ✅ [U] 神社の門＝神社入口の柵（1＝閉じている）。大寄せで 0 → 1。04 copy 11 で 0 にすると開いた（2026-10-06）
// ルート分岐を書き換えても、門が閉じたままだとそのルートに進めない（[U] 2026-10-05）。
// 上の3つは大寄せのときに書かれ、阿弥浜港争乱の直後の門には関係しない（新規周回直後の3件とも 0。[U] 2026-10-06）。
//
// 阿弥浜港争乱の直後の門（解析ノート「阿弥浜港争乱の直後の門と勧誘」、sample/S4-DATA_01・01 copy・01 copy 2 の差分）：
//   0x377D  🔶 代官所の門（1＝開いている。大寄せ以降のフラグと逆）。代官所が開いている 01 copy だけが 1
//   0x377E  🔶 居留地の門（1＝開いている）。居留地が開いている 01・01 copy が 1、閉じている 01 copy 2 が 0
//            どちらも勢力の勧誘状態と同じものかは区別できていない ❓。要ゲーム内確認
//   0x377C・0x377F  ❓ 神社の門の候補（[U] 2026-10-06 の要望で、どちらが神社か確かめるために編集対象にする）。
//            3件とも神社は開いていて、どちらも 0。0x377F は志士との出会いの最初で 0 → 1（03 copy 2 → copy 3）。
//            大寄せのあとに書き換えても神社入口の柵は変わらなかった（[U] 2026-10-06）
//
// 意味の分からないバイト（UI には出さない。[U] 2026-10-06 の要望）：
//   0x37FB  ❓ 0x37FA と同じく根無し草で 1、幕府ルートで 0。04 copy 11 で 0 にしても、どの門も変わらなかった
//   0x3761・0x37C6（大寄せで 0 → 1）、0x37A2（大寄せで 0 → 2）❓ 0 にしてもどの門も変わらなかった
//
// ❓ U-1 判定待ちのため [TS] の固定オフセット（案A）の位置で読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU8, writeU8 } from "./binary";
import { checkLayout } from "./hero";

/** 1 の意味。close＝1 で閉じる、open＝1 で開く、unknown＝分からない */
export type WorldFlagMeaning = "close" | "open" | "unknown";

export type WorldFlag = {
  offset: number;
  label: string;
  note: string;
  meaning: WorldFlagMeaning;
};

/**
 * 値は 0 か 1。
 * 先頭3つ（大寄せ以降の門）は ✅ [U] 書き換えで開くことを確認。残りは 🔶／❓ で要ゲーム内確認
 */
export const WORLD_FLAGS: readonly WorldFlag[] = [
  {
    offset: 0x37fa,
    label: "代官所の門",
    note: "1 で閉じる。大寄せのあと、根無し草では 1、幕府ルートでは 0",
    meaning: "close",
  },
  {
    offset: 0x3764,
    label: "居留地の門",
    note: "1 で閉じる。大寄せで 0 → 1（根無し草・幕府ルートとも）",
    meaning: "close",
  },
  {
    offset: 0x37c3,
    label: "神社入口の柵",
    note: "1 で閉じる。大寄せで 0 → 1（根無し草・幕府ルートとも）",
    meaning: "close",
  },
  {
    offset: 0x377d,
    label: "代官所の門（大寄せ前・未確定）",
    note: "🔶 1 で開く。阿弥浜港争乱の直後、代官所が開いていたセーブだけ 1。勧誘状態と同じものか ❓。要ゲーム内確認",
    meaning: "open",
  },
  {
    offset: 0x377e,
    label: "居留地の門（大寄せ前・未確定）",
    note: "🔶 1 で開く。阿弥浜港争乱の直後、居留地が開いていた2件が 1、閉じていた1件が 0。勧誘状態と同じものか ❓。要ゲーム内確認",
    meaning: "open",
  },
  {
    offset: 0x377c,
    label: "神社の門の候補 A",
    note: "❓ 神社が開いていた3件とも 0。0x377F とどちらが神社か確かめる",
    meaning: "unknown",
  },
  {
    offset: 0x377f,
    label: "神社の門の候補 B",
    note: "❓ 3件とも 0。志士との出会いの最初で 0 → 1。大寄せのあとに書き換えても柵は変わらなかった",
    meaning: "unknown",
  },
];

export type WorldFlagsView = {
  values: number[];
  problem: string | null;
};

export function readWorldFlags(bytes: Uint8Array): WorldFlagsView {
  if (bytes.byteLength < 0x3800) throw new RangeError("ファイルが小さすぎてフラグを読めません");
  const layoutProblem = checkLayout(bytes);
  const values = WORLD_FLAGS.map((f) => readU8(bytes, f.offset));
  const bad = values.findIndex((v) => v > 1);
  const problem = bad >= 0 ? `${WORLD_FLAGS[bad].label} の値が 0・1 以外です（${values[bad]}）` : null;
  return { values, problem: layoutProblem ?? problem };
}

/** index 番目のフラグの1バイトだけを書く。通常モードでは 0・1 だけ、上級者モードでは任意の u8 */
export function writeWorldFlag(
  bytes: Uint8Array,
  index: number,
  value: number,
  opts: { advanced: boolean },
): void {
  const view = readWorldFlags(bytes);
  if (view.problem) throw new RangeError(view.problem);
  const flag = WORLD_FLAGS[index];
  if (!flag) throw new RangeError(`フラグの番号が範囲外です: ${index}`);
  if (!Number.isInteger(value) || value < 0 || value > 0xff)
    throw new RangeError(`u8 の範囲外です: ${value}`);
  if (!opts.advanced && value > 1) throw new RangeError(`0 か 1 を指定してください: ${value}`);
  writeU8(bytes, flag.offset, value);
}
