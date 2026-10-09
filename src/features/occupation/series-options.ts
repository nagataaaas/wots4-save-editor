import type { SelectOption } from "@/components/select-options";
import { acceptRuleOf, seriesAcceptOf } from "@/save/occupation-accept";
import { occupationLabel } from "@/save/master/labels";
import { occupationById } from "@/save/master/occupation-names";
import type { TownsfolkValue } from "@/save/townsfolk";

/**
 * 表示だけを DLC と揃える（依頼主に会う前／「仕事名」受注前・受注済／すべて終えた）。選択値と受注の判定は変えない。
 * n0 は n 件目の受注前（前の件を成功したあと）、n1 は n 件目の受注済。
 */
export function seriesOptions(
  flag: number,
  values: readonly TownsfolkValue[],
  jobs: readonly number[],
): SelectOption[] {
  return values.map((state) => {
    const value = String(state.value);
    if (state.value === 100) return { value, label: state.label, group: "すべて終えた" };
    const n = Math.floor(state.value / 10);
    const digit = state.value % 10;
    if (n < 1 || n > 8 || digit > 1) {
      return {
        value,
        label: state.value >= 90 ? `${state.value} ${state.label}` : state.label,
        group: state.group,
      };
    }
    // 🟢 受注時の値から各件の名前を引く。8件目など n0 のまま受ける件も含む。
    const id = jobs.find((id) => acceptRuleOf(id).onAccept.some(
      (write) => write.flag === flag && (write.value === n * 10 || write.value === n * 10 + 1),
    ));
    const entry = id === undefined ? undefined : occupationById(id);
    const group = entry ? `「${occupationLabel(entry.labelId)}」` : state.group;
    // 🟢 小鳩・おっつぁんの 8件目は受注で 81 を書かない。81 を受注済とは呼ばない
    const label = digit === 0
      ? "受注前"
      : seriesAcceptOf(flag, state.value) ? "受注済" : `${state.value}（受注では書かない値）`;
    return { value, label, group, selectedLabel: `${group} ${label}` };
  });
}
