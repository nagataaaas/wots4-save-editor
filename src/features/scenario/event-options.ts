import type { SelectOption } from "@/components/select-options";
import { formatHex2 } from "@/lib/format";
import { EVENT_RECORDS, EVENT_RECORDS_SEEN, EVENT_STATES } from "@/save/scenario-events";

/** 🟢 状態の値は 00〜05・FF で全部なので、上級者モードでも選択肢は同じ */
export const stateOptions: SelectOption[] = EVENT_STATES.map((s) => ({
  value: String(s.value),
  // confirmed（書き込みでゲーム内の表示を確かめた値）でない値も、確度は出さずにそのまま選べる
  label: `${formatHex2(s.value)} ${s.label}`,
}));

export function recordOptions(advanced: boolean): SelectOption[] {
  const options: SelectOption[] = EVENT_RECORDS.map((r) => ({
    value: String(r.value),
    label: `${formatHex2(r.value)} ${r.label}`,
  }));
  // 上級者モードでは、記録で見たがチャート表示への効き方を確かめていない値（05 など）も選べるようにする
  if (advanced)
    for (const r of EVENT_RECORDS_SEEN)
      options.push({
        value: String(r.value),
        label: `${formatHex2(r.value)} ${r.label}`,
        group: "そのほかの値",
      });
  return options;
}
