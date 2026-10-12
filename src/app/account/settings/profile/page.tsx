import Link from "next/link";
import { loadUserProfile } from "@/lib/profile-server";
import ProfileForm from "./profile-form";
export default async function ProfileSettings({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { profile, photoUrl, failed } = await loadUserProfile(true);
  const query = await searchParams;
  return <><Link className="shelf-back" href="/account/settings">← 設定へ</Link><h1>ユーザー情報</h1><p className="intro">ユーザーネームとアイコンを設定できます。</p>{query.saved === "1" && <p className="notice" role="status">ユーザー情報を保存しました。</p>}{failed ? <p className="notice error" role="alert">ユーザー情報を読み込めませんでした。時間をおいて再度お試しください。</p> : <ProfileForm profile={profile} photoUrl={photoUrl} />}</>;
}
