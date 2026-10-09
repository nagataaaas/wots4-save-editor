import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdvancedModeContext } from "@/lib/advanced-mode-context";
import { readWeapon, WEAPON_FIELDS } from "@/save/weapon";
import { CharmEditor } from "./charm-editor";
import { charmSelectionKey, charmSelections, expandCharmSelections } from "./charm-selection";

const rows = [
  { id: 9, count: 1 },
  { id: 9, count: 1 },
  { id: 4, count: 1 },
];

describe("魅力項目×個数", () => {
  it("通常は同じ魅力も項目×1で表示し、保存時の合算順と一致する", () => {
    expect(charmSelections([9, 9, 4])).toEqual(rows);
    expect(expandCharmSelections(rows, false)).toEqual([9, 9, 4]);
    expect(charmSelectionKey([9, 4, 9])).toBe(charmSelectionKey([9, 9, 4]));
    expect(charmSelections([null, null, null])).toEqual(Array.from({ length: 3 }, () => ({ id: null, count: 1 })));
  });

  it("🟢 上級者モードで異なる3項目を各×3にして、9個を欠落なく読み直す", () => {
    const selected = [{ id: 9, count: 3 }, { id: 4, count: 3 }, { id: 6, count: 3 }];
    const values = expandCharmSelections(selected, true);
    expect(values).toEqual([9, 9, 9, 4, 4, 4, 6, 6, 6]);
    expect(charmSelections(values)).toEqual(selected);
    expect(() => expandCharmSelections(selected, false)).toThrow("上級者モード");
  });

  it("🟢 同じ魅力は合算して3まで。無効な個数・種類数も拒否する", () => {
    expect(expandCharmSelections([{ id: 9, count: 2 }, { id: 9, count: 1 }, { id: null, count: 1 }], true)).toEqual([9, 9, 9, null]);
    expect(() => expandCharmSelections([{ id: 9, count: 3 }, { id: 9, count: 1 }], true)).toThrow("合算して3");
    for (const count of [0, 4, 5, -1, 1.5, NaN]) {
      expect(() => expandCharmSelections([{ id: 9, count }], true)).toThrow();
    }
    expect(() => expandCharmSelections(Array.from({ length: 4 }, () => ({ id: null, count: 1 })), true)).toThrow();
  });

  it("通常は×1表示だけ、上級者モードだけ個数欄と安全上の注意を表示する", () => {
    const bytes = new Uint8Array(0xa0);
    bytes.set([9, 0, 2, 0, 4, 0, 1, 0, 255, 255, 0, 0], WEAPON_FIELDS.charms);
    const weapon = readWeapon(bytes, 0);
    const render = (advanced: boolean) => renderToStaticMarkup(createElement(
      AdvancedModeContext.Provider,
      { value: { advanced, setAdvanced: () => {} } },
      createElement(CharmEditor, { weapon, base: 0, update: () => {} }),
    ));
    const normal = render(false);
    expect(normal.match(/×1<\/span>/g)).toHaveLength(3);
    expect(normal).not.toContain("魅力 1 の個数");
    const advanced = render(true);
    expect(advanced).toContain("魅力 1 の個数");
    expect(advanced).toContain("魅力 3 の個数");
    expect(advanced).toContain("帯刀済みの武器で各魅力の効果が反映されます");
    expect(advanced).toContain("武器袋・武器箪笥での選択や帯刀への変更時にクラッシュ");
    expect(advanced).toContain("バックアップ");
    // ✅ 合計4以上の危険性は通常モードに戻したあとも表示する。
    bytes.set([9, 0, 3, 0, 4, 0, 2, 0, 255, 255, 0, 0], WEAPON_FIELDS.charms);
    const overflow = renderToStaticMarkup(createElement(
      AdvancedModeContext.Provider,
      { value: { advanced: false, setAdvanced: () => {} } },
      createElement(CharmEditor, { weapon: readWeapon(bytes, 0), base: 0, update: () => {} }),
    ));
    expect(overflow).toContain("クラッシュする可能性");
    expect(overflow).not.toContain("魅力 1 の個数");
  });
});
