import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
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
      <header>
        <Link className="brand" href="/">
          ▥ まんがのわ
        </Link>
      </header>
      <main className="auth-shell">
        <div className="card">
          <p className="eyebrow">MY ACCOUNT</p>
          <h1>ログインしました</h1>
          <p className="intro email">{String(data.claims.email ?? "")}</p>
          <div className="empty">
            <h2>あなたの本棚は、ここから。</h2>
            <p className="intro">
              アカウントの準備ができました。本棚の作成・漫画の登録機能は、これから追加していきます。
            </p>
          </div>
          {params.error && (
            <p className="notice error" role="alert">
              ログアウトできませんでした。もう一度お試しください。
            </p>
          )}
          <form action={signOut}>
            <button className="button">ログアウト</button>
          </form>
        </div>
      </main>
    </div>
  );
}
