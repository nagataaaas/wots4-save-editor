import { describe, expect, it } from "vitest";
import { eventLabelId, itemLabelId, npcLabelId, occupationLabelId } from "./label-types";
import {
  eventLabel,
  findLabel,
  itemLabel,
  labelKeywords,
  labelOf,
  nameOf,
  npcLabel,
  occupationGroupLabel,
  occupationLabel,
} from "./labels";
import { occupationGroupByKey } from "./occupation-names";

describe("共通ラベル", () => {
  it("種別ごとの LabelId から日本語・英語の表示名を引ける", () => {
    expect(labelOf({ kind: "item", id: itemLabelId(0x02) })).toBe("おにぎり");
    expect(labelOf({ kind: "item", id: itemLabelId(0x02) }, "en")).toBe("Onigiri");
    expect(itemLabel(itemLabelId(0x02))).toBe("おにぎり");
    expect(npcLabel(npcLabelId(3))).toBe("朱美");
    expect(npcLabel(npcLabelId(40), "en")).toBe("Nodobotoke");
    expect(occupationLabel(occupationLabelId(171))).toBe("出頭命令");
  });

  it("イベントの LabelId は通し番号（0x36A8 + n の n）", () => {
    expect(eventLabel(eventLabelId(6))).toBe("志士との出会い");
    expect(eventLabel(eventLabelId(0))).toBe("船上の侍");
    expect(eventLabel(eventLabelId(28))).toBe("大老 鬼怒川怨仙");
  });

  it("読みを持つラベルは検索用の reading も共通ラベルに載せる", () => {
    expect(findLabel({ kind: "item", id: itemLabelId(0x10) })?.reading).toBe("といし");
    expect(labelKeywords({ kind: "item", id: itemLabelId(0x10) })).toEqual(["砥石", "Whetting Stone", "といし"]);
  });

  it("表にない LabelId は fallback、または「不明」にする", () => {
    expect(labelOf({ kind: "item", id: itemLabelId(0xffff) }, "ja", "なし")).toBe("なし");
    expect(labelOf({ kind: "npc", id: npcLabelId(9999) })).toBe("不明");
    expect(labelKeywords({ kind: "npc", id: npcLabelId(9999) })).toEqual([]);
  });

  it("nameOf：ID のリテラルから名前を引く。返り値の型は名前の文字列そのもの", () => {
    const nodobotoke: "野戸仏" = nameOf.npc(40);
    expect(nodobotoke).toBe("野戸仏");
    expect(nameOf.event(38)).toBe("真実");
    expect(nameOf.item(0x02)).toBe("おにぎり");
    expect(nameOf.occupation(172)).toBe("督促状");
  });

  it("nameOf：表にない ID・名前のない ID は型エラー", () => {
    // @ts-expect-error 9999 は人物の表にない
    expect(() => nameOf.npc(9999)).toThrow();
    // @ts-expect-error 通し番号 84 は名前がない
    expect(nameOf.event(84)).toBe("");
  });

  it("なりわいのまとまりの見出しは、依頼主の名前を人物の表から引く", () => {
    expect(occupationGroupLabel(occupationGroupByKey("police")!)).toBe("【岡っ引き】野戸仏");
    expect(occupationGroupLabel(occupationGroupByKey("homeless")!)).toBe("【宿無し】おっつぁん");
    expect(occupationGroupLabel(occupationGroupByKey("basic")!)).toBe("町のなりわい");
  });
});
