import { describe, expect, it } from "vitest";
import { CERTAINTY_PATTERN } from "./dataset-render";
import { eventSummaryOf } from "./event-summaries";
import { parseEventSummary, renderEventSummaries } from "./event-summary-render";

const mds = import.meta.glob<string>(["/docs/events/*.md", "!**/README.md", "!**/TEMPLATE.md"], {
  query: "?raw",
  import: "default",
  eager: true,
});
const table = import.meta.glob<string>("./event-summary-table.ts", { query: "?raw", import: "default", eager: true });

describe("イベントの概要", () => {
  it("折り返しの段落を空白なしでつなぐ", () => {
    const md = [
      "---",
      "event_id: 5",
      'state_offset: "0x36AD"',
      "",
      "summary: >-",
      "  一行目の文。",
      "  二行目の文。",
      "",
      "timing:",
      "  phase: 1日目 昼",
      "---",
      "本文",
    ].join("\n");
    expect(parseEventSummary(md)).toEqual({ eventId: 5, summary: "一行目の文。二行目の文。" });
  });

  it("1行の値も読む。event_id か summary がなければ null", () => {
    expect(parseEventSummary("---\nevent_id: 7\nsummary: 短い概要\n---\n")).toEqual({ eventId: 7, summary: "短い概要" });
    expect(parseEventSummary("---\nsummary: 概要だけ\n---\n")).toBeNull();
    expect(parseEventSummary("---\nevent_id: 7\n---\n")).toBeNull();
    expect(parseEventSummary("フロントマターなし")).toBeNull();
  });

  it("表は概要だけを持ち、本文は入れない。概要に確度があれば生成を止める", () => {
    const out = renderEventSummaries(["---\nevent_id: 7\nsummary: 短い概要\n---\n本文 🔶"]);
    expect(out).toContain('  7: "短い概要",');
    expect(out).not.toMatch(CERTAINTY_PATTERN);
    expect(() => renderEventSummaries(["---\nevent_id: 7\nsummary: 要ゲーム内確認\n---\n"])).toThrow("確度");
  });

  it("summary_en は折り返しを空白でつなぎ、英語の表に出す。英語の確度の語があれば生成を止める", () => {
    const md = ["---", "event_id: 9", "summary: 概要", "", "summary_en: >-", "  First line.", "  Second line.", "---", ""].join("\n");
    expect(parseEventSummary(md)).toEqual({ eventId: 9, summary: "概要", summaryEn: "First line. Second line." });
    const out = renderEventSummaries([md, "---\nevent_id: 7\nsummary: 短い概要\n---\n"]);
    expect(out).toContain('  9: "First line. Second line.",');
    expect(out).not.toContain('  7: "",');
    expect(() => renderEventSummaries(["---\nevent_id: 7\nsummary: 概要\nsummary_en: Unconfirmed result\n---\n"])).toThrow("確度");
  });

  it("全イベントに英語の概要がある", () => {
    const parsed = Object.values(mds).map(parseEventSummary).filter((s) => s !== null);
    expect(parsed.filter((s) => !s.summaryEn).map((s) => s.eventId)).toEqual([]);
  });

  it("生成物が docs/events と同じ内容（落ちたら pnpm gen:dataset）", () => {
    const sorted = Object.keys(mds).sort().map((k) => mds[k]);
    expect(table["./event-summary-table.ts"].replace(/\r\n/g, "\n")).toBe(renderEventSummaries(sorted));
  });

  it("docs/events にないイベントは null", () => {
    expect(eventSummaryOf(9999)).toBeNull();
  });
});
