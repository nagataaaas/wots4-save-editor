import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readWeapon, WEAPON_FIELDS } from "@/save/weapon";
import { WeaponPanel } from "./weapon-panel";

function fixture() {
  const bytes = new Uint8Array(0xa0);
  const data = new DataView(bytes.buffer);
  data.setUint16(WEAPON_FIELDS.attack, 10, true);
  data.setUint16(WEAPON_FIELDS.durability, 1638, true);
  data.setUint16(WEAPON_FIELDS.durabilityMax, 1673, true);
  data.setUint16(WEAPON_FIELDS.quality, 1, true);
  data.setUint16(WEAPON_FIELDS.qualityMax, 10, true);
  bytes.fill(0xff, WEAPON_FIELDS.title, WEAPON_FIELDS.title + 3);
  // 🟢 自作の名前の番号は −1。名前を隠す値が 1 なら ***** を表示する。
  data.setInt32(WEAPON_FIELDS.nameNo, -1, true);
  const name = "RainMaker";
  for (let i = 0; i < name.length; i++) {
    data.setUint16(WEAPON_FIELDS.name + i * 2, name.charCodeAt(i), true);
  }
  for (let i = 0; i < 3; i++) {
    data.setUint16(WEAPON_FIELDS.charms + i * 4, 0xffff, true);
  }
  return bytes;
}

const render = (bytes: Uint8Array) =>
  renderToStaticMarkup(createElement(WeaponPanel, { weapon: readWeapon(bytes, 0) }));

describe("武器のゲーム風プレビュー", () => {
  it("名前、能力値、魅力の順に表示し、現在値 / 最大値には桁区切りを入れない", () => {
    const bytes = fixture();
    const original = bytes.slice();
    const html = render(bytes);
    expect(html).toContain("RainMaker");
    expect(html).toContain("1638/1673");
    expect(html).toContain("1/10");
    expect(html).not.toContain("1,638");
    expect(html.indexOf("RainMaker")).toBeLessThan(html.indexOf("攻撃力"));
    expect(html.indexOf("攻撃力")).toBeLessThan(html.indexOf('aria-label="魅力"'));
    expect(bytes).toEqual(original);
  });

  it("画像がないときだけ白枠用のクラスを付ける", () => {
    const weapon = readWeapon(fixture(), 0);
    weapon.completeByParts = null;
    expect(renderToStaticMarkup(createElement(WeaponPanel, { weapon })))
      .toContain("weapon-preview-image-empty");
    weapon.completeByParts = 2;
    const html = renderToStaticMarkup(createElement(WeaponPanel, { weapon }));
    expect(html).toContain("<img");
    expect(html).not.toContain("weapon-preview-image-empty");
  });

  it("銘がないときは「なし」のバッジを表示しない", () => {
    const html = render(fixture());
    expect(html).not.toContain('data-slot="badge"');
  });

  it("銘があるときは名前の左に文字だけで表示する", () => {
    const bytes = fixture();
    bytes.set([0x6a, 0x01, 0x00], WEAPON_FIELDS.title); // ✅ 銘「人斬り」
    const html = render(bytes);
    expect(html).toContain("<span>人斬り</span><span>RainMaker</span>");
    expect(html).not.toContain('data-slot="badge"');
  });

  it("耐久度と質は / を中央に固定できる3列で表示する", () => {
    const html = render(fixture());
    expect(html).toContain('class="weapon-preview-pair" aria-label="1638/1673"');
    expect(html).toContain('class="weapon-preview-pair" aria-label="1/10"');
    expect(html).toContain("<span>1638</span><span>/</span><span>1673</span>");
  });

  it("空の魅力をゲーム同様の --- で3枠表示する", () => {
    const html = render(fixture());
    expect(html.match(/<span>---<\/span>/g)).toHaveLength(3);
    expect(html).toContain('aria-label="魅力 1：なし"');
  });

  it("🟢 合計9個の魅力も3種類の個数を欠落なく表示する（要ゲーム内確認）", () => {
    const bytes = fixture();
    bytes.set([9, 0, 3, 0, 4, 0, 3, 0, 6, 0, 3, 0], WEAPON_FIELDS.charms);
    const html = render(bytes);
    expect(html).toContain("重撃 ×3");
    expect(html).toContain("活復 ×3");
    expect(html).toContain("背水 ×3");
  });

  it("🟢 名前を隠す値が 1 の武器は ***** と表示する", () => {
    const bytes = fixture();
    bytes[WEAPON_FIELDS.nameHidden] = 1;
    const html = render(bytes);
    expect(html).toContain("*****");
    expect(html).not.toContain("RainMaker");
  });
});
