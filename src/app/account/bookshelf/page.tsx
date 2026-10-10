import Link from "next/link";
import ComicCover from "@/components/comic-cover";
import { summarizeSeries, volumeLabel } from "@/lib/bookshelf";
import { loadBookshelf, requireBookshelfUser } from "@/lib/bookshelf-server";
import { sampleSeries } from "@/lib/bookshelf-samples";

export default async function Bookshelf({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  await requireBookshelfUser();
  const preview = (await searchParams).preview === "1";
  const result = preview ? { series: sampleSeries, failed: false } : await loadBookshelf();
  const books = result.series.map(summarizeSeries);
  return <>
    <p className="eyebrow">MY BOOKSHELF</p>
    <div className="shelf-title"><h1>自分の本棚</h1><span>{books.length}作品 / {books.reduce((total, book) => total + book.copyCount, 0)}冊</span></div>
    {!preview && <Link className="button add-comic-link" href="/account/bookshelf/register">＋ 漫画を登録</Link>}
    <p className="intro">気になる表紙をタップして、作品と持っている巻を確認。</p>
    {preview ? <div className="shelf-preview-note"><strong>サンプル表示</strong><p>架空の作品で見た目を確認できます。あなたの本棚には保存されません。</p><Link href="/account/bookshelf">自分の本棚に戻る →</Link></div> : <p className="help">作品ごとに、持っている巻の中で最も巻数が小さい巻の表紙を表示します。</p>}
    {result.failed ? <div className="notice error" role="alert">本棚を読み込めませんでした。時間をおいて、もう一度お試しください。<p><Link href="/account/bookshelf">もう一度読み込む →</Link></p></div> : books.length === 0 ? <div className="shelf-empty"><div className="shelf-empty-icon" aria-hidden="true">▥</div><h2>最初の一冊を、ここに。</h2><p>まだ漫画が登録されていません。<br />バーコードやISBNから、本棚に追加しましょう。</p><Link className="button" href="/account/bookshelf/register">漫画を登録する</Link><p><Link href="/account/bookshelf?preview=1">サンプルの本棚を見る →</Link></p></div> : <div className="comic-grid">{books.map(({ series, coverCopy, copyCount, volumes }) => <Link className="comic-card" key={series.id} href={`/account/bookshelf/${series.id}${preview ? "?preview=1" : ""}`} aria-label={`${series.title}の詳細・${copyCount}冊所持`}>
      <ComicCover title={series.title} volume={coverCopy.volume_number} url={coverCopy.cover_url} />
      <div className="comic-card-copy"><span className="comic-owned">{copyCount}冊所持</span><h2>{series.title}</h2><p>{series.author ?? "著者未登録"}</p><span className="comic-volumes">{volumeLabel(volumes)}</span></div>
    </Link>)}</div>}
  </>;
}
