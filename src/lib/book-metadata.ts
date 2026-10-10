import "server-only";
import { inferVolume, normalizeIsbn, safeCoverUrl, type BookMetadata } from "./isbn";

type OpenBook = { summary?: { isbn?: string; title?: string; volume?: string; author?: string; publisher?: string; pubdate?: string; cover?: string }; onix?: { CollateralDetail?: { TextContent?: { Text?: string }[] } } };
type LibraryBook = { title?: string; subtitle?: string; authors?: { name: string }[]; publishers?: { name: string }[]; publish_date?: string; cover?: { large?: string; medium?: string }; identifiers?: { isbn_13?: string[]; isbn_10?: string[] } };
type GoogleBook = { volumeInfo?: { title?: string; authors?: string[]; publisher?: string; publishedDate?: string; description?: string; imageLinks?: { thumbnail?: string }; industryIdentifiers?: { identifier: string }[] } };

async function json<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(7000), cache: "no-store", headers: { "User-Agent": "ComicAppPlus/1.0 (ISBN lookup)" } });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch { return null; }
}

export async function fetchBookMetadata(isbn: string): Promise<BookMetadata | null> {
  const [open, library] = await Promise.all([
    json<(OpenBook | null)[]>(`https://api.openbd.jp/v1/get?isbn=${isbn}`),
    json<Record<string, LibraryBook>>(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`),
  ]);
  const summary = open?.[0]?.summary;
  const lib = library?.[`ISBN:${isbn}`];
  const validOpen = summary?.title && normalizeIsbn(summary.isbn ?? "") === isbn;
  const validLib = lib?.title && [...(lib.identifiers?.isbn_13 ?? []), ...(lib.identifiers?.isbn_10 ?? [])].some((value) => normalizeIsbn(value) === isbn);
  let google: GoogleBook["volumeInfo"];
  if ((!validOpen && !validLib) && process.env.GOOGLE_BOOKS_API_KEY) {
    const data = await json<{ items?: GoogleBook[] }>(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${encodeURIComponent(process.env.GOOGLE_BOOKS_API_KEY)}`);
    google = data?.items?.find((book) => book.volumeInfo?.industryIdentifiers?.some((id) => normalizeIsbn(id.identifier) === isbn))?.volumeInfo;
  }
  if (!validOpen && !validLib && !google?.title) return null;
  const title = validOpen ? summary!.title! : validLib ? lib!.title! : google!.title!;
  const inferred = inferVolume(title, validOpen ? summary?.volume : undefined);
  const openCover = validOpen ? safeCoverUrl(summary?.cover ?? "") : "";
  const libraryCover = validLib ? safeCoverUrl(lib?.cover?.large ?? lib?.cover?.medium ?? "") : "";
  const googleCover = safeCoverUrl(google?.imageLinks?.thumbnail ?? "");
  return {
    isbn, bookTitle: title.slice(0, 500), seriesTitle: inferred.title.slice(0, 200), volume: inferred.volume,
    author: (validOpen ? summary?.author : validLib ? lib?.authors?.map((author) => author.name).join("、") : google?.authors?.join("、") ?? "")?.slice(0, 500) ?? "",
    publisher: (validOpen ? summary?.publisher : validLib ? lib?.publishers?.map((publisher) => publisher.name).join("、") : google?.publisher ?? "")?.slice(0, 200) ?? "",
    publishedDate: (validOpen ? summary?.pubdate : validLib ? lib?.publish_date : google?.publishedDate ?? "")?.slice(0, 100) ?? "",
    description: (validOpen ? open?.[0]?.onix?.CollateralDetail?.TextContent?.[0]?.Text : google?.description ?? lib?.subtitle ?? "")?.replace(/<[^>]*>/g, "").slice(0, 5000) ?? "",
    coverUrl: openCover || libraryCover || googleCover,
    source: validOpen ? "openBD" : validLib ? "Open Library" : "Google Books",
    coverSource: openCover ? "openBD" : libraryCover ? "Open Library" : googleCover ? "Google Books" : "",
  };
}
