# 完全版バックエンド設定（280円・30日間アクセス）

## 実装済み

- 商品価格をサーバー側で280円に固定
- Stripe Checkout Session作成
- Stripe署名検証付きWebhook
- 決済完了時の期限付き`entitlements`付与（決済成功から30×24時間）
- 旧買い切り購入者の`legacy_lifetime`権利維持
- 返金時の権限停止
- サーバー検証型`access` API
- 完全版利用者だけが読める`paid-content` API
- 有料コンテンツ格納用`paid_content`テーブル
- 公開JSONと有料データを分割するスクリプト

## 適用手順

1. 既存のマイグレーションに続けて`supabase/migrations/20260811090000_thirty_day_access.sql`を実行する。既存の権利はこの時点で`legacy_lifetime`へ移行される。
2. Supabase CLIまたはDashboardから次のEdge Functionsをデプロイする。
   - `create-checkout`
   - `access`
   - `stripe-webhook`（JWT検証を無効化。Stripe署名を関数内で検証する）
   - `paid-content`
3. Edge Function Secretsへ次を登録する。
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PRICE_ID_30DAY`（商品名「処世術禄 完全版｜30日間アクセス」、JPY 280、`one_time`の本番Price ID。未設定時は同条件の`price_data`へ安全にフォールバック）
   - 購入完了・キャンセル時の戻り先は、関数内で公開URL
     `https://shoseijutsuroku.com/` に固定済みです。
     `checkout`クエリを受け取ったトップ画面が、アプリ内の購入完了画面へ転送します。
4. Stripe Webhook URLを`https://<project-ref>.supabase.co/functions/v1/stripe-webhook`に設定する。
5. Supabase AuthのRedirect URLsへ次を登録する。
   - `https://shoseijutsuroku.com/auth.html?intent=checkout`
   - `https://shoseijutsuroku.com/auth.html?mode=reset`
6. Stripeイベントは最低限次を購読する。
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `charge.refunded`
7. 完全版の原本を安全なローカル環境で用意してから、`node scripts/split-public-paid-content.mjs`を実行し、`dist-secure-content/paid-content.ndjson`をSupabaseへ投入する。この原本や出力物を公開リポジトリへコミットしない。

## 販売前の必須残作業

販売開始前に以下を完了する。

- 公開ビルドのimport先が`techniques.public.json`、`theories.public.json`、`learning.public.json`のみであることを確認
- 完全版ログイン時に`paid-content` APIから取得してクライアントカタログへ統合することを確認
- 購入確認後の完全版データが端末へ保存されても、起動時の期限確認に失敗した場合は権限を延長せず、再確認までロックされることを確認
- ログアウト時と、サーバーが正常に未購入・期限切れ・返金済みを返した時に、有料コンテンツを表示しないことを確認（蔵書・メモ等のユーザーデータは削除しない）
- GitHub Pages生成物に有料タイトル・本文が含まれないことを文字列検索で監査

この切替前は決済を本番モードにしないこと。
