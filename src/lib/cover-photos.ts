import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ComicSeries } from "./bookshelf";
import { imageContentType } from "./profile";

export const coverBucket = "comic-cover-photos";
export async function uploadCover(client: SupabaseClient, userId: string, file: File) {
  if (!file.size || file.size > 512 * 1024) throw new Error("表紙写真は512KB以内にしてください。撮り直してお試しください。");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = imageContentType(bytes);
  if (!contentType) throw new Error("JPEG・PNG・WebPの写真を選んでください。");
  const extension = contentType === "image/jpeg" ? "jpg" : contentType === "image/png" ? "png" : "webp";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const result = await client.storage.from(coverBucket).upload(path, bytes, { contentType, upsert: false });
  if (result.error) throw new Error("写真を保存できませんでした。もう一度お試しください。");
  return path;
}

export async function discardUnusedCovers(client: SupabaseClient, paths: string[]) {
  if (!paths.length) return;
  const { data, error } = await client.from("comic_copies").select("cover_path").in("cover_path", paths);
  if (error) return; // Never delete an image if attachment status could not be checked.
  const used = new Set(data.map(item => item.cover_path));
  const unused = paths.filter(path => !used.has(path));
  if (unused.length) await client.storage.from(coverBucket).remove(unused);
}

export async function signComicCovers(client: SupabaseClient, series: ComicSeries[]) {
  const paths = [...new Set(series.flatMap(item => item.comic_copies.map(copy => copy.cover_path).filter((path): path is string => Boolean(path))))];
  if (!paths.length) return series;
  const result = await client.storage.from(coverBucket).createSignedUrls(paths, 3600);
  const urls = new Map(result.data?.map(item => [item.path, item.signedUrl]) ?? []);
  return series.map(item => ({ ...item, comic_copies: item.comic_copies.map(copy => ({ ...copy, cover_url: copy.cover_path ? urls.get(copy.cover_path) || null : copy.cover_url })) }));
}
