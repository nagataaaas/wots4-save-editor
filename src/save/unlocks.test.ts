// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 値は実セーブ（なりわい4件のクリア後、2026-10-07）で見たもの。
// 装飾品の所持フラグ 0x3902 + ID は ✅（[U] 2026-10-07 書き換えが装飾品設定に反映された）。
// 容姿のビットは 0x3AB5C + 服の番号（✅ 32〜46・238〜241、ほかは 🟢。U-16 決着）。
// 特典解除は ✅ [U] 2026-10-07 先頭16件の表示、31（J.J. の顔）の解除前後の差分、101（ライフルの免許）への2の書き込みを確認。ほかは 🔶 U-17。
import { describe, expect, it } from "vitest";
import { writeU8 } from "./binary";
import { TS_SAVE_SIZE } from './layout'
import {
  ACCESSORY_FLAGS_OFFSET,
  APPEARANCE_REWARDS,
  appearanceBitPosition,
  isAppearanceBitSet,
  readAccessoryFlags,
  readAppearance,
  readUnlockStates,
  writeAccessoryFlag,
  writeAccessoryFlags,
  writeAppearanceBit,
  writeAppearanceBits,
  writeUnlockState,
  writeUnlockStates,
} from "./unlocks";

const OWNED = [0, 152, 154, 155, 156, 157];
const UNLOCK_SEEN: Record<number, number> = {
  0: 2, 1: 2, 2: 2, 4: 2, 5: 2, 6: 1, 7: 1, 11: 1, 12: 1, 13: 1,
  16: 1, 17: 1, 18: 1, 44: 2, 80: 2, 100: 2, 103: 2, 104: 2,
};

function makeSave(size = TS_SAVE_SIZE, unlockOffset = 0x43318): Uint8Array {
  const b = new Uint8Array(size);
  writeU8(b, 0x129f6, 2);
  for (const id of OWNED) writeU8(b, ACCESSORY_FLAGS_OFFSET + id, 1);
  writeU8(b, 0x3ab79, 0xc0);
  writeU8(b, 0x3ab7a, 0x03);
  for (const [i, v] of Object.entries(UNLOCK_SEEN)) writeU8(b, unlockOffset + Number(i), v);
  for (const [i, v] of [3, 1, 2, 0, 2, 2, 3, 12].entries()) writeU8(b, unlockOffset + 128 + i * 2, v);
  // 範囲の外側（別の表）。書き込みで変わらないことを見る
  writeU8(b, 0x3901, 0x12);
  writeU8(b, 0x39a0, 0x34);
  writeU8(b, 0x3ab5b, 0x56);
  writeU8(b, 0x3ab7b, 0x9a);
  writeU8(b, 0x3ac06, 0x78);
  return b;
}

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i);
  return out;
}

describe("✅ 装飾品の所持フラグ chunks/accessories", () => {
  it("0x3902 + ID の 1 B を読む", () => {
    const v = readAccessoryFlags(makeSave());
    expect(v.values.length).toBe(158);
    expect(v.values.flatMap((x, i) => (x ? [i] : []))).toEqual(OWNED);
    expect(v.problem).toBeNull();
    expect((v.warnings.join('。') || null)).toBeNull();
  });

  it("1 B だけを書き、書き戻すと元に戻る（往復）", () => {
    const orig = makeSave();
    const b = orig.slice();
    writeAccessoryFlag(b, 79, 1, { advanced: false });
    expect(diffOffsets(orig, b)).toEqual([0x3902 + 79]);
    writeAccessoryFlag(b, 79, 0, { advanced: false });
    expect(b).toEqual(orig);
  });

  it("まとめて書く。最後の ID 157 は 0x399F", () => {
    const b = makeSave();
    writeAccessoryFlags(b, Array.from({ length: 158 }, (_, i) => i), 1);
    expect(readAccessoryFlags(b).values.every((x) => x === 1)).toBe(true);
    expect(b[0x3901]).toBe(0x12);
    expect(b[0x39a0]).toBe(0x34);
  });

  it("通常モードは 0・1 だけ。上級者モードは任意の u8", () => {
    const b = makeSave();
    expect(() => writeAccessoryFlag(b, 1, 2, { advanced: false })).toThrow();
    writeAccessoryFlag(b, 1, 2, { advanced: true });
    const v = readAccessoryFlags(b);
    expect((v.warnings.join('。') || null)).toContain("想定外");
    // ❓ 2 以上は所持扱いだが、通常モードで書ける値ではない
    expect([v.owned[1], v.known[1]]).toEqual([true, false]);
    expect([v.owned[0], v.known[0], v.owned[2], v.known[2]]).toEqual([true, true, false, true]);
    expect(() => writeAccessoryFlag(b, 158, 1, { advanced: true })).toThrow();
  });

  it("ファイルサイズが違うと読み取り専用", () => {
    const b = makeSave(TS_SAVE_SIZE + 4);
    expect(readAccessoryFlags(b).problem === null).toBe(false);
    expect(() => writeAccessoryFlag(b, 1, 1, { advanced: false })).toThrow();
  });
});

