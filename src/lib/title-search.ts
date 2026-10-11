import "server-only";
import { parseSeriesRecords } from "./series-search";
import { fetchBookMetadata } from "./book-metadata";
import type { BookMetadata } from "./isbn";

const key = (value: string) => value.normalize("NFKC").replace(/\s/g, "").toLowerCase();
export function titleCandidates(xml: string, query: string): BookMetadata[] {
  const groups = new Map<string, BookMetadata>();
  for (const book of parseSeriesRecords(xml, "", 1, 9999)) {
    const group = JSON.stringify([key(book.seriesTitle), key(book.author), key(book.publisher)]);
    const previous = groups.get(group);
    if (!previous || (book.volume ?? 1) < (previous.volume ?? 1)) groups.set(group, book);
  }
  return [...groups.values()].sort((a, b) => Number(key(b.seriesTitle) === key(query)) - Number(key(a.seriesTitle) === key(query)) || a.seriesTitle.localeCompare(b.seriesTitle, "ja")).slice(0, 12);
}
async function searchXml(query: string) {
  const params = new URLSearchParams({ operation: "searchRetrieve", recordSchema: "dcndl", recordPacking: "xml", maximumRecords: "200", query });
  const response = await fetch(`https://ndlsearch.ndl.go.jp/api/sru?${params}`, { signal: AbortSignal.timeout(20000), next: { revalidate: 86400 } });
  if (!response.ok) throw new Error("SEARCH_UNAVAILABLE");
  const xml = await response.text();
  if (xml.includes("<diagnostics>")) throw new Error("SEARCH_UNAVAILABLE");
  return xml;
}
export async function searchBooksByTitle(input: string): Promise<BookMetadata[]> {
  const query = input.normalize("NFKC").trim();
  const escaped = query.replace(/["\\]/g, " ");
  const candidates = titleCandidates(await searchXml(`title="${escaped}"`), query);
  return Promise.all(candidates.map(async candidate => {
    const extra = await fetchBookMetadata(candidate.isbn);
    return { ...candidate, description: extra?.description ?? "", coverUrl: extra?.coverUrl || candidate.coverUrl, coverSource: extra?.coverSource || candidate.coverSource };
  }));
}
export async function findTitleBook(isbn: string): Promise<BookMetadata | null> {
  const books = parseSeriesRecords(await searchXml(`isbn="${isbn}"`), "", 1, 9999);
  return books.find(book => book.isbn === isbn) ?? null;
}
