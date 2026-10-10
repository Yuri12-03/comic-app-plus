import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";
const moduleExports = {};
const source = ts.transpileModule(fs.readFileSync("src/lib/bookshelf.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInNewContext(source, { exports: moduleExports });
const series = { id: "test", title: "Test", comic_copies: [
  { id: "ten", volume_number: 10, cover_url: "ten" },
  { id: "five", volume_number: 5, cover_url: "five" },
  { id: "three-b", volume_number: 3, cover_url: "three-b" },
  { id: "three-a", volume_number: 3, cover_url: null },
] };
const summary = moduleExports.summarizeSeries(series);
assert.equal(summary.coverCopy.volume_number, 3, "Use the smallest OWNED volume, even without volume 1");
assert.equal(summary.coverCopy.cover_url, null, "Missing cover must not silently choose another volume");
assert.equal(summary.copyCount, 4, "Count physical duplicate copies");
assert.equal(JSON.stringify(summary.volumes), "[3,5,10]", "Sort volumes numerically and deduplicate display");
assert.equal(series.comic_copies[0].volume_number, 10, "Do not mutate source data");
assert.equal(moduleExports.summarizeSeries({ ...series, comic_copies: [] }).coverCopy, undefined);
console.log("Bookshelf selection tests passed");
