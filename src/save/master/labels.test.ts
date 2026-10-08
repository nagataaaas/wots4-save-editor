import { describe, expect, it } from "vitest";
import { eventLabelId, itemLabelId, npcLabelId, occupationLabelId } from "./label-types";
import { findLabel, labelOf } from "./labels";

describe("共通ラベル", () => {
  it("種別ごとの LabelId から日本語・英語の表示名を引ける", () => {
    expect(labelOf({ kind: "item", id: itemLabelId(0x02) })).toBe("おにぎり");
    expect(labelOf({ kind: "item", id: itemLabelId(0x02) }, "en")).toBe("Onigiri");
    expect(labelOf({ kind: "event", id: eventLabelId(2) })).toBe("志士との出会い");
    expect(labelOf({ kind: "npc", id: npcLabelId(3) })).toBe("朱美");
    expect(labelOf({ kind: "occupation", id: occupationLabelId(171) })).toBe("出頭命令");
  });

  it("読みを持つラベルは検索用の reading も共通ラベルに載せる", () => {
    expect(findLabel({ kind: "item", id: itemLabelId(0x10) })?.reading).toBe("といし");
  });

  it("表にない LabelId は fallback、または種別つきの不明表示にする", () => {
    expect(labelOf({ kind: "item", id: itemLabelId(0xffff) }, "ja", "なし")).toBe("なし");
    expect(labelOf({ kind: "npc", id: npcLabelId(9999) })).toBe("不明（npc:9999）");
  });
});
