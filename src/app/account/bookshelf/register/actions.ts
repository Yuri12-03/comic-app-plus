"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { loadBookshelf, requireBookshelfUser } from "@/lib/bookshelf-server";
import { fetchBookMetadata } from "@/lib/book-metadata";
import { inferVolume, normalizeIsbn, safeCoverUrl, type BookMetadata } from "@/lib/isbn";
import { searchSeries } from "@/lib/series-search";
import { searchBooksByTitle } from "@/lib/title-search";
import { discardUnusedCovers, uploadCover } from "@/lib/cover-photos";

export async function lookupTitle(input: string): Promise<{ books?: BookMetadata[]; error?: string }> {
  await requireBookshelfUser();
  const query = input.normalize("NFKC").trim();
  if (query.length < 2 || query.length > 100) return { error: "漫画名を2〜100文字で入力してください。" };
  try {
    const books = await searchBooksByTitle(query);
    return books.length ? { books } : { error: "候補が見つかりませんでした。別の表記や、短い漫画名で検索してください。" };
  } catch { return { error: "検索サービスに接続できませんでした。時間をおいて再度お試しください。" }; }
}

export async function lookupOwnedSeriesRange(seriesId: string, start: number, end: number): Promise<{ books?: BookMetadata[]; error?: string }> {
  const shelf = await loadBookshelf();
  const series = shelf.series.find(item => item.id === seriesId);
  if (shelf.failed || !series) return { error: "追加先の作品を読み込めませんでした。作品詳細からもう一度お試しください。" };
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end > 9999 || end < start || end - start >= 50) return { error: "範囲は1〜9999巻の中から、一度に50冊まで指定してください。" };
  const copy = series.comic_copies.find(item => item.book_title) ?? series.comic_copies[0];
  const title = copy.book_title ? inferVolume(copy.book_title).title : series.title;
  try {
    return { books: await searchSeries(title || series.title, series.author ?? "", copy.publisher ?? "", start, end) };
  } catch { return { error: "巻数の検索サービスに接続できませんでした。時間をおいて再度お試しください。" }; }
}

export async function lookupRange(input: string, start: number, end: number): Promise<{ books?: BookMetadata[]; error?: string }> {
  await requireBookshelfUser();
  const isbn = normalizeIsbn(input);
  if (!isbn || !Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end > 9999 || end < start || end - start >= 50) return { error: "範囲は1〜9999巻の中から、一度に50冊まで指定してください。" };
  try {
    const base = await fetchBookMetadata(isbn);
    if (!base?.seriesTitle) return { error: "作品を特定できません。選択した本を確認してください。" };
    const books = await searchSeries(base.seriesTitle, base.author, base.publisher, start, end);
    if (base.volume && base.volume >= start && base.volume <= end) {
      const index = books.findIndex((book) => book.isbn === base.isbn);
      if (index >= 0) books[index] = base; else books.push(base);
    }
    return { books: books.sort((a,b) => a.volume! - b.volume!) };
  } catch { return { error: "巻数の検索サービスに接続できませんでした。時間をおいて再度お試しください。" }; }
}

export async function registerRange(_state: RegisterState, form: FormData): Promise<RegisterState> {
  const { client, userId } = await requireBookshelfUser();
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
  const paths: string[] = [];
  const photos = books.map(book => form.get(`photo:${normalizeIsbn(book.isbn)}`)).filter((photo): photo is File => photo instanceof File);
  if (photos.reduce((sum, photo) => sum + photo.size, 0) > 2.5 * 1024 * 1024) return { error: "写真の合計が大きいため、登録する巻を分けてください。" };
  try {
    for (const entry of entries) {
      const photo = form.get(`photo:${entry.isbn}`);
      if (photo instanceof File && photo.size) {
        const coverPath = await uploadCover(client, userId, photo); paths.push(coverPath);
        entry.metadata = { ...entry.metadata, ...{ coverPath, coverSource: "表紙写真" } };
      }
    }
  } catch (error) {
    await discardUnusedCovers(client, paths);
    return { error: error instanceof Error ? error.message : "写真を保存できませんでした。" };
  }
  const { data, error } = await client.rpc("register_comic_batch", { p_title: title, p_author: author, p_description: "", p_series_id: seriesId || null, p_allow_duplicate: form.get("allowDuplicate") === "on", p_books: entries });
  await discardUnusedCovers(client, paths);
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
  const { client, userId } = await requireBookshelfUser();
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
  const photo = form.get("photo");
  let coverPath = "";
  if (photo instanceof File && photo.size) {
    try { coverPath = await uploadCover(client, userId, photo); }
    catch (error) { return { error: error instanceof Error ? error.message : "写真を保存できませんでした。" }; }
  }
  const { data, error } = await client.rpc("register_comic", {
    p_isbn: isbn, p_title: title, p_volume: volume, p_author: author, p_description: description,
    p_cover_url: coverUrl, p_metadata: coverPath ? { ...metadata, coverPath, coverSource: "表紙写真" } : metadata, p_series_id: seriesId || null,
    p_allow_duplicate: form.get("allowDuplicate") === "on", p_token: token,
  });
  await discardUnusedCovers(client, coverPath ? [coverPath] : []);
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
