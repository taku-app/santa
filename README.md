# Santa Quest Nagoya

Next.js (App Router) + TypeScript + Tailwind を使った名古屋限定のクリスマスAR体験アプリのLPです。Supabase のメール + パスワード認証を先に実装し、後日ソーシャルログインやStripe決済を拡張できる構成になっています。

## セットアップ

1. 依存関係をインストール

   ```bash
   npm install
   ```

2. Supabase プロジェクトを作成し、AnonキーとURLを取得したら `.env.local` を作成します。

   ```bash
   cp .env.local.example .env.local
   # NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY を上書き
   ```

3. 開発サーバーを起動

   ```bash
   npm run dev
   ```
   http://localhost:3000 にアクセスするとランディングページと認証フォームのモックが表示されます。

## 実装済みの要素

- 名古屋のスポット実績とプレミアム課金（Stripe遷移）のUIモック
- 5スポット制覇でサンタARが解放される説明コンテンツ
- Supabase Browser Client のセットアップ `src/lib/supabase-browser.ts`
- メール + パスワードのサインイン / サインアップ / サインアウト UI（`src/components/auth-panel.tsx`）
  - 認証状態に応じてフォームとログアウトカードを切り替え
  - ステータスメッセージ表示

## Next Step の候補

1. Supabase のデータベースにスポット情報を保存し、`page.tsx` からフェッチする
2. 決済フロー用の Stripe Checkout リンクを設定
3. AR UI（カメラアクセスや3Dモデル描画）の実装
