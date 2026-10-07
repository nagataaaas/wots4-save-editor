// アイテムの表（datatable/item/item.csv、全行 🟢）と同じ内容かを、要所の行で確かめる。
import { describe, expect, it } from "vitest";
import { ITEMS, findItem, itemDisplayName, parseCsv } from "./item-names";

describe("🟢 アイテム datatable/item/item.csv", () => {
  it("ID 0x00〜0xF1 の242件。欠番・重複なし", () => {
    expect(ITEMS.map((it) => it.id)).toEqual(Array.from({ length: 0xf2 }, (_, i) => i));
  });

  it("✅ [TS][U] の名前と合う。部品箱は英語名で刃・鍔・柄", () => {
    expect(findItem(0x00)?.ja).toBe("会談の手紙");
    expect(findItem(0x09)?.ja).toBe("秘薬");
    expect([0x0d, 0x0e, 0x0f].map((id) => findItem(id)?.ja)).toEqual(["部品箱", "部品箱", "部品箱"]);
    expect([0x0d, 0x0e, 0x0f].map((id) => findItem(id)?.en)).toEqual([
      "Parts Box (Blade)",
      "Parts Box (Guard)",
      "Parts Box (Grip)",
    ]);
    expect(findItem(0x12)?.ja).toBe("お酒");
    expect(findItem(0x21)?.ja).toBe("オレ流目録");
    expect(findItem(0xed)?.ja).toBe("拷問部屋の鍵");
    expect(findItem(0xee)?.ja).toBe("謎の鍵");
    expect(findItem(0xf2)).toBeUndefined();
  });

  it("obtain：0＝道具、1＝その場で使う（料理・宿）、2＝手に入る経路がない", () => {
    expect(findItem(0x02)?.obtain).toBe(0);
    expect(findItem(0x30)?.obtain).toBe(1); // うなぎ丼
    expect(findItem(0x6f)?.obtain).toBe(1); // 梅の間
    expect(findItem(0x49)?.obtain).toBe(2); // 丼
    expect(findItem(0x73)?.obtain).toBe(2); // 茶器の複製
    expect(findItem(0xcd)?.obtain).toBe(2);
    expect(ITEMS.filter((it) => it.obtain === 0)).toHaveLength(92);
  });

  it("maxStack：1枠に持てる最大数", () => {
    expect(findItem(0x10)?.maxStack).toBe(1);
    expect(findItem(0x18)?.maxStack).toBe(10);
    expect(findItem(0x19)?.maxStack).toBe(5);
    expect(findItem(0x29)?.maxStack).toBe(999);
    expect(findItem(0x74)?.maxStack).toBe(9999);
    expect(findItem(0xc4)?.maxStack).toBe(10);
  });

  it("説明文（日本語・英語）を持つ。カンマ・引用符を含む行も読める", () => {
    expect(findItem(0x02)?.descJa).toBe("貴重なお米携帯食料。作ってくれた人の気持ちが伝わる。活力300回復。");
    expect(findItem(0x01)?.descEn).toContain('"sooshee.');
    expect(ITEMS.every((it) => it.descJa !== "")).toBe(true);
  });

  it("parseCsv：引用符の中のカンマ・改行・二重引用符", () => {
    expect(parseCsv('a,"b,c","d""e"\r\n1,"x\ny",\n')).toEqual([
      ["a", "b,c", 'd"e'],
      ["1", "x\ny", ""],
    ]);
  });

  it("同じ名前の ID は表示名に ID を添える", () => {
    expect(itemDisplayName(findItem(0x02)!)).toBe("おにぎり");
    expect(itemDisplayName(findItem(0x1c)!)).toBe("茶器（0x1C）");
    expect(itemDisplayName(findItem(0x0d)!)).toBe("部品箱（0x0D）");
    expect(itemDisplayName(findItem(0xd7)!)).toBe("鮎の塩焼き（0xD7）");
  });
});
