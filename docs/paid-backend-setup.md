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
   - 購入完了・キャンセル時の戻り先は、関数内で公開URL
     `https://roku-brand.github.io/syoseijutsu-roku-mobile/upgrade.html` に固定済みです。
4. Stripe Webhook URLを`https://<project-ref>.supabase.co/functions/v1/stripe-webhook`に設定する。
5. Supabase AuthのRedirect URLsへ次を登録する。
   - `https://roku-brand.github.io/syoseijutsu-roku-mobile/auth.html?intent=checkout`
   - `https://roku-brand.github.io/syoseijutsu-roku-mobile/auth.html?mode=reset`
6. Stripeイベントは最低限次を購読する。
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `charge.refunded`
7. 完全版の原本を安全なローカル環境で用意してから、`node scripts/split-public-paid-content.mjs`を実行し、`dist-secure-content/paid-content.ndjson`をSupabaseへ投入する。この原本や出力物を公開リポジトリへコミットしない。

## 販売前の必須残作業

販売開始前に以下を完了する。

- 公開ビルドのimport先が`techniques.public.json`、`theories.public.json`、`learning.public.json`のみであることを確認
- 完全版ログイン時に`paid-content` APIから取得してクライアントカタログへ統合することを確認
- 購入確認後の完全版データが端末へ保存され、通信失敗時も最後に確認済みの購入状態を維持することを確認
- ログアウト時と、サーバーが正常に未購入・返金済みを返した時に、有料コンテンツのメモリと端末キャッシュを消去することを確認
- GitHub Pages生成物に有料タイトル・本文が含まれないことを文字列検索で監査

この切替前は決済を本番モードにしないこと。