describe("容姿の解放ビット chunks/appearance（U-16 決着）", () => {
  it("✅ なりわいの4セットは服の番号 238〜241：0x3AB79 bit6・7、0x3AB7A bit0・1", () => {
    expect(Object.keys(APPEARANCE_REWARDS).map((k) => appearanceBitPosition(Number(k)))).toEqual([
      { offset: 0x3ab79, mask: 0x40 },
      { offset: 0x3ab79, mask: 0x80 },
      { offset: 0x3ab7a, mask: 0x01 },
      { offset: 0x3ab7a, mask: 0x02 },
    ]);
    const v = readAppearance(makeSave());
    expect([238, 239, 240, 241].map((n) => isAppearanceBitSet(v, n))).toEqual([true, true, true, true]);
    expect(isAppearanceBitSet(v, 237)).toBe(false);
  });

  it("✅ [U] 0x3AB60・0x3AB61 を FF にすると服の番号 32〜47 が立つ", () => {
    const b = new Uint8Array(TS_SAVE_SIZE);
    writeU8(b, 0x3ab60, 0xff);
    writeU8(b, 0x3ab61, 0xff);
    const v = readAppearance(b);
    const on = Array.from({ length: 248 }, (_, n) => n).filter((n) => isAppearanceBitSet(v, n));
    expect(on).toEqual(Array.from({ length: 16 }, (_, i) => 32 + i));
  });

  it("ビットを1つだけ消して立て直すと元に戻る（往復）。同じバイトのほかのビットは変えない", () => {
    const orig = makeSave();
    const b = orig.slice();
    writeAppearanceBit(b, 238, false);
    expect(b[0x3ab79]).toBe(0x80);
    expect(diffOffsets(orig, b)).toEqual([0x3ab79]);
    writeAppearanceBit(b, 238, true);
    expect(b).toEqual(orig);
  });

  it("範囲の端（番号 0 と 247）と、範囲外", () => {
    const b = makeSave();
    writeAppearanceBits(b, [0, 247], true);
    expect(b[0x3ab5c]).toBe(0x01);
    expect(b[0x3ab7a]).toBe(0x83);
    expect(b[0x3ab5b]).toBe(0x56);
    expect(b[0x3ab7b]).toBe(0x9a);
    expect(() => writeAppearanceBit(b, 248, true)).toThrow();
  });
});

