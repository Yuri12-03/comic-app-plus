import Link from "next/link";
export default function NotFound() {
  return <div className="shelf-empty"><h1>本棚が見つかりません。</h1><p>承認済みの友達の本棚から、作品を確認できます。</p><Link href="/account/friends">友達の一覧へ →</Link></div>;
}
