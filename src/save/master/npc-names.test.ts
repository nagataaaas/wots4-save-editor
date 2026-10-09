// 名前の表（datatable/npc/npc-name.csv、全行 🟢）と同じ内容かを、要所の行で確かめる。
import { describe, expect, it } from "vitest";
import { npcLabelId } from "./label-types";
import { NPC_LABELS, NPC_NAMES, npcName, npcNameGroup } from "./npc-names";

const ja = (id: number) => NPC_LABELS.get(npcLabelId(id))?.ja;

describe("🟢 人物の名前 datatable/npc/npc-name.csv", () => {
  it("577件。ID は重複せず昇順", () => {
    expect(NPC_NAMES).toHaveLength(577);
    expect(NPC_LABELS.size).toBe(577);
    const ids = NPC_NAMES.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort((a, b) => a - b)).toEqual(ids);
  });

  it("✅ [U] 約束の名前で見た ID", () => {
    // さよ 0xD7・かえで 0x1BA5 は約束の実データ。先生・メリンダ・三姉妹は [U] 2026-10-07 の約束の実データ
    expect(ja(0xd7)).toBe("さよ");
    expect(ja(0x1ba5)).toBe("かえで");
    expect(ja(0x0f)).toBe("先生");
    expect(ja(0x0d)).toBe("メリンダ");
    expect([6, 7, 8].map(ja)).toEqual(["万由", "千佳", "百合"]);
    expect(ja(3)).toBe("朱美");
    expect(npcName(3)?.sex).toBe("f");
    expect(npcName(9999)).toBeUndefined();
  });

  it("区分", () => {
    expect(npcNameGroup(215)).toBe("固有の名前");
    expect(npcNameGroup(1001)).toBe("仮の名前");
    expect(npcNameGroup(8200)).toBe("町の人の名前");
  });
});
