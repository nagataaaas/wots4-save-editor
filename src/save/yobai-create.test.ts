// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 期待するバイト列は docs/save_format/chunks/night-visit で見たもの：
//   かえで（女中 0x25）はゲームが作った約束の実データ（[U] 2026-10-06）、先生はゲームが作った約束の実データ（[U] 2026-10-07）、
//   朱美・町人（男性）は書き込みでゲーム内確認（✅ [U] 2026-10-10）。名前のある男性7人は 🟢 だけ（要ゲーム内確認）。
import { describe, expect, it } from "vitest";
import { TS_SAVE_SIZE } from './layout'
import { DATE_OFFSETS } from "./scenario-date";
import {
  PROMISE_PARTNERS,
  PROMISE_ROWS,
  buildPromiseBytes,
  createPromise,
  createProblem,
  choosePromisePlace,
  choosePromiseAt,
  layoutForPlace,
  initialPromiseSpec,
  nameCandidates,
  partnerDeathWarning,
  promisePartner,
  randomSpec,
  rowsFor,
  validateSpec,
  type PromiseSpec,
} from "./yobai-create";
import { PROMISE_OFFSET, STAGE_OFFSET, readYobai } from "./yobai";

const hex = (s: string) => Uint8Array.from(s.replace(/\s/g, "").match(/../g)!.map((h) => Number.parseInt(h, 16)));

/** かえでと約束中の 0x14038〜0x14061（2日目、経過日数 1） */
const PROMISE_KAEDE = hex("00000100250000000c0006000a000b000e000f000c000d001d000100a51b00001c0000001803ffff0100");
/** 先生と約束中の 0x14038〜0x14061（約束した日 5） */
const PROMISE_SENSEI = hex("ffff00005002000011002000 0a000b000e000f000c000d001d000100 0f00000057000000ff05ffff0500");
/** ✅ [U] 2026-10-10 書き込みで確認：朱美（経過日数 1） */
const PROMISE_AKEMI = hex("ffff0000ba0100001f0016000a000b000e000f000c000d001d00010003000000" + "4c000000ff01ffff0100");
/** ✅ [U] 2026-10-10 書き込みで確認：町人（男性）・たくま・35歳・A（経過日数 1） */
const PROMISE_TOWNSMAN = hex("00000100470000000c0006000a000b000e000f000c000d001d000100bd1b00003a0000002301ffff0100");

/** 約束のない枠（+0x24 以降は前の値が残る） */
const PROMISE_EMPTY = hex("ff".repeat(0x24) + "1803ffffffff0700");

function makeSave(opts: { day?: number; stage?: number; promise?: Uint8Array } = {}): Uint8Array {
  const b = new Uint8Array(TS_SAVE_SIZE);
  b.set(opts.promise ?? PROMISE_EMPTY, PROMISE_OFFSET);
  const dv = new DataView(b.buffer);
  dv.setUint16(DATE_OFFSETS.dayIndex, opts.day ?? 1, true);
  dv.setUint32(STAGE_OFFSET, opts.stage ?? 0, true);
  return b;
}

const KAEDE: PromiseSpec = { type: 0x25, row: 18, name: 7077, look: 0x1c, age: 24, blood: 3 };
const AKEMI: PromiseSpec = { type: 442, row: 2, name: 3, look: 0x4c, age: 0xff, blood: 1 };
const TOWNSMAN: PromiseSpec = { type: 0x47, row: 18, name: 7101, look: 0x3a, age: 35, blood: 1 };
const SENSEI: PromiseSpec = { type: 592, row: 13, name: 15, look: 0x57, age: 0xff, blood: 5 };

