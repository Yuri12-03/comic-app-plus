"use server";
import { revalidatePath } from "next/cache";
import { requireBookshelfUser } from "@/lib/bookshelf-server";
import { coverBucket, discardUnusedCovers, uploadCover } from "@/lib/cover-photos";

export async function saveCoverPhoto(form: FormData): Promise<{ url?: string; error?: string }> {
  const { client, userId } = await requireBookshelfUser();
  const copyId = String(form.get("copyId") ?? "");
  const photo = form.get("photo");
  if (!/^[0-9a-f-]{36}$/i.test(copyId) || !(photo instanceof File)) return { error: "写真を選び直してください。" };
  // Own-copy RLS must succeed before accepting or uploading any image.
  const own = await client.from("comic_copies").select("id,series_id").eq("id", copyId).maybeSingle();
  if (own.error || !own.data) return { error: "この本の表紙を変更できません。" };
  let path = "";
  try {
    path = await uploadCover(client, userId, photo);
    const result = await client.rpc("set_comic_cover_photo", { p_copy: copyId, p_path: path });
    if (result.error) throw new Error("写真を登録できませんでした。もう一度お試しください。");
    if (typeof result.data === "string" && result.data !== path) await discardUnusedCovers(client, [result.data]);
    const signed = await client.storage.from(coverBucket).createSignedUrl(path, 3600);
    revalidatePath("/account/bookshelf");
    revalidatePath(`/account/bookshelf/${own.data.series_id}`);
    revalidatePath("/account/friends", "layout");
    return signed.data?.signedUrl ? { url: signed.data.signedUrl } : { error: "写真は保存しました。ページを再読み込みしてください。" };
  } catch (error) {
    if (path) await discardUnusedCovers(client, [path]);
    return { error: error instanceof Error ? error.message : "写真を保存できませんでした。" };
  }
}
