// イベントチャートの描き分け。規則は docs/save_format/chunks/event-chart「チャート表示の規則」（🟢。✅ の付いたものは実セーブ・書き換えで確認）。
import { describe, expect, it } from "vitest";
import { chartViewWithoutSave, computeChartView, frameLookLabel, type ChartInput } from "./event-chart-view";
import { CHART_CELLS, CHART_FRAMES, type ChartFrame } from "./master/event-chart-layout";

/** 通し番号ごとの状態と記録。指定しないものは FF・FF（未到達・記録なし） */
function input(states: Record<number, [state: number, record?: number]>, opts: Partial<ChartInput> = {}): ChartInput {
  const entries = Array.from({ length: 166 }, (_, index) => {
    const [state, record] = states[index] ?? [0xff];
    return { index, state, record: record ?? 0xff };
  });
  return { entries, playCount: 0, clearTotal: 0, stage: null, bestRoute: null, ...opts };
}

const frameOf = (eventId: number): ChartFrame => CHART_FRAMES.find((f) => f.eventId === eventId)!;
const lineAt = (col: number, row: number) => CHART_CELLS.find((c) => c.col === col && c.row === row && c.type === "line")!;

/** 序章の船上の侍（0）・阿弥浜港争乱（1）を終えた状態 */
const PROLOGUE = { 0: [0x04], 1: [0x04] } as const satisfies Record<number, [number]>;

describe("枠の名前と印", () => {
  it("セーブがなければ全部の枠を名前つきで出す", () => {
    const v = chartViewWithoutSave();
    for (const f of CHART_FRAMES) expect(v.frames.get(f.id)).toMatchObject({ visible: true, named: true });
  });

  it("✅ 記録 04 か状態 04 なら名前を出す。記録 FF で状態 FF・05 なら隠す", () => {
    const v = computeChartView(input({ 6: [0xff, 0x04], 7: [0x04], 8: [0x05], 9: [0xff] }));
    expect(v.frames.get(frameOf(6).id)!.named).toBe(true);
    expect(v.frames.get(frameOf(7).id)!.named).toBe(true);
    expect(v.frames.get(frameOf(8).id)).toMatchObject({ named: false, failed: true, missed: false });
    expect(v.frames.get(frameOf(9).id)!.named).toBe(false);
  });

  it("状態 05 でも記録 04 なら名前を出す", () => {
    const v = computeChartView(input({ 8: [0x05, 0x04] }));
    expect(v.frames.get(frameOf(8).id)).toMatchObject({ named: true, failed: true });
  });

  it("状態 03 は名前を出す（進行中）。01・02 は何も変わらない", () => {
    const v = computeChartView(input({ 6: [0x03], 7: [0x01], 8: [0x02] }));
    expect(v.frames.get(frameOf(6).id)).toMatchObject({ named: true, inProgress: true });
    expect(v.frames.get(frameOf(7).id)).toMatchObject({ named: false, inProgress: false, reached: false });
    expect(v.frames.get(frameOf(8).id)).toMatchObject({ named: false, reached: false });
  });

  it("🟢 緑の枠は状態 03・04 だけ。記録 04 だけ・失敗・01・02 には付かない", () => {
    const v = computeChartView(input({ 6: [0x03], 7: [0x04], 8: [0x05, 0x04], 9: [0xff, 0x04], 10: [0x02] }));
    expect(v.frames.get(frameOf(6).id)!.lit).toBe(true);
    expect(v.frames.get(frameOf(7).id)!.lit).toBe(true);
    expect(v.frames.get(frameOf(8).id)!.lit).toBe(false);
    expect(v.frames.get(frameOf(9).id)!.lit).toBe(false);
    expect(v.frames.get(frameOf(10).id)!.lit).toBe(false);
  });

  it("見え方の説明", () => {
    const v = computeChartView(input({ 8: [0x05] }));
    expect(frameLookLabel(v.frames.get(frameOf(8).id)!)).toBe("名前が隠れる（？？？）・失敗");
    expect(frameLookLabel(v.frames.get(frameOf(70).id)!)).toBe("ゲームでは枠ごと出ない");
  });
});

