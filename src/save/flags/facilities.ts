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
import type { Localized } from "@/lib/i18n";
import { defineLocalized, flagValues, localizedFlag, type ByteFlag, type FlagValue } from "./byte-flag";

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

const OPEN: Localized = { ja: "開いている", en: "Open" };
const CLOSED: Localized = { ja: "閉じている", en: "Closed" };
const OPEN_VALUES: readonly FlagValue[] = flagValues([
  { value: 0, label: CLOSED },
  { value: 1, label: OPEN },
]);
const CLOSE_VALUES: readonly FlagValue[] = flagValues([
  { value: 0, label: OPEN },
  { value: 1, label: CLOSED },
]);

/** 文言を { ja, en } で書いた枠を、読むたびに今の言語の文言を返す FacilitySlot にする */
function slot(label: Localized, when0: Localized, when1: Localized): FacilitySlot {
  const out = {} as FacilitySlot;
  defineLocalized(out, "label", label);
  defineLocalized(out, "when0", when0);
  defineLocalized(out, "when1", when1);
  return out;
}

/** ✅ [U] すべて書き換えで反映されることを確認。note・slots・lightOfHope は 🟢 */
export const FACILITY_FLAGS: readonly FacilityFlag[] = [
  localizedFlag({
    offset: 0x375d,
    label: { ja: "病院", en: "Hospital" },
    note: {
      ja:
        "初期状態は閉。病院占拠事件の成功で開く。" +
        "病院廃業の企てで千両箱を奪って報告する・祝 病院開業で千両箱を奪うと閉じる（病院廃業の企てで一行を通すと開いたまま）。" +
        "西洋医学お断りでは閉じたまま。開いているとき、真ルートの再起の望みで「英国の病院に連れて行こう」が出る",
      en:
        "Closed at first. Opens on success of OWH (Occupy Western Hospital). " +
        "Closes if you steal the money chest and report in Plan to Shut Down the Hospital, or steal it in Hooray! The Hospital's Grand Opening (stays open if you let the group through in Plan to Shut Down the Hospital). " +
        "Stays closed in Denying Western Medicine. While open, the option to take him to the British hospital appears in Praying for Recovery on the true route",
    },
    values: OPEN_VALUES,
    slots: [
      slot(
        { ja: "幕府・2日目昼", en: "Shogunate, Day 2 daytime" },
        { ja: "西洋医学お断り", en: "Denying Western Medicine" },
        { ja: "病院廃業の企て", en: "Plan to Shut Down the Hospital" },
      ),
      slot(
        { ja: "外国・2日目昼", en: "Foreigners, Day 2 daytime" },
        { ja: "病院占拠事件", en: "OWH (Occupy Western Hospital)" },
        { ja: "祝 病院開業", en: "Hooray! The Hospital's Grand Opening" },
      ),
    ],
    lightOfHope: 1 as const,
  }),
  localizedFlag({
    offset: 0x375e,
    label: { ja: "カジノ", en: "Casino" },
    note: {
      ja:
        "初期状態は開。カジノを破壊せよの成功で閉じる（寝返ると開いたまま）。" +
        "カジノ再建を急げの成功、カジノ再建断固阻止で寝返る・伯爵から逃げると開く。" +
        "真ルートでは前の周回から引き継いだ状態のまま2日目夕を迎え、閉じていれば伯爵に刺激を、開いていれば運命のルーレットが起きる",
      en:
        "Open at first. Closes on success of Destroy the Casino (stays open if you switch sides). " +
        "Opens on success of Hurrying to Rebuild the Casino, or if you switch sides or flee from the Count in Put an End to the Casino's Reconstruction. " +
        "On the true route it keeps the state from the previous playthrough until Day 2 evening: Down for the Count happens if closed, Dice of Destiny if open",
    },
    values: CLOSE_VALUES,
    slots: [
      slot(
        { ja: "外国・2日目夜", en: "Foreigners, Day 2 night" },
        { ja: "ライジングサン", en: "Rising Sun" },
        { ja: "カジノ再建を急げ", en: "Hurrying to Rebuild the Casino" },
      ),
      slot(
        { ja: "攘夷・2日目夜", en: "Prajnas, Day 2 night" },
        { ja: "カジノを破壊せよ", en: "Destroy the Casino" },
        { ja: "カジノ再建断固阻止", en: "Put an End to the Casino's Reconstruction" },
      ),
      slot(
        { ja: "真ルート・2日目夕", en: "True route, Day 2 evening" },
        { ja: "運命のルーレット", en: "Dice of Destiny" },
        { ja: "伯爵に刺激を", en: "Down for the Count" },
      ),
    ],
    lightOfHope: 1 as const,
  }),
  localizedFlag({
    offset: 0x375f,
    label: { ja: "語学所", en: "Language School" },
    note: {
      ja:
        "初期状態は閉。講師ご到着で講師を送り届けると開く。" +
        "語学所開設で講師が殺される・講師を亡き者にで講師を斬ると閉じる（講師を亡き者にで逃げ切られると開いたまま）。" +
        "語学無用では閉じたまま。開いているとき、真ルートの闇討ちで「赤城のようになりたくないのか？」が出る",
      en:
        "Closed at first. Opens when you escort the lecturer in The Lecturer Arrives. " +
        "Closes if the lecturer is killed in The Language School Opens or you cut him down in The Lecturer Is a Dead Man (stays open if he escapes). " +
        "Stays closed in We Don't Need No Stinkin' Language School!. While open, the line asking if he wants to end up like Akagi appears in Strike in the Dark on the true route",
    },
    values: OPEN_VALUES,
    slots: [
      slot(
        { ja: "幕府・2日目夕", en: "Shogunate, Day 2 evening" },
        { ja: "講師ご到着", en: "The Lecturer Arrives" },
        { ja: "語学所開設", en: "The Language School Opens" },
      ),
      slot(
        { ja: "攘夷・2日目夕", en: "Prajnas, Day 2 evening" },
        { ja: "語学無用", en: "We Don't Need No Stinkin' Language School!" },
        { ja: "講師を亡き者に", en: "The Lecturer Is a Dead Man" },
      ),
    ],
    lightOfHope: 1 as const,
  }),
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
