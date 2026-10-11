import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ItemInformation, OwnershipStateButton, UnlockStateButton } from "./unlock-ui";
import { nextUnlockState } from "./unlock-state";

describe("容姿・特典のアイテム表示", () => {
  it("名前・種別・説明を表示し、番号と取得条件は常時表示しない", () => {
    const html = renderToStaticMarkup(
      createElement(ItemInformation, { name: "テストの顔", category: "顔", description: "説明の本文", offset: 0x43337, condition: "取得条件の本文" }),
    );
    for (const text of ["テストの顔", "顔", "説明の本文"]) expect(html).toContain(text);
    expect(html).not.toMatch(/>31</);
    expect(html).not.toContain("取得条件の本文");
    expect(html).not.toContain("0x43337");
    expect(html).toContain("補足");
  });

  it("説明がない服は未登録と表示し、説明を推測しない", () => {
    expect(renderToStaticMarkup(
      createElement(ItemInformation, { name: "服", category: "上半身", offset: "0x03AB5C bit1" }),
    )).toContain("説明未登録");
  });
});

describe("装飾品・容姿の所持ボタン", () => {
  it.each([
    { owned: false, labels: ["未所持", "所持"] as const, icon: "lucide-lock-keyhole", color: "text-muted-foreground" },
    { owned: true, labels: ["未所持", "所持"] as const, icon: "lucide-check", color: "text-emerald-600" },
    { owned: false, labels: ["未解放", "解放済み"] as const, icon: "lucide-lock-keyhole", color: "text-muted-foreground" },
    { owned: true, labels: ["未解放", "解放済み"] as const, icon: "lucide-check", color: "text-emerald-600" },
  ])("$labels / owned=$owned に対応するアイコン・色・状態名を表示", ({ owned, labels, icon, color }) => {
    const html = renderToStaticMarkup(createElement(OwnershipStateButton, {
      owned, labels, name: "アイテム", disabled: false, onChange: () => {},
    }));
    expect(html).toContain(icon);
    expect(html).toContain(color);
    expect(html).toContain(`アイテム：${labels[owned ? 1 : 0]}`);
  });

  it("クリックで反転し、読み取り専用では変更しない", () => {
    const changes: boolean[] = [];
    for (const owned of [false, true]) {
      const button = OwnershipStateButton({ owned, name: "装飾品", labels: ["未所持", "所持"], disabled: false, onChange: (v) => changes.push(v) });
      button.props.onClick();
    }
    const disabled = OwnershipStateButton({ owned: false, name: "服", labels: ["未解放", "解放済み"], disabled: true, onChange: (v) => changes.push(v) });
    disabled.props.onClick();
    expect(changes).toEqual([true, false]);
    expect(disabled.props["aria-disabled"]).toBe(true);
  });
});

describe("特典の状態ボタン（🔶 U-17）", () => {
  it("🔶 U-17：非表示 → 未取得 → 取得済み → 非表示の順に循環する", () => {
    expect([0, 1, 2].map(nextUnlockState)).toEqual([1, 2, 0]);
    expect(nextUnlockState(255)).toBe(0);
  });

  it.each(["非表示", "未取得", "取得済み"])("🔶 U-17：%s を読み上げ用ラベルに含める", (label) => {
    const value = ["非表示", "未取得", "取得済み"].indexOf(label);
    const html = renderToStaticMarkup(createElement(UnlockStateButton, { value, name: "特典", disabled: false, onChange: () => {} }));
    expect(html).toContain(`特典：${label}`);
    expect(html).toContain("<svg");
    expect(html).toContain(["lucide-minus", "lucide-lock-keyhole", "lucide-check"][value]);
    expect(html).toContain("size-5");
    expect(html).toContain(["text-muted-foreground", "text-muted-foreground", "text-emerald-600"][value]);
    if (value === 2) expect(html).toContain("dark:text-emerald-400");
  });

  it("読み取り専用でもホバー可能なボタンで無効状態を示す", () => {
    const html = renderToStaticMarkup(createElement(UnlockStateButton, { value: 0, name: "特典", disabled: true, onChange: () => {} }));
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toContain(' disabled=""');
  });
});
