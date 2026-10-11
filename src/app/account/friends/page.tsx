import Link from "next/link";
import UserAvatar from "@/components/user-avatar";
import {loadFriends} from "@/lib/friends-server";
export default async function Friends() {
  const {friends,failed}=await loadFriends();const accepted=friends.filter(item=>item.status==="accepted");
  return <><Link className="shelf-back" href="/account">← ホームへ</Link><p className="eyebrow">FRIENDS / BOOKSHELVES</p><h1>友達の本棚</h1><p className="intro">つながった友達 <strong>{accepted.length}人</strong></p><Link className="button secondary" href="/account/friends/manage">＋ 友達を追加・申請を確認</Link>{failed?<p className="notice error" role="alert">友達を読み込めませんでした。時間をおいて再度お試しください。</p>:accepted.length?<div className="friend-list">{accepted.map(friend=><Link className="friend-list-card" key={friend.friend_id} href={`/account/friends/${friend.friend_id}`}><div className="friend-person"><UserAvatar preset={friend.avatar_preset} photoUrl={friend.photoUrl} name={friend.display_name}/><div><strong>{friend.display_name}</strong><small>本棚を見る →</small></div></div></Link>)}</div>:<div className="shelf-empty"><h2>友達と、読書の輪を。</h2><p>フレンド申請が承認されると、ここに友達が表示されます。</p><Link href="/account/friends/manage">友達を追加する →</Link></div>}</>;
}
