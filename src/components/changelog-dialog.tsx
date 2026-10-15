import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  changelog,
  hasUnseenChangelog,
  isUnseen,
  latestChangelogDate,
  loadChangelogSeen,
  storeChangelogSeen,
} from "@/lib/changelog";
import { getLanguage, tr } from "@/lib/i18n";

/** YYYY-MM-DD を今の言語の書き方で出す（タイムゾーンでずれないよう、その日の正午にする） */
function formatDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(getLanguage() === "en" ? "en-US" : "ja-JP", {
    dateStyle: "long",
  });
}

/** 日付ごとの更新の一覧。seen より新しい日付に「新着」を付ける */
export function ChangelogList({ seen }: { seen: string | null }) {
  return (
    <div className="flex flex-col gap-4">
      {changelog.map((entry) => (
        <section key={entry.date}>
          <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold">
            <time dateTime={entry.date}>{formatDate(entry.date)}</time>
            {isUnseen(entry.date, seen) && <Badge>{tr({ ja: "新着", en: "New" })}</Badge>}
          </h3>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
            {entry.items.map((item, i) => (
              <li key={i}>{tr(item)}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** 更新履歴。前回開いたあとに新しい日付が足されていれば、ボタンに印を出す */
export function ChangelogDialog() {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(loadChangelogSeen);
  // 開いた時点の「前回見た日付」。開いている間の「新着」はこれと比べる
  const [seenBeforeOpen, setSeenBeforeOpen] = useState<string | null>(null);

  const onOpenChange = (next: boolean) => {
    if (next) {
      setSeenBeforeOpen(seen);
      setSeen(latestChangelogDate);
      storeChangelogSeen(latestChangelogDate);
    }
    setOpen(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={<button type="button" />}
        className="text-muted-foreground hover:text-foreground relative self-start px-2 text-xs"
      >
        {tr({ ja: "更新履歴", en: "Changelog" })}
        {hasUnseenChangelog(seen) && (
          <span
            className="bg-primary absolute top-0 right-0.5 size-1.5 rounded-full"
            role="img"
            aria-label={tr({ ja: "新しい更新があります", en: "New updates" })}
          />
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{tr({ ja: "更新履歴", en: "Changelog" })}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto">
          <ChangelogList seen={seenBeforeOpen} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
