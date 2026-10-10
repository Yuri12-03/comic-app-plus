# まんがのわ

今回の範囲はトップページ、新規登録、メール確認、ログイン、ログアウト、ログイン後の案内ページです。本棚・友達・貸出は次の段階で実装します。

## 起動

`npm install` の後、`npm run dev` を実行し、http://localhost:3000 を開きます。Supabase未設定でも画面を確認できます。認証ボタンは無効になります。

## Supabaseの設定

1. https://supabase.com/dashboard でプロジェクトを作成します。
2. Connect画面からProject URLとPublishable keyを取得します。
3. `.env.example` を `.env.local` にコピーし、2項目を設定します。Secret keyやservice_roleキーは使用しません。
4. AuthenticationでEmailログインとConfirm emailを有効にし、パスワード最小文字数を8以上に設定します。
5. Authentication → URL ConfigurationのSite URLを `http://localhost:3000` にします。本番公開時は実際のHTTPS URLへ変更します。
6. Authentication → Email Templates → Confirm signupで確認リンクを下記に設定します。

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup"
  >メールアドレスを確認する</a
>
```

7. 開発サーバーを再起動します。

## 確認

`npm run lint` と `npm run build` で静的検証します。
実認証はSupabase設定後に、新規登録 → メール確認 → アカウント画面 → ログアウト → 再ログインの順に確認してください。誤ったパスワード、確認パスワード不一致、メール確認前のログインも確認します。
未ログインの `/account` は `/login` に移動します。

認証はSupabaseのCookieによるSSR構成を使用し、保護ページでJWTの検証済みclaimsを確認します。今後、本棚データを追加する際はRLSによるアクセス制御も実装します。
