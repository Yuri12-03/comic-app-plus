import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import zxing from "@zxing/library";

function load(path, imports = {}, extra = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports, URL, require: (id) => imports[id] ?? {}, ...extra });
  return exports;
}
const isbn = load("src/lib/isbn.ts");
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
assert.equal(isbn.safeCoverUrl("javascript:alert(1)"), "");
assert.equal(isbn.safeCoverUrl("https://user:password@example.com/a.jpg"), "");

const book = { summary: { isbn: "9784088725093", title: "One piece 巻1", author: "尾田栄一郎", publisher: "集英社", cover: "" } };
const fetchMock = async (url) => ({ ok: true, json: async () => url.includes("openbd") ? [book] : { "ISBN:9784088725093": { title: "ONE PIECE 1", identifiers: { isbn_13: ["9784088725093"] }, cover: { large: "http://covers.openlibrary.org/b/id/123-L.jpg" } } } });
const metadata = load("src/lib/book-metadata.ts", { "./isbn": isbn }, { fetch: fetchMock, AbortSignal, process: { env: {} } });
const result = await metadata.fetchBookMetadata("9784088725093");
assert.equal(result.seriesTitle, "One piece");
assert.equal(result.volume, 1);
assert.equal(result.coverSource, "Open Library");
assert.equal(result.coverUrl, "https://covers.openlibrary.org/b/id/123-L.jpg");
const mismatch = load("src/lib/book-metadata.ts", { "./isbn": isbn }, { fetch: async () => ({ ok: true, json: async () => [{ summary: { isbn: "9784088725444", title: "Wrong book" } }] }), AbortSignal, process: { env: {} } });
assert.equal(await mismatch.fetchBookMetadata("9784088725093"), null);
const failed = load("src/lib/book-metadata.ts", { "./isbn": isbn }, { fetch: async () => { throw new Error("offline"); }, AbortSignal, process: { env: {} } });
assert.equal(await failed.fetchBookMetadata("9784088725093"), null);

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
console.log("ISBN validation, metadata fallback, and EAN-13 decoding tests passed");
