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
//   🟢 105 B の状態列。0＝非表示、1＝表示中・未取得、2＝取得済み。
//   ✅ [U] 2026-10-07 番号 0〜15 はゲーム内表示と一致。101（ライフルの免許）は 2 の書き込みで取得可能になった。
//   それ以外の並び・書き込みは 🔶 U-17。固定位置を採用（ユーザー判断 2026-10-07）。
//
// 固定オフセットで読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readI8, readU8, writeU8 } from "./binary";
import { CAPACITY_MAX, CAPACITY_MIN, WEAPON_CHEST_CAPACITY } from "./weapon-chest";
import { warningsOf, type EditOpts, type ViewStatus } from "./field";
import { validateKnownValue } from "./flags/byte-flag";
import { assertWritable, checkLayout } from "./layout";
import { tr, type Localized } from "@/lib/i18n";

// ---------------------------------------------------------------- 装飾品

export const ACCESSORY_FLAGS_OFFSET = 0x3902;
export const ACCESSORY_COUNT = 158;

/** 通常モードで書ける値。所持フラグは 0・1、特典の状態は 0〜2（🔶 U-17） */
const ACCESSORY_FLAG_VALUES = [{ value: 0 }, { value: 1 }] as const;
const UNLOCK_STATE_VALUES = [{ value: 0 }, { value: 1 }, { value: 2 }] as const;

/**
 * 添字は装飾品の ID。warnings は通常モードの範囲外の値があるときの説明（読み取り専用にはしない）
 */
export type AccessoryFlagsView = ViewStatus & {
  values: number[];
  /** 所持している（値が 0 以外） */
  owned: boolean[];
  /** 値が通常モードで書ける 0・1 のどちらか。false の行は上級者モードでだけ切り替えられる */
  known: boolean[];
};

function readBytes(bytes: Uint8Array, offset: number, count: number): number[] {
  if (bytes.byteLength < offset + count)
    throw new RangeError(tr({ ja: "ファイルが小さすぎて読めません", en: "The file is too small to read" }));
  return Array.from({ length: count }, (_, i) => readU8(bytes, offset + i));
}

export function readAccessoryFlags(bytes: Uint8Array): AccessoryFlagsView {
  const values = readBytes(bytes, ACCESSORY_FLAGS_OFFSET, ACCESSORY_COUNT);
  const known = values.map((v) => ACCESSORY_FLAG_VALUES.some((k) => k.value === v));
  return {
    values,
    owned: values.map((v) => v !== 0),
    known,
    problem: checkLayout(bytes),
    warnings: warningsOf(
      known.includes(false)
        ? tr({
            ja: "所持の状態が想定外の装飾品があります。切り替えは上級者モードでだけできます",
            en: "Some accessories have an unexpected ownership state. They can only be toggled in Advanced mode",
          })
        : null,
    ),
  };
}

function assertValue(value: number, known: readonly { value: number }[], opts: EditOpts): void {
  const problem = validateKnownValue(value, known, opts);
  if (problem) throw new RangeError(problem);
}

/** 装飾品 id の所持フラグを書く。通常モードでは 0・1、上級者モードでは任意の u8 */
export function writeAccessoryFlag(bytes: Uint8Array, id: number, value: number, opts: EditOpts): void {
  assertWritable(bytes);
  if (!Number.isInteger(id) || id < 0 || id >= ACCESSORY_COUNT) throw new RangeError(tr({ ja: "装飾品が範囲外です", en: "The accessory is out of range" }));
  assertValue(value, ACCESSORY_FLAG_VALUES, opts);
  writeU8(bytes, ACCESSORY_FLAGS_OFFSET + id, value);
}

/** ids の装飾品の所持フラグをまとめて書く（0・1） */
export function writeAccessoryFlags(bytes: Uint8Array, ids: readonly number[], value: 0 | 1): void {
  assertWritable(bytes);
  assertValue(value, ACCESSORY_FLAG_VALUES, { advanced: false });
  for (const id of ids)
    if (!Number.isInteger(id) || id < 0 || id >= ACCESSORY_COUNT) throw new RangeError(tr({ ja: "装飾品が範囲外です", en: "The accessory is out of range" }));
  for (const id of ids) writeU8(bytes, ACCESSORY_FLAGS_OFFSET + id, value);
}

