// 町の人（店主など）の状態の候補 0x0100〜0x05FF（1,280 B）を、生の値で編集する。出典：解析ノート §9.6（[U] 2026-10-06）。
// 🔶 終わりの位置は未確定。当初は 0x04BF までとしていたが、さよ（0x0528）が見つかったので 0x05FF まで広げた。
// 0x04C0〜0x0B2F は、手元のサンプルでは 0x0528 以外すべて 0（0x0B30 以降は float やカウンタ）。
//
// ほとんど 0 の u8 の並びで、ところどころに 0 以外がある。🔶 町の人ごとの状態・イベントの進み具合の表と考えている
// （「店主の生死や好感度は周回ごとにリセットされる」§9.6）。1人あたりのバイト数・並び順は ❓。
//
//   0x0127  ✅ [U] 2026-10-06 鍛冶屋の後継者イベントと鍛冶屋の状態（SMITH_STATES。書き換えで確認）。
//              差分では踏み倒しで 0 → 0x6E（110）（S4-DATA_02 copy 2 → copy 3）。S4-DATA_03 は 1（❓ 表にない値）
//   0x0132  ✅ [U] 2026-10-06 堂島が鍛冶屋を継いだフラグ。0x0127 が 70（堂島の説得に成功）になると 1 になる。
//              0 のまま周回すると、0x0127 が 81 でも鍛冶屋はおやじに戻った。1 にして周回すると堂島の鍛冶屋になった
//   0x0264  ✅ [U] 2026-10-06 堂島の死亡フラグ（1）
//   0x02C4  ✅ 寿司屋の店主。0 → 1 で死亡（sample/S4-DATA_02 copy 4 → copy 5）。[U] 2026-10-06：0 に戻すと生き返った
//   0x0444  ✅ 鍛冶屋のおやじ（堂島ではない）。0 → 1 で死亡（S4-DATA_02 copy 3 → copy 4）。[U] 2026-10-06：0 に戻すと生き返った。
//              S4-DATA_03 も 1
//   0x0528  🔶 さよ（DLC）の死亡フラグ。なりわい「おにぎり屋の用心棒」で殺害すると 0 → 1（S4-DATA_03 copy 5 → 04。
//              生存させた 03 copy 6 は 0）。さよであることは [U] 2026-10-06 のユーザー判断。差分1回で、
//              0 に戻して生き返るかは未確認（要ゲーム内確認）
//   0x0133  ❓ 海兵隊の横暴（居酒屋）で成否によらず 0 → 1（§3.5）
//   ほかに 0x012C・0x0130・0x0131・0x01E0・0x0258 で 1 を見た（意味は ❓）
// 意味が分かるまで生の値の欄として出す（AGENTS.md「未確認データの扱い」）。0x0127 だけは値の表から選べる。
//
// ❓ U-1 判定待ちのため [TS] の固定オフセット（案A）の位置で読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU8, writeU8 } from "./binary";
import { checkLayout } from "./hero";

export const TOWNSFOLK_START = 0x0100;
/** 🔶 終わりは未確定（上のコメント） */
export const TOWNSFOLK_END = 0x05ff;
export const TOWNSFOLK_LENGTH = TOWNSFOLK_END - TOWNSFOLK_START + 1;

/** 通常モードで新しく書ける上限。0／1 のフラグとして扱う（今の値と同じ値の書き戻しは許す） */
export const TOWNSFOLK_NORMAL_MAX = 1;

/** ✅ [U] 鍛冶屋の後継者イベントと鍛冶屋の状態 */
export const SMITH_STATE_OFFSET = 0x0127;

/** ✅ [U] 2026-10-06：0x0127 の値（書き換えで確認） */
export const SMITH_STATES: readonly { value: number; label: string; group: string }[] = [
  { value: 0, label: "未会話", group: "後継者イベント" },
  { value: 10, label: "「そろそろやめる」という会話を聞いた", group: "後継者イベント" },
  { value: 20, label: "堂島を探してくる", group: "後継者イベント" },
  { value: 30, label: "鍛冶屋を継げ → 堂島の意志は固かった", group: "後継者イベント" },
  { value: 40, label: "鍛冶屋の過去を知った", group: "後継者イベント" },
  { value: 50, label: "堂島が鍛冶屋を拒むわけを知った", group: "後継者イベント" },
  { value: 60, label: "もう一度、堂島を説得してみよう", group: "後継者イベント" },
  { value: 61, label: "堂島はおとなしくなった", group: "後継者イベント" },
  { value: 69, label: "夢があった（会話後）", group: "後継者イベント" },
  { value: 70, label: "堂島の説得に成功した（0x0132 が 1 になる）", group: "後継者イベント" },
  { value: 81, label: "堂島の鍛冶屋", group: "鍛冶屋の状態" },
  { value: 110, label: "鍛冶屋のおやじから踏み倒した", group: "鍛冶屋の状態" },
  { value: 119, label: "堂島から踏み倒した", group: "鍛冶屋の状態" },
  { value: 120, label: "堂島が死亡", group: "鍛冶屋の状態" },
];

