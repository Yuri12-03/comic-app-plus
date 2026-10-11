import Link from "next/link";
import { notFound } from "next/navigation";
import { loadBookshelf } from "@/lib/bookshelf-server";
import { summarizeSeries, volumeLabel } from "@/lib/bookshelf";
import RangeForm from "../../register/range-form";

export default async function AddVolumes({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shelf = await loadBookshelf();
  if (shelf.failed) return <p className="notice error" role="alert">作品を読み込めませんでした。時間をおいて再度お試しください。</p>;
  const series = shelf.series.find(item => item.id === id);
  if (!series) notFound();
  const { volumes } = summarizeSeries(series);
  const nextVolume = Math.min(9999, Math.max(...volumes) + 1);
  return <>
    <Link className="shelf-back" href={`/account/bookshelf/${id}`}>← 作品詳細へ</Link>
    <p className="eyebrow">ADD VOLUMES</p><h1>{series.title}</h1>
    <p className="intro">現在の所持巻：{volumeLabel(volumes)}</p>
    <RangeForm series={[]} target={{ id, title: series.title, author: series.author, nextVolume }} book={{ isbn: "", bookTitle: series.title, seriesTitle: series.title, author: series.author ?? "", volume: null, publisher: "", publishedDate: "", description: "", coverUrl: "", source: "", coverSource: "" }} />
  </>;
}
