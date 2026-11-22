# 個人記録の自動同期

## 保存と移行

未ログインの記録は従来の端末内領域を使用する。ログイン中はアカウントIDごとに端末内の同期ジャーナルを分け、確定済みの差分、端末の変更、送信中のバッチを一つの状態として保存する。変更の送信は端末への書き込みが済んでから行う。同じブラウザのタブ間でキューを共有し、Web Locksに対応するブラウザでは更新を直列化する。通信が途切れても同じ端末で編集できる。

初回同期では、既存のクラウドバックアップを項目単位に展開する。端末の既存アカウント記録も追加し、同一項目が異なる場合はサーバーの内容を保持して端末側の版を復旧履歴に保存する。既存バックアップは移行時に削除しない。ログイン前の記録はユーザーが引き継ぎを選んだ場合に統合し、引き継ぎ後も元のゲスト領域に保持する。

## 競合・削除

サーバーはアカウント内の項目ごとにリビジョンを管理する。同じ端末IDとバッチ連番を受信しても操作は一度だけ適用する。削除前の版や競合した変更は、最長30日、最大100件を目安に直近の履歴を保持する。復旧本文の合計が約1 MiBを超える場合は古い履歴から整理し、単独で上限を超える最新の1件はそのまま保持する。期限切れ履歴は毎日のジョブと変更の保存時に削除する。

個別削除のマーカーは本文を保持せず、遅れて到着した古い編集を拒否するために使う。クラウド全体の削除はアカウントの世代番号を進め、同期済み記録、復旧履歴、旧クラウドバックアップを一つのトランザクションで削除する。同意前でもクラウド上の記録を削除できる。他の端末では次の同期時に古い世代のキューと記録を消去する。端末内の消去はログアウトを伴い、同じアカウントで再ログインした際にクラウドの記録を取得する。

アカウント削除時は認証ユーザーとの外部キー連鎖で同期記録が消える。アプリは現在のアカウントの端末内コピーを消去する。共有端末の他のアカウントやゲスト記録はそれぞれの領域で管理する。任意の利用状況送信と端末の背景テーマは端末別の設定として扱う。

## Supabase の使用量

