// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 値は docs/save_format/chunks/factions の調査記録のシナリオ差分（[U] 2026-10-05）で見たもの。どれも 🔶（意味も書き込みも要ゲーム内確認）
import { describe, expect, it } from "vitest";
import { writeU8 } from "./binary";
import {
  FACTION_TABLE_OFFSET,
  MORO_DEAD,
  MORO_OFFSET,
  ROUTE_JUDGE_OFFSET,
  ROUTE_NONE_OFFSET,
  factionRouteStatus,
  hostileFlag,
  predictRouteJudge,
  readFactions,
  readRouteJudge,
  routeEligible,
  validateFactionValue,
  writeFactionValue,
  writeRouteJudge,
} from "./factions";
import { validateFlag } from "./flags/byte-flag";
import { TS_SAVE_SIZE } from "./layout";

/** 0x3780〜0x3788。04 copy 3（志士との出会い完了、海兵隊の横暴で赤城と戦って失敗、阿片密売で密売人を斬る） */
const AFTER_OPIUM = [0x01, 0x00, 0x01, 0x00, 0x01, 0x01, 0x00, 0x01, 0x01];
/** 03 copy 6（志士との出会い、海兵隊の横暴の成功、代官所潜入） */
const AFTER_SNEAK = [0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00];

function makeSave(table: number[], size = TS_SAVE_SIZE): Uint8Array {
  const b = new Uint8Array(size);
  b.set(table, FACTION_TABLE_OFFSET);
  return b;
}

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i);
  return out;
}

describe("readFactions 🔶 chunks/factions", () => {
  it("3行 × 3列（幕府・外国・攘夷）に並べて読む", () => {
    expect(readFactions(makeSave(AFTER_SNEAK))).toMatchObject({ values: [
        [0, 0, 3],
        [0, 0, 0],
        [1, 0, 0],
      ],
      problem: null,
    });
    expect(readFactions(makeSave(AFTER_OPIUM)).values).toEqual([
      [1, 0, 1],
      [0, 1, 1],
      [0, 1, 1],
    ]);
  });

  it("値が大きすぎれば読み取り専用にする", () => {
    const b = makeSave(AFTER_SNEAK);
    writeU8(b, FACTION_TABLE_OFFSET + 4, 0xff);
    expect(readFactions(b).problem).not.toBeNull();
  });

  it("サイズが 0x48BB0 でなければ読み取り専用にする", () => {
    expect(readFactions(makeSave(AFTER_SNEAK, TS_SAVE_SIZE + 4)).problem).not.toBeNull();
  });
});

describe("書き込み 🔶 要ゲーム内確認", () => {
  it("1マスの書き込みは 0x3780＋行×3＋列 の1バイトだけを変える", () => {
    const before = makeSave(AFTER_SNEAK);
    const after = before.slice();
    writeFactionValue(after, 2, 1, 1, { advanced: false });
    expect(diffOffsets(before, after)).toEqual([FACTION_TABLE_OFFSET + 7]);
  });

  it("読み出し→書き戻しでバイト列が一致する", () => {
    const before = makeSave(AFTER_OPIUM);
    const after = before.slice();
    readFactions(after).values.forEach((row, r) =>
      row.forEach((v, c) => writeFactionValue(after, r, c, v, { advanced: false })),
    );
    expect(diffOffsets(before, after)).toEqual([]);
  });

  it("✅ [U] 敵対状態（行2）は通常モードでは 0・1 だけ。上級者モードでは 255 まで", () => {
    const b = makeSave(AFTER_SNEAK);
    writeFactionValue(b, 2, 2, 1, { advanced: false });
    expect(readFactions(b).values[2][2]).toBe(1);
    expect(() => writeFactionValue(b, 2, 2, 2, { advanced: false })).toThrow(RangeError);
    writeFactionValue(b, 2, 2, 5, { advanced: true });
    expect(readFactions(b).values[2][2]).toBe(5);
  });

  it("敵対状態の入力の検証は、書き込みと同じ値の表で行う", () => {
    for (const opts of [{ advanced: false }, { advanced: true }])
      for (const value of [0, 1, 2, 255, 256, -1, 0.5]) {
        const flagProblem = validateFlag(hostileFlag(1), value, opts);
        expect(validateFactionValue(value, opts, 2, 1)).toBe(flagProblem);
        const b = makeSave(AFTER_SNEAK);
        if (flagProblem) expect(() => writeFactionValue(b, 2, 1, value, opts)).toThrow(RangeError);
        else expect(() => writeFactionValue(b, 2, 1, value, opts)).not.toThrow();
      }
  });

  it("通常モードは 9 まで。上級者モードでは 255 まで", () => {
    const b = makeSave(AFTER_SNEAK);
    expect(() => writeFactionValue(b, 0, 0, 10, { advanced: false })).toThrow(RangeError);
    expect(() => writeFactionValue(b, 0, 0, 256, { advanced: true })).toThrow(RangeError);
    expect(() => writeFactionValue(b, 3, 0, 1, { advanced: false })).toThrow(RangeError);
    writeFactionValue(b, 0, 0, 10, { advanced: true });
    expect(readFactions(b).values[0][0]).toBe(10);
  });
});