describe("特典解除の状態 chunks/unlocks（🔶 U-17）", () => {
  it("🔶 U-17 上級者モードなら 3〜255 を1 Bに書ける。範囲外は変更しない", () => {
    for (const value of [3, 255]) {
      const b = makeSave();
      const before = b.slice();
      writeUnlockState(b, 104, value, { advanced: true });
      expect(diffOffsets(before, b)).toEqual([0x43318 + 104]);
      expect(readUnlockStates(b).values[104]).toBe(value);
      expect(b.length).toBe(before.length);
    }
    for (const value of [-1, 256, 1.5, NaN]) {
      const b = makeSave();
      const before = b.slice();
      expect(() => writeUnlockState(b, 104, value, { advanced: true })).toThrow();
      expect(b).toEqual(before);
    }
  });
  it("✅ [U] ライフルの免許（101）を取得済みの2にする。固定位置", () => {
    const orig = makeSave();
    orig[0x4337d] = 1;
    const b = orig.slice();
    writeUnlockState(b, 101, 2, { advanced: false });
    expect(diffOffsets(orig, b)).toEqual([0x4337d]);
    expect(readUnlockStates(b).values[101]).toBe(2);
    writeUnlockState(b, 101, 1, { advanced: false });
    expect(b).toEqual(orig);
  });

  it("✅ [U] 先頭16件はゲーム内表示と一致する状態列から読む", () => {
    const v = readUnlockStates(makeSave());
    expect(v.values.length).toBe(105);
    expect(v.values.slice(0, 16)).toEqual([2, 2, 2, 0, 2, 2, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0]);
    expect(Object.fromEntries(v.values.flatMap((x, i) => (x ? [[i, x]] : [])))).toEqual(UNLOCK_SEEN);
    expect((v.warnings.join('。') || null)).toBeNull();
  });

  it("✅ [U] 番号31の J.J. の顔は解除前後で 01→02。書き込み反映は 🔶 U-17", () => {
    const before = makeSave();
    before[0x43318 + 31] = 1;
    const after = before.slice();
    after[0x43318 + 31] = 2;
    expect(diffOffsets(before, after)).toEqual([0x43337]);
    expect(readUnlockStates(before).values[31]).toBe(1);
    expect(readUnlockStates(after).values[31]).toBe(2);
  });

  it("🔶 U-17 周囲の並びや別位置の状態列に依存せず固定位置を使う", () => {
    const shifted = makeSave(TS_SAVE_SIZE, 0x43418);
    expect(readUnlockStates(shifted).values.every(v => v === 0)).toBe(true);
    const ambiguous = makeSave();
    for (const [i, v] of Object.entries(UNLOCK_SEEN)) writeU8(ambiguous, 0x43418 + Number(i), v);
    for (const [i, v] of [3, 1, 2, 0, 2, 2, 3, 12].entries()) writeU8(ambiguous, 0x43418 + 128 + i * 2, v);
    ambiguous.fill(0xaa, 0x43308, 0x43318);
    ambiguous.fill(0xbb, 0x43382, 0x433a8);
    expect(readUnlockStates(ambiguous).problem).toBeNull();
    const before = ambiguous.slice();
    writeUnlockState(ambiguous, 3, 2, { advanced: false });
    expect(diffOffsets(before, ambiguous)).toEqual([0x129f6, 0x4331b]);
    expect(ambiguous[0x129f6]).toBe(8);
  });

  it("🔶 U-17 サイズ・境界・状態値の検証に落ちたら書き込まない", () => {
    for (const bytes of [new Uint8Array(16), makeSave(TS_SAVE_SIZE + 4)]) {
      const before = bytes.slice();
      if (bytes.length < 0x43318 + 105) expect(() => readUnlockStates(bytes)).toThrow(RangeError);
      else expect(readUnlockStates(bytes).problem).not.toBeNull();
      expect(() => writeUnlockState(bytes, 0, 2, { advanced: false })).toThrow();
      expect(bytes).toEqual(before);
    }
  });

  it("🔶 U-17 0〜2 以外の状態があっても読み取り専用にせず、注意を出して書き込める", () => {
    const b = makeSave();
    writeUnlockState(b, 40, 3, { advanced: true });
    expect(readUnlockStates(b).values[40]).toBe(3);
    expect(readUnlockStates(b).known[40]).toBe(false);
    expect(readUnlockStates(b).known[0]).toBe(true);
    expect(readUnlockStates(b).problem).toBeNull();
    expect((readUnlockStates(b).warnings.join('。') || null)).toContain("想定外");
    // 別の特典も書け、上級者モードでなくても 0〜2 に戻せる
    writeUnlockState(b, 0, 2, { advanced: false });
    writeUnlockState(b, 40, 1, { advanced: false });
    expect(readUnlockStates(b).values[0]).toBe(2);
    expect(readUnlockStates(b).values[40]).toBe(1);
    expect((readUnlockStates(b).warnings.join('。') || null)).toBeNull();
  });

  it("1 B だけを書き、書き戻すと元に戻る（往復）", () => {
    const orig = makeSave();
    orig[0x43318 + 104] = 0;
    const b = orig.slice();
    writeUnlockState(b, 104, 2, { advanced: false });
    expect(diffOffsets(orig, b)).toEqual([0x43318 + 104]);
    writeUnlockState(b, 104, 0, { advanced: false });
    expect(b).toEqual(orig);
  });

  it("通常モードは 0〜2。まとめて書いても範囲の外は変えない", () => {
    const b = makeSave();
    expect(() => writeUnlockState(b, 0, 3, { advanced: false })).toThrow();
    writeUnlockStates(b, Array.from({ length: 105 }, (_, i) => i), 2);
    expect(readUnlockStates(b).values.every((x) => x === 2)).toBe(true);
    expect(b[0x43318 + 105]).toBe(0);
    expect(b[0x43318 + 128]).toBe(3);
    expect(b[0x3ab9b]).toBe(0x00);
  });
});

