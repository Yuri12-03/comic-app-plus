import "server-only";
import { loadUserProfile } from "./profile-server";
import type { FriendConnection } from "./friends";
export async function loadFriends() {
  const { client, user } = await loadUserProfile(true);
  const [codes, connections] = await Promise.all([
    client.from("friend_codes").select("friend_code").eq("user_id",user.id).single(),
    client.rpc("list_friend_connections"),
  ]);
  const friends = await Promise.all(((connections.data ?? []) as FriendConnection[]).map(async friend => {
    if (!friend.avatar_path) return friend;
    const photo = await client.storage.from("profile-photos").createSignedUrl(friend.avatar_path,3600);
    return { ...friend, photoUrl: photo.data?.signedUrl ?? null };
  }));
  return { code: codes.data?.friend_code as string | undefined, friends, failed: Boolean(codes.error || connections.error) };
}
