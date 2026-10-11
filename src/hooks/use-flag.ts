import { useSave } from "@/lib/save-context";
import { flagProblem, readFlag, type ByteFlag, type FlagState } from "@/save/flags/byte-flag";

/** flag の今の値と、書き込めない理由。セーブ未読み込み・読めないときは null */
export function useFlag(flag: ByteFlag): { state: FlagState; problem: string | null } | null {
  const { save } = useSave();
  if (!save) return null;
  try {
    return { state: readFlag(save.working, flag), problem: flagProblem(save.working) };
  } catch {
    return null;
  }
}
