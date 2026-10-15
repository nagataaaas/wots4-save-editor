import type { ReactNode } from "react";
import { Check, CircleHelp, LockKeyhole, Minus } from "lucide-react";
import { InfoTip } from "@/components/info-tip";
import { LazyTip } from "@/components/lazy-tip";
import { Badge } from "@/components/ui/badge";
import { nextUnlockState } from "./unlock-state";
import { UNLOCK_STATE_LABELS } from "@/save/unlocks";
import { tr } from "@/lib/i18n";

export function ItemInformation({
  name, category, description, offset, condition, children,
}: {
  name: string;
  category: string;
  description?: string;
  offset: number | string;
  condition?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-sm">{name}</span>
        <Badge variant="secondary" className="font-normal">{category}</Badge>
        <InfoTip offset={offset}>
          {condition ? tr({ ja: `取得条件：${condition}`, en: `How to obtain: ${condition}` }) : undefined}
        </InfoTip>
        {children}
      </div>
      <span className="text-muted-foreground text-xs">{description || tr({ ja: "説明未登録", en: "No description" })}</span>
    </div>
  );
}

/** セーブ未読み込みのときの状態ボタン。状態は「—」にして押せなくする */
function UnloadedStateButton() {
  return (
    <button
      type="button"
      disabled
      className="text-muted-foreground inline-flex size-8 shrink-0 cursor-not-allowed items-center justify-center rounded-md border opacity-50"
    >
      —
    </button>
  );
}

export function OwnershipStateButton({ owned, name, disabled, labels, onChange }: {
  /** null はセーブ未読み込み */
  owned: boolean | null;
  name: string;
  disabled: boolean;
  labels: readonly [string, string];
  onChange: (owned: boolean) => void;
}) {
  if (owned === null) return <UnloadedStateButton />;
  const label = labels[owned ? 1 : 0];
  const Icon = owned ? Check : LockKeyhole;
  return (
    <LazyTip
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      aria-label={tr({ ja: `${name}：${label}（クリックで切り替え）`, en: `${name}: ${label} (click to toggle)` })}
      disabled={disabled}
      content={label}
      onClick={() => { if (!disabled) onChange(!owned); }}
    >
      <Icon
        className={`size-5 ${owned ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}
        aria-hidden="true"
      />
    </LazyTip>
  );
}

export function UnlockStateButton({ value, name, disabled, onChange }: {
  /** null はセーブ未読み込み */
  value: number | null;
  name: string;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  if (value === null) return <UnloadedStateButton />;
  const state = UNLOCK_STATE_LABELS[value];
  const label = state ? tr(state) : tr({ ja: "不明", en: "Unknown" });
  const Icon = [Minus, LockKeyhole, Check][value] ?? CircleHelp;
  const iconColor = [
    "text-muted-foreground",
    "text-muted-foreground",
    "text-emerald-600 dark:text-emerald-400",
  ][value] ?? "text-destructive";
  return (
    <LazyTip
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      aria-label={tr({ ja: `${name}：${label}（クリックで次の状態）`, en: `${name}: ${label} (click for the next state)` })}
      disabled={disabled}
      content={label}
      onClick={() => { if (!disabled) onChange(nextUnlockState(value)); }}
    >
      <Icon className={`size-5 ${iconColor}`} aria-hidden="true" />
    </LazyTip>
  );
}
