// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// src/save/flags/ の、画面のブロックごとの配列。配列1つ＝画面の1ブロック。
import { describe, expect, it } from "vitest";
import { TS_SAVE_SIZE } from '../layout'
import { occupationFlagOffset } from "../townsfolk";
import { ALIVE_DEAD, readFlag, writeFlag, type ByteFlag } from "./byte-flag";
import { CHARACTER_FLAGS } from "./characters";
import { BEST_ROUTE_EVENT_INDEX, BEST_ROUTE_FLAG, EVENT_FLAGS } from "./event-flags";
import { FACILITY_FLAGS, facilitiesReadyForLightOfHope, facilitySlotEvent } from "./facilities";
import { FACTION_EXIT_FLAGS } from "./faction-exit";
import { GATE_CLOSE_FLAGS, GATE_DOOR_FLAGS, GATE_RECRUIT_FLAGS } from "./gates";
import { NPC_DOJO_FLAGS, NPC_OTHER_FLAGS, NPC_SMITH_FLAGS, SMITH_STATES } from "./npc-events";
import {
  GANGSTER_SERIES_VALUES,
  HOMELESS_SERIES_VALUES,
  OCCUPATION_DLC_FLAGS,
  OCCUPATION_FLAGS,
  OCCUPATION_SECURITY_FLAGS,
  OCCUPATION_SERIES_FLAGS,
  POLICE_SERIES_VALUES,
  THIEF_SERIES_VALUES,
  occupationFlag,
} from "./occupation";

/** 画面のブロックと配列 */
const BLOCKS: Record<string, readonly ByteFlag[]> = {
  "阿弥浜 / 施設": FACILITY_FLAGS,
  "阿弥浜 / 門・柵 / 初日勧誘": GATE_RECRUIT_FLAGS,
  "阿弥浜 / 門・柵 / 閉鎖": GATE_CLOSE_FLAGS,
  "阿弥浜 / 門・柵 / 扉": GATE_DOOR_FLAGS,
  "NPC / 勢力の退場": FACTION_EXIT_FLAGS,
  "NPC / 人物の状態": CHARACTER_FLAGS,
  "NPC / NPCイベントフラグ / 鍛冶屋": NPC_SMITH_FLAGS,
  "NPC / NPCイベントフラグ / 道場・先生": NPC_DOJO_FLAGS,
  "NPC / NPCイベントフラグ / その他": NPC_OTHER_FLAGS,
  "イベント / ルート": [BEST_ROUTE_FLAG],
  "イベント / イベント関連フラグ": EVENT_FLAGS,
  "なりわい / 連続なりわい": OCCUPATION_SERIES_FLAGS,
  "なりわい / DLC なりわい": OCCUPATION_DLC_FLAGS,
  "なりわい / 治安なりわい": OCCUPATION_SECURITY_FLAGS,
};
const ALL = Object.values(BLOCKS).flat();
const offsets = (flags: readonly ByteFlag[]) => flags.map((f) => f.offset);
const byOffset = (o: number) => ALL.find((f) => f.offset === o)!;
const valuesOf = (f: ByteFlag) => f.values.map((v) => v.value);

