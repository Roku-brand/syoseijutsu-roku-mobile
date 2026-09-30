# コンテンツ管理の正本と移行

## 現行データの対応

| 対象 | 正本 | 関連・分類 | 公開先 |
| --- | --- | --- | --- |
| 人物像 | `public.personas` | `category` → `content_categories`、`techniques.persona_id` → 人物像名 | 人物像一覧・詳細 |
| 処世術 | `public.techniques` | `persona_id`、`category`、`theory_ids`、`primary_theory_ids` | 探す、カード詳細、完全版 |
| 理論 | `public.theories` | `category_id` → `content_categories`、`related_theory_ids`、処世術の `theory_ids` を逆引き | 探す、理論詳細、完全版 |

移行前の公開アプリは同梱JSONを初期表示し、Supabaseの公開行で上書きしていた。人物像のサブタイトルと画像はTypeScriptの定数、無料版の対象IDは生成JSON、完全版の本文は`paid_content`にも保持されていた。`paid_content`は今回の移行後、正本テーブルからトリガーで更新する配信用の投影となる。`learning`の行は対象外。

## 追加した管理フィールド

- 人物像に不変の`id`、サブタイトル、画像パス、公開状態、無料/完全版、下書き中の関連候補。
- 処世術に画像パス、タグ、無料/完全版。既存の`display_order`をカテゴリ内で正規化。
- 理論に画像パス、無料/完全版、下書き状態、下書き中の関連候補。
- カテゴリ名と順序を`content_categories`へ正規化。所属と`display_order`は別の列で管理する。

画像は既存の同梱画像を`bundled:persona-XX.webp`として参照し、新しい画像はSupabase Storageの`content-images`に保存する。CMSは参照数を確認してから未使用ファイルだけ削除する。

## 移行順

1. `20260928093000_canonical_content_cms.sql`: スキーマ、カテゴリ、保存RPC、参照ガード、Storage、完全版投影。
2. `20260928093100_cms_existing_content_backfill.sql`: 同梱JSONに基づく無料版ID、人物像の画像とサブタイトル、従来の公開対象から外れていた20件の下書き化。
3. `20260928093200_cms_order_normalization.sql`: カテゴリ・人物像・処世術・理論の安定した順序。
4. 変更後のアプリと`paid-content` Edge Functionを配布する。

2番のSQLは`scripts/generate-cms-backfill.mjs`から再生成できる。移行時点の同梱JSONを使用すること。移行後はJSONを編集元として使わない。

## 検証

ローカルのPostgres互換DBで、人物像の作成・改名・所属変更、理論の公開と関連処世術への逆引き、処世術の下書きと公開、画像パス、`paid_content`への投影、参照中の非公開防止、順序変更を確認した。`pnpm typecheck`と既存ユニットテストも通過。

2026-09-29に本番Supabaseへ3件のCMS移行を適用した。適用後はカテゴリ9件、人物像27件、処世術359件、理論768件を維持し、完全版の配信用投影は処世術241件・理論617件となった。無料版は処世術95件・理論151件で、対象外の処世術20件を下書き化した。旧来のApple IAP移行もリポジトリの履歴に復元した。

GitHub Actionsの公開用ビルド、型検査、コンテンツ監査、86件のPlaywright E2Eは成功した。本番のEdge Functionsも更新済み。GitHub Pagesは`main`ブランチから公開する環境設定のため、ブランチ上の試験実行では公開ジョブのみ拒否された。

## 既知の制約

既存のRLSは公開行を匿名クライアントから読める設計であり、無料/完全版の切替はアプリUIと`paid-content`の配信制御で行われる。完全版本文そのもののDBレベルの非公開化には、公開読み取りAPIを分ける追加移行が必要。

