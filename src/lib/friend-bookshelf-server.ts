import "server-only";
import { notFound } from "next/navigation";
import { loadFriends } from "./friends-server";
import { createClient } from "./supabase/server";
import type { ComicSeries } from "./bookshelf";

export async function loadFriendBookshelf(ownerId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ownerId)) notFound();
  const { friends, failed } = await loadFriends();
  if (failed) return { friend: null, series: [] as ComicSeries[], failed: true };
  const friend = friends.find(item => item.friend_id === ownerId && item.status === "accepted");
  if (!friend) notFound();
  const client = await createClient();
  if (!client) notFound();
  const result = await client.rpc("read_friend_bookshelf", { p_owner: ownerId });
  if (result.error?.message.includes("FRIEND_NOT_FOUND")) notFound();
  return { friend, series: (result.data ?? []) as ComicSeries[], failed: Boolean(result.error) };
}
