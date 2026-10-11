// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 位置と意味は 🟢（docs/save_format/chunks/best-route）。書き換えの反映は未確認（要ゲーム内確認）。
// 🔶 POINT_NORMAL_MAX（20）はしきい値 10・攻略手順どおりの 11 より上に取った値で、ゲームの上限ではない。
// 🟢 しきい値はどれも 10（メリンダは 5日目以降）。
// ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { describe, expect, it } from "vitest";
import { writeU8 } from "./binary";
import { TS_SAVE_SIZE } from "./hero";
import { POINT_NORMAL_MAX, YOBAI_POINTS, readYobaiPoints, validateYobaiPoint, writeYobaiPoint } from "./yobai-points";

/** 0x3792〜0x3797（ローラ・朱美・万由・千佳・百合・メリンダ） */
const VALUES = [3, 1, 10, 9, 0, 11];

function makeSave(size = TS_SAVE_SIZE): Uint8Array {
  const b = new Uint8Array(size);
  VALUES.forEach((v, i) => writeU8(b, 0x3792 + i, v));
  // 前後のバイト（0x3791、0x3798）も置き、書き込みで変わらないことを見る
  writeU8(b, 0x3791, 0xaa);
  writeU8(b, 0x3798, 0xbb);
  return b;
}

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i);
  return out;
}

describe("夜這いに関わる好感度・ポイント chunks/best-route", () => {
  it("🟢 0x3792〜0x3797 の6バイトを読む", () => {
    expect(YOBAI_POINTS.map((p) => p.offset).sort()).toEqual([0x3792, 0x3793, 0x3794, 0x3795, 0x3796, 0x3797]);
    const view = readYobaiPoints(makeSave());
    expect(view.problem).toBeNull();
    expect(Object.fromEntries(view.values.map((v) => [v.offset, v.value]))).toEqual({
      0x3792: 3,
      0x3793: 1,
      0x3794: 10,
      0x3795: 9,
      0x3796: 0,
      0x3797: 11,
    });
  });

  it("🟢 ローラ・朱美・三姉妹・メリンダのしきい値は 10", () => {
    const t = Object.fromEntries(YOBAI_POINTS.map((p) => [p.offset, p.threshold]));
    expect(t).toEqual({ 0x3792: 10, 0x3793: 10, 0x3794: 10, 0x3795: 10, 0x3796: 10, 0x3797: 10 });
  });

  it("🟢 朱美は魚、三姉妹は治安と拷問の点数のことを説明に書く", () => {
    const note = (o: number) => YOBAI_POINTS.find((p) => p.offset === o)!.note;
    expect(note(0x3793)).toContain("魚");
    expect(note(0x3794)).toContain("治安 70 以上");
    expect(note(0x3795)).toContain("治安 29 以下");
    expect(note(0x3796)).toContain("治安 30〜69");
    expect(note(0x3797)).toContain("5日目以降");
  });

  it("🟢 ローラの好感度は、謎の鍵と千両箱のことを説明に書く", () => {
    const laura = YOBAI_POINTS.find((p) => p.offset === 0x3792)!;
    expect(laura.note).toContain("謎の鍵");
    expect(laura.note).toContain("千両箱");
  });

  it("読み出し→書き戻し→バイト一致", () => {
    const before = makeSave();
    const after = before.slice();
    for (const { offset, value } of readYobaiPoints(after).values) writeYobaiPoint(after, offset, value, { advanced: false });
    expect(after).toEqual(before);
  });

  it("1バイトだけ書く", () => {
    const before = makeSave();
    const after = before.slice();
    writeYobaiPoint(after, 0x3793, 10, { advanced: false });
    expect(diffOffsets(before, after)).toEqual([0x3793]);
    expect(after[0x3793]).toBe(10);
  });

  it("🔶 通常モードは 0〜20、上級者モードは 0〜255", () => {
    expect(POINT_NORMAL_MAX).toBe(20);
    expect(validateYobaiPoint(20, { advanced: false })).toBeNull();
    expect(validateYobaiPoint(21, { advanced: false })).not.toBeNull();
    expect(validateYobaiPoint(255, { advanced: true })).toBeNull();
    expect(validateYobaiPoint(256, { advanced: true })).not.toBeNull();
    expect(validateYobaiPoint(-1, { advanced: true })).not.toBeNull();
    const b = makeSave();
    expect(() => writeYobaiPoint(b, 0x3797, 21, { advanced: false })).toThrow();
    expect(b[0x3797]).toBe(11);
    writeYobaiPoint(b, 0x3797, 200, { advanced: true });
    expect(b[0x3797]).toBe(200);
  });

  it("好感度・ポイント以外の位置には書かない", () => {
    const b = makeSave();
    expect(() => writeYobaiPoint(b, 0x3798, 1, { advanced: true })).toThrow();
    expect(() => writeYobaiPoint(b, 0x3791, 1, { advanced: true })).toThrow();
    expect(b[0x3798]).toBe(0xbb);
  });

  it("ファイルサイズが 0x48BB0 でなければ読み取り専用", () => {
    const b = makeSave(TS_SAVE_SIZE + 4);
    expect(readYobaiPoints(b).problem).not.toBeNull();
    expect(() => writeYobaiPoint(b, 0x3793, 2, { advanced: false })).toThrow();
  });
});