describe("画面のブロックごとの配列（src/save/flags/）", () => {
  it("同じ位置を2つの欄に出さない（一緒に書く位置も含む）", () => {
    const positions = ALL.flatMap((f) => [f.offset, ...(f.alsoAt ?? [])]);
    expect(new Set(positions).size).toBe(positions.length);
  });

  it("どの欄も、位置がファイルの中にあり、値の表が空でなく、値は u8 で重ならない", () => {
    for (const f of ALL) {
      expect(f.offset, f.label).toBeLessThan(TS_SAVE_SIZE);
      expect(f.values.length, f.label).toBeGreaterThan(0);
      for (const v of f.values) expect(v.value >= 0 && v.value <= 0xff, f.label).toBe(true);
      expect(new Set(valuesOf(f)).size, f.label).toBe(f.values.length);
    }
  });

  it("画面に出す文言に、確度・アドレス・生の値の説明を書かない（AGENTS.md）", () => {
    const certainty = /✅|🟢|🟡|🔶|❓|未確認|要ゲーム内確認|確認済み|未検証|推測|推定|確度|U-\d+|D-\d+/;
    for (const f of ALL) {
      const texts = [f.label, f.note ?? "", f.hint ?? "", ...f.values.map((v) => `${v.label}${v.group ?? ""}`)];
      for (const t of texts) {
        expect(t, f.label).not.toMatch(certainty);
        expect(t, f.label).not.toMatch(/0x[0-9a-f]/i);
      }
    }
  });

  it("どの欄も、表の値を通常モードで書け、そのフラグの位置だけが変わる", () => {
    for (const f of ALL) {
      const b = new Uint8Array(TS_SAVE_SIZE);
      for (const { value } of f.values) {
        writeFlag(b, f, value, { advanced: false });
        expect(readFlag(b, f)).toEqual({ value, known: true, mismatch: false });
      }
      const touched = [...b.keys()].filter((i) => b[i] !== 0);
      for (const i of touched) expect([f.offset, ...(f.alsoAt ?? [])]).toContain(i);
    }
  });
});

// 門・柵（chunks/gates）。✅ [U] 2026-10-06：代官所の表門（0x37FA）・居留地（0x3764）の門と神社入口の柵（0x37C3）は 0 で開いた。
// 大寄せ前の門 0x377D（代官所）・0x377E（居留地）・0x377F（神社）は 1 で開き、書き換えで反映された。
// 代官所の裏門（0x37FB）は 🟢 意味のみ。1＝閉じるは 🔶、書き換えで裏門が開くかは ❓ 要ゲーム内確認。
// 洞窟内の柵（0x3761）は ✅ 1 で下降・通行不可、0 での回復は ❓。拷問塔の扉（0x3762・0x3763）は 🟢、見た目は要ゲーム内確認。
describe("門・柵の状態 chunks/gates", () => {
  it("初日勧誘・閉鎖・扉の3つの配列に分ける", () => {
    expect(offsets(GATE_RECRUIT_FLAGS)).toEqual([0x377d, 0x377e, 0x377f]);
    expect(offsets(GATE_CLOSE_FLAGS)).toEqual([0x37fa, 0x37fb, 0x3764, 0x37c3, 0x3761]);
    expect(GATE_DOOR_FLAGS).toHaveLength(1);
    expect(GATE_DOOR_FLAGS[0]).toMatchObject({
      offset: 0x3762,
      alsoAt: [0x3763],
      label: "代官所 拷問部屋の扉",
      hint: "1日目昼または「大老と三姉妹」が成功していない場合はフラグに関わらず閉じます",
    });
  });

  it("初日勧誘は 1 で開き、閉鎖と扉は 1 で閉じる。🟢 閉鎖の 0 はほかの条件の閉鎖を打ち消さない", () => {
    for (const f of GATE_RECRUIT_FLAGS)
      expect(f.values).toEqual([
        { value: 0, label: "閉じている" },
        { value: 1, label: "開いている" },
      ]);
    for (const f of [...GATE_CLOSE_FLAGS, ...GATE_DOOR_FLAGS])
      expect(f.values).toEqual([
        { value: 0, label: "閉鎖指定なし" },
        { value: 1, label: "閉じる" },
      ]);
  });

  it("神社は入口の柵と洞窟内の柵を区別し、門とは表示しない", () => {
    const shrine = [...GATE_RECRUIT_FLAGS, ...GATE_CLOSE_FLAGS].filter((f) => f.label.includes("神社"));
    expect(shrine.map((f) => [f.offset, f.label])).toEqual([
      [0x377f, "神社入口の柵"],
      [0x37c3, "神社入口の柵"],
      [0x3761, "神社の洞窟内の柵"],
    ]);
    expect(byOffset(0x3761).note).toContain("閉じると柵が降り"); // ✅
  });
});

