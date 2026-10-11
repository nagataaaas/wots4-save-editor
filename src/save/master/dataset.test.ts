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
});
