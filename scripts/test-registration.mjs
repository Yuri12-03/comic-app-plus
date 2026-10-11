import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import zxing from "@zxing/library";
import { XMLParser } from "fast-xml-parser";

function load(path, imports = {}, extra = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports, URL, require: (id) => imports[id] ?? {}, ...extra });
  return exports;
}
const isbn = load("src/lib/isbn.ts");
const defaults = load("src/lib/cover-defaults.ts");
const candidates = [
  { volume: 1, isbn: "missing", coverUrl: "https://covers.test/missing" },
  { volume: 1, isbn: "available", coverUrl: "https://covers.test/available" },
  { volume: 2, isbn: "single", coverUrl: "" },
  { volume: 3, isbn: "failed-a", coverUrl: "https://covers.test/missing" },
  { volume: 3, isbn: "failed-b", coverUrl: "" },
];
const checked = [];
const chosen = await defaults.selectCoverDefaults(candidates, 1, 4, async url => { checked.push(url); return url.endsWith("/available"); });
assert.equal(chosen[1], "available");
assert.equal(chosen[2], "single");
assert.equal(chosen[3], undefined);
assert.equal(chosen[4], undefined);
assert.equal(checked.filter(url => url.endsWith("/missing")).length, 1);
const stable = await defaults.selectCoverDefaults(candidates.slice(0, 2), 1, 1, async () => true);
assert.equal(stable[1], "missing");
assert.equal(isbn.normalizeIsbn("978-4-08-872509-3"), "9784088725093");
assert.equal(isbn.normalizeIsbn("４０８８７２５０９３"), "9784088725093");
assert.equal(isbn.normalizeIsbn("080442957X"), "9780804429573");
assert.equal(isbn.normalizeIsbn("9784088725094"), null);
assert.equal(isbn.normalizeIsbn("1929979003904"), null);
assert.equal(isbn.normalizeIsbn("9784088725093<script>"), null);
assert.equal(isbn.inferVolume("One piece 巻1").title, "One piece");
assert.equal(isbn.inferVolume("One piece 巻2 (Versus!!バギー海賊団)").volume, 2);
assert.equal(isbn.inferVolume("One piece 巻2 (Versus!!バギー海賊団)").title, "One piece");
assert.equal(isbn.inferVolume("ONE PIECE （１０）").volume, 10);
assert.equal(isbn.inferVolume("20世紀少年").volume, null);
assert.equal(isbn.inferVolume("作品", "3").volume, 3);
assert.equal(isbn.inferVolume("作品", "巻十二").volume, 12);
assert.equal(isbn.inferVolume("作品", "巻2 (副題)").volume, 2);
assert.equal(isbn.inferVolume("作品 第百二十三巻").volume, 123);
assert.equal(isbn.inferVolume("作品", "1-6").volume, null);
assert.equal(isbn.inferVolume("作品 Vol. 10").volume, 10);
const search = load("src/lib/series-search.ts", { "./isbn": isbn, "fast-xml-parser": { XMLParser } });
const record = (title, volume, id, datatype = "ISBN") => `<record><recordData><rdf:RDF><dcndl:BibResource><dc:title><rdf:Description><rdf:value>${title}</rdf:value></rdf:Description></dc:title><dcndl:volume><rdf:Description><rdf:value>${volume}</rdf:value></rdf:Description></dcndl:volume><dcterms:identifier rdf:datatype="http://ndl.go.jp/dcndl/terms/${datatype}">${id}</dcterms:identifier></dcndl:BibResource></rdf:RDF></recordData></record>`;
const fixture = `<searchRetrieveResponse><records>${record("ONE PIECE", "巻一", "4-08-872509-3")}${record("ONE PIECE", "巻2 (副題)", "9784088725444")}${record("ONE PIECE", "巻3", "9784088725697", "SetISBN")}${record("ONE PIECE 関連本", "巻3", "9784088725697")}${record("ONE PIECE", "巻2", "9784088725444")}</records></searchRetrieveResponse>`;
const parsed = search.parseSeriesRecords(fixture, "One piece", 1, 2);
assert.equal(parsed.length, 2);
assert.equal(parsed[0].isbn, "9784088725093");
assert.equal(parsed[1].volume, 2);
const incomplete = record("ONE PIECE", "", "9784088725444");
const correct = record("ONE PIECE", "巻2", "9784088725444");
const better = search.parseSeriesRecords(`<searchRetrieveResponse><records>${incomplete}${correct}</records></searchRetrieveResponse>`, "", 1, 9999);
assert.equal(better[0].volume, 2, "Prefer explicit volume metadata over an incomplete duplicate ISBN record");
const combined = record("ONE PIECE", "巻1", "9784088725093").replace('</dcndl:BibResource>', '<dcterms:identifier rdf:datatype="http://ndl.go.jp/dcndl/terms/ISBN">9784088725444</dcterms:identifier></dcndl:BibResource>');
assert.equal(search.parseSeriesRecords(`<searchRetrieveResponse><records>${combined}${correct}</records></searchRetrieveResponse>`, "", 1, 9999).length, 1, "Ignore ambiguous catalogue records that associate different volumes' ISBNs with the first-volume title");
const titleSearch = load("src/lib/title-search.ts", { "./series-search": search });
const titleFixture = `<searchRetrieveResponse><records>${record("ONE PIECE", "巻2", "9784088725444")}${record("ONE PIECE", "巻一", "9784088725093")}${record("別の漫画", "巻3", "9784088725697")}${record("ONE PIECE", "巻一", "9784088725093")}</records></searchRetrieveResponse>`;
const titleResults = titleSearch.titleCandidates(titleFixture, "one piece");
assert.equal(titleResults.length, 2, "Collapse volumes into one candidate per series");
assert.equal(titleResults[0].seriesTitle, "ONE PIECE", "Exact title precedes partial or related titles");
assert.equal(titleResults[0].volume, 1, "Use the smallest found volume for the candidate");
assert.equal(titleResults[0].isbn, "9784088725093");
const separateEditions = titleFixture.replace('<dcndl:BibResource>', '<dcndl:BibResource><dcterms:publisher><foaf:Agent><foaf:name>新装版出版社</foaf:name></foaf:Agent></dcterms:publisher>');
assert.equal(titleSearch.titleCandidates(separateEditions, "ONE PIECE").length, 3, "Different publishers stay separate");
assert.equal(titleSearch.titleCandidates("<searchRetrieveResponse/>", "unknown").length, 0);
assert.equal(titleSearch.titleCandidates(`<searchRetrieveResponse><records>${record("読み切り作品", "", "9784088725093")}</records></searchRetrieveResponse>`, "読み切り作品")[0].volume, null, "Allow single-volume candidates with no volume metadata");
assert.equal(isbn.safeCoverUrl("javascript:alert(1)"), "");
assert.equal(isbn.safeCoverUrl("https://user:password@example.com/a.jpg"), "");

