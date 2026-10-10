// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 値は docs/save_format/chunks/gates の調査記録のシナリオ差分（[U] 2026-10-05）で見たもの。
// 代官所の表門（0x37FA）・居留地（0x3764）の門と神社入口の柵（0x37C3）は、書き換えで開くことを確認（✅ [U] 2026-10-06）。
// 代官所の裏門（0x37FB）は 🟢 意味のみ。1＝閉じるは 🔶、書き換えで裏門が開くかは ❓ 要ゲーム内確認。
// 大寄せ前の門 0x377D（代官所）・0x377E（居留地）・0x377F（神社）は 1 で開き、書き換えで反映された（✅ [U] 2026-10-06）。
// 大寄せ以降の門は 🟢 大寄せでルートに入れなかった勢力の門が 1 になる。
import { describe, expect, it } from "vitest";
import { writeU8 } from "./binary";
import { TS_SAVE_SIZE } from "./hero";
import {
  SCENARIO_FLAGS,
  WORLD_FLAGS,
  readScenarioFlags,
  readWorldFlags,
  writeScenarioFlag,
  writeWorldFlag,
} from "./world-flags";

/**
 * WORLD_FLAGS の順。大寄せ以降の4つは 04 copy 11（根無し草、大寄せのあと。3つの門がすべて閉じている）、
 * 大寄せ前の3つは S4-DATA_01（阿弥浜港争乱の直後、居留地だけが開いている）の値
 */
// 洞窟内の柵は合成値1を追加（✅ 1で下降・通行不可、0での回復は未確認）。
const NO_ROUTE = [1, 1, 1, 1, 0, 1, 0, 1];

function makeSave(values: number[], size = TS_SAVE_SIZE): Uint8Array {
  const b = new Uint8Array(size);
  WORLD_FLAGS.forEach((f, i) => {
    writeU8(b, f.offset, values[i] ?? 0);
    if (f.pairedOffset !== undefined) writeU8(b, f.pairedOffset, values[i] ?? 0);
  });
  // 意味の分からないバイト（UI に出さない）も置き、書き込みで変わらないことを見る
  writeU8(b, 0x37a2, 2);
  writeU8(b, 0x377c, 1);
  return b;
}

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i);
  return out;
}

describe("門・柵のフラグ chunks/gates", () => {
  it("大寄せ以降と大寄せ前の、代官所・居留地・神社の門と、代官所の拷問部屋の扉を読む", () => {
    expect(WORLD_FLAGS.map((f) => f.offset)).toEqual([
      0x37fa, 0x37fb, 0x3764, 0x37c3, 0x377d, 0x377e, 0x377f, 0x3761, 0x3762,
    ]);
    expect(readWorldFlags(makeSave(NO_ROUTE))).toEqual({
      values: [...NO_ROUTE, 0],
      paired: [null, null, null, null, null, null, null, null, 0],
      problem: null,
    });
  });

  it("✅ [U] 大寄せ以降の門は 1 で閉じ、大寄せ前の門は 1 で開く（0x37FB の 1＝閉じるは 🔶）", () => {
    expect(WORLD_FLAGS.map((f) => f.meaning)).toEqual([
      "close",
      "close",
      "close",
      "close",
      "open",
      "open",
      "open",
      "close",
      "close",
    ]);
    expect(WORLD_FLAGS.map((f) => f.group)).toEqual([
      "close",
      "close",
      "close",
      "close",
      "recruit",
      "recruit",
      "recruit",
      "close",
      "door",
    ]);
  });

  it("神社は入口の柵と洞窟内の柵を区別し、門とは表示しない", () => {
    expect(WORLD_FLAGS.find((f) => f.offset === 0x37c3)?.label).toContain("神社入口の柵");
    expect(WORLD_FLAGS.find((f) => f.offset === 0x377f)?.label).toContain("神社入口の柵");
    const cave = WORLD_FLAGS.find((f) => f.offset === 0x3761)!;
    expect(cave.label).toContain("神社の洞窟内の柵");
    expect(cave.note).toContain("✅ 1 で柵が降り");
    expect(cave.note).toContain("0 に戻したときの上昇・通行の回復は要ゲーム内確認");
    expect(
      WORLD_FLAGS.filter((f) => f.label.includes("神社")).every((f) => !f.label.includes("門")),
    ).toBe(true);
    expect(SCENARIO_FLAGS.some((f) => f.offset === 0x3761)).toBe(false);
  });

  it("0・1 以外なら読み取り専用にする", () => {
    expect(readWorldFlags(makeSave([2, 1, 1, 1, 0, 1, 0])).problem).not.toBeNull();
    expect(readWorldFlags(makeSave([1, 2, 1, 1, 0, 1, 0])).problem).not.toBeNull();
    expect(readWorldFlags(makeSave([1, 1, 1, 1, 0, 1, 2])).problem).not.toBeNull();
    expect(readWorldFlags(makeSave([1, 1, 1, 1, 0, 1, 0, 2])).problem).not.toBeNull();
  });

  it("サイズが 0x48BB0 でなければ読み取り専用にする", () => {
    expect(readWorldFlags(makeSave(NO_ROUTE, TS_SAVE_SIZE + 4)).problem).not.toBeNull();
  });

  it("書き込みは、そのフラグの1バイト（拷問部屋の扉は2バイト）だけを変える", () => {
    WORLD_FLAGS.forEach((f, i) => {
      const before = makeSave(NO_ROUTE);
      const after = before.slice();
      writeWorldFlag(after, i, (NO_ROUTE[i] ?? 0) ^ 1, { advanced: false });
      expect(diffOffsets(before, after)).toEqual(
        f.pairedOffset === undefined ? [f.offset] : [f.offset, f.pairedOffset],
      );
    });
  });

  it("通常モードは 0・1 だけ。上級者モードでは任意の u8", () => {
    const b = makeSave(NO_ROUTE);
    expect(() => writeWorldFlag(b, 0, 2, { advanced: false })).toThrow(RangeError);
    expect(() => writeWorldFlag(b, WORLD_FLAGS.length, 0, { advanced: false })).toThrow(RangeError);
    writeWorldFlag(b, 0, 2, { advanced: true });
    expect(b[0x37fa]).toBe(2);
  });

  it("読み出し→書き戻しでバイト列が一致する", () => {
    const before = makeSave(NO_ROUTE);
    const after = before.slice();
    readWorldFlags(after).values.forEach((v, i) =>
      writeWorldFlag(after, i, v, { advanced: false }),
    );
    expect(diffOffsets(before, after)).toEqual([]);
  });
});