/** 0x3780〜0x378C。04 copy 12（幕府に3回参加、剣術大会の準備で攘夷と戦う、大寄せのあと。公儀の剣が出た） */
const BAKUFU_ROUTE = [0x03, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x01, 0x01, 0x02, 0x02, 0x00];
/** 04 copy 11・03 copy 9 の 0x3789〜0x378C（どの勢力にも入れない） */
const NO_ROUTE = [0x02, 0x02, 0x02, 0x01];

describe("剣術大会以後のルート分岐 chunks/factions（0x3789〜0x378C）", () => {
  it("勢力ごとの判定と無所属を読む", () => {
    expect(readRouteJudge(makeSave(BAKUFU_ROUTE))).toEqual({
      judges: [1, 2, 2],
      none: 0,
      problem: null,
      warnings: [],
    });
    const b = makeSave(BAKUFU_ROUTE);
    b.set(NO_ROUTE, ROUTE_JUDGE_OFFSET);
    expect(readRouteJudge(b)).toEqual({ judges: [2, 2, 2], none: 1, problem: null, warnings: [] });
    // 大寄せ前はすべて 00
    expect(readRouteJudge(makeSave(AFTER_SNEAK))).toEqual({
      judges: [0, 0, 0],
      none: 0,
      problem: null,
      warnings: [],
    });
  });

  it("✅ [U] 無所属が 01 でも、勢力のどれかが 01 なら根無し草にならないので警告する", () => {
    const b = makeSave(BAKUFU_ROUTE);
    writeU8(b, ROUTE_NONE_OFFSET, 0x01);
    expect((readRouteJudge(b).warnings.join('。') || null)).toMatch(/根無し草/);
  });

  it("剣術大会の準備で攘夷と戦った回数は 2 として読む（行1）", () => {
    expect(readFactions(makeSave(BAKUFU_ROUTE)).values).toEqual([
      [3, 0, 0],
      [0, 0, 2],
      [0, 0, 1],
    ]);
  });

  it("見たことのない値なら読み取り専用にする", () => {
    const b = makeSave(BAKUFU_ROUTE);
    writeU8(b, ROUTE_NONE_OFFSET, 0x02);
    expect(readRouteJudge(b).problem).not.toBeNull();
  });

  it("✅ [U] 書き換えでルートが変わる。1バイトだけを書き、通常モードでは見た値だけ", () => {
    const before = makeSave(BAKUFU_ROUTE);
    const after = before.slice();
    writeRouteJudge(after, 2, 0x01, { advanced: false });
    writeRouteJudge(after, 3, 0x01, { advanced: false });
    expect(diffOffsets(before, after)).toEqual([ROUTE_JUDGE_OFFSET + 2, ROUTE_NONE_OFFSET]);
    expect(() => writeRouteJudge(after, 0, 0x03, { advanced: false })).toThrow(RangeError);
    expect(() => writeRouteJudge(after, 3, 0x02, { advanced: false })).toThrow(RangeError);
    expect(() => writeRouteJudge(after, 4, 0x00, { advanced: true })).toThrow(RangeError);
  });

  it("✅ [U] 行0 − 行1 ≥ 3 でルートに入れる。行2 は使わない（書き換えで5通り試した結果）", () => {
    const cases: [number, number, number, boolean][] = [
      [3, 0, 0, true],
      [3, 1, 0, false],
      [4, 1, 0, true],
      [3, 0, 1, true],
      [3, 0, 5, true],
    ];
    for (const [cooperate, fought, hostile, expected] of cases) {
      const values = [
        [0, 0, cooperate],
        [0, 0, fought],
        [0, 0, hostile],
      ];
      expect(routeEligible(values, 2)).toBe(expected);
    }
    // 04 copy 12：幕府だけが入れる
    const values = readFactions(makeSave(BAKUFU_ROUTE)).values;
    expect([0, 1, 2].map((c) => routeEligible(values, c))).toEqual([true, false, false]);
  });

  it("阿片密売の3通り（04 copy 13 から）：対立ポイント は不利益を与えた勢力に付く", () => {
    // 02：密売人を斬る（大成功）→ 幕府 +1、外国 −1
    expect(
      readFactions(makeSave([0x02, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x01, 0x00])).values.map(
        (r) => r.slice(),
      ),
    ).toEqual([
      [2, 0, 0],
      [0, 1, 0],
      [0, 1, 0],
    ]);
    // 02 copy：導入で幕府勢力を斬る（失敗）→ 幕府の + は増えず −1
    const slashed = readFactions(
      makeSave([0x01, 0x00, 0x00, 0x01, 0x00, 0x00, 0x01, 0x00, 0x00]),
    ).values;
    expect(slashed[0][0] - slashed[1][0]).toBe(0);
    // 02 copy 2：密売人を見逃す（成功）→ 幕府 +1 だけ
    expect(readFactions(makeSave([0x02, 0, 0, 0, 0, 0, 0, 0, 0])).values[0][0]).toBe(2);
  });

  it("読み出し→書き戻しでバイト列が一致する", () => {
    const before = makeSave(BAKUFU_ROUTE);
    const after = before.slice();
    const v = readRouteJudge(after);
    v.judges.forEach((j, c) => writeRouteJudge(after, c, j, { advanced: false }));
    writeRouteJudge(after, 3, v.none, { advanced: false });
    expect(diffOffsets(before, after)).toEqual([]);
  });
});

