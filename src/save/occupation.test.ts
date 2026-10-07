// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 値は docs/save_format/chunks/occupation（受注・クリアの差分 2026-10-06・2026-10-07）で見たもの。
import { describe, expect, it } from "vitest";
import { writeU16 } from "./binary";
import { TS_SAVE_SIZE } from "./hero";
import { OCCUPATIONS, OCCUPATION_GROUPS, occupationById, occupationGroupOf } from "./master/occupation-names";
import {
  OCCUPATION_ACCEPTED_OFFSET,
  OCCUPATION_CLEAR_COUNT_OFFSET,
  OCCUPATION_NOT_APPEARED,
  OCCUPATION_STATE_COUNT,
  OCCUPATION_STATE_OFFSET,
  occupationStateOffset,
  readOccupations,
  syncClearCount,
  validateOccupationState,
  writeOccupationState,
  writeOccupationStates,
} from "./occupation";

/**
 * 差分の「おにぎり屋の用心棒」をクリアしたあと（sample/S4-DATA_04 相当）：209〜212 が 1、クリア数 4。
 * 🔶 171（出頭命令）は受注前から 0。ほかの ID は FFFF にしておく
 */
function makeSave(size = TS_SAVE_SIZE): Uint8Array {
  const b = new Uint8Array(size);
  for (let id = 0; id < OCCUPATION_STATE_COUNT; id++) writeU16(b, OCCUPATION_STATE_OFFSET + id * 2, OCCUPATION_NOT_APPEARED);
  for (const id of [209, 210, 211, 212]) writeU16(b, OCCUPATION_STATE_OFFSET + id * 2, 1);
  writeU16(b, OCCUPATION_STATE_OFFSET + 171 * 2, 0);
  writeU16(b, OCCUPATION_CLEAR_COUNT_OFFSET, 4);
  // 前後のバイト（0x33A3・0x35A4 の vitals）も置き、書き込みで変わらないことを見る
  b[OCCUPATION_STATE_OFFSET - 1] = 7;
  b[OCCUPATION_STATE_OFFSET + OCCUPATION_STATE_COUNT * 2] = 7;
  return b;
}

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i);
  return out;
}

describe("🟢 なりわいの表 datatable/occupation/occupation.csv", () => {
  it("ID 3〜212 のうち170件。重複なし", () => {
    expect(OCCUPATIONS).toHaveLength(170);
    expect(OCCUPATIONS[0].id).toBe(3);
    expect(OCCUPATIONS[OCCUPATIONS.length - 1].id).toBe(212);
    expect(new Set(OCCUPATIONS.map((o) => o.id)).size).toBe(170);
  });

  it("✅ 差分の4件（209〜212）と、【岡っ引き】野戸仏の連続なりわいの1・2件目（171・172）", () => {
    expect([209, 210, 211, 212].map((id) => occupationById(id)?.ja)).toEqual([
      "今宵の虎徹は",
      "薬売り",
      "食い逃げ外国人",
      "おにぎり屋の用心棒",
    ]);
    expect(occupationById(171)?.ja).toBe("出頭命令");
    expect(occupationById(172)?.ja).toBe("督促状");
  });

  it("🟢 まとまりの範囲は重ならず、表の全件がどれかに入る", () => {
    for (let i = 1; i < OCCUPATION_GROUPS.length; i++) expect(OCCUPATION_GROUPS[i].from).toBe(OCCUPATION_GROUPS[i - 1].to + 1);
    expect(occupationGroupOf(171)).toBe("police");
    expect(occupationGroupOf(163)).toBe("sakotsu");
    expect(occupationGroupOf(170)).toBe("okami");
    expect(occupationGroupOf(212)).toBe("shirube");
    for (const o of OCCUPATIONS) expect(OCCUPATION_GROUPS.some((g) => o.id >= g.from && o.id <= g.to)).toBe(true);
  });
});

