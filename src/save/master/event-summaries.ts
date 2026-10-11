// イベントの概要。docs/events/*.md のフロントマターの event_id と summary（`summary: >-` の折り返しの段落）から引く。
const files = import.meta.glob<string>(["/docs/events/*.md", "!**/README.md", "!**/TEMPLATE.md"], {
  query: "?raw",
  import: "default",
  eager: true,
});

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

const SUMMARIES: ReadonlyMap<number, string> = new Map(
  Object.values(files)
    .map(parseEventSummary)
    .filter((s) => s !== null)
    .map((s) => [s.eventId, s.summary]),
);

/** イベントの通し番号から概要を引く。docs/events にないイベントは null */
export function eventSummaryOf(eventId: number): string | null {
  return SUMMARIES.get(eventId) ?? null;
}
