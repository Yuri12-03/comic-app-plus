import Link from "next/link";
export default function AuthError() {
  return (
    <main className="site">
      <div className="auth-shell card">
        <h1>メールを確認できませんでした</h1>
        <p className="intro">
          リンクの期限が切れているか、すでに使用されています。確認済みの場合はログインしてください。未確認の場合は、再度新規登録からお試しください。
        </p>
        <Link className="button" href="/login">
          ログインへ
        </Link>
        <p>
          <Link href="/signup">新規登録へ</Link>
        </p>
      </div>
    </main>
  );
}
