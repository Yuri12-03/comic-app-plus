# まんがのわ

スマホ優先の漫画管理アプリ。現在はトップページ、メール・パスワードによる新規登録、自動ログイン、ログアウトを実装しています。本棚・友達・貸出は今後追加します。

## 起動・接続

`npm install` の後、`npm run dev -- --port 3001` を実行し、http://localhost:3001 を開きます。
`.env.example` を `.env.local` にコピーし、SupabaseのProject URLとPublishable keyを設定します。接続設定はGitHubに含めません。
Vercelでは同じ環境変数を設定し、変更後に再デプロイしてください。

## 認証設定

SupabaseのAuthentication → Sign In / ProvidersでEmailを有効、Allow new users to sign upをオン、Confirm emailをオフにします。
登録すると確認メールを介さずログインします。入力したメールアドレスの所有確認は行いません。
SMTPと確認メールテンプレートの設定はこのフローには不要です。

## ユーザーの保存先

Supabaseの `auth.users` にユーザーID・メールアドレス・ハッシュ化されたパスワード等を保存します。Authentication → Usersで確認できます。
`public.profiles`等のプロフィールテーブルはまだ作成していません。

## 検証

`npm run lint` と `npm run build` で検証します。
新規登録 → 自動ログイン → 再読み込み → ログアウト → 再ログインと、Supabaseのユーザー一覧への反映を確認します。
未ログインの `/account` は `/login` に移動します。

Cookieによる認証と検証済みのJWT claimsを使用します。本棚データの追加時はRLSを設定します。