// 施設（chunks/facilities）。✅ [U] 2026-10-06：0x375D＝病院（1＝開）、0x375E＝カジノ（1＝閉）、0x375F＝語学所（1＝開）。
describe("施設 chunks/facilities", () => {
  it("✅ [U] 0x375D 病院・0x375E カジノ・0x375F 語学所。カジノだけ 1 で閉じる", () => {
    expect(FACILITY_FLAGS.map((f) => [f.offset, f.label, f.values.find((v) => v.value === 1)?.label])).toEqual([
      [0x375d, "病院", "開いている"],
      [0x375e, "カジノ", "閉じている"],
      [0x375f, "語学所", "開いている"],
    ]);
  });

  it("🟢 2日目の各枠で、値によって起きるイベントが入れ替わる", () => {
    const slotsOf = (i: number) => FACILITY_FLAGS[i].slots.map((s) => [s.when0, s.when1]);
    expect(slotsOf(0)).toEqual([
      ["西洋医学お断り", "病院廃業の企て"],
      ["病院占拠事件", "祝 病院開業"],
    ]);
    expect(slotsOf(1)).toEqual([
      ["ライジングサン", "カジノ再建を急げ"],
      ["カジノを破壊せよ", "カジノ再建断固阻止"],
      ["運命のルーレット", "伯爵に刺激を"],
    ]);
    expect(slotsOf(2)).toEqual([
      ["講師ご到着", "語学所開設"],
      ["語学無用", "講師を亡き者に"],
    ]);
    const hospitalShogunate = FACILITY_FLAGS[0].slots[0];
    expect(facilitySlotEvent(hospitalShogunate, 0)).toBe("西洋医学お断り");
    expect(facilitySlotEvent(hospitalShogunate, 1)).toBe("病院廃業の企て");
    expect(facilitySlotEvent(hospitalShogunate, 2)).toBeNull();
  });

  it("🟢 希望の光には病院・語学所が開き、カジノが閉じている（3つとも 1）必要がある", () => {
    expect(facilitiesReadyForLightOfHope([1, 1, 1])).toBe(true);
    expect(facilitiesReadyForLightOfHope([0, 0, 0])).toBe(false);
    expect(facilitiesReadyForLightOfHope([1, 0, 1])).toBe(false);
  });
});

// 勢力の退場（chunks/best-route）。✅ [U] 2026-10-09：1 にすると、その勢力の人物が町から消えた。
describe("勢力の退場 chunks/best-route", () => {
  it("幕府・外国・攘夷の順に 0x378F〜0x3791", () => {
    expect(FACTION_EXIT_FLAGS.map((f) => [f.offset, f.label])).toEqual([
      [0x378f, "幕府"],
      [0x3790, "外国"],
      [0x3791, "攘夷"],
    ]);
    for (const f of FACTION_EXIT_FLAGS)
      expect(f.values.map((v) => v.label)).toEqual(["町にいる", "退場した"]);
  });
});

// 人物の状態（chunks/characters）。
// 🟢 0x374E＝赤城（0 生存・1 死亡・3 病院に運ばれて助かった）、0x374F＝小暮、0x3759＝メリンダ。
// ✅ [U] 2026-10-06：0x3750＝朱美〜0x3758＝J.J. は書き換えで人物を確認。🟢 鬼怒川は船上の侍で 2・大老暗殺計画で倒すと 0。
// 🟢 J.J. は 0・1・3・4・5 を取る。🟢 ローラの 2＝代官所へ向かった。
// ✅ 万由・千佳・百合は 0 生存・1 死亡、J.J. の 3（療養中）・堂島の 1（釜茹で）の意味（ユーザー判断 2026-10-11）。
// 🟢 0x375A＝堂島、0x375B＝先生、0x375C＝薬屋、0x37F9＝寿司屋。書き換えの効果は要ゲーム内確認。
describe("人物の状態 chunks/characters", () => {
  it("0x374E〜0x375C の15人と、🟢 寿司屋の 0x37F9", () => {
    expect(offsets(CHARACTER_FLAGS)).toEqual([
      ...Array.from({ length: 15 }, (_, i) => 0x374e + i),
      0x37f9,
    ]);
    expect(CHARACTER_FLAGS.map((f) => f.label)).toEqual([
      "赤城", "小暮", "朱美", "琴吹", "茂呂", "万由", "千佳", "百合", "鬼怒川怨仙",
      "ローラ", "J.J.", "メリンダ", "堂島", "先生", "薬屋", "寿司屋",
    ]);
  });

  it("基本は 0＝生存・1＝死亡。違う人物だけ個別の値を持つ", () => {
    for (const o of [0x374f, 0x3752, 0x3753, 0x3754, 0x3755, 0x3759, 0x37f9])
      expect(byOffset(o).values).toBe(ALIVE_DEAD);
    expect(valuesOf(byOffset(0x374e))).toEqual([0, 1, 3]);
    expect(valuesOf(byOffset(0x3756))).toEqual([0, 2]);
    expect(valuesOf(byOffset(0x3757))).toEqual([0, 1, 2]);
    expect(valuesOf(byOffset(0x3758))).toEqual([0, 1, 3, 4, 5]);
    expect(byOffset(0x3757).values.find((s) => s.value === 2)?.label).toBe("代官所へ向かった");
    expect(byOffset(0x3758).note).toContain("療養中");
    expect(byOffset(0x375a).note).toContain("釜茹で");
  });
});

