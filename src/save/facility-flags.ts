// 施設（病院・カジノ・語学所）の状態。出典：docs/save_format/chunks/facilities、[U] 2026-10-06 の比較と書き換え。
//
// 比べたのは、内容のまったく違う2つのセーブ（施設の状態は [U] による）：
//   sample/S4-DATA_03         病院＝開、語学所＝開、カジノ＝閉（3つとも初期状態から変わっている）
//   sample/S4-DATA_01 copy 6  病院＝閉、語学所＝閉、カジノ＝開（3つとも初期状態）
// フラグ列 0x374E〜0x3837 のうち、01・01 copy〜copy 6 の7件で同じ値で、03 だけ違うのは5バイト。
// そのうち3つ並んでそろって変わったのが 0x375D〜0x375F（03 で 1、01 系で 0）。
//
// ✅ [U] 2026-10-06：1バイトずつ書き換えて、ゲーム内で反映を確認した。
//   0x375D  ✅ 病院（1＝開いている）
//   0x375E  ✅ カジノ（1＝閉じている）
//   0x375F  ✅ 語学所（1＝開いている）
// 3つとも 0 が初期状態（病院・語学所は閉、カジノは開）。
// 03 の周回では施設のイベントの状態 A（添字 13〜27）が 00（未発生）なので、前の周回から引き継がれた値と考えられる（🔶 chunks/facilities）。
//
// ❓ U-1 判定待ちのため [TS] の固定オフセット（案A）の位置で読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU8, writeU8 } from "./binary";
import { checkLayout } from "./hero";

/** 1 の意味。close＝1 で閉じる、open＝1 で開く */
export type FacilityFlagMeaning = "close" | "open";

export type FacilityFlag = {
  offset: number;
  label: string;
  note: string;
  meaning: FacilityFlagMeaning;
};

/** 値は 0 か 1。✅ [U] すべて書き換えで反映されることを確認 */
export const FACILITY_FLAGS: readonly FacilityFlag[] = [
  {
    offset: 0x375d,
    label: "病院",
    note: "1 で開く。初期状態は 0（閉）。病院占拠事件で開き、西洋医学お断り・病院廃業の企てで閉じる",
    meaning: "open",
  },
  {
    offset: 0x375e,
    label: "カジノ",
    note: "1 で閉じる。初期状態は 0（開）。カジノを破壊せよで閉じ、カジノ再建を急げで開く",
    meaning: "close",
  },
  {
    offset: 0x375f,
    label: "語学所",
    note: "1 で開く。初期状態は 0（閉）。講師ご到着で開き、語学無用で閉じる",
    meaning: "open",
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
