# まんがのわ

スマホ優先の漫画管理アプリ。トップページ、メール・パスワードによる新規登録、自動ログイン、ログアウト、自分の本棚の一覧・作品詳細を実装しています。漫画の登録・友達・貸出は今後追加します。

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

Cookieによる認証と検証済みのJWT claimsを使用します。

## 自分の本棚

ログイン後の「自分の本棚」から `/account/bookshelf` を開きます。
作品ごとに、所持する巻のうち巻数が最も小さい巻の表紙を表示します（例：3・5・10巻なら3巻）。表紙がない・取得できない場合は、その巻の代替表示を出します。カードを押すと作品紹介・著者・所持巻・ISBNを確認できます。
同じ巻を複数冊持つ場合も冊数に含め、所持巻の表示は重複をまとめます。漫画が未登録の作品は一覧に出しません。

`?preview=1` は架空の作品で配置を確認するサンプル表示です。ログインが必要で、データベースへの保存は行いません。

`supabase/migrations/202610100001_personal_bookshelf.sql` をSupabaseのSQL Editorで一度実行します（現在のプロジェクトには適用済み）。
`bookshelves` → `comic_series` → `comic_copies` の外部キーで各冊の所属本棚を一意に保ちます。現在は個人本棚のみで、グループと友達のアクセスは今後拡張します。
3テーブルすべてにRLSを有効にし、認証ユーザー本人の本棚だけを読み取れます。未認証ユーザーにアクセス権はなく、クライアントからの書き込み権限もまだ付与していません。

`npm run test:bookshelf` で最小巻選択・数値順・重複冊数・表紙欠損を検証します。
`supabase/tests/personal_bookshelf.sql` は既存の2つのテスト用Authユーザーを使い、所有者分離と未認証アクセス拒否を検証します。テストの本棚・漫画はトランザクション終了時にロールバックされます。
