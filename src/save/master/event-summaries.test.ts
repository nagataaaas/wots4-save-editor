import { describe, expect, it } from "vitest";
import { eventSummaryOf, parseEventSummary } from "./event-summaries";

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

  it("docs/events にないイベントは null", () => {
    expect(eventSummaryOf(9999)).toBeNull();
  });
});
