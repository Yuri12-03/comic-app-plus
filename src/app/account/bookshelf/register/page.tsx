import Link from "next/link";
import { loadBookshelf } from "@/lib/bookshelf-server";
import RegisterForm from "./register-form";

export default async function RegisterPage() {
  const { series, failed } = await loadBookshelf();
  return <div className="registration-shell"><Link className="shelf-back" href="/account/bookshelf">← 自分の本棚へ</Link><p className="eyebrow">ADD A COMIC</p><h1>本棚に、新しい一冊を。</h1><p className="intro">バーコードや漫画名から探して、あなたの本棚へ。</p>{failed ? <p className="notice error" role="alert">本棚を読み込めませんでした。時間をおいて、もう一度お試しください。</p> : <RegisterForm series={series.map(({ id, title, author }) => ({ id, title, author }))} />}</div>;
}
