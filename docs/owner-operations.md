# オーナー運用管制塔

## 構成

運用画面は既存の Supabase Auth と `profiles.role = 'owner'` を利用します。画面側のオーナー判定に加え、運用テーブルは `public.is_owner()` を使う RLS で保護されているため、一般ユーザーは問い合わせ・投稿候補・実行ログを取得できません。

データは次の順で読み込みます。画面確認用の架空レコードは保持しません。

1. Supabase の `operation_*` テーブル（本番の正本）
2. 取得失敗時はリポジトリの `operations/*.json`（自動処理の受け渡し用フォールバック）

管理画面は Gmail や X を直接操作しません。外部の Codex / ChatGPT 定期タスクが情報を取得・生成し、JSONまたは Supabaseへ反映します。

## 現在の運用の流れ

1. GPT Work の定期タスクが、火曜・金曜の9:00（Asia/Tokyo）に問い合わせ用Gmailの新着を確認します。
2. GPT Work は分類・要約・返信案を作りますが、メールの送信、下書き作成、既読化などは行いません。
3. 現時点では GPT Work から Supabase / GitHub への認証済み書き込み経路は未接続です。そのため、GPT Workの結果はChatGPT上に出力され、管理画面へ自動反映されません。
4. 管理画面へ反映するには、同じ形式の結果を `operations/*.json` へ取り込んで公開するか、信頼済みのサーバー処理から `operation_*` テーブルへ書き込みます。
5. 管理画面はSupabaseの実データを読み、オーナーが問い合わせ状態、メモ、SNS候補、FAQ候補を更新します。更新内容はRLSでオーナーだけに許可されます。

データが0件のときは空状態を表示します。Supabase取得に失敗したときは原因を明示し、架空データで正常に見せかけません。

## 定期タスクが更新するファイル

- `operations/inquiries.json`: Gmailから整理した問い合わせ、要約、AI返信案
- `operations/social-posts.json`: X投稿候補、予定日時、生成理由、実績
- `operations/ai-tasks.json`: 各定期タスクの最終結果、次回予定、処理件数、エラー、更新先
- `operations/faq-candidates.json`: 問い合わせから抽出したFAQ候補
- `operations/activity-log.json`: AIとオーナーの監査ログ
- `operations/dashboard.json`: 対象期間とデータソースの宣言

各JSONは `schemaVersion`、`updatedAt`、`items` を持ち、各項目は一意な `id` と `status` を持ちます。未連携時の `items` は空配列です。更新前後に `pnpm operations:validate` を実行してください。

リポジトリへ反映したJSONは、GitHub Pagesの公開処理中に `pnpm operations:sync` で Supabaseへ upsert されます。定期タスクが Supabaseへ直接書く場合は、クライアント公開キーではなく、信頼済み環境に保管した `SUPABASE_SERVICE_ROLE_KEY` を使用してください。サービスロールキーはリポジトリ、ログ、生成JSONへ含めないでください。

## 競合を避ける運用

JSON同期は同じ `id` を更新します。`scripts/sync-operations.mjs` は既存行のオーナー管理項目を保持してから同期するため、管理画面で行った判断を次回の公開処理で戻しません。定期タスクがSupabaseへ直接書く場合も、同じ項目を保持してください。

- 問い合わせのオーナー管理項目: `status`, `owner_memo`, `category`, `urgency`
- SNSのオーナー管理項目: `body`, `scheduled_at`, `status`, `owner_memo`
- FAQのオーナー管理項目: `proposed_answer`, `status`

## Gmail / X連携の拡張点

Gmail連携はメッセージIDを `sourceRef` に保存し、本文・送信者・日時を正規化してから `inquiries.json` または `operation_inquiries` を更新します。管理画面から直接返信する機能を追加する場合も、送信はサーバー側の所有者確認済みエンドポイントへ分離してください。

X連携は投稿候補と実績取得を分けます。投稿APIを追加する場合は、`承認済み` だけを対象にし、投稿結果のIDと時刻を保存してから `投稿済み` へ遷移させます。アクセストークンをWebクライアントやJSONへ含めないでください。
