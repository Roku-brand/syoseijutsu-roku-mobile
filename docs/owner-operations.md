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
3. GPT Work は専用の `operations-mcp` 取込アプリを使い、問い合わせ・要約・返信案・対応評価・FAQ候補・実行結果を Supabase へ反映します。
4. 取込前に前回成功日時と処理済み Gmail messageId を取得し、成功した場合だけチェックポイントを更新します。失敗時はエラーだけを記録し、次回に再試行できる状態を保ちます。

`operations-mcp` は問い合わせの送信や Gmail の変更を行わず、同期状態の取得、成功結果の記録、失敗結果の記録だけを公開します。取込キーの平文はリポジトリへ保存せず、Edge Function は SHA-256 ハッシュだけを保持します。

5. 問い合わせ本文・送信者・要約などの個人情報は、公開 GitHub リポジトリの `operations/*.json` には保存しません。
6. 管理画面はSupabaseの実データを読み、オーナーが問い合わせ状態、メモ、SNS候補、FAQ候補を更新します。更新内容はRLSでオーナーだけに許可されます。

データが0件のときは空状態を表示します。Supabase取得に失敗したときは原因を明示し、架空データで正常に見せかけません。

## 外部タスクが更新する場所

問い合わせ定期タスクは `operations-mcp` 経由でSupabaseだけを更新します。公開リポジトリのJSONへ問い合わせデータを書き込んではいけません。

機密情報を含まないSNS案など、GitHub経由の処理では次のファイルを使用できます。

- `operations/social-posts.json`: X投稿候補、予定日時、生成理由、実績
- `operations/ai-tasks.json`: 各定期タスクの最終結果、次回予定、処理件数、エラー、更新先
- `operations/faq-candidates.json`: 問い合わせから抽出したFAQ候補
- `operations/activity-log.json`: AIとオーナーの監査ログ
- `operations/dashboard.json`: 対象期間とデータソースの宣言

各JSONは `schemaVersion`、`updatedAt`、`items` を持ち、各項目は一意な `id` と `status` を持ちます。未連携時の `items` は空配列です。更新前後に `pnpm operations:validate` を実行してください。

リポジトリへ反映したJSONは、GitHub Pagesの公開処理中に `pnpm operations:sync` で Supabaseへ upsert されます。`operations-mcp` はSupabase Edge Function内だけでサービスロールを使用します。サービスロールキーをタスクのプロンプト、リポジトリ、ログ、生成JSONへ含めないでください。

## 競合を避ける運用

JSON同期は同じ `id` を更新します。`scripts/sync-operations.mjs` は既存行のオーナー管理項目を保持してから同期するため、管理画面で行った判断を次回の公開処理で戻しません。定期タスクがSupabaseへ直接書く場合も、同じ項目を保持してください。

- 問い合わせのオーナー管理項目: `status`, `owner_memo`, `category`, `urgency`
- SNSのオーナー管理項目: `body`, `scheduled_at`, `status`, `owner_memo`
- FAQのオーナー管理項目: `proposed_answer`, `status`

## Gmail / X連携の拡張点

Gmail連携はメッセージIDを `sourceRef` に保存し、本文・送信者・日時を正規化してから `operation_inquiries` を更新します。成功実行では `operation_faq_candidates`、`operation_ai_tasks`、`operation_activity_log` と非公開の `operation_automation_state` も更新します。管理画面から直接返信する機能を追加する場合も、送信はサーバー側の所有者確認済みエンドポイントへ分離してください。

X連携は投稿候補と実績取得を分けます。投稿APIを追加する場合は、`承認済み` だけを対象にし、投稿結果のIDと時刻を保存してから `投稿済み` へ遷移させます。アクセストークンをWebクライアントやJSONへ含めないでください。
