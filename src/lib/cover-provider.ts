import "server-only";
import { normalizeIsbn, safeCoverUrl } from "./isbn";
async function json<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(7000), next: { revalidate: 86400 } });
    return response.ok ? await response.json() as T : null;
  } catch { return null; }
}
// Other providers supply images only; their bibliographic fields are never merged.
export async function fetchExternalCover(isbn: string) {
  const [open, library] = await Promise.all([
    json<({ summary?: { isbn?: string; cover?: string } } | null)[]>(`https://api.openbd.jp/v1/get?isbn=${isbn}`),
    json<Record<string, { cover?: { large?: string; medium?: string }; identifiers?: { isbn_13?: string[]; isbn_10?: string[] } }>>(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`),
  ]);
  const summary = open?.[0]?.summary;
  const openCover = normalizeIsbn(summary?.isbn ?? "") === isbn ? safeCoverUrl(summary?.cover ?? "") : "";
  if (openCover) return { coverUrl: openCover, coverSource: "openBD" };
  const lib = library?.[`ISBN:${isbn}`];
  const libraryCover = [...(lib?.identifiers?.isbn_13 ?? []), ...(lib?.identifiers?.isbn_10 ?? [])].some(id => normalizeIsbn(id) === isbn) ? safeCoverUrl(lib?.cover?.large ?? lib?.cover?.medium ?? "") : "";
  if (libraryCover) return { coverUrl: libraryCover, coverSource: "Open Library" };
  if (process.env.GOOGLE_BOOKS_API_KEY) {
    const data = await json<{ items?: { volumeInfo?: { industryIdentifiers?: { identifier: string }[]; imageLinks?: { thumbnail?: string } } }[] }>(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${encodeURIComponent(process.env.GOOGLE_BOOKS_API_KEY)}`);
    const book = data?.items?.find(item => item.volumeInfo?.industryIdentifiers?.some(id => normalizeIsbn(id.identifier) === isbn));
    const cover = safeCoverUrl(book?.volumeInfo?.imageLinks?.thumbnail ?? "");
    if (cover) return { coverUrl: cover, coverSource: "Google Books" };
  }
  return { coverUrl: `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`, coverSource: "Open Library" };
}