describe("時間帯を過ぎた枠", () => {
  it("後ろの段階に到達すると、何もしなかった段階の、たどっている行の枠が失敗になる", () => {
    // 志士との出会い（6、1日目昼）→ 代官所潜入（12、1日目夜）。1日目夕の攘夷の枠は 海兵隊の横暴（9）
    const v = computeChartView(input({ ...PROLOGUE, 6: [0x04], 12: [0x04] }));
    expect(v.frames.get(frameOf(9).id)).toMatchObject({ failed: true, missed: true });
    // ほかの行の同じ段階の枠（琴吹光探検隊 7・電信あり 8）には付かない
    expect(v.frames.get(frameOf(7).id)!.failed).toBe(false);
    expect(v.frames.get(frameOf(8).id)!.failed).toBe(false);
    // 到達した段階より後ろの枠にも付かない
    expect(v.frames.get(frameOf(17).id)!.failed).toBe(false);
  });

  it("たどる行は共通の行から始まる", () => {
    // 序章のあと、1日目昼に何もせず 1日目夕の 海兵隊の横暴（9）に到達：1日目昼の共通の枠（嵐のあと 3）が失敗になる
    const v = computeChartView(input({ ...PROLOGUE, 9: [0x04] }));
    expect(v.frames.get(frameOf(3).id)).toMatchObject({ failed: true, missed: true });
    expect(v.frames.get(frameOf(6).id)!.failed).toBe(false);
  });

  it("同じ段階で別の枠に到達していれば付かない", () => {
    const v = computeChartView(input({ ...PROLOGUE, 6: [0x04], 9: [0x04] }));
    for (const id of [3, 4, 5, 6, 7, 8]) expect(v.frames.get(frameOf(id).id)!.failed, `通し番号 ${id}`).toBe(false);
  });
});

describe("真ルートの升", () => {
  it("✅ 状態 05（失敗）だけでは枠が出ない", () => {
    const v = computeChartView(input({ 72: [0x05] }));
    expect(v.frames.get(frameOf(72).id)!.visible).toBe(false);
  });

  it("✅ 状態 04・記録 04 なら出る。状態 03 でも出る", () => {
    const v = computeChartView(input({ 70: [0x04], 71: [0xff, 0x04], 72: [0x03] }));
    for (const id of [70, 71, 72]) expect(v.frames.get(frameOf(id).id)!.visible, `通し番号 ${id}`).toBe(true);
    expect(v.frames.get(frameOf(73).id)!.visible).toBe(false);
  });

  it("周回数が 3 以上なら全部の枠が出る。2 なら出ない", () => {
    const shown = (playCount: number) => {
      const v = computeChartView(input({}, { playCount }));
      return CHART_FRAMES.filter((f) => f.hidden !== 0).every((f) => v.frames.get(f.id)!.visible);
    };
    expect(shown(2)).toBe(false);
    expect(shown(3)).toBe(true);
  });

  it("周回数が 3 以上なら、真ルートの線も全部つながって出る", () => {
    const v = computeChartView(input(PROLOGUE, { playCount: 3 }));
    for (const c of CHART_CELLS.filter((x) => x.type === "line"))
      expect(v.lines.get(c.id)!.includes("hidden"), `升 ${c.col},${c.row}`).toBe(false);
  });

  it("真ルートの枠が出ていなければ、真ルートの線と分かれ目の下の腕は出ない", () => {
    const v = computeChartView(input(PROLOGUE));
    for (const c of CHART_CELLS.filter((x) => x.type === "line" && x.hidden === 1))
      for (const a of v.lines.get(c.id)!) expect(a === "none" || a === "hidden").toBe(true);
    const fork = v.lines.get(lineAt(3, 6).id)!;
    expect(fork).toEqual(["none", "black", "black", "hidden"]);
  });

  it("三姉妹見参（70）が出ると、分かれ目から 70 までの線が出て、その先は出ない", () => {
    const v = computeChartView(input({ ...PROLOGUE, 70: [0x04] }));
    expect(v.lines.get(lineAt(3, 6).id)![3]).not.toBe("hidden");
    expect(v.lines.get(lineAt(3, 7).id)!.filter((a) => a === "hidden")).toEqual([]);
    expect(v.lines.get(lineAt(3, 8).id)!.filter((a) => a === "hidden")).toEqual([]);
    // 70 とお早い到着（71）のあいだ
    expect(v.lines.get(lineAt(5, 8).id)!.filter((a) => a !== "none")).toEqual(["hidden", "hidden"]);
  });
});