// NPCイベントフラグ（chunks/townsfolk・best-route）。
// ✅ [U] 2026-10-06：0x0127＝鍛冶屋の後継者イベント・鍛冶屋の状態（値の表は書き換えで確認）、0x0132＝堂島が鍛冶屋を継いだ。
// ほかは 🟢。番号 23 の値と場面の割り当ては 🔶。
describe("NPCイベントフラグ chunks/townsfolk", () => {
  it("鍛冶屋・道場・先生・その他の配列", () => {
    expect(offsets(NPC_SMITH_FLAGS)).toEqual([0x0127, 0x0132, 0x3799]);
    expect(offsets(NPC_DOJO_FLAGS)).toEqual([...[10, 13, 17, 18, 20, 21].map(occupationFlagOffset), 0x379a]);
    expect(offsets(NPC_OTHER_FLAGS)).toEqual([16, 23, 24].map(occupationFlagOffset));
  });

  it("0x0127 の値（✅ [U] 書き換え・実セーブ、ほかの値と書かれる場面は 🟢。21〜26 は出さない）", () => {
    expect(SMITH_STATES.map((s) => s.value).sort((a, b) => a - b)).toEqual([
      0, 1, 10, 20, 27, 28, 30, 40, 50, 60, 61, 69, 70, 80, 81, 82, 83, 90, 99, 109, 110, 119, 120,
    ]);
    // ✅ [U] 2026-10-16：踏み倒した直後に殺すと 109 のまま。🟢 110・120 は踏み倒したあとに話して店をやめられたとき
    expect(SMITH_STATES.find((s) => s.value === 109)?.label).toBe("鍛冶屋のおやじから踏み倒した直後（おやじが怒っている）");
    expect(SMITH_STATES.find((s) => s.value === 110)?.label).toBe("踏み倒したため、おやじが店をやめた");
    expect(SMITH_STATES.find((s) => s.value === 120)?.label).toBe("踏み倒したため、堂島が店をやめた");
    expect(byOffset(0x0132).label).toBe("堂島が鍛冶屋");
    expect(valuesOf(byOffset(0x0132))).toEqual([0, 1]);
  });

  it("🟢 先生の段階（番号 10）は仕事探し・道場・手合わせの値（74 は書く場面がないので載せない）", () => {
    expect(valuesOf(byOffset(0x0126))).toEqual([
      0, 1, 2, 3, 9, 10, 11, 19, 20, 21, 29, 30, 31, 40, 41, 49, 50, 60, 70, 71, 72, 73, 75, 76, 77, 79, 80, 99,
    ]);
    expect(byOffset(0x0126).values.find((v) => v.value === 50)?.label).toBe("道場の師範代を引き受けた");
  });

  it("🟢 ぢぢい（番号 13）の値は東急流の段ではなく聞いた話。🔶 100 は通常モードに出さない", () => {
    const f = byOffset(0x0129);
    expect(valuesOf(f)).toEqual([0, 1, 10, 20, 30, 40, 50, 60, 70]);
    expect(f.note).toContain("流派の段そのものではない");
    expect(f.note).toContain("目録の入手や技の習得は反映されない");
    expect(() => writeFlag(new Uint8Array(TS_SAVE_SIZE), f, 100, { advanced: false })).toThrow(RangeError);
  });

  it("🟢 先生が師範代（番号 21）は 0〜2", () => {
    expect(valuesOf(byOffset(occupationFlagOffset(21)))).toEqual([0, 1, 2]);
  });

  it("🟢 堂島・先生の職（0x3799・0x379A）は書き換えたときに効くことを hint に書く", () => {
    expect(byOffset(0x3799).label).toBe("堂島が鍛冶屋（イベント判定用）");
    expect(byOffset(0x379a).label).toBe("先生が道場の師範代（イベント判定用）");
    expect(byOffset(0x379a).hint).toContain("無所属の剣術大会");
  });

  it("🟢 エリア移動・ロードで消えるなりわいのフラグ（1〜3・15）は載せない", () => {
    for (const n of [1, 2, 3, 15]) expect(ALL.some((f) => f.offset === occupationFlagOffset(n))).toBe(false);
  });
});

