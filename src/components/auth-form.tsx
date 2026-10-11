"use client";
import Link from "next/link";
import { useActionState } from "react";
import { authenticate } from "@/app/auth/actions";
export function AuthForm({
  mode,
  configured,
  next,
}: {
  mode: "login" | "signup";
  configured: boolean;
  next?: string;
}) {
  const signup = mode === "signup";
  const [state, action, pending] = useActionState(
    authenticate.bind(null, mode),
    {},
  );
  return (
    <>
      <form action={action} className="auth-form">
        {next && <input type="hidden" name="next" value={next} />}
        {!configured && (
          <p className="notice">
            アカウント機能は準備中です。接続設定が完了すると登録・ログインできます。
          </p>
        )}
        <label className="field">
          メールアドレス
          <input
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            required
            maxLength={254}
          />
        </label>
        <label className="field">
          パスワード
          <input
            name="password"
            type="password"
            autoComplete={signup ? "new-password" : "current-password"}
            minLength={8}
            required
            aria-describedby="password-help"
          />
          <span id="password-help" className="help">
            8文字以上で入力してください。
          </span>
        </label>
        {signup && (
          <label className="field">
            パスワード（確認）
            <input
              name="confirmation"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
        )}
        <div aria-live="polite" aria-atomic="true">
          {state.error && (
            <p className="notice error" role="alert">
              {state.error}
            </p>
          )}
          {state.success && <p className="notice">{state.success}</p>}
        </div>
        <button className="button" disabled={pending || !configured}>
          {pending ? "処理中…" : signup ? "アカウントを作成" : "ログイン"}
        </button>
      </form>
      <p className="switch">
        {signup
          ? "すでにアカウントをお持ちですか？"
          : "まだアカウントをお持ちでない方"}
        <br />
        <Link href={`${signup ? "/login" : "/signup"}${next ? `?next=${encodeURIComponent(next)}` : ""}`}>
          {signup ? "ログインする →" : "新規登録する →"}
        </Link>
      </p>
    </>
  );
}
