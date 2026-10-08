// ノードの表（datatable/event/chart-node.csv、全行 🟢）と同じ内容かを、要所の行で確かめる。
import { describe, expect, it } from "vitest";
import { CHART_NODES, CHART_NODE_MAX, CHART_NODE_OWN_LABELS, chartNode } from "./chart-nodes";
import { chartNodeLabel } from "./labels";

const name = (id: number) => {
  const node = chartNode(id);
  return node ? chartNodeLabel(node, "") : undefined;
};

describe("🟢 チャートのノード datatable/event/chart-node.csv", () => {
  it("0〜118 の119件。ID は欠番なしの昇順", () => {
    expect(CHART_NODES).toHaveLength(119);
    expect(CHART_NODES.map((n) => n.id)).toEqual([...Array(CHART_NODE_MAX + 1).keys()]);
  });

  it("イベントに当たらないノードは 0・1・53・113・114・118", () => {
    expect(CHART_NODES.filter((n) => n.eventId === null).map((n) => n.id)).toEqual([0, 1, 53, 113, 114, 118]);
    expect(CHART_NODES.filter((n) => n.labelId === null).map((n) => n.id)).toEqual([0, 1, 53, 113, 114, 118]);
  });

  it("✅ 実データで場面の分かっている値", () => {
    expect(name(2)).toBe("志士との出会い");
    expect(name(6)).toBe("琴吹光探検隊");
    expect(chartNode(78)?.eventId).toBe(0);
    expect(name(78)).toBe("船上の侍");
    expect(chartNode(83)?.eventId).toBe(1);
    expect(name(83)).toBe("阿弥浜港争乱");
    expect(name(89)).toBe("嵐のあと");
    expect(chartNode(102)?.eventId).toBe(51);
    expect(name(102)).toBe("覇者となる");
  });

  it("名前はイベントの名前を使う。違う名前のノードだけ、ノードの名前を持つ", () => {
    expect([...CHART_NODE_OWN_LABELS.keys()]).toEqual([30, 39]);
    expect(name(30)).toBe("闇討ち ～小暮捜索");
    expect(name(39)).toBe("町の薬師");
    expect(chartNode(39)?.eventId).toBe(34);
    expect(name(73)).toBe("大老　鬼怒川怨仙");
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
