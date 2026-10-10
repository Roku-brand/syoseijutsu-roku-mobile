# Owner content management setup

1. Apply `supabase/migrations/20260827100000_owner_content_management.sql` in the Supabase SQL editor or with the Supabase CLI.
2. Register `tsubasa00928@gmail.com` through the existing Supabase Auth flow. Do not put the email address in client-side authorization logic.
3. Copy the authenticated user's UUID from Supabase Auth and run this in the SQL editor:

```sql
update public.profiles set role = 'owner' where user_id = '<OWNER_USER_UUID>';
insert into public.user_roles (user_id, role)
values ('<OWNER_USER_UUID>', 'owner')
on conflict (user_id) do update set role = 'owner', updated_at = now();
```

4. On a trusted machine only, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, then run `pnpm content:import-owner`. The service-role key must never be put in Expo environment variables or committed to Git.
5. Confirm the count printed before and after import. The script upserts by the existing ID, preserves ordering and leaves rows not present in the local bundle untouched.

The app reads `public.techniques` as the public source of truth when available and keeps the bundled JSON only as a bootstrap/offline fallback. Drafts and revisions are protected by RLS. Publishing is performed by `publish_technique`, which checks owner status, detects stale `updated_at`, stores a revision snapshot, and updates the published row atomically.

## 日々の本文修正（再ビルド不要）

タイトル・原理・解説・実践・注意点・理論概要・画像・掲載順の修正は、管理画面からDBへ保存・公開する。本文の微修正だけを理由に、生成JSONの書き換え、PR作成、Webビルド、ストア申請を行わない。

1. 対象IDと現在の本文を確認し、管理画面で修正して公開する。直接DBを更新する場合も、対象IDと更新前の値／`updated_at`を条件にし、件数を確認する。
2. 公開用APIで変更後の値を確認する。完全版の本文は認証済みの完全版APIで確認し、未購入者に本文が返らないことも確認する。既存のDBトリガーが処世術・理論の完全版データへ反映するため、本文修正のたびに`content:sync-paid`を実行しない。
3. 起動時に公開内容と認証済み完全版本文を取得する。以後は前面への復帰時、利用中は10分ごとに`content_revision`の更新番号1つだけを確認し、番号が変わった場合だけ本文を再取得する。短時間の確認は60秒間まとめ、バックグラウンドでは定期確認しない。Web/PWAは接続復帰時にも確認する。通信失敗時は直前に取得した内容を保持し、完全版の保存済みデータはそのユーザーへの利用権確認を前提に扱う。

更新番号は公開行の変更・取り下げ・削除、分類変更、学習データ変更にDBトリガーで追従する。下書きだけの編集と`updated_at`だけの更新では番号を進めない。確認時は1行のSELECTだけで、全件集計、本文ダウンロード、Edge Function、Realtime接続は使用しない。利用中1時間あたりの定期確認は6回で、変更がなければ本文取得は0回。起動、復帰、認証・利用権確認などの既存通信は別途発生する。

画面の構造・ボタン・動作の変更はWebのビルドと公開が必要。ビルド同梱のオフライン初期データや静的SEOページを更新したい場合にも別途ビルドする。オフライン中のアプリはDB変更を受け取れず、初回起動時の同梱データには、そのビルド時点の内容が含まれる。

この再取得の改善自体はプログラム変更のため一度公開が必要だが、以後の通常の本文修正はDB更新だけで反映できる。
