// 生成物（src/save/master/dataset/*.ts）が docs/save_format/datatable の CSV と同じ内容かを確かめる。
// 落ちたら pnpm gen:dataset を実行する。
import { describe, expect, it } from "vitest";
import { CERTAINTY_PATTERN, datasetNameOf, parseCsv, renderDataset } from "./dataset-render";

const csvs = import.meta.glob<string>(["/docs/save_format/datatable/**/*.csv", "!**/TEMPLATE.csv"], {
  query: "?raw",
  import: "default",
  eager: true,
});
const generated = import.meta.glob<string>("./dataset/*.ts", { query: "?raw", import: "default", eager: true });

describe("CSV から生成したデータ", () => {
  const entries = Object.entries(csvs).map(([path, text]) => [path.replace("/docs/save_format/datatable/", ""), text]);

  it.each(entries)("%s の生成物が最新", (rel, text) => {
    const file = `./dataset/${datasetNameOf(rel).file}`;
    expect(generated[file], `${file} がありません。pnpm gen:dataset を実行してください`).toBeDefined();
    expect(generated[file].replace(/\r\n/g, "\n")).toBe(renderDataset(rel, text));
  });

  it("CSV のない生成物は残っていない", () => {
    const expected = new Set(entries.map(([rel]) => `./dataset/${datasetNameOf(rel).file}`));
    expect(Object.keys(generated).filter((f) => !expected.has(f))).toEqual([]);
  });

  it("列の型：数値・16進数の列は数値（空は null）、それ以外は文字列", () => {
    const text = 'id_dec,id_hex,name_ja,n,h,s,e\n1,0x1,"a,b",10,0x1A,x,\n2,0x2,,,,,\n';
    expect(renderDataset("t/sample.csv", text)).toContain(
      '  1: { "id_dec": 1, "name_ja": "a,b", "n": 10, "h": 26, "s": "x", "e": null },\n' +
        '  2: { "id_dec": 2, "name_ja": "", "n": null, "h": null, "s": "", "e": null },',
    );
    expect(() => renderDataset("t/dup.csv", "id_dec,a\n1,x\n1,y\n")).toThrow("重複");
  });

  it("備考・status は出さない。画面で使うものだけ確度を含まない列に変える", () => {
    const text = 'id_dec,name_ja,status,備考\n1,a,🟢,ふだんは町にいない\n2,b,✅ 実データ,\n';
    const out = renderDataset("npc/night-visit-partner.csv", text);
    expect(out).not.toMatch(CERTAINTY_PATTERN);
    expect(out).toContain('  1: { "id_dec": 1, "name_ja": "a", "note_ja": "ふだんは町にいない", "checked": false },');
    expect(out).toContain('  2: { "id_dec": 2, "name_ja": "b", "note_ja": "", "checked": true },');
    expect(renderDataset("t/x.csv", "id_dec,a,status,備考\n1,x,🔶,D-13\n")).toBe(
      renderDataset("t/x.csv", "id_dec,a\n1,x\n"),
    );
    // 残す注記に確度があれば生成を止める
    expect(() => renderDataset("occupation/occupation.csv", "id_dec,備考\n1,🔶 U-17\n")).toThrow("確度");
  });

  it("生成物に確度の記号・語・U-n / D-n がない", () => {
    for (const [file, text] of Object.entries(generated)) {
      const body = text.replace(/^\/\/.*$/gm, "");
      expect(body, file).not.toMatch(CERTAINTY_PATTERN);
    }
  });

  it("parseCsv：引用符の中のカンマ・改行・二重引用符", () => {
    expect(parseCsv('a,"b,c","d""e"\r\n1,"x\ny",\n')).toEqual([
      ["a", "b,c", 'd"e'],
      ["1", "x\ny", ""],
    ]);
  });

  it('候補の16進数・バイト列は生成時に配列にする。空欄は空配列', () => {
    const out = renderDataset('npc/pupil.csv', 'id_dec,looks\n1,0x10;0xFF\n2,\n');
    expect(out).toContain('"looks": [16,255]');
    expect(out).toContain('"looks": []');
    expect(renderDataset('place/night-visit-row.csv', 'id_dec,save_bytes_le,備考\n1,07 00 A2,\n2,,\n'))
      .toContain('"save_bytes_le": [7,0,162]');
    // 読めない値はファイル・列・行を添えて止める
    expect(() => renderDataset('npc/pupil.csv', 'id_dec,looks\n1,0x10;xx\n'))
      .toThrow('npc/pupil.csv の looks 列（id_dec 1）: 配列の値が読めません: xx');
    expect(() => renderDataset('weapon/blade.csv', 'id_dec,save_bytes_le\n1,00 100\n')).toThrow('範囲');
  });

  it('固有武器のバイト列は空か6バイト', () => {
    const out = renderDataset('weapon/complete.csv', 'id_dec,unique_bytes\n1,41 02 0A 00 61 00\n2,\n');
    expect(out).toContain('"unique_bytes": [65,2,10,0,97,0]');
    expect(out).toContain('"unique_bytes": []');
    expect(() => renderDataset('weapon/complete.csv', 'id_dec,unique_bytes\n1,41 02\n')).toThrow('6バイト');
  });

  it('🟢 容姿のモデルは符号つきの4値、層と技の列は配列にして出す', () => {
    const out = renderDataset('appearance/feet.csv', 'id_dec,save_models,layer_meshes,layer_textures\n1,46 01 FF FF 00 00 FF FF,足|小物||,299 300|309||\n');
    expect(out).toContain('"save_models": [326,-1,0,-1]');
    expect(out).toContain('"layer_meshes": ["足","小物","",""]');
    expect(out).toContain('"layer_textures": [[299,300],[309],[],[]]');
    const header = 'id_dec,save_models,layer_meshes,layer_textures\n';
    expect(() => renderDataset('appearance/feet.csv', `${header}1,FF FF,|||,|||\n`)).toThrow('8バイト');
    expect(() => renderDataset('appearance/feet.csv', `${header}1,00 00 00 00 00 00 00 00,|||,1|2\n`)).toThrow('4つ');
    expect(renderDataset('sect/stance-skill.csv', 'id_dec,next,prev\n1,2 3,\n'))
      .toContain('"next": [2,3], "prev": []');
    expect(renderDataset('sect/skill.csv', 'id_dec,attrs\n1,投げ・防御\n'))
      .toContain('"attrs": ["投げ","防御"]');
  });
});