- 起動、ログイン、画面復帰、通信復帰、編集後、手動再試行で同期する。成功後の定期ポーリングや Realtime 購読はない。
- 編集は約800ミリ秒まとめて送信する。バッチは最大32操作で、通常は約8万文字未満。取得も1ページ最大32件で、本文合計が約256 KiBを超えた時点で次ページに分ける。個別に大きい項目は単独でも取得できる。
- 復旧一覧は20件ずつ、本文は選んだ1件のみ取得する。画像、公開コンテンツ本文、購入データはこの同期に含まれない。
- RLS 有効の非公開テーブルとアカウント・項目キー、アカウント・リビジョンのインデックスを利用する。API は有効なアカウントの本人確認を行う。
- 管理画面の Usage で Database Size と Database Egress を確認する。旧バックアップとの並行保管中は容量が増える。Free プランの目安はプロジェクト当たりデータベース500 MB、組織当たり月間の非キャッシュ Egress 5 GB。実際の使用量は利用者数・記録量・機種変更回数に依存する。
  [Supabase Billing](https://supabase.com/docs/guides/platform/billing-on-supabase)
  [Supabase Egress](https://supabase.com/docs/guides/platform/manage-your-usage/egress)

公開前の検証環境でテーブルとインデックスを含む容量を確認する。

```sql
select c.relname, pg_size_pretty(pg_total_relation_size(c.oid)) as total_size
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where (n.nspname = 'private' and c.relname in (
  'personal_sync_head', 'personal_sync_item', 'personal_sync_device', 'personal_sync_recovery'
)) or (n.nspname = 'public' and c.relname = 'personal_backups')
order by pg_total_relation_size(c.oid) desc;
```

## 公開準備とロールバック

本番Supabaseには2026年11月22日に `20261122025925` を単独で適用した。新規4テーブルのRLS、匿名ユーザーの同期RPC実行拒否、復旧履歴の削除ジョブを確認した。

1. 本番と別の環境でマイグレーションを適用し、旧アカウント記録とバックアップを模したデータを入れて、移行・競合・削除を確認する。既存データベースの容量と旧バックアップの件数を確認する。
2. 利用規約3.5・プライバシーポリシー2.2の適用日と事前周知を確定する。アプリ本文と静的なプライバシー文書を揃える。静的文書は `node scripts/sync-privacy-documents.mjs` で再生成する。アップデート前からの利用者には、内容の確認後に初回同期を開始する導線がある。
3. 本番スキーマを適用して確認してからクライアントを公開する。App Store Connect のプライバシー申告とポリシーURLも公開時に確認する。
4. 問題時は同期RPCを一時停止し、端末の保留キューと新旧のテーブルを保持する。UIは記録の閲覧・端末保存ができる版を使う。復旧後に同じリビジョンとキューで再試行する。テーブルを削除したり、世代を戻して旧バックアップを再度有効にしたりすると、消去済み記録が復活する可能性がある。旧方式へ戻す場合も、すでに新方式で増えた記録を書き出して確認する。

同期の送受信だけを一時停止する場合は、運用者が次の権限を切り替える。削除と復旧のAPIは個別に利用できる。

```sql
-- Pause
revoke execute on function public.sync_personal_records(uuid,integer,bigint,text,bigint,jsonb) from authenticated;
-- Resume after checking schema compatibility
grant execute on function public.sync_personal_records(uuid,integer,bigint,text,bigint,jsonb) to authenticated;
```

法務確認は、民法548条の4に沿った周知方法と適用日、消費者契約法8条・10条と同期障害時の対応、Supabaseへの委託・国外取扱いに関する個人情報保護法上の手続、App Store Connectの申告区分を対象にする。

## ローカル検証

- `node node_modules/typescript/bin/tsc --noEmit`
- `node scripts/run-unit-tests.mjs`
- `node scripts/sync-privacy-documents.mjs --check`
- `PLAYWRIGHT_PERSONAL_SYNC_FIXTURE=1` を設定し、`pnpm test:e2e personal-cloud-sync.spec.ts personal-memo-sync.spec.ts legal-compliance.spec.ts` を実行する。Expo のローカル開発サーバーとテスト用の認証・同期レスポンスを使う。実環境の認証情報は使わない。

## 変更ファイル

| 分類 | ファイル |
|---|---|
| 同期・端末保存 | `src/state/app-state.tsx`、`src/state/personal-data.ts`、`src/state/personal-sync-model.ts`、`src/state/personal-sync-api.ts`、`src/state/personal-sync-storage.ts` |
| データベース | `supabase/migrations/20261122025925_personal_sync.sql` |
| 設定・認証 | `src/app/settings.tsx`、`src/app/settings/data.tsx`、`src/app/settings/delete-account.tsx`、`src/app/auth.tsx`、`src/auth/auth-state.tsx`、`src/components/data-status-banner.tsx`、`src/components/registration-consent.tsx` |
| 規約・配信文書 | `src/data/legal-documents.ts`、`src/data/generated/terms-history.json`、`PRIVACY_POLICY.md`、`public/privacy/index.html`、`store/privacy/index.html`、`store/metadata-ja.md`、`scripts/sync-privacy-documents.mjs`、`docs/releases/personal-sync.md` |
| 検証 | `playwright.config.ts`、`tests/e2e/legal-compliance.spec.ts`、`tests/e2e/personal-cloud-sync.spec.ts`、`tests/e2e/home-card-deck.spec.ts`、`tests/e2e/release-smoke.spec.ts`、`tests/e2e/quality-improvements.spec.ts`、`tests/e2e/selected-improvements.spec.ts`、`tests/unit/personal-sync-model.test.mjs`、`tests/unit/personal-sync-database.test.mjs` |