// イベント（chunks/best-route・scenario-flags）。
// ✅ [U] 2026-10-06：真ルート 0x378E は三姉妹見参（添字70）の成功と組で効く。0・1 は書き換えで確認、2（外れた）は 🟢。
// 0x37A1〜0x37A4・0x37A8 は 🟢（0x37A2 の 1 と 2 を書き分ける意図は 🔶）。
// 0x37C0（黒船の大砲）は意味が 🔶、0x37C6（領事館の中に入れない）は 🟢、0x3760 は 1 になる場面が ❓。
// 0x378D・0x379B・0x379F・0x37A0・0x37AA と剣術大会の 0x37AB・0x37F7・0x37F8 は出さない（ユーザー判断 2026-10-10）。
describe("イベント関連フラグ chunks/best-route・scenario-flags", () => {
  it("✅ [U] 真ルートは 0x378E。三姉妹見参（添字70）と組で効く", () => {
    expect(BEST_ROUTE_FLAG.offset).toBe(0x378e);
    expect(BEST_ROUTE_EVENT_INDEX).toBe(70);
    expect(valuesOf(BEST_ROUTE_FLAG)).toEqual([0, 1, 2]);
    expect(BEST_ROUTE_FLAG.values[2].label).toContain("外れた");
  });

  it("位置の順に並べる", () => {
    expect(offsets(EVENT_FLAGS)).toEqual([0x3760, 0x37a1, 0x37a2, 0x37a3, 0x37a4, 0x37a8, 0x37c0, 0x37c6]);
    expect(byOffset(0x37a2).label).toBe("般若党の本拠");
    expect(byOffset(0x37a2).note).toContain("片付いたと離散したの効果は同じ");
    expect(byOffset(0x37c6).values).toEqual([
      { value: 0, label: "入れる" },
      { value: 1, label: "入れない" },
    ]);
  });

  it("出さないと決めたバイト・使われていないバイトはどの欄にもない", () => {
    const hidden = [
      0x378d, 0x379b, 0x379f, 0x37a0, 0x37aa, 0x37ab, 0x37f7, 0x37f8, 0x377c,
      0x3798, 0x379c, 0x379d, 0x379e, 0x37a5, 0x37a6, 0x37a7, 0x37a9,
    ];
    for (const o of hidden) expect(ALL.some((f) => f.offset === o), `0x${o.toString(16)}`).toBe(false);
    // 好感度・ポイント（0x3792〜0x3797）は夜這いの画面
    for (let o = 0x3792; o <= 0x3797; o++) expect(ALL.some((f) => f.offset === o)).toBe(false);
  });
});