// 代官所の拷問塔の扉（chunks/scenario-flags）。🟢 0x3762（拷問部屋）と 0x3763（拷問塔の区画の入口）を
// 1つの欄にまとめて両方へ同じ値を書く。1 以上で閉じる。扉の見た目は要ゲーム内確認。
describe("代官所 拷問部屋の扉（門・柵のフラグに置く）", () => {
  const TORTURE = WORLD_FLAGS.findIndex((f) => f.offset === 0x3762);
  /** 大寄せ以降で門がすべて閉じ、大老と三姉妹の前（0x3762・0x3763 が 1） */
  const VALUES = [...NO_ROUTE, 1];

  it("🟢 0x3763 と組にして、門・柵のフラグの「代官所の扉」に置く", () => {
    const torture = WORLD_FLAGS[TORTURE];
    expect(torture).toMatchObject({
      offset: 0x3762,
      pairedOffset: 0x3763,
      label: "代官所 拷問部屋の扉",
      meaning: "close",
      group: "door",
      hint: "1日目昼または「大老と三姉妹」が成功していない場合はフラグに関わらず閉じます",
    });
    expect(SCENARIO_FLAGS.some((f) => f.offset === 0x3762 || f.offset === 0x3763)).toBe(false);
  });

  it("2バイトを読み、食い違っていてもそのまま読む。書き込むと両方がそろう", () => {
    const b = makeSave(VALUES);
    const paired = WORLD_FLAGS.map((f) => (f.pairedOffset === undefined ? null : 1));
    expect(readWorldFlags(b)).toEqual({ values: VALUES, paired, problem: null });
    writeU8(b, 0x3763, 0);
    const view = readWorldFlags(b);
    expect(view.values[TORTURE]).toBe(1);
    expect(view.paired[TORTURE]).toBe(0);
    expect(view.problem).toBeNull();
    writeWorldFlag(b, TORTURE, 0, { advanced: false });
    expect([b[0x3762], b[0x3763]]).toEqual([0, 0]);
  });

  it("どちらかのバイトが 0・1 以外なら読み取り専用にする", () => {
    const b = makeSave(VALUES);
    writeU8(b, 0x3763, 2);
    expect(readWorldFlags(b).problem).not.toBeNull();
  });
});

