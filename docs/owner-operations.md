# オーナー運用管制塔

## 構成

運用画面は既存の Supabase Auth と `profiles.role = 'owner'` を利用します。画面側のオーナー判定に加え、運用テーブルは `public.is_owner()` を使う RLS で保護されているため、一般ユーザーは問い合わせ・投稿候補・実行ログを取得できません。

データは次の順で読み込みます。

1. Supabase の `operation_*` テーブル（本番の正本）
2. 取得失敗時はリポジトリの `operations/*.json`（UI確認用サンプル兼フォールバック）

管理画面は Gmail や X を直接操作しません。外部の Codex / ChatGPT 定期タスクが情報を取得・生成し、JSONまたは Supabaseへ反映します。

## 定期タスクが更新するファイル

- `operations/inquiries.json`: Gmailから整理した問い合わせ、要約、AI返信案
- `operations/social-posts.json`: X投稿候補、予定日時、生成理由、実績
- `operations/ai-tasks.json`: 各定期タスクの最終結果、次回予定、処理件数、エラー、更新先
- `operations/faq-candidates.json`: 問い合わせから抽出したFAQ候補
- `operations/activity-log.json`: AIとオーナーの監査ログ
- `operations/dashboard.json`: 対象期間とデータソースの宣言

各JSONは `schemaVersion`、`updatedAt`、`items` を持ち、各項目は一意な `id` と `status` を持ちます。更新前後に `pnpm operations:validate` を実行してください。

リポジトリへ反映したJSONは、GitHub Pagesの公開処理中に `pnpm operations:sync` で Supabaseへ upsert されます。定期タスクが Supabaseへ直接書く場合は、クライアント公開キーではなく、信頼済み環境に保管した `SUPABASE_SERVICE_ROLE_KEY` を使用してください。サービスロールキーはリポジトリ、ログ、生成JSONへ含めないでください。

## 競合を避ける運用

JSON同期は同じ `id` を更新します。`scripts/sync-operations.mjs` は既存行のオーナー管理項目を保持してから同期するため、管理画面で行った判断を次回の公開処理で戻しません。定期タスクがSupabaseへ直接書く場合も、同じ項目を保持してください。

- 問い合わせのオーナー管理項目: `status`, `owner_memo`, `category`, `urgency`
- SNSのオーナー管理項目: `body`, `scheduled_at`, `status`, `owner_memo`
- FAQのオーナー管理項目: `proposed_answer`, `status`

## Gmail / X連携の拡張点

Gmail連携はメッセージIDを `sourceRef` に保存し、本文・送信者・日時を正規化してから `inquiries.json` または `operation_inquiries` を更新します。管理画面から直接返信する機能を追加する場合も、送信はサーバー側の所有者確認済みエンドポイントへ分離してください。

X連携は投稿候補と実績取得を分けます。投稿APIを追加する場合は、`承認済み` だけを対象にし、投稿結果のIDと時刻を保存してから `投稿済み` へ遷移させます。アクセストークンをWebクライアントやJSONへ含めないでください。
