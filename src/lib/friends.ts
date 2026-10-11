import type { AvatarPreset } from "./profile";
export function normalizeFriendCode(input: string) {
  const code = input.normalize("NFKC").replace(/[\s-]/g, "").toUpperCase();
  return /^[A-F0-9]{16}$/.test(code) ? code : null;
}
export function formatFriendCode(code: string) { return code.match(/.{1,4}/g)?.join("-") ?? code; }
export function friendReturnPath(input: string) {
  try {
    if (!input.startsWith("/account/friends/add?")) return null;
    const url = new URL(input, "https://comic-app-plus.vercel.app");
    const code = normalizeFriendCode(url.searchParams.get("code") ?? "");
    return code && url.pathname === "/account/friends/add" ? `/account/friends/add?code=${code}` : null;
  } catch { return null; }
}
export function parseFriendQr(input: string) {
  const direct = normalizeFriendCode(input); if (direct) return direct;
  try {
    const url = new URL(input);
    if (url.origin !== "https://comic-app-plus.vercel.app" || url.username || url.password || url.pathname !== "/account/friends/add") return null;
    return normalizeFriendCode(url.searchParams.get("code") ?? "");
  } catch { return null; }
}
export type FriendCandidate = { user_id: string; display_name: string; avatar_preset: AvatarPreset; code: string };
export type FriendConnection = { connection_id: string; friend_id: string; friend_code: string; display_name: string; avatar_preset: AvatarPreset; avatar_path: string | null; status: "pending" | "accepted" | "declined"; incoming: boolean; photoUrl?: string | null };
