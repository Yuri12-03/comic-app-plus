import Link from "next/link";
export default function NotFound() {
  return <div className="shelf-empty"><h1>作品が見つかりません</h1><p>自分の本棚から、もう一度作品を選んでください。</p><Link className="button" href="/account/bookshelf">自分の本棚へ</Link></div>;
}
