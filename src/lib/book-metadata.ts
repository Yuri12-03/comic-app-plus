import "server-only";
import { findTitleBook } from "./title-search";
import { fetchExternalCover } from "./cover-provider";
import type { BookMetadata } from "./isbn";
export async function fetchBookMetadata(isbn: string): Promise<BookMetadata | null> {
  try {
    const book = await findTitleBook(isbn);
    return book ? { ...book, ...await fetchExternalCover(isbn) } : null;
  } catch { return null; }
}
