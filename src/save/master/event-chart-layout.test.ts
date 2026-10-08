// イベントチャートの升の並び（datatable/event/chart-cell.csv、全行 🟢）が、ノードの表と食い違っていないかを確かめる。
import { describe, expect, it } from "vitest";
import { CHART_NODES } from "./chart-nodes";
import {
  CHART_CELLS,
  CHART_COLS,
  CHART_FRAMES,
  CHART_LINES,
  CHART_NEIGHBORS,
  CHART_ROWS,
  frameName,
} from "./event-chart-layout";

const frameAt = (col: number, row: number) => CHART_FRAMES.find((f) => f.col === col && f.row === row);

describe("🟢 イベントチャートの升", () => {
  it("枠 95 個（真ルート 21 個）と線 240 本。格子は 47 列 × 11 行", () => {
    expect(CHART_CELLS).toHaveLength(335);
    expect(CHART_FRAMES).toHaveLength(95);
    expect(CHART_FRAMES.filter((f) => f.hidden !== 0)).toHaveLength(21);
    expect(CHART_LINES).toHaveLength(240);
    expect([CHART_COLS, CHART_ROWS]).toEqual([47, 11]);
  });

  it("同じ升に2つ置かない。枠は偶数の列", () => {
    const keys = CHART_CELLS.map((c) => `${c.col},${c.row}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const f of CHART_FRAMES) expect(f.col % 2).toBe(0);
  });

  it("升は上の行から、行の中は左から並ぶ", () => {
    const order = CHART_CELLS.map((c) => c.row * 100 + c.col);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("枠のノードはどれもイベントに当たる。同じノードの枠は1つ", () => {
    for (const f of CHART_FRAMES) expect(CHART_NODES[f.node].eventId).toBe(f.eventId);
    const nodes = CHART_FRAMES.map((f) => f.node);
    expect(new Set(nodes).size).toBe(nodes.length);
  });

  it("真ルートの升は行 8〜10 と、そこへ下りる行 7 の縦線。分かれ目の線は列 3・行 6 の ├ だけ", () => {
    for (const c of CHART_CELLS.filter((x) => x.hidden === 1)) expect(c.row).toBeGreaterThanOrEqual(c.type === "line" ? 7 : 8);
    expect(CHART_CELLS.filter((x) => x.hidden === 1 && x.row === 7).map((c) => [c.col, c.type === "line" && c.shape])).toEqual([[3, 11]]);
    // 行 8 の横線のうち 4 本（列 15・17・34・44）だけは隠しの印がない（真ルートを知らなくても出るとみられる。要ゲーム内確認）
    const unmarked = CHART_CELLS.filter((x) => x.row >= 8 && x.hidden !== 1);
    expect(unmarked.map((c) => [c.col, c.row, c.type])).toEqual([
      [15, 8, "line"],
      [17, 8, "line"],
      [34, 8, "line"],
      [44, 8, "line"],
    ]);
    const fork = CHART_CELLS.filter((c) => c.hidden === 2);
    expect(fork.map((c) => [c.col, c.row, c.type === "line" && c.shape])).toEqual([[3, 6, 6]]);
  });

  it("要所の枠の位置と名前", () => {
    expect(frameName(frameAt(0, 0)!)).toBe("船上の侍");
    expect(frameName(frameAt(2, 0)!)).toBe("阿弥浜港争乱");
    expect(frameName(frameAt(4, 6)!)).toBe("簀巻き日和");
    expect(frameName(frameAt(4, 8)!)).toBe("三姉妹見参");
    expect(frameName(frameAt(46, 8)!)).toBe("希望の光");
    expect(frameAt(4, 8)!.route).toBe("best");
    expect(frameAt(16, 0)!.route).toBe("other");
  });

  it("剣術大会（47〜50）・悲しみのローラ（67）・84 の枠はない", () => {
    const ids = new Set(CHART_FRAMES.map((f) => f.eventId));
    for (const id of [47, 48, 49, 50, 67, 84]) expect(ids.has(id), `通し番号 ${id}`).toBe(false);
  });

  it("隣どうしは両方からつながる", () => {
    for (const c of CHART_CELLS)
      CHART_NEIGHBORS.get(c.id)!.forEach((n, k) => {
        if (!n) return;
        const back = CHART_NEIGHBORS.get(n.id)![k ^ 1];
        expect(back?.id, `升 ${c.id} の向き ${k}`).toBe(c.id);
      });
  });

  it("船上の侍の右は線で、阿弥浜港争乱につながる", () => {
    const start = frameAt(0, 0)!;
    const line = CHART_NEIGHBORS.get(start.id)![1]!;
    expect(line.type).toBe("line");
    expect(CHART_NEIGHBORS.get(line.id)![1]?.id).toBe(frameAt(2, 0)!.id);
  });
});
