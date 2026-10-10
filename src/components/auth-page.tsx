import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getConfig } from "@/lib/supabase/config";
import { AuthForm } from "./auth-form";
export async function AuthPage({ mode }: { mode: "login" | "signup" }) {
  await connection();
  const client = await createClient();
  if (client) {
    const { data } = await client.auth.getClaims();
    if (data?.claims) redirect("/account");
  }
  return (
    <div className="site">
      <header>
        <Link className="brand" href="/">
          ▥ まんがのわ
        </Link>
        <Link href="/">トップへ</Link>
      </header>
      <main className="auth-shell">
        <div className="card">
          <p className="eyebrow">WELCOME TO YOUR BOOKSHELF</p>
          <h1>{mode === "signup" ? "本棚をはじめよう" : "おかえりなさい"}</h1>
          <p className="intro">
            {mode === "signup"
              ? "メールアドレスでアカウントを作成します。"
              : "メールアドレスとパスワードでログイン。"}
          </p>
          <AuthForm mode={mode} configured={!!getConfig()} />
        </div>
      </main>
    </div>
  );
}
