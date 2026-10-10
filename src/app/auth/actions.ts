"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export type AuthState = { error?: string; success?: string };
export async function authenticate(
  mode: "login" | "signup",
  _previous: AuthState,
  form: FormData,
): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { error: "メールアドレスを確認してください。" };
  if (password.length < 8)
    return { error: "パスワードは8文字以上で入力してください。" };
  if (mode === "signup" && password !== form.get("confirmation"))
    return { error: "確認用のパスワードが一致しません。" };
  const client = await createClient();
  if (!client) return { error: "現在、アカウント機能の準備中です。" };
  try {
    const result =
      mode === "signup"
        ? await client.auth.signUp({ email, password })
        : await client.auth.signInWithPassword({ email, password });
    if (result.error) {
      console.error("Authentication request failed", { code: result.error.code, status: result.error.status });
      if (result.error.code === "email_not_confirmed")
        return {
          error: "確認メールのリンクを開いてからログインしてください。",
        };
      if (result.error.status === 429)
        return { error: "しばらく待ってからお試しください。" };
      return {
        error:
          mode === "login"
            ? "ログインできませんでした。メールアドレスとパスワードを確認してください。"
            : "登録できませんでした。入力内容を確認し、しばらく待ってからお試しください。",
      };
    }
    if (mode === "signup" && !result.data.session)
      return {
        success:
          "確認メールを送信しました。メールのリンクを開いて確認してください。届かない場合は迷惑メールフォルダもご確認ください。",
      };
  } catch {
    return {
      error: "接続できませんでした。時間をおいてもう一度お試しください。",
    };
  }
  redirect("/account");
}
export async function signOut() {
  const client = await createClient();
  if (client) {
    const { error } = await client.auth.signOut();
    if (error) redirect("/account?error=signout");
  }
  redirect("/");
}
