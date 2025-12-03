# Santa Quest Nagoya

Next.js (App Router) + TypeScript + Tailwind を使った名古屋限定のクリスマスAR体験アプリのLPです。Supabase のメール + パスワード認証を先に実装し、後日ソーシャルログインやStripe決済を拡張できる構成になっています。無料枠のボタンからは位置情報ベースの実績ゲームページへ遷移できます。

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
   http://localhost:3000 にアクセスするとランディングページと認証フォームのモックが表示されます。`/game` にアクセスすると簡易マップ＋実績解除モーダルをテストできます。

## 実装済みの要素

- 名古屋のスポット実績とプレミアム課金（Stripe遷移）のUIモック
- 5スポット制覇でサンタARが解放される説明コンテンツ
- `/game` で名古屋主要6スポット（ミッドランドスクエア、オアシス21、名古屋城、大名古屋ビルヂング、名古屋港ガーデンふ頭、大須商店街）それぞれの50m圏内判定と簡易スタンプマップ
- 実績解除結果を伝えるモーダル（`src/components/achievement-modal.tsx`）
- **ARカメラ機能**（`src/components/ar-camera.tsx`）
  - リアルタイムカメラアクセスとプレビュー
  - 3Dモデル表示（GLB/GLTF形式サポート、Google model-viewer使用）
  - 写真撮影と保存機能
  - WebXR AR対応（iOS/Android）
  - 詳細は `docs/AR_CAMERA.md` を参照
- Supabase Browser Client のセットアップ `src/lib/supabase-browser.ts`
- メール + パスワードのサインイン / サインアップ / サインアウト UI（`src/components/auth-panel.tsx`）
  - 認証状態に応じてフォームとログアウトカードを切り替え
  - ステータスメッセージ表示

## Next Step の候補

1. Supabase のデータベースにスポット情報を保存し、`page.tsx` からフェッチする
2. 決済フロー用の Stripe Checkout リンクを設定
3. 3Dモデルファイルの追加（`/public/models/santa.glb` にサンタモデルを配置）

## Supabase 実績テーブル

`/game` ページはログイン済みの Supabase ユーザーであれば解除済みスポットをクラウドに同期します。以下のテーブルを作成してから `.env.local` の Supabase URL / Anon キーをセットしてください。

```sql
create table public.user_achievements (
  id bigserial primary key,
  user_id uuid references auth.users (id) on delete cascade not null,
  achievement_id text not null,
  unlocked_at timestamptz not null default timezone('utc', now()),
  last_lat double precision,
  last_lng double precision
);

create unique index user_achievements_user_id_achievement_id_idx
  on public.user_achievements (user_id, achievement_id);

alter table public.user_achievements enable row level security;

create policy "users can read their achievements"
  on public.user_achievements
  for select
  using (auth.uid() = user_id);

create policy "users can insert their achievements"
  on public.user_achievements
  for insert
  with check (auth.uid() = user_id);

create policy "users can update their achievements"
  on public.user_achievements
  for update
  using (auth.uid() = user_id);
```

- `user_id`: Supabase Auth ユーザーID（`uuid`）
- `achievement_id`: `/game` 内のスポットID（例: `midland`）
- `unlocked_at`: 解除日時。`upsert` 時に `now()` で自動更新されます
- `last_lat` / `last_lng`: 最後に解除したときの測位情報（任意だが、後で分析に利用できます）

RLS を有効にした状態で `src/app/game/page.tsx` が `select` と `upsert` を行うため、ブラウザからのアクセスでも本人のレコードだけを読む / 書くことができます。

## Supabase 決済テーブル

Stripe 決済後にプレミアム権限を付与するため、ユーザー単位の課金履歴テーブルを作成します。`SUPABASE_SERVICE_ROLE_KEY` を API Routes から使用し、決済完了後のレコード作成のみサーバー側で行います。

```sql
create table public.user_payments (
  id bigserial primary key,
  user_id uuid references auth.users (id) on delete cascade not null,
  stripe_session_id text unique not null,
  plan text not null default 'premium',
  status text not null,
  amount bigint not null default 0,
  currency text not null default 'jpy',
  purchased_at timestamptz not null default timezone('utc', now())
);

create index user_payments_user_id_idx on public.user_payments (user_id);

alter table public.user_payments enable row level security;

create policy "users can read their payments"
  on public.user_payments
  for select
  using (auth.uid() = user_id);
```

クライアントからは `select` のみを許可し（`supabase.from("user_payments").select(...)`）、`insert/upsert` は `src/app/api/stripe/confirm/route.ts` がサービスロールキーで代行します。

## Stripe 決済設定

プレミアムプランのボタンは Stripe Checkout を呼び出し、決済完了後に `/premium/success` から Supabase へプレミアム状態を記録します。以下の環境変数を `.env.local` に追記してください。

```bash
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="public-anon-key"
SUPABASE_SERVICE_ROLE_KEY="service-role-key (server only)"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
STRIPE_SECRET_KEY="sk_test_xxx"
STRIPE_PRICE_ID="price_xxx" # Dashboardで作成したPremium用Price
```

- `STRIPE_PRICE_ID`: Stripe Dashboard の Product/Price（1回払い）のID。
- `NEXT_PUBLIC_SITE_URL`: Checkout成功後の遷移URL生成に使用されます。本番デプロイ時は実際のドメインを設定してください。
- `SUPABASE_SERVICE_ROLE_KEY`: API Route から `user_payments` に書き込むために必要です。クライアント側に露出しないよう `.env.local` のまま運用してください。

実装済みフロー

1. `/api/stripe/checkout` が Checkout Session を作成し、`user_id`/`plan` を metadata に付与。
2. Stripe の success_url は `/premium/success?session_id=...`。このページで `/api/stripe/confirm` を呼び、`session_id` と Supabase の `user_id` を照合。
3. 支払いが `paid` のとき、`user_payments` に `upsert` し、トップページのプレミアムカードが `/game` 直行に切り替わります。
