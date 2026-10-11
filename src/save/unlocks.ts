// 装飾品の所持・容姿の解放・特典解除の状態。出典：docs/save_format/chunks/accessories・appearance・unlocks。
//
// 装飾品の所持フラグ（chunks/accessories）：
//   0x3902 + ID（ID 0〜157、1 B × 158）✅。0＝なし、1＝所持。
//   ✅ なりわいの報酬の差分で 0x3902（ID 0）・0x399C〜0x399F（ID 154〜157）が 0 → 1。
//   ✅ [U] 2026-10-07 全部を 1 にすると装飾品設定に出た。2 以上の値の意味は ❓
//
// 容姿の解放ビット（chunks/appearance、U-16 決着）：
//   0x3AB5C + 服の番号/8 の bit (服の番号%8)。服の番号は datatable/appearance/cloth.csv（0〜241）。
//   ✅ [U] 2026-10-07 0x3AB60・0x3AB61 を FF にすると番号 32〜46 の15着が容姿設定に出た。
//   ✅ なりわいの差分で 0x3AB79 bit6・7、0x3AB7A bit0・1（番号 238〜241 ＝ 近藤・ドナドナ・さよ・土方のセット）。
//   0x3AB79 に 0x40 を書くと容姿に近藤のセットが出た（✅ [U] 2026-10-06）。ほかの番号は 🟢（ゲーム内では未確認）
//
// 特典解除の状態（chunks/unlocks）：
//   🔶 U-17 106 B の状態列。0＝非表示、1＝表示中・未取得、2＝取得済み。
//   ✅ [U] 2026-10-07 番号 0〜15 はゲーム内表示と一致。101（ライフルの免許）は 2 の書き込みで取得可能になった。
//   それ以外の並び・書き込みは 🔶 U-17。固定位置を採用（ユーザー判断 2026-10-07）。
//
// 固定オフセットで読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU8, writeU8 } from "./binary";
import { checkLayout } from "./hero";

// ---------------------------------------------------------------- 装飾品

export const ACCESSORY_FLAGS_OFFSET = 0x3902;
export const ACCESSORY_COUNT = 158;

export type FlagBytesView = {
  values: number[];
  /** 妥当性検証に落ちた理由。あれば読み取り専用 */
  layoutProblem: string | null;
  /** 通常モードの範囲外の値があるときの説明（読み取り専用にはしない） */
  warning: string | null;
};

function readBytes(bytes: Uint8Array, offset: number, count: number): number[] {
  if (bytes.byteLength < offset + count) throw new RangeError("ファイルが小さすぎて読めません");
  return Array.from({ length: count }, (_, i) => readU8(bytes, offset + i));
}

export function readAccessoryFlags(bytes: Uint8Array): FlagBytesView {
  const values = readBytes(bytes, ACCESSORY_FLAGS_OFFSET, ACCESSORY_COUNT);
  const bad = values.findIndex((v) => v > 1);
  return {
    values,
    layoutProblem: checkLayout(bytes),
    warning: bad >= 0 ? "所持の状態が想定外の装飾品があります。切り替えは上級者モードでだけできます" : null,
  };
}

function assertEditable(bytes: Uint8Array): void {
  const problem = checkLayout(bytes);
  if (problem) throw new RangeError(problem);
}

function assertValue(value: number, max: number, advanced: boolean): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) throw new RangeError("指定できない値です");
  if (!advanced && value > max) throw new RangeError("通常モードでは指定できない値です");
}

/** 装飾品 id の所持フラグを書く。通常モードでは 0・1、上級者モードでは任意の u8 */
export function writeAccessoryFlag(bytes: Uint8Array, id: number, value: number, opts: { advanced: boolean }): void {
  assertEditable(bytes);
  if (!Number.isInteger(id) || id < 0 || id >= ACCESSORY_COUNT) throw new RangeError("装飾品が範囲外です");
  assertValue(value, 1, opts.advanced);
  writeU8(bytes, ACCESSORY_FLAGS_OFFSET + id, value);
}

/** ids の装飾品の所持フラグをまとめて書く（0・1） */
export function writeAccessoryFlags(bytes: Uint8Array, ids: readonly number[], value: 0 | 1): void {
  for (const id of ids) writeAccessoryFlag(bytes, id, value, { advanced: false });
}

// ---------------------------------------------------------------- 容姿

/** ✅ ビット列の先頭（服の番号 0 の bit0） */
export const APPEARANCE_OFFSET = 0x3ab5c;
/** 🟢 服の番号 0〜241 が入る 31 B */
export const APPEARANCE_BYTES = 31;
export const APPEARANCE_BIT_COUNT = APPEARANCE_BYTES * 8;

/** ゲーム内で書き換えを確かめた服の番号（✅ [U] 2026-10-07・2026-10-06。ほかは 🟢） */
export const APPEARANCE_CONFIRMED: ReadonlySet<number> = new Set([
  32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 238,
]);

