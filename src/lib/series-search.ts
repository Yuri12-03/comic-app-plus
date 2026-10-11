import "server-only";
import { XMLParser } from "fast-xml-parser";
import { inferVolume, normalizeIsbn, type BookMetadata } from "./isbn";

const array = (value: unknown): unknown[] => value == null ? [] : Array.isArray(value) ? value : [value];
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" ? value as Record<string, unknown> : {};
const text = (value: unknown): string => typeof value === "string" || typeof value === "number" ? String(value) : text(object(value)["#text"] ?? "");
const key = (value: string) => value.normalize("NFKC").replace(/\s/g, "").toLowerCase();

export function parseSeriesRecords(xml: string, title: string, start: number, end: number): BookMetadata[] {
  const parsed = new XMLParser({ ignoreAttributes: false, parseTagValue: false, processEntities: false }).parse(xml);
  const records = array(parsed?.searchRetrieveResponse?.records?.record);
  const found = new Map<string, BookMetadata>();
  const quality = new Map<string, number>();
  for (const record of records) {
    const resources = array(object(object(object(record).recordData)["rdf:RDF"])["dcndl:BibResource"]);
    for (const resource of resources) {
      const item = object(resource);
      const rawTitle = text(object(object(item["dc:title"])["rdf:Description"])["rdf:value"]) || text(item["dcterms:title"]);
      const seriesTitle = inferVolume(rawTitle).title;
      if (!seriesTitle || (title && key(seriesTitle) !== key(title))) continue;
      const rawVolume = text(object(object(item["dcndl:volume"])["rdf:Description"])["rdf:value"]) || text(item["dcndl:volume"]);
      const identifiers = array(item["dcterms:identifier"]).filter(id => text(object(id)["@_rdf:datatype"]).endsWith("/ISBN"));
      const isbns = [...new Set(identifiers.map(id => normalizeIsbn(text(id))).filter((isbn): isbn is string => Boolean(isbn)))];
      // A multi-volume catalogue can attach several ISBNs to its first-volume title.
      // It cannot reliably describe one physical volume, so do not use it for registration.
      if (isbns.length !== 1) continue;
      const volume = inferVolume(rawTitle, rawVolume).volume ?? inferVolume(text(item["dcterms:title"])).volume;
      if (title ? !volume || volume < start || volume > end : volume !== null && (volume < start || volume > end)) continue;
      const publisher = text(object(object(item["dcterms:publisher"])["foaf:Agent"])["foaf:name"]);
      for (const isbn of isbns) {
        const nationalRecord = `${text(object(record).recordIdentifier)} ${text(item["@_rdf:about"])}`.includes("R100000002");
        const score = (volume !== null ? 10 : 0) + (rawVolume ? 2 : 0) + (nationalRecord ? 20 : 0);
        if (found.has(isbn) && (quality.get(isbn) ?? 0) >= score) continue;
        quality.set(isbn, score);
        found.set(isbn, { isbn, seriesTitle, volume, bookTitle: text(item["dcterms:title"]) || rawTitle, author: array(item["dc:creator"]).map(text).join("、"), publisher, publishedDate: text(item["dcterms:date"]) || text(item["dcterms:issued"]), description: array(item["dcterms:abstract"]).map(text).join("\n").replace(/<[^>]*>/g, "").slice(0, 5000), coverUrl: `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`, source: "国立国会図書館", coverSource: "Open Library" });
      }
    }
  }
  return [...found.values()].sort((a, b) => a.volume! - b.volume! || a.isbn.localeCompare(b.isbn));
}

export async function searchSeries(title: string, author: string, publisher: string, start: number, end: number): Promise<BookMetadata[]> {
  // Only public bibliographic labels are sent; quote CQL metacharacters.
  const quote = (value: string) => value.replace(/["\\]/g, " ").trim();
  const authorName = author.split(/[,、\s]/)[0];
  const query = `title="${quote(title)}"${authorName ? ` AND creator="${quote(authorName)}"` : ""}${publisher ? ` AND publisher="${quote(publisher)}"` : ""}`;
  const params = new URLSearchParams({ operation: "searchRetrieve", recordSchema: "dcndl", recordPacking: "xml", maximumRecords: "500", query });
  const response = await fetch(`https://ndlsearch.ndl.go.jp/api/sru?${params}`, { signal: AbortSignal.timeout(45000), next: { revalidate: 86400 } });
  if (!response.ok) throw new Error("SEARCH_UNAVAILABLE");
  const xml = await response.text();
  if (xml.includes("<diagnostics>")) throw new Error("SEARCH_UNAVAILABLE");
  return parseSeriesRecords(xml, title, start, end);
}
