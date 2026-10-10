import Link from "next/link";
import { notFound } from "next/navigation";
import ComicCover from "@/components/comic-cover";
import { sortedCopies, summarizeSeries, volumeLabel } from "@/lib/bookshelf";
import { loadBookshelf, requireBookshelfUser } from "@/lib/bookshelf-server";
import { sampleSeries } from "@/lib/bookshelf-samples";

export default async function ComicDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ preview?: string; registered?: string }> }) {
  await requireBookshelfUser();
  const { id } = await params;
  const query = await searchParams;
  const preview = query.preview === "1";
  const back = `/account/bookshelf${preview ? "?preview=1" : ""}`;
  const result = preview ? { series: sampleSeries, failed: false } : await loadBookshelf();
  if (result.failed) return <><Link href={back}>← 自分の本棚へ</Link><p className="notice error" role="alert">作品を読み込めませんでした。時間をおいて、もう一度お試しください。</p></>;
  const series = result.series.find((series) => series.id === id);
  if (!series) notFound();
  const { coverCopy, copyCount, volumes } = summarizeSeries(series);
  return <>
    <Link className="shelf-back" href={back}>← 自分の本棚へ</Link>
    {query.registered === "1" && !preview && <p className="notice" role="status">本棚に登録しました。<Link href="/account/bookshelf/register"> 続けて漫画を登録 →</Link></p>}
    {preview && <p className="shelf-preview-note">サンプル表示：この作品はあなたの本棚には保存されていません。</p>}
    <div className="comic-detail"><ComicCover title={series.title} volume={coverCopy.volume_number} url={coverCopy.cover_url} /><div><p className="eyebrow">COMIC DETAILS</p><h1>{series.title}</h1><p className="intro">{series.author ?? "著者未登録"}</p><span className="comic-owned">{copyCount}冊所持</span><p className="intro">{volumeLabel(volumes)}</p><p className="help">表紙：所持している最小巻の{coverCopy.volume_number}巻</p></div></div>
    <section className="comic-description"><h2>作品について</h2><p>{series.description ?? "作品の紹介はまだ登録されていません。"}</p></section>
    <section className="owned-section"><h2>持っている巻 <span>{copyCount}冊</span></h2><div className="owned-list">{sortedCopies(series).map((copy) => <div className="owned-volume" key={copy.id}><span className="volume-number">{copy.volume_number}<small>巻</small></span><div><strong>{copy.book_title ?? series.title}</strong><p>{copy.isbn ? `ISBN ${copy.isbn}` : "ISBN未登録"}</p>{copy.publisher && <p>{copy.publisher} {copy.published_date}</p>}{copy.metadata_source && <p>書誌情報：{copy.metadata_source}</p>}</div></div>)}</div></section>
  </>;
}
