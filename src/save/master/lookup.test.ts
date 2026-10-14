import { describe, expect, it } from "vitest";
import { lookup } from "./lookup";
import { COMPLETE_TABLE } from "./dataset/complete";
import { weaponImageUrl } from "./weapon-images";

describe("lookup", () => {
  const table = { 1: { id_dec: 1, name_ja: "a" }, 3: { id_dec: 3, name_ja: "b" } } as const;

  it("ID の行を引く。表にない ID は undefined", () => {
    expect(lookup(table, 3)?.name_ja).toBe("b");
    expect(lookup(table, 2)).toBeUndefined();
    expect(lookup(table, -1)).toBeUndefined();
    expect(lookup(table, 1.5)).toBeUndefined();
    expect(lookup(table, NaN)).toBeUndefined();
  });

  it("生成した表をそのまま渡せる", () => {
    expect(lookup(COMPLETE_TABLE, 2)?.name_ja).toBe("中道刀");
  });
});

describe("weaponImageUrl", () => {
  it("complete.csv の image_url を引く。画像のない ID・表にない ID は null", () => {
    expect(weaponImageUrl(2)).toBe("https://static.wikia.nocookie.net/wots/images/9/95/Basal_Blade.jpg/revision/latest");
    expect(weaponImageUrl(116)).toContain("Wildgrass.jpg");
    expect(weaponImageUrl(0xffff)).toBeNull();
    expect(weaponImageUrl(1)).toBeNull();
  });
});
