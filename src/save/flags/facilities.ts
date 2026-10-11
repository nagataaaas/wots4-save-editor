// 画面：世界 / 阿弥浜の「施設」。病院・カジノ・語学所の状態。出典：docs/save_format/chunks/facilities、[U] 2026-10-06 の比較と書き換え。
//
// 比べたのは、内容のまったく違う2つの実セーブ（施設の状態は [U] による）：
//   病院＝開、語学所＝開、カジノ＝閉（3つとも初期状態から変わっている）
//   病院＝閉、語学所＝閉、カジノ＝開（3つとも初期状態）
// フラグ列 0x374E〜0x3837 のうち、3つ並んでそろって変わったのが 0x375D〜0x375F。
//
// ✅ [U] 2026-10-06：1バイトずつ書き換えて、ゲーム内で反映を確認した。
//   0x375D  ✅ 病院（1＝開いている）
//   0x375E  ✅ カジノ（1＝閉じている）
//   0x375F  ✅ 語学所（1＝開いている）
// 3つとも 0 が初期状態（病院・語学所は閉、カジノは開）。周回をまたいで引き継がれる（🔶 chunks/facilities）。
//
// 🟢 値を変える場面・値で分かれるイベント（chunks/facilities「ゲーム側の仕様」）：
//   - 2日目の各枠は、施設の値で起きるイベントが入れ替わる（slots）
//   - 真ルートでは、病院が 1 なら再起の望みで「英国の病院に連れて行こう」が出る。語学所が 1 なら闇討ちで
//     「赤城のようになりたくないのか？」が出る。カジノは前の周回から引き継がれ、2日目夕までに変わらない
//   - 希望の光に進むには、病院・語学所が開き（1）、カジノが閉じている（1）必要がある（lightOfHope）
import type { ByteFlag, FlagValue } from "./byte-flag";

/** 🟢 2日目の1つの枠。施設の値が 0 のとき when0、1 のとき when1 のイベントが起きる */
export type FacilitySlot = {
  /** 枠（勢力・時間帯） */
  label: string;
  when0: string;
  when1: string;
};

export type FacilityFlag = ByteFlag & {
  /** 🟢 値で起きるイベントが入れ替わる枠 */
  slots: readonly FacilitySlot[];
  /** 🟢 真ルートで希望の光に進むのに要る値 */
  lightOfHope: 0 | 1;
};

const OPEN_VALUES: readonly FlagValue[] = [
  { value: 0, label: "閉じている" },
  { value: 1, label: "開いている" },
];
const CLOSE_VALUES: readonly FlagValue[] = [
  { value: 0, label: "開いている" },
  { value: 1, label: "閉じている" },
];

/** ✅ [U] すべて書き換えで反映されることを確認。note・slots・lightOfHope は 🟢 */
export const FACILITY_FLAGS: readonly FacilityFlag[] = [
  {
    offset: 0x375d,
    label: "病院",
    note:
      "初期状態は閉。病院占拠事件の成功で開く。" +
      "病院廃業の企てで千両箱を奪って報告する・祝 病院開業で千両箱を奪うと閉じる（病院廃業の企てで一行を通すと開いたまま）。" +
      "西洋医学お断りでは閉じたまま。開いているとき、真ルートの再起の望みで「英国の病院に連れて行こう」が出る",
    values: OPEN_VALUES,
    slots: [
      { label: "幕府・2日目昼", when0: "西洋医学お断り", when1: "病院廃業の企て" },
      { label: "外国・2日目昼", when0: "病院占拠事件", when1: "祝 病院開業" },
    ],
    lightOfHope: 1,
  },
  {
    offset: 0x375e,
    label: "カジノ",
    note:
      "初期状態は開。カジノを破壊せよの成功で閉じる（寝返ると開いたまま）。" +
      "カジノ再建を急げの成功、カジノ再建断固阻止で寝返る・伯爵から逃げると開く。" +
      "真ルートでは前の周回から引き継いだ状態のまま2日目夕を迎え、閉じていれば伯爵に刺激を、開いていれば運命のルーレットが起きる",
    values: CLOSE_VALUES,
    slots: [
      { label: "外国・2日目夜", when0: "ライジングサン", when1: "カジノ再建を急げ" },
      { label: "攘夷・2日目夜", when0: "カジノを破壊せよ", when1: "カジノ再建断固阻止" },
      { label: "真ルート・2日目夕", when0: "運命のルーレット", when1: "伯爵に刺激を" },
    ],
    lightOfHope: 1,
  },
  {
    offset: 0x375f,
    label: "語学所",
    note:
      "初期状態は閉。講師ご到着で講師を送り届けると開く。" +
      "語学所開設で講師が殺される・講師を亡き者にで講師を斬ると閉じる（講師を亡き者にで逃げ切られると開いたまま）。" +
      "語学無用では閉じたまま。開いているとき、真ルートの闇討ちで「赤城のようになりたくないのか？」が出る",
    values: OPEN_VALUES,
    slots: [
      { label: "幕府・2日目夕", when0: "講師ご到着", when1: "語学所開設" },
      { label: "攘夷・2日目夕", when0: "語学無用", when1: "講師を亡き者に" },
    ],
    lightOfHope: 1,
  },
];

/** 🟢 2日目のその枠で起きるイベント。値が 0・1 以外なら null */
export function facilitySlotEvent(slot: FacilitySlot, value: number): string | null {
  if (value === 0) return slot.when0;
  if (value === 1) return slot.when1;
  return null;
}

/** 🟢 希望の光に進むための施設の条件がそろっているか（FACILITY_FLAGS の順の値。病院・語学所が開き、カジノが閉じている） */
export function facilitiesReadyForLightOfHope(values: readonly number[]): boolean {
  return FACILITY_FLAGS.every((f, i) => values[i] === f.lightOfHope);
}