// なりわい（chunks/townsfolk「なりわいのフラグ」）。✅ 0x0120（番号 4、野戸仏）は 20・100 を書き換えで確認（2026-10-07）。ほかは 🟢。
describe("なりわいのフラグ chunks/townsfolk", () => {
  it("連続なりわい・DLC・治安の配列と番号", () => {
    expect(OCCUPATION_SERIES_FLAGS.map((f) => f.number)).toEqual([4, 5, 6, 7, 25, 26]);
    expect(OCCUPATION_DLC_FLAGS.map((f) => f.number)).toEqual([27, 28, 29, 30, 31]);
    expect(OCCUPATION_SECURITY_FLAGS.map((f) => f.number)).toEqual([8, 9]);
    for (const f of OCCUPATION_FLAGS) expect(f.offset).toBe(occupationFlagOffset(f.number));
    expect(occupationFlag(4).offset).toBe(0x0120);
    expect(() => occupationFlag(10)).toThrow(RangeError);
  });

  it("依頼主の名前", () => {
    expect([4, 5, 6, 7].map((n) => occupationFlag(n).label)).toEqual([
      "【岡っ引き】野戸仏",
      "【極道】小鳩",
      "【泥棒】泥棒さん",
      "【宿無し】おっつぁん",
    ]);
  });

  it("🟢 連続なりわいの値は依頼主ごと。0・n0・n1 と、8件目のあとの値と 100", () => {
    const steps = (last: number) => [0, ...Array.from({ length: last }, (_, i) => [(i + 1) * 10, (i + 1) * 10 + 1]).flat()];
    expect(POLICE_SERIES_VALUES.map((v) => v.value)).toEqual([...steps(8), 90, 91, 97, 99, 100, 101, 102]);
    expect(GANGSTER_SERIES_VALUES.map((v) => v.value)).toEqual([...steps(8), 90, 91, 100, 101]);
    expect(THIEF_SERIES_VALUES.map((v) => v.value)).toEqual([...steps(8), 90, 91, 92, 100, 101, 102]);
    expect(HOMELESS_SERIES_VALUES.map((v) => v.value)).toEqual([...steps(8), 90, 91, 100]);
    [POLICE_SERIES_VALUES, GANGSTER_SERIES_VALUES, THIEF_SERIES_VALUES, HOMELESS_SERIES_VALUES].forEach((table, i) =>
      expect(occupationFlag(4 + i).values).toBe(table),
    );
    expect(POLICE_SERIES_VALUES.find((v) => v.value === 97)?.label).toBe("出された浪人（虎鉄）に礼を言われた（野戸仏の話はまだ）");
  });

  it("🟢 佐古津（8）・女将（9）・四天王の話（25）・最終なりわい（26）・汁部（27〜31）の値", () => {
    expect(valuesOf(occupationFlag(8))).toEqual([0, 10, 20, 30]);
    expect(valuesOf(occupationFlag(9))).toEqual([0, 1, 10, 20, 21]);
    expect(valuesOf(occupationFlag(25))).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 50, 60, 99, 100]);
    expect(occupationFlag(25).values.find((v) => v.value === 10)?.label).toBe("熊神十兵衛から「四天王の証」を受け取り、後を継いだ");
    // 🔶 治療すると 207 から 208 に発展。43 は医者の判定の境目で、書く場面はないので表にない
    expect(valuesOf(occupationFlag(26))).toEqual([0, 1, 2, 10, 11, 12, 15, 20, 99, 100]);
    expect(occupationFlag(26).values.find((v) => v.value === 10)?.label).toBe("女将に熊神のことを話し、薬代を引き受けてもらった");
    expect(valuesOf(occupationFlag(27))).toEqual([0, 1]);
    expect(occupationFlag(31).values.map((v) => v.label)).toEqual([
      "受注前",
      "成功",
      "成功……？（失敗を成功扱いにしてもらった）",
    ]);
  });

  it("欄の下に並べる依頼主のなりわい", () => {
    expect(occupationFlag(4).jobs).toEqual([171, 172, 173, 174, 175, 176, 177, 178]);
    // 🟢 佐古津は 163〜166。162 は表にない欠番なので入らない
    expect(occupationFlag(8).jobs).toEqual([163, 164, 165, 166]);
    expect(occupationFlag(9).jobs).toEqual([167, 168, 169, 170]);
    expect(occupationFlag(26).jobs).toEqual([207, 208]);
    expect(occupationFlag(27).jobs).toBeUndefined();
  });
});
