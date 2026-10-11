"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBookshelfUser } from "@/lib/bookshelf-server";
import { fetchBookMetadata } from "@/lib/book-metadata";
import { normalizeIsbn, safeCoverUrl, type BookMetadata } from "@/lib/isbn";
import { searchSeries } from "@/lib/series-search";

export async function lookupRange(input: string, start: number, end: number): Promise<{ books?: BookMetadata[]; error?: string }> {
  await requireBookshelfUser();
  const isbn = normalizeIsbn(input);
  if (!isbn || !Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end > 9999 || end < start || end - start >= 50) return { error: "範囲は1〜9999巻の中から、一度に50冊まで指定してください。" };
  const base = await fetchBookMetadata(isbn);
  if (!base?.seriesTitle) return { error: "作品を特定できません。最初のISBNを確認してください。" };
  try {
    const books = await searchSeries(base.seriesTitle, base.author, base.publisher, start, end);
    if (base.volume && base.volume >= start && base.volume <= end) {
      const index = books.findIndex((book) => book.isbn === base.isbn);
      if (index >= 0) books[index] = base; else books.push(base);
    }
    return { books: books.sort((a,b) => a.volume! - b.volume!) };
  } catch { return { error: "巻数の検索サービスに接続できませんでした。時間をおいて再度お試しください。" }; }
}

export async function registerRange(_state: RegisterState, form: FormData): Promise<RegisterState> {
  const { client } = await requireBookshelfUser();
  const title = String(form.get("title") ?? "").normalize("NFKC").trim();
  const author = String(form.get("author") ?? "").trim();
  const seriesId = String(form.get("seriesId") ?? "");
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let books: { isbn: string; volume: number; token: string }[];
  try { books = JSON.parse(String(form.get("books") ?? "")); } catch { return { error: "追加する巻を選び直してください。" }; }
  if (!title || title.length > 200 || author.length > 500 || (seriesId && !uuid.test(seriesId)) || !Array.isArray(books) || books.length < 1 || books.length > 50 || books.some((book) => !book || typeof book.isbn !== "string" || !normalizeIsbn(book.isbn) || !Number.isInteger(book.volume) || book.volume < 1 || book.volume > 9999 || !uuid.test(book.token)) || new Set(books.map(book => normalizeIsbn(book.isbn))).size !== books.length || new Set(books.map(book => book.volume)).size !== books.length) return { error: "作品名と、各巻の選択を確認してください。" };
  const entries = await Promise.all(books.map(async book => {
    const isbn = normalizeIsbn(book.isbn)!;
    const metadata = await fetchBookMetadata(isbn);
    return { isbn, volume: book.volume, token: book.token, coverUrl: metadata?.coverUrl || `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`, metadata: metadata ?? { isbn, bookTitle: `${title} ${book.volume}巻`, seriesTitle: title, volume: book.volume, author, source: "利用者確認", publisher: "", publishedDate: "", description: "", coverUrl: "", coverSource: "" } };
  }));
  const { data, error } = await client.rpc("register_comic_batch", { p_title: title, p_author: author, p_description: "", p_series_id: seriesId || null, p_allow_duplicate: form.get("allowDuplicate") === "on", p_books: entries });
  if (error) {
    if (error.message.includes("DUPLICATE_ISBN")) return { error: "すでに登録されているISBNがあります。追加の実物を持っている場合のみ、下のチェックを入れてください。まだ保存は行われていません。", duplicate: true };
    return { error: "まとめて保存できませんでした。内容を保持していますので、時間をおいて再度お試しください。" };
  }
  revalidatePath("/account/bookshelf"); revalidatePath("/account");
  redirect(`/account/bookshelf/${data}?registered=1`);
}

export async function lookupIsbn(input: string): Promise<{ book?: BookMetadata; error?: string }> {
  await requireBookshelfUser();
  const isbn = normalizeIsbn(input);
  if (!isbn) return { error: "ISBNを確認してください。978・979から始まる13桁、または10桁のISBNを入力できます。" };
  const book = await fetchBookMetadata(isbn);
  if (book) return { book };
  return { book: { isbn, bookTitle: "", seriesTitle: "", volume: null, author: "", publisher: "", publishedDate: "", description: "", coverUrl: "", source: "手入力", coverSource: "" }, error: "情報が見つからないか、書誌サービスに接続できませんでした。必要な情報を入力して登録できます。" };
}

export type RegisterState = { error?: string; duplicate?: boolean };
export async function registerComic(_state: RegisterState, form: FormData): Promise<RegisterState> {
  const { client } = await requireBookshelfUser();
  const isbn = normalizeIsbn(String(form.get("isbn") ?? ""));
  const title = String(form.get("title") ?? "").normalize("NFKC").trim();
  const author = String(form.get("author") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const rawVolume = String(form.get("volume") ?? "");
  const volume = Number(rawVolume);
  const rawCover = String(form.get("coverUrl") ?? "").trim();
  const coverUrl = safeCoverUrl(rawCover);
  const token = String(form.get("token") ?? "");
  const seriesId = String(form.get("seriesId") ?? "");
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!isbn || !title || title.length > 200 || !/^\d+$/.test(rawVolume) || !Number.isInteger(volume) || volume < 1 || volume > 9999 || author.length > 500 || description.length > 5000 || !uuid.test(token) || (seriesId && !uuid.test(seriesId)) || (rawCover && !coverUrl))
    return { error: "作品名・巻数・ISBN・表紙URLの入力を確認してください。" };
  // Preserve original provider metadata separately from the user's shelf labels.
  const original = await fetchBookMetadata(isbn);
  const metadata: BookMetadata = original ?? { isbn, bookTitle: String(form.get("bookTitle") ?? "").slice(0, 500) || title, seriesTitle: title, volume, author, description, coverUrl, publisher: String(form.get("publisher") ?? "").slice(0, 200), publishedDate: String(form.get("publishedDate") ?? "").slice(0, 100), source: "手入力・確認済み", coverSource: "" };
  const { data, error } = await client.rpc("register_comic", {
    p_isbn: isbn, p_title: title, p_volume: volume, p_author: author, p_description: description,
    p_cover_url: coverUrl, p_metadata: metadata, p_series_id: seriesId || null,
    p_allow_duplicate: form.get("allowDuplicate") === "on", p_token: token,
  });
  if (error) {
    if (error.message.includes("DUPLICATE_ISBN")) return { error: "同じISBNの漫画が、すでに本棚にあります。もう1冊持っている場合は、チェックを入れて登録してください。", duplicate: true };
    if (error.message.includes("SERIES_NOT_FOUND")) return { error: "追加先の作品が見つかりません。追加先を選び直してください。" };
    console.error("Comic registration failed", { code: error.code });
    return { error: "保存できませんでした。入力はそのまま、時間をおいてもう一度お試しください。" };
  }
  revalidatePath("/account/bookshelf");
  revalidatePath("/account");
  redirect(`/account/bookshelf/${data}?registered=1`);
}
