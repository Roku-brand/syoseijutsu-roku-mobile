# 完全版バックエンド設定（280円・買い切り）

## 実装済み

- 商品価格をサーバー側で280円に固定
- Stripe Checkout Session作成
- Stripe署名検証付きWebhook
- 決済完了時の`entitlements`付与
- 返金時の権限停止
- サーバー検証型`access` API
- 完全版利用者だけが読める`paid-content` API
- 有料コンテンツ格納用`paid_content`テーブル
- 公開JSONと有料データを分割するスクリプト

## 適用手順

1. Supabase SQL Editorで`supabase/migrations/20260803080000_secure_paid_backend.sql`を実行する。
2. Supabase CLIまたはDashboardから次のEdge Functionsをデプロイする。
   - `create-checkout`
   - `access`
   - `stripe-webhook`（JWT検証を無効化。Stripe署名を関数内で検証する）
   - `paid-content`
3. Edge Function Secretsへ次を登録する。
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `SITE_URL=https://roku-brand.github.io/syoseizyutsu-roku-mobile`
4. Stripe Webhook URLを`https://<project-ref>.supabase.co/functions/v1/stripe-webhook`に設定する。
5. Stripeイベントは最低限次を購読する。
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `charge.refunded`
6. `node scripts/split-public-paid-content.mjs`を実行し、`dist-secure-content/paid-content.ndjson`をSupabaseへ投入する。

## 販売前の必須残作業

現在のアプリは既存画面との互換性のため、元の完全版JSONをまだリポジトリ内で参照している。販売開始前に以下を完了する。

- 公開ビルドのimport先を`techniques.public.json`、`theories.public.json`、`learning.public.json`へ変更
- 完全版ログイン時に`paid-content` APIから取得してクライアントカタログへ統合
- ログアウト時に有料コンテンツのメモリ・AsyncStorage・IndexedDBキャッシュを消去
- GitHub Pages生成物に有料タイトル・本文が含まれないことを文字列検索で監査

この切替前は決済を本番モードにしないこと。