// ---------------------------------------------------------------- 容姿

/** ✅ ビット列の先頭（服の番号 0 の bit0） */
export const APPEARANCE_OFFSET = 0x3ab5c;
/** 🟢 服の番号 0〜241 が入る 31 B */
export const APPEARANCE_BYTES = 31;
export const APPEARANCE_BIT_COUNT = APPEARANCE_BYTES * 8;

/** なりわいの報酬のセット（✅ 差分。名前は 🟢） */
export const APPEARANCE_REWARDS: Readonly<Record<number, Localized>> = {
  238: {
    ja: "新撰組 近藤セット（なりわい「今宵の虎徹は」）",
    en: "Shinsengumi Kondo set (mission \"A Thirst For Blood\")",
  },
  239: { ja: "ドナドナセット（なりわい「食い逃げ外国人」）", en: "Dona Dona set (mission \"Foreign Dine-and-Ditcher\")" },
  240: { ja: "さよセット（なりわい「おにぎり屋の用心棒」）", en: "Sayo set (mission \"Rice Guard\")" },
  241: { ja: "新撰組 土方セット（なりわい「薬売り」）", en: "Shinsengumi Hijikata set (mission \"Medicine Seller\")" },
};

export function appearanceBitPosition(bit: number): { offset: number; mask: number } {
  if (!Number.isInteger(bit) || bit < 0 || bit >= APPEARANCE_BIT_COUNT)
    throw new RangeError(tr({ ja: "服が範囲外です", en: "The clothing is out of range" }));
  return { offset: APPEARANCE_OFFSET + (bit >> 3), mask: 1 << (bit & 7) };
}

export type AppearanceView = ViewStatus & {
  /** APPEARANCE_BYTES 個のバイト */
  bytes: number[];
};

export function readAppearance(bytes: Uint8Array): AppearanceView {
  return { warnings: [], bytes: readBytes(bytes, APPEARANCE_OFFSET, APPEARANCE_BYTES), problem: checkLayout(bytes) };
}

export function isAppearanceBitSet(view: AppearanceView, bit: number): boolean {
  const { offset, mask } = appearanceBitPosition(bit);
  return (view.bytes[offset - APPEARANCE_OFFSET] & mask) !== 0;
}

/** ビットを1つだけ立てる・消す。同じバイトのほかのビットは変えない */
export function writeAppearanceBit(bytes: Uint8Array, bit: number, on: boolean): void {
  assertWritable(bytes);
  const { offset, mask } = appearanceBitPosition(bit);
  const old = readU8(bytes, offset);
  writeU8(bytes, offset, on ? old | mask : old & ~mask);
}

/** bits のビットをまとめて立てる・消す */
export function writeAppearanceBits(bytes: Uint8Array, bits: readonly number[], on: boolean): void {
  assertWritable(bytes);
  const positions = bits.map(appearanceBitPosition);
  for (const { offset, mask } of positions) {
    const old = readU8(bytes, offset);
    writeU8(bytes, offset, on ? old | mask : old & ~mask);
  }
}

// ---------------------------------------------------------------- 特典解除

export const UNLOCK_COUNT = 105;
/** 🔶 U-17：固定位置。差分：01 copy 5→6（番号31）。 */
export const UNLOCK_STATES_OFFSET = 0x43318;
// 🟢 特典85〜99が付与する装飾品。添字は特典番号から85を引いた値。
const ACCESSORY_UNLOCK_FIRST = 85;
const UNLOCK_ACCESSORY_IDS = [77, 78, 89, 92, 93, 79, 80, 81, 153, 90, 94, 95, 96, 68, 82] as const;
// 🟢 箪笥の特典0〜3は容量（10本単位）へ加算する。取得解除では容量を減らさない。
const WEAPON_CHEST_UNLOCK_INCREMENTS = [3, 4, 5, 6] as const;
// ✅ [U] 2026-10-07 番号31「J.J. の顔」はゲーム内で解除した前後の差分で対応を確認。書き込みの反映は 🔶 U-17。
// ✅ [U] 2026-10-07 番号101（ライフルの免許）は値 2 の書き込みによる反映をゲーム内で確認。

export const UNLOCK_STATE_LABELS: Record<number, Localized> = {
  0: { ja: "非表示", en: "Hidden" },
  1: { ja: "未取得", en: "Not obtained" }, // 表示中・未取得
  2: { ja: "取得済み", en: "Obtained" },
};

