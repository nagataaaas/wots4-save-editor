// docs/save_format/datatable/**/*.csv から src/save/master/dataset/*.ts を作る。使い方：pnpm gen:dataset
// CSV を直したら実行する。生成物が CSV と違うと src/save/master/dataset.test.ts が落ちる。
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { datasetNameOf, renderDataset } from "../src/save/master/dataset-render.ts";

const root = join(import.meta.dirname, "..");
const datatable = join(root, "docs/save_format/datatable");
const out = join(root, "src/save/master/dataset");

function csvFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return csvFiles(path);
    return name.endsWith(".csv") && name !== "TEMPLATE.csv" ? [path] : [];
  });
}

mkdirSync(out, { recursive: true });
const written = new Set<string>();
for (const path of csvFiles(datatable).sort()) {
  const rel = relative(datatable, path).split("\\").join("/");
  const { file } = datasetNameOf(rel);
  if (written.has(file)) throw new Error(`生成ファイルの名前が重なります: ${file}`);
  writeFileSync(join(out, file), renderDataset(rel, readFileSync(path, "utf8")));
  written.add(file);
}
for (const name of readdirSync(out)) if (!written.has(name)) rmSync(join(out, name));
console.log(`${written.size} 件を生成しました: ${relative(root, out)}`);