describe("🟢 特典取得に伴う容量と装飾品の更新", () => {
  function emptySave(): Uint8Array {
    const bytes = new Uint8Array(TS_SAVE_SIZE);
    bytes[0x129f6] = 2;
    bytes[0x43318 + 105] = 0x7b;
    return bytes;
  }

  it.each([[0, 5], [1, 6], [2, 7], [3, 8]])("箪笥の特典%iは新しい取得で容量を%iにする", (id, capacity) => {
    const bytes = emptySave();
    const before = bytes.slice();
    writeUnlockState(bytes, id, 2, { advanced: false });
    expect(bytes[0x129f6]).toBe(capacity);
    expect(diffOffsets(before, bytes)).toEqual([0x129f6, 0x43318 + id]);
    const obtained = bytes.slice();
    writeUnlockState(bytes, id, 2, { advanced: false });
    expect(bytes).toEqual(obtained);
    writeUnlockState(bytes, id, 0, { advanced: false });
    expect(bytes[0x129f6]).toBe(capacity);
  });

  it("重複と取得済みを除いて一括拡張し、上限200本に収める", () => {
    const bytes = emptySave();
    writeUnlockStates(bytes, [0, 0, 1, 2, 3], 2);
    expect(bytes[0x129f6]).toBe(20);
    const obtained = bytes.slice();
    writeUnlockStates(bytes, [0, 1, 2, 3], 2);
    expect(bytes).toEqual(obtained);
    bytes[0x129f6] = 19;
    bytes[0x43318 + 3] = 1;
    writeUnlockState(bytes, 3, 2, { advanced: false });
    expect(bytes[0x129f6]).toBe(20);
  });

  it.each([77, 78, 89, 92, 93, 79, 80, 81, 153, 90, 94, 95, 96, 68, 82].map((accessoryId, index) => [85 + index, accessoryId]))(
    "特典%iは装飾品%iだけを付与し、取得状態を戻しても所持を維持する", (id, accessoryId) => {
      const bytes = emptySave();
      const before = bytes.slice();
      writeUnlockState(bytes, id, 2, { advanced: false });
      expect(diffOffsets(before, bytes)).toEqual([0x3902 + accessoryId, 0x43318 + id]);
      writeUnlockState(bytes, id, 1, { advanced: false });
      expect(bytes[0x3902 + accessoryId]).toBe(1);
      // 以前の編集で状態だけ取得済みの場合も、装飾品を補える。
      bytes[0x43318 + id] = 2;
      bytes[0x3902 + accessoryId] = 0;
      writeUnlockState(bytes, id, 2, { advanced: false });
      expect(bytes[0x3902 + accessoryId]).toBe(1);
    },
  );

  it("全特典の一括取得でも侍点と隣接領域・サイズを保ち、再実行は同じバイト列になる", () => {
    const bytes = emptySave();
    bytes[0xb3c] = 123;
    writeUnlockStates(bytes, Array.from({ length: 105 }, (_, id) => id), 2);
    expect(bytes[0x129f6]).toBe(20);
    expect(bytes[0x3902 + 153]).toBe(1);
    expect(bytes[0x43318 + 105]).toBe(0x7b);
    expect(bytes[0xb3c]).toBe(123);
    expect(bytes.length).toBe(TS_SAVE_SIZE);
    const obtained = bytes.slice();
    writeUnlockStates(bytes, Array.from({ length: 105 }, (_, id) => id), 2);
    expect(bytes).toEqual(obtained);
  });

  it("範囲外ID・不正容量では一括操作の全バイトを変更しない", () => {
    for (const indexes of [[85, 105], [85, -1], [85, 1.5]]) {
      const bytes = emptySave();
      const before = bytes.slice();
      expect(() => writeUnlockStates(bytes, indexes, 2)).toThrow();
      expect(bytes).toEqual(before);
    }
    for (const capacity of [0, 1, 21, 255]) {
      const bytes = emptySave();
      bytes[0x129f6] = capacity;
      const before = bytes.slice();
      expect(() => writeUnlockStates(bytes, [85, 0], 2)).toThrow();
      expect(bytes).toEqual(before);
    }
  });
});
