// 道場（🟢 chunks/dojo）。名簿の書き換え・道場破りを帰す操作のゲームへの反映は要ゲーム内確認。
import { describe, expect, it } from "vitest";
import { TS_SAVE_SIZE } from './layout'
import {
  PUPIL_KINDS,
  RAIDERS_OFFSET,
  pupilOffset,
  rankForPoints,
  readDojo,
  writePupilKind,
  writePupilLook,
  writeRaid,
} from "./dojo";

/** はじめからの初期値：0x14064〜0x1406B は 0、名簿は FF、道場破りは −1 */
function blank(): Uint8Array {
  const b = new Uint8Array(TS_SAVE_SIZE);
  b.fill(0xff, 0x1406c, 0x1415c);
  b.fill(0xff, 0x1415c, 0x1417c);
  return b;
}

/** 実セーブで見た弟子の並び（種類 78 パツキン隊・点 3、73 娘・点 4、34 老婆・点 1） */
const PUPIL_78 = [0x4e, 0, 0, 0, 0x4b, 0, 0, 0, 0x01, 0x00, 3, 0];
const PUPIL_73 = [0x49, 0, 0, 0, 0x15, 0, 0, 0, 0xbc, 0x00, 4, 0];
const PUPIL_34 = [0x22, 0, 0, 0, 0x1c, 0, 0, 0, 0x13, 0x00, 1, 0];

function withPupils(): Uint8Array {
  const b = blank();
  b.set(PUPIL_78, pupilOffset(0));
  b.set(PUPIL_73, pupilOffset(1));
  b.set(PUPIL_34, pupilOffset(2));
  b[0x14065] = 3;
  b[0x14066] = 1;
  b[0x14068] = 8;
  return b;
}

describe("道場の読み出し", () => {
  it("はじめからの値は弟子なし・段階 0 で編集できる", () => {
    const v = readDojo(blank());
    expect(v.problem).toBeNull();
    expect(v.count).toBe(0);
    expect(v.pupils.every((p) => p === null)).toBe(true);
  });

  it("名簿の各項目を読む", () => {
    const v = readDojo(withPupils());
    expect(v.problem).toBeNull();
    expect(v.pupils[1]).toEqual({ kind: 73, name: 21, look: 0xbc, point: 4, shown: 0 });
    expect(v.points).toBe(8);
  });

  it("+0x00 が −1 の枠は、+0x0B が 0 でも空き（✅ 実セーブ：地域を移ると空きの枠の +0x0B も 0 になる）", () => {
    const b = withPupils();
    b.fill(0xff, pupilOffset(1), pupilOffset(1) + 11);
    b[pupilOffset(1) + 11] = 0;
    b[0x14065] = 2;
    b[0x14068] = 4;
    const v = readDojo(b);
    expect(v.problem).toBeNull();
    expect(v.pupils[1]).toBeNull();
    expect(v.pupils[2]).not.toBeNull();
    // 空きの枠に入れても、決め直した数・点が合う
    writePupilKind(b, 1, 73);
    expect(b[0x14065]).toBe(3);
    expect(b[0x14068]).toBe(8);
  });

  it("数・点が名簿と合わなければ読み取り専用", () => {
    const b = withPupils();
    b[0x14065] = 4;
    expect(readDojo(b).problem).not.toBeNull();
    const c = withPupils();
    c[0x14068] = 9;
    expect(readDojo(c).problem).not.toBeNull();
  });

  it("ファイルサイズが違えば読み取り専用", () => {
    const b = new Uint8Array(TS_SAVE_SIZE + 1);
    b.set(blank());
    expect(readDojo(b).problem).not.toBeNull();
  });
});

describe("段階", () => {
  it("点の範囲で 0〜5（🟢）", () => {
    expect([0, 4, 5, 24, 25, 39, 40, 54, 55, 70, 71, 9999].map((p) => rankForPoints(p, 0))).toEqual([
      0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5,
    ]);
    expect(rankForPoints(10000, 3)).toBe(3);
  });
});

describe("名簿の書き込み", () => {
  it("今の値を書き戻すとバイトが変わらない", () => {
    const b = withPupils();
    const before = b.slice();
    writePupilKind(b, 1, 73);
    writePupilLook(b, 1, 0xbc, { advanced: false });
    expect(b).toEqual(before);
  });

  it("空きに弟子を入れると、種類の名前・見た目・点を書き、数・点・段階を決め直す", () => {
    const b = withPupils();
    writePupilKind(b, 5, 109);
    const k = PUPIL_KINDS.find((x) => x.id === 109)!;
    expect(Array.from(b.subarray(pupilOffset(5), pupilOffset(5) + 12))).toEqual([
      109, 0, 0, 0, k.name, 0, 0, 0, k.looks[0], 0, k.point, 0,
    ]);
    expect(b[0x14065]).toBe(4);
    expect(b[0x14068]).toBe(8 + k.point);
    expect(b[0x14066]).toBe(1);
  });

  it("空きにすると 12 B を FF にして決め直す", () => {
    const b = withPupils();
    writePupilKind(b, 0, null);
    expect(b.subarray(pupilOffset(0), pupilOffset(0) + 12).every((v) => v === 0xff)).toBe(true);
    expect(b[0x14065]).toBe(2);
    expect(b[0x14068]).toBe(5);
    expect(b[0x14066]).toBe(1);
  });

  it("71 点以上で段階 5", () => {
    const b = blank();
    for (let i = 0; i < 15; i++) writePupilKind(b, i, 109);
    expect(b[0x14068]).toBe(75);
    expect(b[0x14066]).toBe(5);
    expect(readDojo(b).problem).toBeNull();
  });

  it("種類を変えると、今の見た目が候補になければ候補の先頭にする", () => {
    const b = withPupils();
    writePupilKind(b, 1, 37);
    expect(b[pupilOffset(1) + 8]).toBe(PUPIL_KINDS.find((x) => x.id === 37)!.looks[0]);
  });

  it("表にない種類・候補にない見た目は書かない（上級者モードは見た目の表にあれば書ける）", () => {
    const b = withPupils();
    expect(() => writePupilKind(b, 0, 1)).toThrow();
    expect(() => writePupilLook(b, 0, 0x13, { advanced: false })).toThrow();
    writePupilLook(b, 0, 0x13, { advanced: true });
    expect(b[pupilOffset(0) + 8]).toBe(0x13);
  });
});

describe("道場破りが来ているか", () => {
  it("来ていないにすると、来ている印・人数を 0、枠を −1 にする", () => {
    const b = withPupils();
    b[0x14064] = 1;
    b[0x1406a] = 2;
    b.set([0x25, 1, 0, 0, 0x26, 1, 0, 0], RAIDERS_OFFSET);
    writeRaid(b, false);
    expect(b[0x14064]).toBe(0);
    expect(b[0x1406a]).toBe(0);
    expect(b.subarray(RAIDERS_OFFSET, RAIDERS_OFFSET + 32).every((v) => v === 0xff)).toBe(true);
  });

  it("来ているにすると印だけを 1 にする（種類と人数は道場に入るとゲームが書く 🟢）", () => {
    const b = withPupils();
    const before = b.slice();
    writeRaid(b, true);
    expect(b[0x14064]).toBe(1);
    before[0x14064] = 1;
    expect(b).toEqual(before);
  });

  it("弟子がいなければ来ているにしない", () => {
    expect(() => writeRaid(blank(), true)).toThrow();
  });
});