/** なりわいの報酬のセット（✅ 差分。名前は 🟢） */
export const APPEARANCE_REWARDS: Readonly<Record<number, string>> = {
  238: "新撰組 近藤セット（なりわい「今宵の虎徹は」）",
  239: "ドナドナセット（なりわい「食い逃げ外国人」）",
  240: "さよセット（なりわい「おにぎり屋の用心棒」）",
  241: "新撰組 土方セット（なりわい「薬売り」）",
};

export function appearanceBitPosition(bit: number): { offset: number; mask: number } {
  if (!Number.isInteger(bit) || bit < 0 || bit >= APPEARANCE_BIT_COUNT) throw new RangeError("服が範囲外です");
  return { offset: APPEARANCE_OFFSET + (bit >> 3), mask: 1 << (bit & 7) };
}

export type AppearanceView = {
  /** APPEARANCE_BYTES 個のバイト */
  bytes: number[];
  layoutProblem: string | null;
};

export function readAppearance(bytes: Uint8Array): AppearanceView {
  return { bytes: readBytes(bytes, APPEARANCE_OFFSET, APPEARANCE_BYTES), layoutProblem: checkLayout(bytes) };
}

export function isAppearanceBitSet(view: AppearanceView, bit: number): boolean {
  const { offset, mask } = appearanceBitPosition(bit);
  return (view.bytes[offset - APPEARANCE_OFFSET] & mask) !== 0;
}

/** ビットを1つだけ立てる・消す。同じバイトのほかのビットは変えない */
export function writeAppearanceBit(bytes: Uint8Array, bit: number, on: boolean): void {
  assertEditable(bytes);
  const { offset, mask } = appearanceBitPosition(bit);
  const old = readU8(bytes, offset);
  writeU8(bytes, offset, on ? old | mask : old & ~mask);
}

/** bits のビットをまとめて立てる・消す */
export function writeAppearanceBits(bytes: Uint8Array, bits: readonly number[], on: boolean): void {
  for (const bit of bits) writeAppearanceBit(bytes, bit, on);
}

// ---------------------------------------------------------------- 特典解除

export const UNLOCK_COUNT = 106;
/** 🔶 U-17：固定位置。差分：01 copy 5→6（番号31）。 */
export const UNLOCK_STATES_OFFSET = 0x43318;
/** ✅ [U] 2026-10-07 番号31「J.J. の顔」はゲーム内で解除した前後の差分で対応を確認。書き込みの反映は 🔶 U-17。 */
export const UNLOCK_READ_CONFIRMED: ReadonlySet<number> = new Set([31]);
/** ✅ [U] 2026-10-07 値 2 の書き込みによる反映をゲーム内で確認した特典。 */
export const UNLOCK_WRITE_CONFIRMED: ReadonlySet<number> = new Set([101]);

export const UNLOCK_STATE_LABELS: Record<number, string> = {
  0: "非表示",
  1: "未取得", // 表示中・未取得
  2: "取得済み",
};

export type UnlockStatesView = FlagBytesView & { offset: number | null };

export function readUnlockStates(bytes: Uint8Array): UnlockStatesView {
  const layoutProblem = checkLayout(bytes);
  const offset = UNLOCK_STATES_OFFSET;
  const readable = offset + UNLOCK_COUNT <= bytes.length;
  const values = readable ? readBytes(bytes, offset, UNLOCK_COUNT) : [];
  const bad = values.findIndex(value => value > 2);
  return {
    values,
    offset,
    layoutProblem: layoutProblem ?? (!readable ? "ファイルが小さすぎて特典を読めません" : bad >= 0 ? "想定外の状態の特典があるため読み取り専用です" : null), // 🔶 U-17
    warning: null,
  };
}

/** 🔶 U-17 特典 index の状態を書く。固定位置でサイズ・境界・値の範囲を検証する。 */
export function writeUnlockState(bytes: Uint8Array, index: number, value: number, opts: { advanced: boolean }): void {
  assertEditable(bytes);
  if (!Number.isInteger(index) || index < 0 || index >= UNLOCK_COUNT) throw new RangeError("特典が範囲外です");
  assertValue(value, 2, opts.advanced);
  if (value > 2) throw new RangeError("指定できない状態です");
  const view = readUnlockStates(bytes);
  if (view.layoutProblem) throw new RangeError(view.layoutProblem);
  writeU8(bytes, UNLOCK_STATES_OFFSET + index, value);
}

/** indexes の特典の状態をまとめて書く（0〜2） */
export function writeUnlockStates(bytes: Uint8Array, indexes: readonly number[], value: 0 | 1 | 2): void {
  for (const i of indexes) writeUnlockState(bytes, i, value, { advanced: false });
}