describe("夜の約束を作る chunks/night-visit「約束の作り方」", () => {
  it("🟢 読み出した今日・段階・死亡の注意を画面で再利用できる", () => {
    const bytes = makeSave({ day: 5, stage: 2 });
    const context = readYobai(bytes).context;
    expect(context.today).toBe(5);
    expect(context.stage).toBe(2);
    expect(context.createProblem).toBeNull();
    expect(initialPromiseSpec(context.stage).type).toBe(0x25);
    createPromise(bytes, KAEDE, { advanced: false });
    expect(readYobai(bytes).context.createProblem).toContain("すでに約束");
  });
  it("🟢 場所と配置が候補にあるなら組を選び、なければ上書きする", () => {
    const partner = promisePartner(KAEDE.type)!;
    const rows = rowsFor(partner, 2, { advanced: false });
    const row = rows[0];
    expect(choosePromisePlace({ ...KAEDE, place: 1, layout: 1 }, rows, row.place, row.layout))
      .toMatchObject({ row: row.index, place: undefined, layout: undefined });
    const nearest = rows.filter(r => r.place === row.place)
      .sort((a, b) => Math.abs((a.stage ?? 0) - 2) - Math.abs((b.stage ?? 0) - 2))[0];
    expect(choosePromiseAt(KAEDE, rows, row.place, 2)?.row).toBe(nearest.index);
    // 組も配置もない場所は選べない（例外にせず null）
    expect(choosePromiseAt(KAEDE, rows, -1, 2)).toBeNull();
    expect(layoutForPlace(row.place, row.layout)).toBe(row.layout);
    expect(choosePromisePlace(KAEDE, [], row.place, row.layout)).toMatchObject({ place: row.place, layout: row.layout });
    expect(() => layoutForPlace(-1, 0)).toThrow();
  });
  it("組の表は 75 行で、+0x0C〜+0x1B はどれも同じ（🟢）", () => {
    expect(PROMISE_ROWS).toHaveLength(75);
    const tail = PROMISE_ROWS[0].bytes.slice(0x0c);
    for (const r of PROMISE_ROWS) {
      expect(r.bytes).toHaveLength(0x1c);
      expect(r.bytes.slice(0x0c)).toEqual(tail);
    }
  });

  it.each([
    ["かえで（実データ）", KAEDE, PROMISE_KAEDE, 1],
    ["朱美（✅ 書き込み）", AKEMI, PROMISE_AKEMI, 1],
    ["町人・男性（✅ 書き込み）", TOWNSMAN, PROMISE_TOWNSMAN, 1],
    ["先生（実データ）", SENSEI, PROMISE_SENSEI, 5],
  ] as const)("%s のバイト列を作る", (_, spec, expected, day) => {
    expect(buildPromiseBytes(spec, day)).toEqual(expected);
    expect(validateSpec(spec, 0, { advanced: false })).toBeNull();
  });

  it("空の枠に書き、+0x2A 以降と枠の外は変えない。読み直すと同じ値", () => {
    const before = makeSave({ day: 1 });
    const after = before.slice();
    createPromise(after, KAEDE, { advanced: false });
    expect(after.slice(PROMISE_OFFSET, PROMISE_OFFSET + 0x2a)).toEqual(PROMISE_KAEDE);
    for (let i = 0; i < after.length; i++)
      if (i < PROMISE_OFFSET || i >= PROMISE_OFFSET + 0x2a) expect(after[i], `0x${i.toString(16)}`).toBe(before[i]);
    const { promise } = readYobai(after);
    expect(promise).toMatchObject({ active: true, type: 0x25, place: 0x0c, layout: 0x06, name: 7077, look: 0x1c, age: 24, blood: 3, day: 1 });
  });

  it("約束した日はいまの経過日数", () => {
    const b = makeSave({ day: 4 });
    createPromise(b, AKEMI, { advanced: false });
    expect(readYobai(b).promise.day).toBe(4);
  });

  it("約束があると作らない。ファイルサイズが違うと作らない", () => {
    expect(createProblem(makeSave({ promise: PROMISE_KAEDE }))).toMatch(/すでに約束/);
    expect(() => createPromise(makeSave({ promise: PROMISE_KAEDE }), AKEMI, { advanced: false })).toThrow();
    const small = new Uint8Array(TS_SAVE_SIZE - 16);
    small.set(PROMISE_EMPTY, PROMISE_OFFSET);
    expect(createProblem(small)).not.toBeNull();
  });

  it("町の人の組は、通常モードでは段階 0x13E30 以下、上級者モードではまとまりの全行", () => {
    const kaede = promisePartner(0x25)!;
    expect(rowsFor(kaede, 0, { advanced: false }).every((r) => r.group === 1 && r.stage === 0)).toBe(true);
    expect(rowsFor(kaede, 3, { advanced: false })).toHaveLength(22);
    expect(rowsFor(kaede, 0, { advanced: true })).toHaveLength(22);
    // 行 19 は段階 2
    expect(validateSpec({ ...KAEDE, row: 19 }, 0, { advanced: false })).toMatch(/段階/);
    expect(validateSpec({ ...KAEDE, row: 19 }, 2, { advanced: false })).toBeNull();
    expect(validateSpec({ ...KAEDE, row: 19 }, 0, { advanced: true })).toBeNull();
    // まとまり 2 の行は使えない
    expect(validateSpec({ ...KAEDE, row: 37 }, 3, { advanced: true })).not.toBeNull();
  });

  it("名前は相手と同じ性別の候補から（🟢 女性 7001〜7100、男性 7101〜7150、外国人は 8000 台）", () => {
    const female = nameCandidates(promisePartner(0x25)!);
    const male = nameCandidates(promisePartner(0x47)!);
    expect(female[0]).toBe(7001);
    expect(female.at(-1)).toBe(7100);
    expect(male[0]).toBe(7101);
    expect(male.at(-1)).toBe(7150);
    expect(nameCandidates(promisePartner(0x23)!)[0]).toBe(8001); // 貴婦人
    expect(nameCandidates(promisePartner(0x10)!)[0]).toBe(8105); // 外国人（男性）
  });

  it("名前・見た目・年齢・血液型は種類とは別に、約束の編集欄と同じ範囲で選べる（✅ [U] 別々に効く）", () => {
    // 名前：名前の表にある ID なら、性別や種類の候補と違っても通常モードで書ける
    expect(validateSpec({ ...KAEDE, name: 7101 }, 0, { advanced: false })).toBeNull();
    expect(validateSpec({ ...KAEDE, name: 9999 }, 0, { advanced: false })).not.toBeNull();
    expect(validateSpec({ ...KAEDE, name: 9999 }, 0, { advanced: true })).toBeNull();
    // 見た目：🟢 見た目の表（222件）にある値。町人の見た目 0x3A を女中に
    expect(validateSpec({ ...KAEDE, look: 0x3a }, 0, { advanced: false })).toBeNull();
    expect(validateSpec({ ...KAEDE, look: 0x14 }, 0, { advanced: false })).not.toBeNull(); // 表にない
    // 年齢：0〜99 か 255（？）。血液型：1〜5
    expect(validateSpec({ ...KAEDE, age: 99 }, 0, { advanced: false })).toBeNull();
    expect(validateSpec({ ...KAEDE, age: 100 }, 0, { advanced: false })).not.toBeNull();
    expect(validateSpec({ ...AKEMI, blood: 2 }, 0, { advanced: false })).toBeNull();
    expect(validateSpec({ ...AKEMI, blood: 6 }, 0, { advanced: false })).not.toBeNull();
    // 種類は約束できる相手の表にあるものだけ。坂本（91）は表にない
    expect(validateSpec({ ...KAEDE, type: 91 }, 0, { advanced: true })).toMatch(/種類/);
  });

  it("くじで選んだ値はどれも検証を通る", () => {
    let seed = 1;
    const rand = () => ((seed = (seed * 48271) % 0x7fffffff) / 0x7fffffff);
    for (const p of PROMISE_PARTNERS)
      for (let stage = 0; stage <= 3; stage++) {
        const spec = randomSpec(p, stage, rand);
        expect(validateSpec(spec, stage, { advanced: false }), `${p.label} ${stage}`).toBeNull();
      }
  });

  it("上級者モードでは、名前のある相手でも場所と配置を、場所で使える配置の組に上書きできる", () => {
    // 朱美を稲荷前 0C・配置 06 に（組 2 の +0x00〜+0x1B のうち、+0x08・+0x0A だけが変わる）
    const moved: PromiseSpec = { ...AKEMI, place: 0x0c, layout: 0x06 };
    expect(validateSpec(moved, 0, { advanced: false })).toMatch(/上級者モード/);
    expect(validateSpec(moved, 0, { advanced: true })).toBeNull();
    const bytes = buildPromiseBytes(moved, 1);
    const expected = PROMISE_AKEMI.slice();
    expected.set([0x0c, 0x00, 0x06, 0x00], 0x08);
    expect(bytes).toEqual(expected);
    // その場所で使えない配置は上級者モードでも書かない
    expect(validateSpec({ ...AKEMI, place: 0x0c, layout: 0x07 }, 0, { advanced: true })).not.toBeNull();
    // 組と同じ場所・配置を指定するのは通常モードでもよい
    expect(validateSpec({ ...AKEMI, place: 0x1f, layout: 0x16 }, 0, { advanced: false })).toBeNull();
  });

  it("名前のある相手は表の行・名前・見た目が決まっている（🟢 男性7人は要ゲーム内確認）", () => {
    const akagi = promisePartner(46)!;
    expect(akagi.kind).toBe("special");
    expect(randomSpec(akagi, 0)).toEqual({ type: 46, row: 0, name: 1, look: 0x30, age: 25, blood: 3 });
    expect(PROMISE_ROWS[akagi.row!].partnerName).toBe("赤城");
  });

  it("死んでいる名前のある相手には警告を出す", () => {
    const b = makeSave();
    expect(partnerDeathWarning(b, 442)).toBeNull();
    b[0x3750] = 1;
    // 名前だけを出す（場所・姿の注記は付けない）。❓ 死んだ相手が夜這いの場に出るかは書かない
    expect(partnerDeathWarning(b, 442)).toBe("朱美 は死亡しています。約束は消えずに残ります");
    expect(partnerDeathWarning(b, 0x25)).toBeNull();
  });
});
