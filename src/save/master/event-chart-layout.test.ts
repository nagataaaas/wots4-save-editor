// イベントチャートの枠の配置（スクリーンショットから書き起こしたもの）が、ノードの表と食い違っていないか、
// 枠や線が重なっていないかを確かめる。
import { describe, expect, it } from "vitest";
import { CHART_NODES } from "./chart-nodes";
import {
  BOX_WIDTH,
  CHART_BOXES,
  CHART_COLS,
  CHART_LINKS,
  CHART_ROWS,
  boxEventId,
  boxName,
  chartBox,
  linkSegments,
} from "./event-chart-layout";

describe("イベントチャートの枠", () => {
  it("どの枠も 🟢 ノードの表にあり、イベントの通し番号を持つ", () => {
    for (const b of CHART_BOXES) {
      expect(CHART_NODES[b.node]?.eventId, `ノード ${b.node}`).not.toBeNull();
      expect(boxEventId(b)).toBe(CHART_NODES[b.node].eventId);
    }
  });

  it("ノード番号は重複しない", () => {
    const nodes = CHART_BOXES.map((b) => b.node);
    expect(new Set(nodes).size).toBe(nodes.length);
  });

  it("同じ列・段に2つの枠を置かない", () => {
    const cells = CHART_BOXES.map((b) => `${b.col},${b.row}`);
    expect(new Set(cells).size).toBe(cells.length);
  });

  it("列・段の範囲に収まる", () => {
    for (const b of CHART_BOXES) {
      expect(b.col).toBeGreaterThanOrEqual(0);
      expect(b.col).toBeLessThan(CHART_COLS);
      expect(b.row).toBeGreaterThanOrEqual(0);
      expect(b.row).toBeLessThan(CHART_ROWS);
    }
  });

  it("名前は 🟢 ノードの表から引く", () => {
    expect(boxName(chartBox(78)!)).toBe("船上の侍");
    expect(boxName(chartBox(109)!)).toBe("大老は生きていた");
  });

  it("日と時間帯を持つのは勢力の枠だけで、1〜3日目", () => {
    for (const b of CHART_BOXES.filter((x) => x.day !== undefined)) {
      expect(["prajna", "shogunate", "foreigners"]).toContain(b.kind);
      expect(b.slot).toBeDefined();
    }
  });
});

describe("イベントチャートの線", () => {
  it("両端のノードがどれも枠にある", () => {
    for (const l of CHART_LINKS)
      for (const n of [...l.from, ...l.to]) expect(chartBox(n), `ノード ${n}`).toBeDefined();
  });

  it("出発の枠は同じ列で、到着の枠はそれより右", () => {
    for (const l of CHART_LINKS) {
      const fromCols = new Set(l.from.map((n) => chartBox(n)!.col));
      expect(fromCols.size).toBe(1);
      const [col] = fromCols;
      for (const n of l.to) expect(chartBox(n)!.col).toBeGreaterThan(col);
    }
  });

  it("横の線は、つなぐ枠のほかの枠に重ならない", () => {
    for (const l of CHART_LINKS)
      for (const s of linkSegments(l)) {
        if (s.y1 !== s.y2) continue;
        const [left, right] = [Math.min(s.x1, s.x2), Math.max(s.x1, s.x2)];
        const hit = CHART_BOXES.filter(
          (b) => b.node !== s.node && b.row + 0.5 === s.y1 && b.col < right && b.col + BOX_WIDTH > left,
        );
        expect(hit.map((b) => b.node), `${l.from.join(",")} → ${l.to.join(",")}`).toEqual([]);
      }
  });

  it("縦の線は列の隙間にある", () => {
    for (const l of CHART_LINKS)
      for (const s of linkSegments(l).filter((x) => x.x1 === x.x2)) {
        const frac = s.x1 - Math.floor(s.x1);
        expect(frac).toBeGreaterThan(BOX_WIDTH);
      }
  });
});
