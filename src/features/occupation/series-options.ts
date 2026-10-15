import type { SelectOption } from "@/components/select-options";
import { tr } from "@/lib/i18n";
import { decodeSeriesValue } from "@/save/occupation-accept";
import { occupationLabel } from "@/save/master/labels";
import { occupationById } from "@/save/master/occupation-names";
import type { FlagValue } from "@/save/flags/byte-flag";

/**
 * 表示だけを DLC と揃える（依頼主に会う前／「仕事名」受注前・受注済／すべて終えた）。選択値と受注の判定は変えない。
 * 値の読み方は occupation-accept.ts の decodeSeriesValue。
 */
export function seriesOptions(flag: number, values: readonly FlagValue[]): SelectOption[] {
  return values.map((state) => {
    const value = String(state.value);
    const decoded = decodeSeriesValue(flag, state.value);
    if (decoded.kind === "done") return { value, label: state.label, group: tr({ ja: "すべて終えた", en: "All done" }) };
    if (decoded.kind === "other") return { value, label: state.label, group: state.group };
    // 🟢 各件の名前。8件目など n0 のまま受ける件も含む。
    const entry = occupationById(decoded.job);
    const name = entry && occupationLabel(entry.labelId);
    const group = name ? tr({ ja: `「${name}」`, en: `"${name}"` }) : state.group;
    // 🟢 小鳩・おっつぁんの 8件目は受注で 81 を書かない。81 を受注済とは呼ばない
    const label = !decoded.accepted
      ? tr({ ja: "受注前", en: "Not accepted" })
      : decoded.startsAccept
        ? tr({ ja: "受注済", en: "Accepted" })
        : tr({ ja: "受注済（受注中にはならない）", en: "Accepted (does not become the current mission)" });
    return { value, label, group, selectedLabel: `${group} ${label}` };
  });
}
