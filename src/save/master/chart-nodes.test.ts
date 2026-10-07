// ノードの表（datatable/event/chart-node.csv、全行 🟢）と同じ内容かを、要所の行で確かめる。
import { describe, expect, it } from "vitest";
import { CHART_NODES, CHART_NODE_MAX, chartNode } from "./chart-nodes";

describe("🟢 チャートのノード datatable/event/chart-node.csv", () => {
  it("0〜118 の119件。ID は欠番なしの昇順", () => {
    expect(CHART_NODES).toHaveLength(119);
    expect(CHART_NODES.map((n) => n.id)).toEqual([...Array(CHART_NODE_MAX + 1).keys()]);
  });

  it("イベントに当たらないノードは 0・1・53・113・114・118", () => {
    expect(CHART_NODES.filter((n) => n.eventId === null).map((n) => n.id)).toEqual([0, 1, 53, 113, 114, 118]);
    expect(CHART_NODES.filter((n) => n.ja === null).map((n) => n.id)).toEqual([0, 1, 53, 113, 114, 118]);
  });

  it("✅ 実データで場面の分かっている値", () => {
    expect(chartNode(2)?.ja).toBe("志士との出会い");
    expect(chartNode(6)?.ja).toBe("琴吹光探検隊");
    expect(chartNode(78)).toMatchObject({ ja: "船上の侍", eventId: 0 });
    expect(chartNode(83)).toMatchObject({ ja: "阿弥浜港争乱", eventId: 1 });
    expect(chartNode(89)?.ja).toBe("嵐のあと");
    expect(chartNode(102)).toMatchObject({ ja: "覇者となる", eventId: 51 });
  });

  it("1つのイベントが複数のノードを持つ", () => {
    expect(CHART_NODES.filter((n) => n.eventId === 83)).toHaveLength(7);
    expect(CHART_NODES.filter((n) => n.eventId === 28)).toHaveLength(4);
    expect(CHART_NODES.filter((n) => n.eventId === 34)).toHaveLength(3);
  });

  it("範囲外は undefined", () => {
    expect(chartNode(119)).toBeUndefined();
    expect(chartNode(-1)).toBeUndefined();
    expect(chartNode(0xffff)).toBeUndefined();
  });
});
