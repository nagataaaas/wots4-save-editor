import { useCallback } from "react";
import { useSaveView } from "@/lib/use-save-view";
import { flagProblem, readFlag, type ByteFlag, type FlagState } from "@/save/flags/byte-flag";

/**
 * flag の今の値（state）、読めない理由（error）、書き込めない理由（problem）。
 * セーブ未読み込みのときは state も error も null。読めないときは state が null で error に理由が入る
 */
export function useFlag(flag: ByteFlag): { state: FlagState | null; error: string | null; problem: string | null } {
  const read = useCallback(
    (bytes: Uint8Array) => ({ state: readFlag(bytes, flag), problem: flagProblem(bytes) }),
    [flag],
  );
  const { view, error, problem } = useSaveView(read, { problem: (v) => v.problem });
  return { state: view?.state ?? null, error, problem };
}