/** 添字は特典の番号 */
export type UnlockStatesView = ViewStatus & {
  values: number[];
  /** 🔶 U-17 値が通常モードで書ける 0〜2 のどれか。false の行は上級者モードでだけ切り替えられる */
  known: boolean[];
};

export function readUnlockStates(bytes: Uint8Array): UnlockStatesView {
  const values = readBytes(bytes, UNLOCK_STATES_OFFSET, UNLOCK_COUNT);
  const known = values.map((v) => UNLOCK_STATE_VALUES.some((k) => k.value === v));
  return {
    values,
    known,
    problem: checkLayout(bytes),
    // 🔶 U-17：0〜2 以外の値は上級者モードで書けるので、読み取り専用にはせず注意だけ出す
    warnings: warningsOf(
      known.includes(false)
        ? tr({
            ja: "状態が想定外の特典があります。切り替えは上級者モードでだけできます",
            en: "Some unlocks have an unexpected state. They can only be toggled in Advanced mode",
          })
        : null,
    ),
  };
}

/** 🔶 U-17 特典 index の状態を書く。固定位置でサイズ・境界・値の範囲を検証する。 */
export function writeUnlockState(bytes: Uint8Array, index: number, value: number, opts: EditOpts): void {
  assertWritable(bytes);
  if (!Number.isInteger(index) || index < 0 || index >= UNLOCK_COUNT) throw new RangeError(tr({ ja: "特典が範囲外です", en: "The unlock is out of range" }));
  assertValue(value, UNLOCK_STATE_VALUES, opts); // 🔶 U-17：3 以上は上級者モードだけ
  writeValidatedUnlockStates(bytes, [index], value);
}

/** indexes の特典の状態をまとめて書く（0〜2） */
export function writeUnlockStates(bytes: Uint8Array, indexes: readonly number[], value: 0 | 1 | 2): void {
  assertWritable(bytes);
  assertValue(value, UNLOCK_STATE_VALUES, { advanced: false });
  for (const i of indexes)
    if (!Number.isInteger(i) || i < 0 || i >= UNLOCK_COUNT) throw new RangeError(tr({ ja: "特典が範囲外です", en: "The unlock is out of range" }));
  writeValidatedUnlockStates(bytes, indexes, value);
}

/** 🟢 入力の検証後に呼ぶ。関連する書き込みも、容量の検証を済ませてからまとめて行う。 */
function writeValidatedUnlockStates(bytes: Uint8Array, indexes: readonly number[], value: number): void {
  const uniqueIndexes = [...new Set(indexes)];
  let capacityIncrement = 0;
  if (value === 2) {
    for (const index of uniqueIndexes) {
      if (index < WEAPON_CHEST_UNLOCK_INCREMENTS.length && readU8(bytes, UNLOCK_STATES_OFFSET + index) !== 2)
        capacityIncrement += WEAPON_CHEST_UNLOCK_INCREMENTS[index];
    }
  }

  let expandedCapacity: number | null = null;
  if (capacityIncrement > 0) {
    const capacity = readI8(bytes, WEAPON_CHEST_CAPACITY);
    if (capacity < CAPACITY_MIN || capacity > CAPACITY_MAX)
      throw new RangeError(tr({
        ja: "武器箪笥の容量が想定外のため特典を解除できません。武器の画面で容量を直してください",
        en: "Cannot unlock this bonus because the Weapon Chest capacity is unexpected. Correct its capacity on the Weapons screen.",
      }));
    expandedCapacity = Math.min(CAPACITY_MAX, capacity + capacityIncrement);
  }

  if (expandedCapacity !== null) writeU8(bytes, WEAPON_CHEST_CAPACITY, expandedCapacity);
  for (const index of uniqueIndexes) {
    writeU8(bytes, UNLOCK_STATES_OFFSET + index, value);
    if (value !== 2) continue;
    const accessoryId = UNLOCK_ACCESSORY_IDS[index - ACCESSORY_UNLOCK_FIRST];
    // 所持済みの特典も再指定で装飾品を補える。容量の再加算とは分ける。
    if (accessoryId !== undefined) writeU8(bytes, ACCESSORY_FLAGS_OFFSET + accessoryId, 1);
  }
}
