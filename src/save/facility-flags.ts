// 施設（病院・語学所・カジノ）の状態の候補。出典：解析ノート §9.8、[U] 2026-10-06 の比較。
//
// 比べたのは、内容のまったく違う2つのセーブ（施設の状態は [U] による）：
//   sample/S4-DATA_03         病院＝開、語学所＝開、カジノ＝閉（3つとも初期状態から変わっている）
//   sample/S4-DATA_01 copy 6  病院＝閉、語学所＝閉、カジノ＝開（3つとも初期状態）
// フラグ列 0x374E〜0x3837 のうち、01・01 copy〜copy 6 の7件で同じ値で、03 だけ違うのは5バイト。
// そのうち3つ並んでそろって変わったのが 0x375D〜0x375F（03 で 1、01 系で 0）。
//
//   0x375D  🔶 施設の状態の候補。並びから病院と推測（イベントの添字順：病院 13〜16 → 語学所 18〜21 → カジノ 25〜27）❓
//   0x375E  🔶 同上。語学所と推測 ❓
//   0x375F  🔶 同上。カジノと推測 ❓
//
// 3つとも同じ向きに変わったので、どのバイトがどの施設かは決められない ❓。1 の意味も
// 「開いている」（カジノは「閉じている」）なのか「初期状態から変わった」なのかは区別できない ❓。要ゲーム内確認。
// 03 の周回では施設のイベントの状態 A（添字 13〜27）が 00（未発生）なので、前の周回から引き継がれた値と考えられる（🔶 §9.8）。
// 次点の候補（UI には出さない）：0x399C〜0x399F（03＝01×4、01 系＝0）、0x3799（03＝1）、0x37AA（03＝0、01 系＝1）。
//
// ❓ U-1 判定待ちのため [TS] の固定オフセット（案A）の位置で読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU8, writeU8 } from "./binary";
import { checkLayout } from "./hero";

export type FacilityFlag = {
  offset: number;
  label: string;
  note: string;
};

/** 🔶 値は 0 か 1。どのバイトがどの施設かは ❓ */
export const FACILITY_FLAGS: readonly FacilityFlag[] = [
  {
    offset: 0x375d,
    label: "施設の候補 1（病院？）",
    note: "🔶 病院＝開・語学所＝開・カジノ＝閉のセーブで 1、3つとも初期状態のセーブで 0。どの施設かは ❓",
  },
  {
    offset: 0x375e,
    label: "施設の候補 2（語学所？）",
    note: "🔶 病院＝開・語学所＝開・カジノ＝閉のセーブで 1、3つとも初期状態のセーブで 0。どの施設かは ❓",
  },
  {
    offset: 0x375f,
    label: "施設の候補 3（カジノ？）",
    note: "🔶 病院＝開・語学所＝開・カジノ＝閉のセーブで 1、3つとも初期状態のセーブで 0。どの施設かは ❓",
  },
];

export type FacilityFlagsView = {
  values: number[];
  problem: string | null;
};

export function readFacilityFlags(bytes: Uint8Array): FacilityFlagsView {
  if (bytes.byteLength < 0x3800) throw new RangeError("ファイルが小さすぎて施設のフラグを読めません");
  const layoutProblem = checkLayout(bytes);
  const values = FACILITY_FLAGS.map((f) => readU8(bytes, f.offset));
  const bad = values.findIndex((v) => v > 1);
  const problem =
    bad >= 0 ? `${FACILITY_FLAGS[bad].label} の値が 0・1 以外です（${values[bad]}）` : null;
  return { values, problem: layoutProblem ?? problem };
}

/** index 番目のフラグの1バイトだけを書く。通常モードでは 0・1 だけ、上級者モードでは任意の u8 */
export function writeFacilityFlag(
  bytes: Uint8Array,
  index: number,
  value: number,
  opts: { advanced: boolean },
): void {
  const view = readFacilityFlags(bytes);
  if (view.problem) throw new RangeError(view.problem);
  const flag = FACILITY_FLAGS[index];
  if (!flag) throw new RangeError(`フラグの番号が範囲外です: ${index}`);
  if (!Number.isInteger(value) || value < 0 || value > 0xff)
    throw new RangeError(`u8 の範囲外です: ${value}`);
  if (!opts.advanced && value > 1) throw new RangeError(`0 か 1 を指定してください: ${value}`);
  writeU8(bytes, flag.offset, value);
}