describe("なりわいの状態の表 0x33A4〜 chunks/occupation", () => {
  it("✅ 状態[id] = 0x33A4 + id×2（209 は 0x3546、212 は 0x354C）", () => {
    expect(occupationStateOffset(209)).toBe(0x3546);
    expect(occupationStateOffset(212)).toBe(0x354c);
    expect(() => occupationStateOffset(256)).toThrow(RangeError);
  });

  it("✅ 1 以上はクリア回数。🟢 合計がクリア数 0x433A6 に等しい", () => {
    const view = readOccupations(makeSave());
    expect(view.layoutProblem).toBeNull();
    expect(view.states[209]).toBe(1);
    expect(view.states[3]).toBe(OCCUPATION_NOT_APPEARED);
    expect(view.stateSum).toBe(4);
    expect(view.clearCount).toBe(4);
  });

  it("🔶 0 は受けられる・未クリア（出頭命令は受注前から 0）。合計には数えない", () => {
    const view = readOccupations(makeSave());
    expect(view.states[171]).toBe(0);
  });

  it("🟢 受注中の ID 0x45F4E を読む（受注していなければ 0）", () => {
    const b = makeSave();
    expect(readOccupations(b).accepted).toBe(0);
    writeU16(b, OCCUPATION_ACCEPTED_OFFSET, 171);
    expect(readOccupations(b).accepted).toBe(171);
  });

  it("✅ 209 を 1 にする書き込みは、その 2 B だけを変える", () => {
    const before = makeSave();
    writeU16(before, occupationStateOffset(209), 0);
    const after = before.slice();
    writeOccupationState(after, 209, 1, { advanced: false });
    expect(diffOffsets(before, after)).toEqual([0x3546]);
  });

  it("通常モードは FFFF か 0〜999（🔶 仮の上限）で、表にある ID だけ。上級者モードは任意の u16", () => {
    expect(validateOccupationState(3, OCCUPATION_NOT_APPEARED, 1, { advanced: false })).toBeNull();
    expect(validateOccupationState(3, 999, 0, { advanced: false })).toBeNull();
    expect(validateOccupationState(3, 1000, 0, { advanced: false })).not.toBeNull();
    // 7 は欠番、213 は表の外
    expect(validateOccupationState(7, 1, OCCUPATION_NOT_APPEARED, { advanced: false })).not.toBeNull();
    expect(validateOccupationState(213, 1, OCCUPATION_NOT_APPEARED, { advanced: false })).not.toBeNull();
    expect(validateOccupationState(213, 1000, OCCUPATION_NOT_APPEARED, { advanced: true })).toBeNull();
    expect(validateOccupationState(3, 0x10000, 0, { advanced: true })).not.toBeNull();
  });

  it("まとめて書き、クリア数を表の合計に揃える", () => {
    const b = makeSave();
    writeOccupationStates(b, [171, 172, 173], 2);
    expect(readOccupations(b).stateSum).toBe(10);
    expect(readOccupations(b).clearCount).toBe(4);
    syncClearCount(b);
    expect(readOccupations(b).clearCount).toBe(10);
  });

  it("🔶 状態が FFFF か 0〜999 でない（位置がずれた）セーブは読み取り専用", () => {
    const b = makeSave();
    writeU16(b, occupationStateOffset(50), 0x1234);
    expect(readOccupations(b).layoutProblem).not.toBeNull();
    expect(() => writeOccupationState(b, 209, 2, { advanced: true })).toThrow(RangeError);
    expect(() => syncClearCount(b)).toThrow(RangeError);
  });

  it("❓ U-1：サイズが 0x48BB0 でなければ読み取り専用にする", () => {
    const b = makeSave(TS_SAVE_SIZE + 4);
    expect(readOccupations(b).layoutProblem).not.toBeNull();
    expect(() => writeOccupationState(b, 209, 2, { advanced: true })).toThrow(RangeError);
  });

  it("読み出し→書き戻しでバイト列が一致する", () => {
    const before = makeSave();
    const after = before.slice();
    readOccupations(after).states.forEach((v, id) => writeOccupationState(after, id, v, { advanced: false }));
    syncClearCount(after);
    expect(diffOffsets(before, after)).toEqual([]);
  });
});
