// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// src/save/flags/ のどの配列にも共通の読み書きの規則。
import { describe, expect, it } from "vitest";
import { writeU8 } from "../binary";
import { TS_SAVE_SIZE } from "../hero";
import { readFlag, validateFlag, writeFlag, yesNo, type ByteFlag } from "./byte-flag";

const SINGLE: ByteFlag = { offset: 0x3760, label: "一つ", values: yesNo("なし", "あり") };
const PAIRED: ByteFlag = {
  offset: 0x3762,
  alsoAt: [0x3763],
  label: "二つ",
  values: [
    { value: 0, label: "開" },
    { value: 1, label: "閉" },
  ],
};

function makeSave(size = TS_SAVE_SIZE): Uint8Array {
  const b = new Uint8Array(size);
  // 前後のバイトも置き、書き込みで変わらないことを見る
  writeU8(b, 0x375f, 0xaa);
  writeU8(b, 0x3761, 0xbb);
  writeU8(b, 0x3764, 0xcc);
  writeU8(b, 0x3762, 1);
  writeU8(b, 0x3763, 1);
  return b;
}

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i);
  return out;
}

describe("1バイトのフラグ（byte-flag.ts）", () => {
  it("値と、表にある値か、一緒に書く位置と食い違っているかを読む", () => {
    const b = makeSave();
    expect(readFlag(b, SINGLE)).toEqual({ value: 0, known: true, mismatch: false });
    expect(readFlag(b, PAIRED)).toEqual({ value: 1, known: true, mismatch: false });
    writeU8(b, 0x3760, 7);
    expect(readFlag(b, SINGLE)).toEqual({ value: 7, known: false, mismatch: false });
    writeU8(b, 0x3763, 0);
    expect(readFlag(b, PAIRED)).toEqual({ value: 1, known: false, mismatch: true });
  });

  it("書き込みは、そのフラグの位置（一緒に書く位置を含む）だけを変える", () => {
    const before = makeSave();
    const after = before.slice();
    writeFlag(after, SINGLE, 1, { advanced: false });
    expect(diffOffsets(before, after)).toEqual([0x3760]);
    const after2 = before.slice();
    writeFlag(after2, PAIRED, 0, { advanced: false });
    expect(diffOffsets(before, after2)).toEqual([0x3762, 0x3763]);
  });

  it("食い違っていても、書き込むと両方がそろう", () => {
    const b = makeSave();
    writeU8(b, 0x3763, 0);
    writeFlag(b, PAIRED, 1, { advanced: false });
    expect([b[0x3762], b[0x3763]]).toEqual([1, 1]);
  });

  it("通常モードは表の値だけ。上級者モードでは任意の u8", () => {
    const b = makeSave();
    expect(() => writeFlag(b, SINGLE, 2, { advanced: false })).toThrow(RangeError);
    expect(() => writeFlag(b, SINGLE, 0x100, { advanced: true })).toThrow(RangeError);
    expect(() => writeFlag(b, SINGLE, -1, { advanced: true })).toThrow(RangeError);
    writeFlag(b, SINGLE, 2, { advanced: true });
    expect(b[0x3760]).toBe(2);
    expect(validateFlag(SINGLE, 1, { advanced: false })).toBeNull();
    expect(validateFlag(SINGLE, 255, { advanced: true })).toBeNull();
  });

  it("サイズが 0x48BB0 でなければ書かない", () => {
    const b = makeSave(TS_SAVE_SIZE + 4);
    const before = b.slice();
    expect(() => writeFlag(b, SINGLE, 1, { advanced: true })).toThrow(RangeError);
    expect(diffOffsets(before, b)).toEqual([]);
  });

  it("ファイルが位置より短ければ読めない", () => {
    expect(() => readFlag(new Uint8Array(0x3762), PAIRED)).toThrow(RangeError);
    expect(() => readFlag(new Uint8Array(0x3763), PAIRED)).toThrow(RangeError);
  });

  it("読み出し→書き戻しでバイト列が一致する", () => {
    const before = makeSave();
    writeU8(before, 0x3760, 9); // 表にない値でも、上級者モードなら同じ値を書き戻せる
    const after = before.slice();
    for (const flag of [SINGLE, PAIRED]) writeFlag(after, flag, readFlag(after, flag).value, { advanced: true });
    expect(diffOffsets(before, after)).toEqual([]);
  });
});
