import "server-only";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ComicSeries } from "./bookshelf";

export async function requireBookshelfUser() {
  await connection();
  const client = await createClient();
  if (!client) redirect("/login");
  const { data, error } = await client.auth.getClaims();
  if (error || !data?.claims?.sub) redirect("/login");
  return { client, userId: String(data.claims.sub) };
}

export async function loadBookshelf() {
  const { client, userId } = await requireBookshelfUser();
  const shelf = await client.from("bookshelves").select("id").eq("owner_id", userId).maybeSingle();
  if (shelf.error) return { series: [] as ComicSeries[], failed: true };
  if (!shelf.data) return { series: [] as ComicSeries[], failed: false };
  const result = await client.from("comic_series")
    .select("id,title,author,description,comic_copies(id,volume_number,isbn,cover_url,book_title,publisher,published_date,metadata_source)")
    .eq("bookshelf_id", shelf.data.id).order("title");
  if (result.error) return { series: [] as ComicSeries[], failed: true };
  return { series: (result.data as ComicSeries[]).filter((series) => series.comic_copies.length > 0), failed: false };
}
