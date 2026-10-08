// docs/save_format/datatable/**/*.csv から src/save/master/dataset/*.ts を作る（pnpm gen:dataset）。
// ファイルの読み書きは scripts/gen-dataset.ts。ここは文字列から文字列への変換だけを持ち、
// テスト（dataset.test.ts）で生成物が CSV と同じ内容かを確かめるのにも使う。
//
// 生成物：id_dec をキーにした `as const` のオブジェクト。型の上でも値（名前など）が分かるので、
// nameOf.npc(40) にカーソルを当てると返り値の文字列が見える。
// 列の型：空でない値がすべて整数・小数なら数値、すべて 0x で始まる16進数なら数値（空は null）。それ以外は文字列（空は ""）。
// すべての行が空の列は null（CSV ごとに "" と null に分かれないように）。
// id_hex は id_dec と同じ値なので出さない。

/** RFC 4180 の CSV を行・列に分ける（"..." の中のカンマ・改行・"" に対応） */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const DECIMAL = /^-?\d+(\.\d+)?$/;
const HEX = /^0x[0-9a-f]+$/i;
const OMIT_COLUMNS = new Set(["id_hex"]);

/** "npc/npc-name.csv" → { file: "npc-name.ts", name: "NPC_NAME_TABLE" } */
export function datasetNameOf(csvPath: string): { file: string; name: string } {
  const base = csvPath.replace(/^.*\//, "").replace(/\.csv$/, "");
  return { file: `${base}.ts`, name: `${base.replace(/-/g, "_").toUpperCase()}_TABLE` };
}

/** csvPath は datatable からの相対パス（"npc/npc-name.csv"） */
export function renderDataset(csvPath: string, text: string): string {
  const [header, ...body] = parseCsv(text.replace(/^﻿/, ""));
  const rows = body.filter((r) => r.length > 1);
  const idCol = header.indexOf("id_dec");
  if (idCol < 0) throw new Error(`${csvPath} に id_dec 列がありません`);

  const columns = header
    .map((name, i) => ({ name, i }))
    .filter((c) => !OMIT_COLUMNS.has(c.name))
    .map((c) => {
      const values = rows.map((r) => r[c.i] ?? "").filter((v) => v !== "");
      const kind =
        values.length === 0
          ? "empty"
          : values.every((v) => DECIMAL.test(v))
            ? "decimal"
            : values.every((v) => HEX.test(v))
              ? "hex"
              : "string";
      return { ...c, kind };
    });

  const seen = new Set<number>();
  let prev = -Infinity;
  const lines = rows.map((r) => {
    const id = Number(r[idCol]);
    if (!Number.isInteger(id)) throw new Error(`${csvPath} の id_dec が整数ではありません: ${r[idCol]}`);
    if (seen.has(id)) throw new Error(`${csvPath} の id_dec が重複しています: ${id}`);
    if (id < prev) throw new Error(`${csvPath} の id_dec が昇順ではありません: ${id}`);
    seen.add(id);
    prev = id;
    const fields = columns.map((c) => {
      const v = r[c.i] ?? "";
      const value =
        c.kind === "empty" ? "null" : c.kind === "string" ? JSON.stringify(v) : v === "" ? "null" : String(Number(v));
      return `${JSON.stringify(c.name)}: ${value}`;
    });
    return `  ${id}: { ${fields.join(", ")} },`;
  });

  const { name } = datasetNameOf(csvPath);
  return [
    `// 生成ファイル。docs/save_format/datatable/${csvPath} から pnpm gen:dataset で作る。直接編集しない。`,
    `export const ${name} = {`,
    ...lines,
    `} as const;`,
    "",
  ].join("\n");
}
