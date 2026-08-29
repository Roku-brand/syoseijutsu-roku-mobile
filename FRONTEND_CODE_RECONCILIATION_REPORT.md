# フロントエンドコード整理・現行UI照合レポート

## 結論

公開サイトを正として、現行UIに影響しない旧UI部品・到達不能な表示部品を整理した。レスポンシブ判定の初期描画差異を減らすため、共通 `Screen` と購買画面の寸法参照をhydrated後のフックへ統一した。画面の見た目、文言、導線、カード構造、本文データ、アクセス制御は維持している。

## 調査方法と正規仕様

2026-08-30にChromeで公開サイトを、1440×900と390×844で確認した。Welcome、ホーム、探す、学ぶ、マイページ、カテゴリ、テーマ、人物像、処世術詳細、理論詳細、購買、学習ケース、`/legal/privacy` を直接表示し、遷移、折り返し、スクロール、ロック、空表示、404を確認した。正規仕様は同梱の `FRONTEND_CANONICAL_SPEC.md` に固定した。

実測した現行UIの要点は次の通り。

- 主ナビは「ホーム」「探す」「学ぶ」「マイページ」。PCは左固定ナビ、スマホは下固定ナビ。
- Welcomeは「無料ではじめる」「完全版を購入する」を入口とし、後者は `/upgrade` へ遷移する。
- 探すは「処世術 336」「理論 630」とカテゴリカードを表示する。
- 学ぶは「全21ケース」を案内し、無料状態ではStage 1の7ケースを利用可能、Stage 2・3をロック表示する。
- カテゴリ→テーマ→人物像→処世術詳細、理論一覧→理論詳細の導線が到達可能。
- 理論 `kb_070` の詳細で「関連する処世術」1件として「役割と期待を明示する」が表示される。
- `/legal/privacy` は直リンクで本文を表示する。主要な直接URLは空表示や404にならない。
- 既存Chromeセッションの `/my-os` はオーナー・完全版状態だった。匿名の無料状態はロック表示と既存E2Eで検証した。

## コードとの主な相違

`src/components/ui.tsx` に、現在の参照元がない旧来の `BrandMark`、`Header`/`AppHeader`、`SurfaceCard`、`Divider`、`GoldIcon`、`TagChip`、`ListGroup`、`ListRow`、`SegmentedControl`、`ChapterTitle`、`ChoiceCard` と、それら専用StyleSheetが残っていた。共通UIの現在の実使用箇所は `AppText`、`Screen`、`DetailHeader`、`IconButton`、`Pill`、`SectionHeader`、`PrimaryButton`、`SecondaryButton`、`EmptyState` である。

また、詳細ヘッダーの実装が共通 `BookHeader` に移行済みなのに、複数画面が何も表示しない `DetailHeader` を呼び出していた。購買・共通Screenだけがrawな `useWindowDimensions` を使っており、他画面のhydrated後判定と経路が分かれていた。Welcomeや購買・学ぶ・ホームには、正本データから導出できる件数の手書き表示も残っていた。

## 整理したコード

- `src/components/ui.tsx`: 未使用の旧UI exportと専用スタイルを削除。`Screen` の幅判定を `useHydratedWindowDimensions` に統一。
- `src/components/loading-screen.tsx`: 参照元がない孤立コンポーネントを削除。
- `src/app/upgrade.tsx`: raw寸法参照をhydratedフックへ統一し、無料処世術数をアクセス設定から導出。完全版の21ケース表示は共通のアクセス設定定数へ集約。
- `src/app/welcome.tsx`: 人物像・処世術・理論の表示件数をカタログから導出。表示値は従来と同じ26/336/630。
- `src/app/(tabs)/learn.tsx`: 完全版総ケース数と無料利用可能ケース数を共通設定へ集約し、公開runtimeに完全版データがまだ展開されていない場合の既存Stage表示fallbackは維持。
- `src/app/(tabs)/index.tsx`: ホームの完全版案内に表示するケース数を学習データから導出。
- `src/app/learn/[caseId].tsx`: 学習ケース詳細の総数表示を、公開runtimeの部分データ同期で揺れない共通の完全版件数へ統一。
- `src/app/category/[key].tsx`、`src/app/legal/[document].tsx`、`src/app/settings.tsx`、`src/app/settings/install.tsx`、`src/app/settings/profile.tsx`、`src/app/theme/[category]/[title].tsx`、`src/app/theories/[category].tsx`、`src/app/topic/[slug].tsx`: 表示されない冗長な `DetailHeader` 呼び出しとimportを削除。