// そのほかのフラグ（chunks/scenario-flags）。シナリオの画面の「イベント関連フラグ」に出す。
// どれも 🟢 1 になる場面が分かっていて、書き換えたときのゲーム内の反映は要ゲーム内確認。
// 0x37C0（黒船の大砲）は意味が 🔶、0x37C6（1 のとき領事館の中に入れない）は意味が 🟢、0x3760 は 1 になる場面が ❓。
// 0x37AB（剣術大会で勝ち抜いた試合数）・0x37F7・0x37F8（剣術大会でまだら・メリンダに勝った）は画面に出さない（ユーザー判断 2026-10-10）。
describe("そのほかのフラグ chunks/scenario-flags", () => {
  /** SCENARIO_FLAGS の順。大寄せで外国ルートに入れず（0x37C6 が 1）、黒船の大砲を譲っていない、という合成の値 */
  const VALUES = [1, 0, 0];

  function makeOther(values: number[], size = TS_SAVE_SIZE): Uint8Array {
    const b = new Uint8Array(size);
    SCENARIO_FLAGS.forEach((f, i) => writeU8(b, f.offset, values[i]));
    // 隣のバイト（門 0x3764・0x37C3、拷問塔の扉 0x3762・0x3763、真ルートの範囲 0x37A2）も置き、書き込みで変わらないことを見る
    writeU8(b, 0x3764, 1);
    writeU8(b, 0x37c3, 1);
    writeU8(b, 0x3762, 1);
    writeU8(b, 0x3763, 1);
    writeU8(b, 0x37a2, 2);
    return b;
  }

  it("位置と候補の値", () => {
    expect(SCENARIO_FLAGS.map((f) => f.offset)).toEqual([0x37c6, 0x3760, 0x37c0]);
    // 🟢 0x37C6 は 1 のとき領事館の中に入れない（表示は要ゲーム内確認）
    const consulate = SCENARIO_FLAGS[0];
    expect(consulate.label).toBe("領事館の中に入れない");
    expect(consulate.values).toEqual([
      { value: 0, label: "0 入れる" },
      { value: 1, label: "1 入れない" },
    ]);
    expect(consulate.certainty).toBe("🟢");
    // 🔶 意味に推測が入るのは 0x37C0
    expect(SCENARIO_FLAGS.filter((f) => f.certainty === "🔶").map((f) => f.offset)).toEqual([
      0x37c0,
    ]);
    // 剣術大会の 0x37AB・0x37F7・0x37F8 は出さない
    for (const o of [0x37ab, 0x37f7, 0x37f8])
      expect(SCENARIO_FLAGS.some((f) => f.offset === o)).toBe(false);
    // 門と重ならない
    const gates = new Set(WORLD_FLAGS.map((f) => f.offset));
    expect(SCENARIO_FLAGS.some((f) => gates.has(f.offset))).toBe(false);
  });

  it("生の値を読む。候補にない値でも読み取り専用にしない", () => {
    expect(readScenarioFlags(makeOther(VALUES))).toEqual({ values: VALUES, problem: null });
    const odd = [...VALUES];
    odd[0] = 7;
    expect(readScenarioFlags(makeOther(odd))).toEqual({ values: odd, problem: null });
  });

  it("サイズが 0x48BB0 でなければ読み取り専用にする", () => {
    const b = makeOther(VALUES, TS_SAVE_SIZE + 4);
    expect(readScenarioFlags(b).problem).not.toBeNull();
    expect(() => writeScenarioFlag(b, 0, 0, { advanced: true })).toThrow(RangeError);
  });

  it("書き込みは、そのフラグの1バイトだけを変える", () => {
    SCENARIO_FLAGS.forEach((f, i) => {
      const before = makeOther(VALUES);
      const after = before.slice();
      writeScenarioFlag(after, i, VALUES[i] === 0 ? 1 : 0, { advanced: false });
      expect(diffOffsets(before, after)).toEqual([f.offset]);
    });
  });

  it("通常モードは候補の値だけ。上級者モードでは任意の u8", () => {
    const b = makeOther(VALUES);
    expect(() => writeScenarioFlag(b, 0, 2, { advanced: false })).toThrow(RangeError);
    expect(() => writeScenarioFlag(b, SCENARIO_FLAGS.length, 0, { advanced: false })).toThrow(
      RangeError,
    );
    expect(() => writeScenarioFlag(b, 0, 0x100, { advanced: true })).toThrow(RangeError);
    writeScenarioFlag(b, 0, 2, { advanced: true });
    expect(b[0x37c6]).toBe(2);
  });

  it("読み出し→書き戻しでバイト列が一致する", () => {
    const before = makeOther(VALUES);
    const after = before.slice();
    readScenarioFlags(after).values.forEach((v, i) =>
      writeScenarioFlag(after, i, v, { advanced: false }),
    );
    expect(diffOffsets(before, after)).toEqual([]);
  });
});
