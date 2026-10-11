import "server-only";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "./profile";
import { friendReturnPath } from "./friends";

export async function loadUserProfile(enforceOnboarding = false, returnTo?: string) {
  await connection();
  const client = await createClient();
  if (!client) redirect("/login");
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) redirect("/login");
  const result = await client.from("user_profiles").select("id,display_name,avatar_kind,avatar_preset,avatar_path").eq("id", data.user.id).maybeSingle();
  const profile = result.data as UserProfile | null;
  if (enforceOnboarding && data.user.user_metadata?.profile_setup_required === true && !profile) {
    const next = friendReturnPath(returnTo ?? "");
    redirect(`/account/onboarding${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  }
  let photoUrl: string | null = null;
  if (profile?.avatar_kind === "photo" && profile.avatar_path) {
    const signed = await client.storage.from("profile-photos").createSignedUrl(profile.avatar_path, 3600);
    photoUrl = signed.data?.signedUrl ?? null;
  }
  return { client, user: data.user, profile, photoUrl, failed: Boolean(result.error) };
}
