import Link from "next/link";
import ComicCover from "@/components/comic-cover";
import UserAvatar from "@/components/user-avatar";
import { summarizeSeries } from "@/lib/bookshelf";
import { loadFriendBookshelf } from "@/lib/friend-bookshelf-server";

export default async function FriendBookshelf({ params }: { params: Promise<{ friendId: string }> }) {
  const { friendId } = await params;
  const { friend, series, failed } = await loadFriendBookshelf(friendId);
  const books = series.map(summarizeSeries);
  return <>
    <Link className="shelf-back" href="/account/friends">← 友達の一覧へ</Link>
    <p className="eyebrow">FRIEND&apos;S BOOKSHELF</p>
    {friend && <div className="friend-person"><UserAvatar preset={friend.avatar_preset} photoUrl={friend.photoUrl} name={friend.display_name}/><h1>{friend.display_name}の本棚</h1></div>}
    <p className="intro">{books.length}作品 / {books.reduce((sum, book) => sum + book.copyCount, 0)}冊</p>
    <p className="help">本棚に登録されているすべての漫画を表示しています。表紙をタップして、作品と持っている巻を確認できます。</p>
    {failed ? <p className="notice error" role="alert">本棚を読み込めませんでした。時間をおいて再度お試しください。</p> : books.length === 0 ? <div className="shelf-empty"><h2>まだ漫画が登録されていません。</h2><p>友達が漫画を登録すると、ここに表示されます。</p></div> : <div className="comic-grid">{books.map(({series, coverCopy, copyCount}) => <Link className="comic-card" key={series.id} href={`/account/friends/${friendId}/${series.id}`} aria-label={`${series.title}の詳細・${copyCount}冊所持`}>
      <ComicCover title={series.title} volume={coverCopy.volume_number} url={coverCopy.cover_url}/>
      <div className="comic-card-copy"><span className="comic-owned">{copyCount}冊所持</span><h2>{series.title}</h2><p>{series.author ?? "著者未登録"}</p></div>
    </Link>)}</div>}
  </>;
}
