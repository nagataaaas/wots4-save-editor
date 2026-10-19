// 装飾品の表（datatable/accessory/accessory.csv、全行 🟢）と特典解除の表（datatable/unlock/unlock.csv、🔶 U-17）を要所の行で確かめる。
import { describe, expect, it } from "vitest";
import { ACCESSORIES, CLOTHES, UNLOCKS, appearanceUnlockInformation } from "./accessory-names";
import { OUTFIT_TABLE } from "./dataset/outfit";

describe("🟢 容姿の服 datatable/appearance/cloth.csv", () => {
  it("🟢 服194件の説明を保持し、さよはセットの表示名・説明を使う", () => {
    expect(CLOTHES.filter((c) => c.descJa.length > 0)).toHaveLength(194);
    expect(CLOTHES.find((c) => c.id === 32)?.descJa).toBe("男性の最上級正礼服の一つ。裾が燕の尾のように割れているのが特徴。");
    expect(CLOTHES.find((c) => c.id === 240)).toMatchObject({
      ja: "さよ",
      en: "Sayo Outfit",
      category: "全身",
      descJa: "白地に藍色のかつての少女を思い出させる色合い。",
    });
    expect(CLOTHES.find((c) => c.id === 238)?.descJa.split(" / ")).toHaveLength(3);
    expect(CLOTHES.find((c) => c.id === 241)?.descJa.split(" / ")).toHaveLength(2);
  });
  it("番号 0〜241 のうち194件。47 は欠番", () => {
    expect(CLOTHES.length).toBe(194);
    expect(CLOTHES[CLOTHES.length - 1].id).toBe(241);
    expect(CLOTHES.some((c) => c.id === 47)).toBe(false);
  });

  it("✅ [U] 0x3AB60〜61 で出た15着は 32〜46。なりわいの4セットは 238〜241", () => {
    const names = (ids: number[]) => ids.map((id) => CLOTHES.find((c) => c.id === id)?.ja);
    expect(names([32, 35, 38, 41, 46])).toEqual(["緑色の燕尾服", "桃色のベスト", "青色の横縞タンクトップ", "裸 羽織", "黒色の着物 羽織"]);
    expect(CLOTHES.filter((c) => c.id >= 32 && c.id <= 47).length).toBe(15);
    expect(names([238, 241])).toEqual(["新撰組の服 / 新撰組着物 / 新撰組の足袋 草履", "黒色の副長服"]);
    expect(CLOTHES.filter((c) => c.dlc !== null).map((c) => [c.id, c.dlc])).toEqual([
      [238, 1],
      [239, 2],
      [240, 2],
      [241, 1],
    ]);
  });
});

describe("🟢 全身の表示名・説明（特典の保存位置は 🔶 U-17）", () => {
  it("22件の全身の服を扱い、全身IDと解放IDを混同しない", () => {
    expect(Object.values(OUTFIT_TABLE)).toHaveLength(22);
    expect(OUTFIT_TABLE[245]).toMatchObject({ name_ja: "さよ", cloth_id: 240, unlock_id: null });
    expect(OUTFIT_TABLE[53]).toMatchObject({ name_ja: "まだらの服", cloth_id: null, unlock_id: 80 });
  });
  it("🟢 まだらの説明は服の説明を表示し、🔶 U-17 の特典情報は変更しない", () => {
    const original = { ...UNLOCKS[80] };
    expect(appearanceUnlockInformation(UNLOCKS[80])).toMatchObject({
      ja: "まだらの服",
      descriptionJa: "正体を現した朱美の衣装。闇に紛れ痕跡を残さず任務を遂行するのに適している。",
    });
    expect(UNLOCKS[80]).toEqual(original);
    expect(UNLOCKS[80].effectJa).toBe("主人公設定でまだらの服が選択可能になる");
  });
  it("🟢 同じ特典の複数衣装を落とさず、🔶 U-17 の解除先は共通", () => {
    expect(appearanceUnlockInformation(UNLOCKS[68]).ja).toBe("パツキン隊の鎧 / メリンダの鎧");
    expect(appearanceUnlockInformation(UNLOCKS[84]).ja).toBe("貴婦人ドレス / 看護師の服");
    expect(appearanceUnlockInformation(UNLOCKS[68]).descriptionJa.split(" / ")).toHaveLength(2);
  });
  it("全身の説明がない特典は既存の名前・効果を保持する（🔶 U-17）", () => {
    for (const id of [31, 72, 83]) {
      expect(appearanceUnlockInformation(UNLOCKS[id])).toEqual({
        ja: UNLOCKS[id].ja, en: UNLOCKS[id].en, descriptionJa: UNLOCKS[id].effectJa,
        descriptionEn: UNLOCKS[id].effectEn,
      });
    }
  });
});

describe("🟢 装飾品 datatable/accessory/accessory.csv", () => {
  it("ID 0〜157 の158件。欠番・重複なし", () => {
    expect(ACCESSORIES.map((a) => a.id)).toEqual(Array.from({ length: 158 }, (_, i) => i));
  });

  it("✅ なりわいの報酬の差分の5か所（0x3902・0x399C〜0x399F）の装飾品", () => {
    expect([0, 154, 155, 156, 157].map((id) => ACCESSORIES[id].ja)).toEqual([
      "新撰組の鉢金",
      "袖章",
      "マラカス",
      "三味線",
      "おんぶさよ人形",
    ]);
  });

  it("DLC の番号と、店で買えない物", () => {
    expect(ACCESSORIES[152]).toMatchObject({ ja: "龍馬の脇差", dlc: 0, shop: false });
    expect(ACCESSORIES[0]).toMatchObject({ dlc: 1, shop: false });
    expect(ACCESSORIES[1]).toMatchObject({ ja: "きつね面", dlc: null, shop: true, part: "head" });
    expect(ACCESSORIES.filter((a) => !a.shop).length).toBe(20);
    expect(ACCESSORIES.filter((a) => a.dlc !== null).map((a) => a.id)).toEqual([0, 152, 154, 155, 156, 157]);
  });
});

describe("特典解除 datatable/unlock/unlock.csv（先頭16件・31 ✅ [U]、残り 🔶 U-17）", () => {
  it("🟢 番号 0〜104 の105件", () => {
    expect(UNLOCKS.map((u) => u.id)).toEqual(Array.from({ length: 105 }, (_, i) => i));
    expect(UNLOCKS[93]).toMatchObject({ ja: "ローラの人形", category: "装飾品" });
  });

  it("要所の名前と分類", () => {
    expect(UNLOCKS[0]).toMatchObject({ ja: "武器箪笥 壱", category: "武器箪笥", conditionJa: "条件なし" });
    expect(UNLOCKS[4].category).toBe("難易度");
    expect(UNLOCKS[17]).toMatchObject({ ja: "武士の顔", category: "顔" });
    expect(UNLOCKS[31]).toMatchObject({ ja: "J.Jの顔", category: "顔" });
    expect(UNLOCKS[45]).toMatchObject({ ja: "J.Jの髪型", category: "髪型" });
    expect(UNLOCKS[84]).toMatchObject({ ja: "外国人セット", category: "服" });
    expect(UNLOCKS[85]).toMatchObject({ ja: "鬼怒川の烏帽子", category: "装飾品" });
    expect(UNLOCKS[100].category).toBe("免許");
    expect(UNLOCKS[104]).toMatchObject({ ja: "大老の銃", category: "その他" });
  });
});