describe("🟢 大寄せの判定（茂呂・無所属）", () => {
  const values = [
    [3, 4, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];

  it("幕府は茂呂（0x3752）が 1（死亡）だと友好度が 3 以上でも入れない", () => {
    expect(routeEligible(values, 0, 0)).toBe(true);
    expect(routeEligible(values, 0, MORO_DEAD)).toBe(false);
    // 茂呂は幕府だけに効く
    expect(routeEligible(values, 1, MORO_DEAD)).toBe(true);
  });

  it("readFactions は茂呂の状態も読む", () => {
    const b = makeSave(BAKUFU_ROUTE);
    writeU8(b, MORO_OFFSET, MORO_DEAD);
    const v = readFactions(b);
    expect(v.moro).toBe(1);
    expect(routeEligible(v.values, 0, v.moro)).toBe(false);
  });

  it("factionRouteStatus は友好度の差（✅）と茂呂の死亡（🟢）を合わせて返す", () => {
    const b = makeSave(BAKUFU_ROUTE);
    const alive = readFactions(b);
    const [friendly, opposed] = [alive.values[0][0], alive.values[1][0]];
    expect(factionRouteStatus(alive, 0)).toEqual({
      eligible: routeEligible(alive.values, 0, alive.moro),
      friendly,
      opposed,
      affinity: friendly - opposed,
      moroDead: false,
    });
    writeU8(b, MORO_OFFSET, MORO_DEAD);
    const dead = readFactions(b);
    expect(factionRouteStatus(dead, 0)).toMatchObject({ eligible: false, moroDead: true });
    // 茂呂の死亡は幕府（列0）にだけ付ける
    expect(factionRouteStatus(dead, 1).moroDead).toBe(false);
  });

  it("3勢力とも 02 なら無所属 01、どれかが入れるなら 00", () => {
    expect(predictRouteJudge(values, 0)).toEqual({ judges: [1, 1, 2], none: 0 });
    expect(
      predictRouteJudge(
        [
          [3, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
        ],
        MORO_DEAD,
      ),
    ).toEqual({ judges: [2, 2, 2], none: 1 });
  });
});