export type TownsfolkValue = { value: number; label: string; group?: string };

/**
 * 差分で何か分かっているバイトの説明。name があるものは入力欄を最初から出す。
 * values があるものは値の表から選ぶ（通常モードでは表の値だけ書ける）
 */
export const TOWNSFOLK_NOTES: Readonly<
  Record<number, { name?: string; note: string; values?: readonly TownsfolkValue[] }>
> = {
  0x0127: {
    name: "鍛冶屋の後継者イベント・鍛冶屋の状態",
    note: "書き換えで確認済み。踏み倒しの回数は 0x0B58（u32、この範囲の外）も +1 になった。周回後に誰が鍛冶屋になるかは 0x0132 が決める",
    values: SMITH_STATES,
  },
  0x012c: { note: "❓ 多くのセーブで 1" },
  0x0132: {
    name: "堂島が鍛冶屋を継いだ",
    note: "堂島の説得に成功する（0x0127＝70）と 1 になる。周回をまたいで、誰が鍛冶屋になるかを決める（確認済み：0 のまま周回するとおやじに戻り、1 だと堂島になった）",
    values: [
      { value: 0, label: "継いでいない（鍛冶屋のおやじ）" },
      { value: 1, label: "継いだ（堂島の鍛冶屋）" },
    ],
  },
  0x0133: { note: "❓ 海兵隊の横暴（居酒屋）で成否によらず 0 → 1" },
  0x0264: { name: "堂島", note: "1 で死亡（確認済み）" },
  0x02c4: { name: "寿司屋の店主", note: "1 で死亡。殺すと 0 → 1、0 に戻すと生き返る（確認済み）" },
  0x0444: {
    name: "鍛冶屋のおやじ",
    note: "1 で死亡（堂島ではない）。殺すと 0 → 1、0 に戻すと生き返る（確認済み）",
  },
  0x0528: {
    name: "さよ（DLC）",
    note: "🔶 1 で死亡。なりわい「おにぎり屋の用心棒」で殺害すると 0 → 1（差分1回）。0 に戻して生き返るかは未確認",
  },
};

export type TownsfolkView = {
  values: number[];
  problem: string | null;
};

export function readTownsfolk(bytes: Uint8Array): TownsfolkView {
  if (bytes.byteLength <= TOWNSFOLK_END) throw new RangeError("ファイルが小さすぎて町の人の状態を読めません");
  const values = Array.from({ length: TOWNSFOLK_LENGTH }, (_, i) => readU8(bytes, TOWNSFOLK_START + i));
  return { values, problem: checkLayout(bytes) };
}

/**
 * 通常モードは 0・1 と、今の値と同じ値（書き戻し）だけ。値の表があるバイト（0x0127 など）は表の値だけ書ける。
 * 上級者モードは任意の u8。問題がなければ null
 */
export function validateTownsfolk(
  offset: number,
  value: number,
  current: number,
  opts: { advanced: boolean },
): string | null {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) return `u8 の範囲外です: ${value}`;
  if (opts.advanced || value === current) return null;
  const values = TOWNSFOLK_NOTES[offset]?.values;
  if (values) return values.some((s) => s.value === value) ? null : `確認済みの値ではありません: ${value}`;
  if (value > TOWNSFOLK_NORMAL_MAX) return `通常モードでは 0 か 1 を指定してください: ${value}`;
  return null;
}

/** offset の1バイトだけを書く */
export function writeTownsfolk(
  bytes: Uint8Array,
  offset: number,
  value: number,
  opts: { advanced: boolean },
): void {
  const view = readTownsfolk(bytes);
  if (view.problem) throw new RangeError(view.problem);
  if (!Number.isInteger(offset) || offset < TOWNSFOLK_START || offset > TOWNSFOLK_END)
    throw new RangeError(`範囲外のオフセットです: 0x${offset.toString(16)}`);
  const error = validateTownsfolk(offset, value, readU8(bytes, offset), opts);
  if (error) throw new RangeError(error);
  writeU8(bytes, offset, value);
}
