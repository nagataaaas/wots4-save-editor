// docs/events/*.md のフロントマターから、イベントの概要の表（event-summary-table.ts）を作る。
// pnpm gen:dataset とテストからだけ使う。md を丸ごとバンドルに入れると本文の確度が残るので、
// 概要（summary）と英語の概要（summary_en）だけを抜き出す（AGENTS.md「UI に確度を出さない」）。
import { CERTAINTY_PATTERN } from "./dataset-render.ts";

/** 英語の文の確度の語。英語の概要にあれば生成を止める */
const CERTAINTY_PATTERN_EN = /\b(?:unconfirmed|unverified|not verified|estimated|speculat\w*|certainty)\b/i;

/**
 * フロントマターの key の値を読む。`>-` などの折り返しの段落は joiner でつなぐ。なければ ""
 */
function frontValue(lines: readonly string[], key: string, joiner: string): string {
  const start = lines.findIndex((l) => l.startsWith(`${key}:`));
  if (start < 0) return "";
  const inline = lines[start].slice(key.length + 1).trim();
  if (/^[>|]/.test(inline)) {
    const body: string[] = [];
    for (const l of lines.slice(start + 1)) {
      if (l.trim() !== "" && !/^\s/.test(l)) break;
      body.push(l.trim());
    }
    return body.filter((l) => l !== "").join(joiner);
  }
  return inline.replace(/^["']|["']$/g, "");
}

/**
 * フロントマターの event_id と summary を読む。どちらかがなければ null。
 * summary_en（英語の概要）があれば summaryEn に入れる（なければ持たない）
 */
export function parseEventSummary(md: string): { eventId: number; summary: string; summaryEn?: string } | null {
  const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(md)?.[1];
  if (!front) return null;
  const lines = front.split(/\r?\n/);
  const id = lines.map((l) => /^event_id:\s*(\d+)\s*$/.exec(l)).find((m) => m);
  if (!id) return null;
  // 日本語の文なので、折り返しは空白を入れずにつなぐ
  const summary = frontValue(lines, "summary", "");
  if (!summary) return null;
  // 英語の文は、折り返しを空白でつなぐ
  const summaryEn = frontValue(lines, "summary_en", " ");
  return summaryEn ? { eventId: Number(id[1]), summary, summaryEn } : { eventId: Number(id[1]), summary };
}

/** md の本文の並びから表のソースを作る。概要に確度があれば生成を止める */
export function renderEventSummaries(mds: readonly string[]): string {
  const rows = mds
    .map(parseEventSummary)
    .filter((s) => s !== null)
    .sort((a, b) => a.eventId - b.eventId);
  const seen = new Set<number>();
  for (const { eventId, summary, summaryEn } of rows) {
    if (seen.has(eventId)) throw new Error(`イベントの概要が重複しています: ${eventId}`);
    seen.add(eventId);
    if (CERTAINTY_PATTERN.test(summary)) throw new Error(`イベント ${eventId} の概要に確度の表記があります: ${summary}`);
    if (summaryEn && (CERTAINTY_PATTERN.test(summaryEn) || CERTAINTY_PATTERN_EN.test(summaryEn)))
      throw new Error(`イベント ${eventId} の英語の概要に確度の表記があります: ${summaryEn}`);
  }
  return [
    "// 生成ファイル。docs/events/*.md の summary・summary_en から pnpm gen:dataset で作る。直接編集しない。",
    "export const EVENT_SUMMARY_TABLE: Readonly<Record<number, string>> = {",
    ...rows.map(({ eventId, summary }) => `  ${eventId}: ${JSON.stringify(summary)},`),
    "};",
    "",
    "/** 英語の概要。summary_en のないイベントは載せない（画面では日本語を出す） */",
    "export const EVENT_SUMMARY_EN_TABLE: Readonly<Record<number, string>> = {",
    ...rows
      .filter(({ summaryEn }) => summaryEn)
      .map(({ eventId, summaryEn }) => `  ${eventId}: ${JSON.stringify(summaryEn)},`),
    "};",
    "",
  ].join("\n");
}
