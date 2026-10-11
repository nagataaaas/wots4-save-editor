// docs/events/*.md のフロントマターから、イベントの概要の表（event-summary-table.ts）を作る。
// pnpm gen:dataset とテストからだけ使う。md を丸ごとバンドルに入れると本文の確度が残るので、
// 概要だけを抜き出す（AGENTS.md「UI に確度を出さない」）。
import { CERTAINTY_PATTERN } from "./dataset-render.ts";

/** フロントマターの event_id と summary を読む。どちらかがなければ null */
export function parseEventSummary(md: string): { eventId: number; summary: string } | null {
  const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(md)?.[1];
  if (!front) return null;
  const lines = front.split(/\r?\n/);
  const id = lines.map((l) => /^event_id:\s*(\d+)\s*$/.exec(l)).find((m) => m);
  const start = lines.findIndex((l) => /^summary:/.test(l));
  if (!id || start < 0) return null;
  const inline = lines[start].replace(/^summary:\s*/, "");
  let summary: string;
  if (/^[>|]/.test(inline)) {
    const body: string[] = [];
    for (const l of lines.slice(start + 1)) {
      if (l.trim() !== "" && !/^\s/.test(l)) break;
      body.push(l.trim());
    }
    // 日本語の文なので、折り返しは空白を入れずにつなぐ
    summary = body.filter((l) => l !== "").join("");
  } else {
    summary = inline.replace(/^["']|["']$/g, "");
  }
  return summary ? { eventId: Number(id[1]), summary } : null;
}

/** md の本文の並びから表のソースを作る。概要に確度があれば生成を止める */
export function renderEventSummaries(mds: readonly string[]): string {
  const rows = mds
    .map(parseEventSummary)
    .filter((s) => s !== null)
    .sort((a, b) => a.eventId - b.eventId);
  const seen = new Set<number>();
  for (const { eventId, summary } of rows) {
    if (seen.has(eventId)) throw new Error(`イベントの概要が重複しています: ${eventId}`);
    seen.add(eventId);
    if (CERTAINTY_PATTERN.test(summary)) throw new Error(`イベント ${eventId} の概要に確度の表記があります: ${summary}`);
  }
  return [
    "// 生成ファイル。docs/events/*.md の summary から pnpm gen:dataset で作る。直接編集しない。",
    "export const EVENT_SUMMARY_TABLE: Readonly<Record<number, string>> = {",
    ...rows.map(({ eventId, summary }) => `  ${eventId}: ${JSON.stringify(summary)},`),
    "};",
    "",
  ].join("\n");
}
