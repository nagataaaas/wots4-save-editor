import type { ReactNode } from "react";
import type { SelectOption } from "@/components/select-options";
import { SelectRow } from "@/components/select-row";
import { useFlag } from "@/hooks/use-flag";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { useSave } from "@/lib/save-context";
import { cn } from "@/lib/utils";
import { writeFlag, type ByteFlag } from "@/save/flags/byte-flag";

const MISMATCH = "mismatch";

/**
 * src/save/flags/ の配列のフラグ1つ分の欄。値の表から選ぶ。
 * options・note・hint・write を渡すと、その欄だけ見せ方や書き方を変えられる（なりわいの受注など）
 */
export function FlagRow({
  flag,
  options,
  note,
  hint,
  write,
}: {
  flag: ByteFlag;
  options?: readonly SelectOption[];
  note?: ReactNode;
  hint?: ReactNode;
  /** 既定は writeFlag。例外はその場で表示する */
  write?: (bytes: Uint8Array, value: number, opts: { advanced: boolean }) => void;
}) {
  const { update } = useSave();
  const { advanced } = useAdvancedMode();
  const current = useFlag(flag);
  const state = current?.state ?? null;

  return (
    <SelectRow
      label={flag.label}
      offset={flag.offset}
      value={state === null ? null : state.mismatch ? MISMATCH : String(state.value)}
      currentLabel={state?.mismatch ? "状態が食い違っています" : "不明"}
      options={
        options ??
        flag.values.map((v) => ({ value: String(v.value), label: v.label, group: v.group }))
      }
      problem={current?.problem ?? null}
      warning={state && !state.known ? "通常のプレイでは取らない状態です" : null}
      note={note ?? flag.note}
      hint={hint ?? flag.hint}
      onChange={(v) =>
        update((b) => (write ?? ((bytes, value, opts) => writeFlag(bytes, flag, value, opts)))(b, Number(v), { advanced }))
      }
    />
  );
}

/** 配列のフラグを並べる。画面の1ブロック＝配列1つ */
export function FlagGrid({
  flags,
  className,
}: {
  flags: readonly ByteFlag[];
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-3", className)}>
      {flags.map((flag) => (
        <FlagRow key={flag.offset} flag={flag} />
      ))}
    </div>
  );
}
