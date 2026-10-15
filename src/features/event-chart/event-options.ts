import type { SelectOption } from "@/components/select-options";
import { tr } from "@/lib/i18n";
import { EVENT_RECORDS, EVENT_RECORDS_SEEN, EVENT_STATES } from "@/save/scenario-events";

/** 🟢 選べる状態の値は 00〜05・FF で全部なので、上級者モードでも選択肢は同じ（06 はチャートの判定にだけ使う値で、選択肢にしない） */
export function stateOptions(): SelectOption[] {
  return EVENT_STATES.map((s) => ({
    value: String(s.value),
    // confirmed（書き込みでゲーム内の表示を確かめた値）でない値も、確度は出さずにそのまま選べる
    label: s.label,
  }));
}

export function recordOptions(advanced: boolean): SelectOption[] {
  const options: SelectOption[] = EVENT_RECORDS.map((r) => ({
    value: String(r.value),
    label: r.label,
  }));
  // 上級者モードでは、記録で見たがチャート表示への効き方を確かめていない値（05 など）も選べるようにする
  if (advanced)
    for (const r of EVENT_RECORDS_SEEN)
      options.push({
        value: String(r.value),
        label: r.label,
        group: tr({ ja: "そのほかの値", en: "Other values" }),
      });
  return options;
}