## 削除したコード

削除は参照検索で利用箇所がないことを確認した旧UI部品と、参照元のない `loading-screen.tsx` に限定した。コンテンツ本文、ID、タイトル、人物像分類、アクセス範囲、現行の共通ヘッダー・カード・ボタンは削除していない。

## 保留した整理候補

- `src/app/(tabs)/catalog.tsx`: `/catalog` から `/discover` へ送る互換ルート。主ナビからは隠れているが、外部リンク・旧ブックマーク互換のため保持。
- `scripts/` のコンテンツimport、検証、理論リンク監査、公開build補助: package scriptsやGitHub Actionsから参照されるため未使用と断定せず保持。
- `scripts/build-master336-theory-mapping.mjs`: 旧入力パスを持つ歴史的な生成ツールだがpackage scriptから参照されるため保持。別途リリースツール整理として扱う。
- `README.md`、`RELEASE_REPORT.md`: 過去の経緯・手順の記録であり、実UIの正本ではない。今回、現行UIを過去文書へ戻す変更は行わなかった。
- `DetailHeader`: no-op呼び出しは除去したが、コレクション画面の削除操作用inline actionで使用されるためexport本体は保持。

## UIへの影響

意図した見た目・挙動の変更はない。件数表示は従来と同じ値を共通設定または正本データから参照するようにした。`Screen` と購買画面の寸法判定は初期描画時のサーバー／クライアント差異を抑える内部整理で、hydration後のPC・スマホレイアウトは従来の表示を維持する。

## UIに影響しない変更

未使用export・StyleSheet、孤立コンポーネント、表示されない冗長な詳細ヘッダー呼び出しを削除した。公開build時にPWA cache stampが通常どおり更新されたが、これは既存の `export:pages` の生成処理によるものである。

## 検証結果

- TypeScript: `pnpm typecheck` 成功。
- Production build: `pnpm export:pages` 成功。1080静的ルートをexportし、Pages fallbackとSEO assetを生成。
- 公開build監査: `node scripts/audit-public-build.mjs` 成功。1116ファイルを確認。
- E2E: `pnpm test:e2e --reporter=line`、45/45成功。同期済み理論データのタイトルを固定値で期待していた既存テストは、現行UIの構造（非空・2行以内・作者名非表示）を検証する形へ整理した。
- Lint: `package.json` に `lint` scriptがなく、`pnpm lint` は実行不能。今回、UI整理の範囲を越えてLint基盤を新設していない。
- `git diff --check`: 成功。
- 既存Chrome実査では、PC・スマホの主要画面、直接URL、戻る導線、ロック表示、理論・処世術詳細、購買遷移、プライバシー直リンクを確認した。

## 本番確認結果

デプロイ後に同じPC・スマホ寸法で、Welcome、無料版開始、購買ページ、ホーム、探す、学ぶ、マイページ、カテゴリ、テーマ、人物像一覧、処世術1件、理論 `kb_070`、学習ケース1件、`/legal/privacy` を再確認する。特に `kb_070` から「役割と期待を明示する」へ遷移できることを確認対象とする。

## 残課題とリスク

- Lintの正式な実行基盤が未設定。導入は別タスクで、既存UIを基準にルールと違反修正範囲を合意してから行う。
- 公開Chromeの既存セッションはオーナー状態を保持するため、匿名無料状態の完全な独立ブラウザ確認には別セッションが必要。無料ロックの回帰は既存E2EとStage 2・3表示で補完した。
- コンテンツ生成スクリプト群には歴史的な入力パス・旧仕様候補が残る。package script／公開workflowとの関係を確認してから段階的に整理する。
