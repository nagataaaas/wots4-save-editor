import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type LicenseEntry = (typeof import("virtual:third-party-licenses"))["default"][number];

/** 使っているライブラリのライセンスの一覧。本文は開いたときに読み込む */
export function LicensesDialog() {
  const [open, setOpen] = useState(false);
  const [licenses, setLicenses] = useState<LicenseEntry[] | null>(null);

  useEffect(() => {
    if (!open || licenses) return;
    let alive = true;
    void import("virtual:third-party-licenses").then((m) => alive && setLicenses(m.default));
    return () => {
      alive = false;
    };
  }, [open, licenses]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<button type="button" />}
        className="text-muted-foreground hover:text-foreground self-start px-2 text-xs"
      >
        LICENCE
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>LICENCE</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto">
          {licenses === null ? (
            <p className="text-muted-foreground text-sm">読み込み中…</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {licenses.map((l) => (
                <li key={`${l.name}@${l.version}`}>
                  <details className="rounded-md border">
                    <summary className="hover:bg-muted/50 flex cursor-pointer items-baseline gap-2 px-2 py-1.5 text-sm">
                      <span className="font-mono">{l.name}</span>
                      <span className="text-muted-foreground text-xs">{l.version}</span>
                      <span className="text-muted-foreground ml-auto text-xs">{l.license}</span>
                    </summary>
                    <pre className="bg-muted/30 border-t p-2 text-xs whitespace-pre-wrap">
                      {l.text ?? `${l.license} License`}
                    </pre>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