const book = { summary: { isbn: "9784088725093", title: "Wrong external title", author: "Wrong author", publisher: "Wrong publisher", cover: "" } };
const fetchMock = async (url) => ({ ok: true, json: async () => url.includes("openbd") ? [book] : { "ISBN:9784088725093": { title: "Wrong title", identifiers: { isbn_13: ["9784088725093"] }, cover: { large: "http://covers.openlibrary.org/b/id/123-L.jpg" } } } });
const covers = load("src/lib/cover-provider.ts", { "./isbn": isbn }, { fetch: fetchMock, AbortSignal, process: { env: {} } });
const ndlBook = { ...parsed[0], author: "NDL author", publisher: "NDL publisher", description: "NDL description" };
const metadata = load("src/lib/book-metadata.ts", { "./title-search": { findTitleBook: async () => ndlBook }, "./cover-provider": covers });
const result = await metadata.fetchBookMetadata("9784088725093");
assert.equal(result.seriesTitle, "ONE PIECE");
assert.equal(result.volume, 1);
assert.equal(result.author, "NDL author");
assert.equal(result.publisher, "NDL publisher");
assert.equal(result.description, "NDL description");
assert.equal(result.source, "国立国会図書館");
assert.equal(result.coverSource, "Open Library");
assert.equal(result.coverUrl, "https://covers.openlibrary.org/b/id/123-L.jpg");
const missing = load("src/lib/book-metadata.ts", { "./title-search": { findTitleBook: async () => null }, "./cover-provider": covers });
assert.equal(await missing.fetchBookMetadata("9784088725093"), null, "Never substitute other services' book information when NDL is missing");
const failed = load("src/lib/book-metadata.ts", { "./title-search": { findTitleBook: async () => { throw new Error("offline"); } }, "./cover-provider": covers });
assert.equal(await failed.fetchBookMetadata("9784088725093"), null);
const wrongCover = load("src/lib/cover-provider.ts", { "./isbn": isbn }, { fetch: async () => ({ ok: true, json: async () => [{ summary: { isbn: "9784088725444", cover: "https://wrong.example/cover.jpg" } }] }), AbortSignal, process: { env: {} } });
assert.equal((await wrongCover.fetchExternalCover("9784088725093")).coverUrl.includes("wrong.example"), false);

// Generate a readable EAN-13 fixture and verify decoding with the scanner library.
const left = ["0001101","0011001","0010011","0111101","0100011","0110001","0101111","0111011","0110111","0001011"];
const parity = ["LLLLLL","LLGLGG","LLGGLG","LLGGGL","LGLLGG","LGGLLG","LGGGLL","LGLGLG","LGLGGL","LGGLGL"];
const code = "9784088725093";
let bits = "101";
for (let i = 1; i < 7; i++) { const pattern = left[Number(code[i])]; bits += parity[Number(code[0])][i - 1] === "L" ? pattern : [...pattern].reverse().map((bit) => bit === "0" ? "1" : "0").join(""); }
bits += "01010";
for (let i = 7; i < 13; i++) bits += [...left[Number(code[i])]].map((bit) => bit === "0" ? "1" : "0").join("");
bits += "101";
const width = (bits.length + 24) * 4, height = 180;
const pixels = new Uint8ClampedArray(width * height).fill(255);
const bars = [];
for (let i = 0; i < bits.length; i++) if (bits[i] === "1") {
  bars.push(`<rect x="${(i + 12) * 4}" y="12" width="4" height="140"/>`);
  for (let y = 12; y < 152; y++) for (let x = (i + 12) * 4; x < (i + 13) * 4; x++) pixels[y * width + x] = 0;
}
const { MultiFormatReader, RGBLuminanceSource, BinaryBitmap, HybridBinarizer, DecodeHintType, BarcodeFormat } = zxing;
const reader = new MultiFormatReader();
reader.setHints(new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13]]]));
assert.equal(reader.decode(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(pixels, width, height)))).getText(), code);
fs.mkdirSync("scripts/fixtures", { recursive: true });
fs.writeFileSync("scripts/fixtures/isbn-barcode.svg", `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="white"/><g fill="black">${bars.join("")}</g><text x="${width / 2}" y="174" text-anchor="middle" font-family="sans-serif" font-size="18">${code}</text></svg>`);
console.log("ISBN validation, NDL-only metadata, external covers, and EAN-13 decoding tests passed");
