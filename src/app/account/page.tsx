import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import Dashboard from "./dashboard";
export default async function Account({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await connection();
  const client = await createClient();
  if (!client) redirect("/login");
  const { data, error } = await client.auth.getClaims();
  if (error || !data?.claims) redirect("/login");
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
            <p className="account-email email">{String(data.claims.email ?? "")}</p>
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
