// イベントチャートの枠の描き分け。規則は docs/save_format/chunks/event-chart「チャート表示の規則」。
import { describe, expect, it } from "vitest";
import { chartBoxLook } from "./event-chart-view";
import type { ChartBox } from "./master/event-chart-layout";

const faction: ChartBox = { node: 5, col: 3, row: 0, kind: "prajna", day: 1, slot: 1 }; // 海兵隊の横暴（1日目夕）
const later: ChartBox = { node: 95, col: 14, row: 0, kind: "prajna" }; // 志士の刀（日と時間帯なし）
const hidden: ChartBox = { node: 56, col: 2, row: 8, kind: "hidden" }; // 三姉妹見参
const e = (state: number, record: number) => ({ index: 0, state, record });
const day1Noon = { day: 1, slot: 0 };

describe("chartBoxLook", () => {
  it("セーブ未読み込みは名前を出す", () => {
    expect(chartBoxLook(null, null, faction)).toBe("shown");
    expect(chartBoxLook(null, null, hidden)).toBe("shown");
  });

  it("✅ 記録 04 なら名前を出し、状態 05 なら失敗の印", () => {
    expect(chartBoxLook(e(0x04, 0x04), day1Noon, faction)).toBe("shown");
    expect(chartBoxLook(e(0x05, 0x04), day1Noon, faction)).toBe("shown-failed");
    expect(chartBoxLook(e(0xff, 0x04), day1Noon, faction)).toBe("shown");
  });

  it("✅ 記録 FF でも状態 04 なら名前を出す", () => {
    expect(chartBoxLook(e(0x04, 0xff), day1Noon, faction)).toBe("shown");
    expect(chartBoxLook(e(0x04, 0xff), day1Noon, hidden)).toBe("shown");
  });

  it("✅ 記録 FF で状態 FF・00・05 なら名前を隠す", () => {
    expect(chartBoxLook(e(0xff, 0xff), day1Noon, faction)).toBe("masked");
    expect(chartBoxLook(e(0x00, 0xff), day1Noon, faction)).toBe("masked");
    expect(chartBoxLook(e(0x05, 0xff), day1Noon, faction)).toBe("masked-failed");
  });

  it("❓ 記録 FF で状態 01〜03、記録 00・03・05 は名前を隠すとして描く", () => {
    for (const s of [0x01, 0x02, 0x03]) expect(chartBoxLook(e(s, 0xff), day1Noon, faction)).toBe("masked");
    for (const r of [0x00, 0x03, 0x05]) expect(chartBoxLook(e(0x00, r), day1Noon, later)).toBe("masked");
  });

  it("✅ 隠しルートの枠は、記録 FF で状態 04 以外なら枠ごと出ない", () => {
    for (const s of [0x00, 0x01, 0x03, 0x05, 0xff]) expect(chartBoxLook(e(s, 0xff), day1Noon, hidden)).toBe("absent");
    expect(chartBoxLook(e(0x05, 0x04), day1Noon, hidden)).toBe("shown-failed");
  });

  it("✅ 時間帯が過ぎた未処理の勢力イベントは失敗（🔶 当たるイベントの範囲）", () => {
    expect(chartBoxLook(e(0x00, 0x04), { day: 1, slot: 1 }, faction)).toBe("shown");
    expect(chartBoxLook(e(0x00, 0x04), { day: 1, slot: 2 }, faction)).toBe("shown-failed");
    expect(chartBoxLook(e(0xff, 0xff), { day: 2, slot: 0 }, faction)).toBe("masked-failed");
    expect(chartBoxLook(e(0x00, 0x04), { day: 5, slot: 0 }, faction)).toBe("shown-failed");
    // 進行中・成功は時間帯が過ぎても失敗にしない
    expect(chartBoxLook(e(0x03, 0x04), { day: 2, slot: 0 }, faction)).toBe("shown");
    expect(chartBoxLook(e(0x04, 0x04), { day: 2, slot: 0 }, faction)).toBe("shown");
    // 日と時間帯を持たない枠、日付が分からないときは失敗にしない
    expect(chartBoxLook(e(0x00, 0x04), { day: 9, slot: 2 }, later)).toBe("shown");
    expect(chartBoxLook(e(0x00, 0x04), null, faction)).toBe("shown");
  });
});
