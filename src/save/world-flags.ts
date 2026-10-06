// 門・柵の開閉フラグ。出典：docs/save_format/chunks/gates（[U] 2026-10-05 のシナリオ差分、2026-10-06 の書き換え）。
//
// 0x3750〜0x3800 あたりには小さな値のバイトが並び、場所の状態を持っていると推定（🔶）。
//
// 大寄せ以降の門（1＝閉じている）：
//   0x37FA  ✅ [U] 代官所の門。大寄せのあと、根無し草（03 copy 9・04 copy 11）では 1、幕府ルート（04 copy 12）では 0。
//              04 copy 11（代官所・領事館・神社の3つの門がすべて閉じている）で 0 にすると、代官所の門だけが開いた（2026-10-06）
//   0x3764  ✅ [U] 居留地の門。大寄せで 0 → 1。04 copy 11 で 0 にすると開いた（2026-10-06）
//   0x37C3  ✅ [U] 神社の門＝神社入口の柵。大寄せで 0 → 1。04 copy 11 で 0 にすると開いた（2026-10-06）
// ルート分岐を書き換えても、門が閉じたままだとそのルートに進めない（[U] 2026-10-05）。
// この3つは大寄せのときに書かれ、阿弥浜港争乱の直後の門には関係しない（新規周回直後の3件とも 0。[U] 2026-10-06）。
//
// 大寄せ前の門（1＝開いている。大寄せ以降のフラグと逆）。chunks/gates の調査記録 2026-10-06_amihama-gates.md：
//   0x377D  ✅ [U] 代官所の門。sample/S4-DATA_01 copy だけが 1。書き換えで開閉が反映された（2026-10-06）
//   0x377E  ✅ [U] 居留地の門。01・01 copy が 1、01 copy 2 が 0。書き換えで開閉が反映された（2026-10-06）
//   0x377F  ✅ [U] 神社の門。志士との出会い（イベント添字6）の導入で 0 → 1、添字6 が 03 になる（01 copy 2、2026-10-06）。
//              添字6 が 03 のまま 0 に戻すと門は閉じ、近づいても導入は流れない。添字6 を FF に戻すと導入が流れて開く。
//              大寄せのあとに書き換えても柵は変わらない（0x37C3 が決める）
//   0x377D・0x377E が勢力の勧誘状態と同じものかは区別できていない ❓
//
// 意味の分からないバイト（UI には出さない。[U] 2026-10-06 の要望）：
//   0x377C  ❓ 神社の門の候補だったが、神社は 0x377F だった。3件とも 0
//   0x37FB  ❓ 0x37FA と同じく根無し草で 1、幕府ルートで 0。04 copy 11 で 0 にしても、どの門も変わらなかった
//   0x3761・0x37C6（大寄せで 0 → 1）、0x37A2（大寄せで 0 → 2）❓ 0 にしてもどの門も変わらなかった
//
// ❓ U-1 判定待ちのため [TS] の固定オフセット（案A）の位置で読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU8, writeU8 } from "./binary";
import { checkLayout } from "./hero";

/** 1 の意味。close＝1 で閉じる、open＝1 で開く */
export type WorldFlagMeaning = "close" | "open";

export type WorldFlag = {
  offset: number;
  label: string;
  note: string;
  meaning: WorldFlagMeaning;
};

/** 値は 0 か 1。✅ [U] すべて書き換えで開閉が反映されることを確認 */
export const WORLD_FLAGS: readonly WorldFlag[] = [
  {
    offset: 0x37fa,
    label: "代官所の門（大寄せ以降）",
    note: "1 で閉じる。大寄せのあと、根無し草では 1、幕府ルートでは 0",
    meaning: "close",
  },
  {
    offset: 0x3764,
    label: "居留地の門（大寄せ以降）",
    note: "1 で閉じる。大寄せで 0 → 1（根無し草・幕府ルートとも）",
    meaning: "close",
  },
  {
    offset: 0x37c3,
    label: "神社入口の柵（大寄せ以降）",
    note: "1 で閉じる。大寄せで 0 → 1（根無し草・幕府ルートとも）",
    meaning: "close",
  },
  {
    offset: 0x377d,
    label: "代官所の門（大寄せ前）",
    note: "1 で開く。阿弥浜港争乱の結果で決まる。勧誘状態と同じものか ❓",
    meaning: "open",
  },
  {
    offset: 0x377e,
    label: "居留地の門（大寄せ前）",
    note: "1 で開く。阿弥浜港争乱の結果で決まる。勧誘状態と同じものか ❓",
    meaning: "open",
  },
  {
    offset: 0x377f,
    label: "神社の門（大寄せ前）",
    note: "1 で開く。志士との出会いの導入で開く。導入を見たあと（イベント6 が 03 以降）に 0 にすると、近づいても開かない",
    meaning: "open",
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
