"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { loadUserProfile } from "@/lib/profile-server";
import { imageContentType, isAvatarPreset, validDisplayName } from "@/lib/profile";
import { friendReturnPath } from "@/lib/friends";
export type ProfileState = { error?: string };
export async function saveProfile(onboarding: boolean, _previous: ProfileState, form: FormData): Promise<ProfileState> {
  const { client, user, profile, failed } = await loadUserProfile();
  if (failed) return { error: "ユーザー情報を確認できませんでした。時間をおいて再度お試しください。" };
  const displayName = String(form.get("displayName") ?? "").normalize("NFKC").trim();
  const kind = String(form.get("avatarKind") ?? "");
  const preset = String(form.get("avatarPreset") ?? "cat");
  if (!validDisplayName(displayName)) return { error: "ユーザーネームは1〜30文字で入力してください。" };
  if (!["preset", "photo"].includes(kind) || !isAvatarPreset(preset)) return { error: "アイコンを選び直してください。" };
  let path = kind === "photo" ? profile?.avatar_path ?? null : null;
  let uploaded: string | null = null;
  const file = form.get("photo");
  if (kind === "photo" && file instanceof File && file.size > 0) {
    if (file.size > 512 * 1024) return { error: "写真が大きすぎます。選び直してください。" };
    const bytes = new Uint8Array(await file.arrayBuffer());
    const contentType = imageContentType(bytes);
    if (!contentType) return { error: "JPEG・PNG・WebPの写真を選んでください。" };
    const extension = contentType === "image/jpeg" ? "jpg" : contentType === "image/png" ? "png" : "webp";
    path = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error } = await client.storage.from("profile-photos").upload(path, bytes, { contentType, upsert: false });
    if (error) return { error: "写真を保存できませんでした。選択内容はそのまま、もう一度お試しください。" };
    uploaded = path;
  }
  if (kind === "photo" && !path) return { error: "写真を選択するか、デフォルトアイコンを選んでください。" };
  const { error } = await client.from("user_profiles").upsert({ id: user.id, display_name: displayName, avatar_kind: kind, avatar_preset: preset, avatar_path: path });
  if (error) {
    if (uploaded) await client.storage.from("profile-photos").remove([uploaded]);
    return { error: "ユーザー情報を保存できませんでした。時間をおいて再度お試しください。" };
  }
  if (profile?.avatar_path && profile.avatar_path !== path) await client.storage.from("profile-photos").remove([profile.avatar_path]);
  revalidatePath("/account");
  revalidatePath("/account/settings/profile");
  redirect(onboarding ? friendReturnPath(String(form.get("next") ?? "")) ?? "/account" : "/account/settings/profile?saved=1");
}
