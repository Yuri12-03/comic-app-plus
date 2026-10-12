import Link from "next/link";
import { notFound } from "next/navigation";
import ComicCover from "@/components/comic-cover";
import { sortedCopies, summarizeSeries } from "@/lib/bookshelf";
import { loadFriendBookshelf } from "@/lib/friend-bookshelf-server";

export default async function FriendComicDetail({ params }: { params: Promise<{ friendId: string; seriesId: string }> }) {
  const { friendId, seriesId } = await params;
  const result = await loadFriendBookshelf(friendId);
  const back = `/account/friends/${friendId}`;
  if (result.failed) return <><Link href={back}>← 友達の本棚へ</Link><p className="notice error" role="alert">作品を読み込めませんでした。時間をおいて再度お試しください。</p></>;
  const series = result.series.find(item => item.id === seriesId);
  if (!series) notFound();
  const { coverCopy, copyCount } = summarizeSeries(series);
  return <>
    <Link className="shelf-back" href={back}>← {result.friend?.display_name}の本棚へ</Link>
    <div className="comic-detail"><ComicCover title={series.title} volume={coverCopy.volume_number} url={coverCopy.cover_url}/><div><h1>{series.title}</h1><p className="intro">{series.author ?? "著者未登録"}</p><span className="comic-owned">{copyCount}冊所持</span><p className="help">表紙：所持している最小巻の{coverCopy.volume_number}巻</p></div></div>
    <section className="comic-description"><h2>作品について</h2><p>{series.description ?? "作品の紹介はまだ登録されていません。"}</p></section>
    <section className="owned-section"><div className="owned-heading"><h2>持っている巻 <span>{copyCount}冊</span></h2></div><div className="owned-list">{sortedCopies(series).map(copy => <div className="owned-volume" key={copy.id}><span className="volume-number">{copy.volume_number}<small>巻</small></span><div><strong>{copy.book_title ?? series.title}</strong><p>{copy.isbn ? `ISBN ${copy.isbn}` : "ISBN未登録"}</p>{copy.publisher && <p>{copy.publisher} {copy.published_date}</p>}</div></div>)}</div></section>
  </>;
}
