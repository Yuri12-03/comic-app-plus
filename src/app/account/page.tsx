import Link from "next/link";
import { loadUserProfile } from "@/lib/profile-server";
import UserAvatar from "@/components/user-avatar";
import { signOut } from "@/app/auth/actions";
import Dashboard from "./dashboard";
export default async function Account({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { user, profile, photoUrl } = await loadUserProfile(true);
  const params = await searchParams;
  return (
    <div className="site">
      <header className="dashboard-header">
        <Link className="brand" href="/account">
          ▥ まんがのわ
        </Link>
        <form action={signOut}><button className="logout-button">ログアウト</button></form>
      </header>
      <main className="dashboard-shell">
          <div className="dashboard-welcome">
            <p className="eyebrow">MY BOOKSHELF / HOME</p>
            <h1>本棚から、ひろがる毎日。</h1>
            <p className="intro">お気に入りの漫画も、身近な人との貸し借りも。<br />ここから、あなたの本棚をはじめましょう。</p>
            <Link className="home-profile" href="/account/settings/profile"><UserAvatar preset={profile?.avatar_preset} photoUrl={photoUrl} name={profile?.display_name} /><span><strong>{profile?.display_name ?? "ユーザー情報を設定する"}</strong><small>{user.email}</small></span></Link>
          </div>
          {params.error && (
            <p className="notice error" role="alert">
              ログアウトできませんでした。もう一度お試しください。
            </p>
          )}
          <Dashboard />
      </main>
      <footer>まんがのわ — 本棚から広がる、漫画のつながり。</footer>
    </div>
  );
}