describe("赤い線", () => {
  it("到達した枠どうしをつなぐ道を赤くする", () => {
    // 船上の侍と阿弥浜港争乱のあいだの ┬。下の腕は嵐のあと（未到達）へ向かうので黒
    const v = computeChartView(input(PROLOGUE));
    expect(v.lines.get(lineAt(1, 0).id)).toEqual(["red", "red", "none", "black"]);
  });

  it("記録 04 だけの枠と、状態 01・02 の枠は到達した枠に入らない", () => {
    for (const s of [[0xff, 0x04], [0x01], [0x02]] as const) {
      const v = computeChartView(input({ 0: [0x04], 1: [...s] }));
      expect(v.lines.get(lineAt(1, 0).id)!.includes("red"), s.join(",")).toBe(false);
    }
  });

  it("失敗した枠への道も赤くなる。分かれ道では到達した枠へ向かう腕だけ", () => {
    const v = computeChartView(input({ ...PROLOGUE, 6: [0x05] }));
    const toPrajna = v.lines.get(lineAt(3, 0).id)!;
    expect(toPrajna[1]).toBe("red");
    // 1日目昼の幕府・外国の枠へ下りる腕は赤くない
    expect(toPrajna[3]).toBe("black");
  });
});

describe("結末への到達", () => {
  it("結末の枠の状態が 03〜05 なら到達。記録 04 だけでは到達にしない", () => {
    expect(computeChartView(input(PROLOGUE)).endingReached).toBe(false);
    expect(computeChartView(input({ ...PROLOGUE, 92: [0x04] })).endingReached).toBe(true);
    expect(computeChartView(input({ ...PROLOGUE, 92: [0x05] })).endingReached).toBe(true);
    expect(computeChartView(input({ ...PROLOGUE, 92: [0xff, 0x04] })).endingReached).toBe(false);
    expect(chartViewWithoutSave().endingReached).toBe(false);
  });
});

describe("🟢 今の段階の紫の箱", () => {
  const eventsIn = (ids: readonly number[]) =>
    [...new Set(ids.map((id) => CHART_FRAMES.find((f) => f.id === id)!.eventId))].sort((a, b) => a - b);

  it("真ルートでなければ、同じ段階の真ルート以外の枠を囲む", () => {
    // 1日目夜（120）：代官所潜入 12・阿片密売を阻止せよ 10・辻斬りを辻斬る 11。真ルートの再起の望み 72 は入れない
    const v = computeChartView(input({}, { stage: 120, bestRoute: 0 }));
    expect(eventsIn(v.stageFrames)).toEqual([10, 11, 12]);
  });

  it("真ルート（0x378E が 0 以外）なら、同じ段階の真ルートの枠だけを囲む。枠が出ているかは見ない", () => {
    expect(eventsIn(computeChartView(input({}, { stage: 120, bestRoute: 1 })).stageFrames)).toEqual([72]);
    expect(eventsIn(computeChartView(input({}, { stage: 120, bestRoute: 2 })).stageFrames)).toEqual([72]);
  });

  it("当てはまる枠がなければ描かない。段階か真ルートが分からなければ描かない", () => {
    // 1日目昼（100）に真ルートの枠はない
    expect(computeChartView(input({}, { stage: 100, bestRoute: 1 })).stageFrames).toEqual([]);
    expect(computeChartView(input({}, { stage: 123, bestRoute: 0 })).stageFrames).toEqual([]);
    expect(computeChartView(input({}, { stage: null, bestRoute: 0 })).stageFrames).toEqual([]);
    expect(chartViewWithoutSave().stageFrames).toEqual([]);
  });
});

describe("カーソルの範囲とスクロール", () => {
  it("到達した枠と記録 04 の枠のうち最も右の列", () => {
    expect(computeChartView(input({})).cursorMaxCol).toBe(-1);
    expect(computeChartView(input(PROLOGUE)).cursorMaxCol).toBe(2);
    expect(computeChartView(input({ ...PROLOGUE, 12: [0xff, 0x04] })).cursorMaxCol).toBe(frameOf(12).col);
  });

  it("クリア回数の合計が 0 なら左右にスクロールできない", () => {
    expect(computeChartView(input({}, { clearTotal: 0 })).scrollLocked).toBe(true);
    expect(computeChartView(input({}, { clearTotal: 1 })).scrollLocked).toBe(false);
  });
});
