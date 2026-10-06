// 夜這いの約束に関わる好感度・ポイント（u8 × 6）。フラグ列の中、隠しルートの周り（docs/save_format/chunks/hidden-route）。
//
//   0x3792  🟢 ローラの好感度。外国のイベントで増減する。お団子物語で 3 以上だと場面が分かれる（🟢）。
//              3日目夜に、小公女倒れるが成功していて 10 以上なら、謎の鍵（0xEE）でローラの部屋の扉を開けて約束できる（🟢）。
//              攻略手順どおりの最大は 12。祝 病院開業で千両箱を奪うと 0 に戻る（🟢）
//   0x3793  🟢 朱美の好感度。海兵隊の横暴で +1（[U] 2回再現）。真実（3日目夜）で 10 以上なら夜這いの約束になる（🟢）
//   0x3794〜0x3796  🟢 三姉妹（万由・千佳・百合）の拷問のポイント。拷問で 10 以上なら夜這いの約束になる（🟢）。0 に戻る場面がある
//   0x3797  🟢 メリンダを峰打ちで倒した点数（+2・+5）。攻略手順どおりで 11。夜這いの約束ができるしきい値は ❓
//
// 書き換えたときのゲーム内の反映は未確認（要ゲーム内確認）。
// 通常モードの上限 POINT_NORMAL_MAX は、しきい値（10）と攻略手順どおりの点数（11）より少し上に取った値（🔶 ゲームの上限ではない）。
// ❓ U-1 判定待ちのため [TS] の固定オフセット（案A）の位置で読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU8, writeU8 } from "./binary";
import { checkLayout } from "./hero";

export type YobaiPoint = {
  offset: number;
  label: string;
  /** 約束になる値。分かっていなければ null */
  threshold: number | null;
  note: string;
  /** 意味以外に未確認のことがあれば、バッジに出す */
  pending?: string;
};

export const YOBAI_POINTS: readonly YobaiPoint[] = [
  {
    offset: 0x3793,
    label: "朱美の好感度",
    threshold: 10,
    note: "海兵隊の横暴に成功すると +1。真実（3日目夜）の場面で 10 以上なら夜這いの約束になる",
  },
  {
    offset: 0x3792,
    label: "ローラの好感度",
    threshold: 10,
    note:
      "外国のイベントの成功で +1〜+3、失敗で −1（最大 12）。祝 病院開業で千両箱を奪うと 0 に戻る。" +
      "3日目夜に、小公女倒れるが成功していて 10 以上なら、謎の鍵でローラの部屋の扉を開けて約束できる",
  },
  {
    offset: 0x3794,
    label: "万由の拷問のポイント",
    threshold: 10,
    note: "拷問で 10 以上なら夜這いの約束になる。拷問の場面で 0 に戻ることがある",
  },
  {
    offset: 0x3795,
    label: "千佳の拷問のポイント",
    threshold: 10,
    note: "拷問で 10 以上なら夜這いの約束になる。拷問の場面で 0 に戻ることがある",
  },
  {
    offset: 0x3796,
    label: "百合の拷問のポイント",
    threshold: 10,
    note: "拷問で 10 以上なら夜這いの約束になる。拷問の場面で 0 に戻ることがある",
  },
  {
    offset: 0x3797,
    label: "メリンダの峰打ちの点数",
    threshold: null,
    note: "メリンダを峰打ちで倒すと +2（剣術大会（攘夷）の決勝は +5）。攻略手順どおりに進めると 11",
    pending: "約束できる値は未確認",
  },
];

/** 通常モードで書ける上限（🔶 しきい値 10・攻略手順どおりの 11 より少し上。ゲームの上限ではない） */
export const POINT_NORMAL_MAX = 20;

export type YobaiPointsView = {
  values: { offset: number; value: number }[];
  /** 妥当性検証に落ちた理由。null なら編集可能 */
  problem: string | null;
};

export function readYobaiPoints(bytes: Uint8Array): YobaiPointsView {
  const last = Math.max(...YOBAI_POINTS.map((p) => p.offset));
  if (bytes.byteLength <= last) throw new RangeError("ファイルが小さすぎて好感度・ポイントを読めません");
  return {
    values: YOBAI_POINTS.map((p) => ({ offset: p.offset, value: readU8(bytes, p.offset) })),
    problem: checkLayout(bytes),
  };
}

/** 通常モードは 0〜POINT_NORMAL_MAX、上級者モードは任意の u8。問題がなければ null */
export function validateYobaiPoint(value: number, opts: { advanced: boolean }): string | null {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) return `0〜255 の整数を指定してください: ${value}`;
  if (!opts.advanced && value > POINT_NORMAL_MAX)
    return `通常モードでは 0〜${POINT_NORMAL_MAX} を指定してください（上級者モードで 255 まで書けます）: ${value}`;
  return null;
}

/** offset の1バイトだけを書く */
export function writeYobaiPoint(bytes: Uint8Array, offset: number, value: number, opts: { advanced: boolean }): void {
  const view = readYobaiPoints(bytes);
  if (view.problem) throw new RangeError(view.problem);
  if (!YOBAI_POINTS.some((p) => p.offset === offset))
    throw new RangeError(`好感度・ポイントの位置ではありません: 0x${offset.toString(16)}`);
  const error = validateYobaiPoint(value, opts);
  if (error) throw new RangeError(error);
  writeU8(bytes, offset, value);
}
