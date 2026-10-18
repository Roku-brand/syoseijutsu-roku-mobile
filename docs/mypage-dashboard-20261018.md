# マイページ刷新（2026-10-18）

## 画面構造

初期画面の「閲覧履歴／蔵書／マイ処世術」タブを廃止し、次の順に縦スクロールで表示する。

1. プロフィール：既存の名前・アイコン・会員状態、編集・設定への導線。
2. いまの座右の銘：既存の巻物画像と編集機能を継続。
3. お気に入り：対人術・仕事術・人生術の画像付き3カード、理論・特集の件数、「すべて見る」。
4. マイ処世術：作成日時順の最新3件、作成・全件表示への導線。三点メニューに編集・移動・削除を集約。
5. 閲覧履歴：一覧を常時展開せず、専用画面へ遷移。処世術・理論・特集の切り替えは履歴画面内で継続。

未ログイン時などプロフィール画像が未設定の場合は、一般的な人型のシルエットを表示する。設定済みのプロフィール画像は引き続き使用する。

## 件数と分類

- 保存配列のIDを表示時に `Set` で重複排除する。保存レコード自体は書き換えない。
- 処世術は既存カタログの `categoryKey` による自動分類。ユーザー作成フォルダーへの所属とは独立している。
- 理論・特集は、それぞれの保存IDの件数を使う。特集の件数を出すために記事本文を新たに取得しない。
- 古い不明IDは全件一覧で保存記録を維持し、分類不明の処世術を対人術へ誤って数えない。
- 理論の旧ID・canonical IDの正規化は、従来の状態復元処理を使う。
- 自作カードは既存の本文から見出し・抜粋を表示する。別のタイトル項目や新しい保存形式は追加しない。

## 共通画像

「探す」と同じ `CategoryArt category={...} compact` を使用する。参照元は `src/data/category-images.ts` の `compactTechniqueCategoryImages`。

| 分野 | 既存アセット |
| --- | --- |
| 対人術 | `assets/categories/interpersonal.webp` |
| 仕事術 | `assets/categories/work.webp` |
| 人生術 | `assets/categories/life.webp` |

新規画像の生成・複製・外部URLの追加は行っていない。巻物は `assets/my-page/personal-principle-scroll-refined.webp` と既存の背景を再利用する。

## 保存アイコン

`SaveDiamond` を共通化し、輪郭のみの菱形と、既存テーマの金色で塗りつぶした菱形を表示する。

- 処世術の検索結果一覧。
- 理論の検索結果一覧。
- 処世術・理論・特集の詳細ヘッダー。

既存の保存ハンドラーをそのまま使用し、`accessibilityState.selected` と `aria-pressed` を保存状態に同期する。重要度の星・関係図・装飾・セキュリティ表現は変更しない。

## データと既存機能の保全

保存先は従来どおり `@shoseijutsu-roku/state/v1`。保存済み、座右の銘、自作カード、両種のフォルダー、閲覧履歴のデータ形式と既存IDを維持する。プロフィール・認証・会員状態は従来の `AuthProvider` / `AccessProvider` を使い、課金やアクセス判定を変更しない。DBマイグレーションは不要。

お気に入りの詳細画面では既存のフォルダー作成・改名・移動・削除を利用できる。自作カードは一覧・ダッシュボードで同じ編集画面と操作メニューを使用する。フォルダー削除で中のカードを削除せず「未整理」に戻す。

従来の新規作成処理にあった自作カードの100件への切り詰めを除去した。300件の既存データがある場合も追加によって過去のカードを消さない。自作フォルダーの改名は既存IDを保持する追加操作として実装する。

一覧は20件ずつ表示する仕組みを継続。ダッシュボードは3枚の共通画像と最大3件の自作カードだけを表示し、特集本文や全件一覧を初期画面へ展開しない。

## 変更ファイル

画面・表示・状態：

- `src/components/my-page-content.tsx`
- `src/components/favorites-overview.tsx`（新規）
- `src/components/personal-memos-content.tsx`（新規）
- `src/components/history-content.tsx`（新規）
- `src/components/personal-section-heading.tsx`（新規）
- `src/components/save-diamond.tsx`（新規）
- `src/components/library-content.tsx`
- `src/components/book-ui.tsx`
- `src/components/technique-row.tsx`
- `src/data/personal-dashboard.ts`（新規）
- `src/state/app-state.tsx`
- `src/app/library.tsx`
- `src/app/history.tsx`
- `src/app/my-techniques.tsx`

検証：

- `tests/e2e/my-page-dashboard.spec.ts`（新規）
- `tests/unit/personal-dashboard.test.mjs`（新規）
- `tests/e2e/personal-library-design.spec.ts`
- `tests/e2e/release-smoke.spec.ts`
- `tests/e2e/brand-ui.spec.ts`
- `tests/e2e/usability-library.spec.ts`
- `tests/e2e/mobile-ui-polish.spec.ts`
- `tests/e2e/mobile-home-polish.spec.ts`
- `playwright.config.ts`（同じ静的サーバーをNodeから直接起動）
- `package.json`、`.github/workflows/pr-check.yml`、`.github/workflows/deploy-pages.yml`（単体テストを追加）

`folder-fronts.tsx`、`personal-content-card.tsx`、`personal-library-theme.ts`、カテゴリ画像は既存実装を再利用し、複製しない。

## 検証結果

- TypeScript：成功。
- ESLint（src / scripts / tests）：成功。
- 単体テスト：3件成功（重複排除、作成日順、既存本文からの見出し・抜粋）。
- 全ブラウザ回帰テスト：242件成功。空状態、3分野・理論・特集の実件数、重複保存、未ログインでの作成、編集、削除、フォルダー作成・改名・移動・削除、旧ID保全、300件から301件への追加と再起動後の保持、全種の保存・解除、プロフィール・会員状態、巻物の編集、閲覧履歴、戻る操作とスクロール位置、有料コンテンツの保護を含む。
- 表示幅：320 / 375 / 390 / 430 / 768 / 1440 / 1672px。3分野カードの横並びと横方向のはみ出しがないことを確認。
- 人型アイコンへの変更後、マイページ・プロフィール関連のブラウザテスト21件、TypeScript、変更箇所のESLintを再実行して成功。未ログイン時の代替アイコンを320 / 375 / 430 / 1440pxで確認。
- 公開用と同じWeb生成手順：成功。404フォールバックとSEO出力を含む。
- 有料本文漏洩監査：3,036フィンガープリント、1,644ファイルを検査して成功。
- iOS向けJavaScript出力：ダッシュボード刷新後に成功し、105アセットの存在を確認。最後の代替アイコン変更は共通のViewのみで実装し、TypeScriptとWeb表示で追加確認。

スクリーンショットは未ログインのブラウザに検証用の自作カードを保存して撮影したもの。製品の空状態にはサンプルを表示しない。

| 表示幅 | 上部 | 自作カード・履歴 |
| --- | --- | --- |
| 320px | [上部](evidence/mypage-dashboard/iphone-small-top.png) | [下部](evidence/mypage-dashboard/iphone-small-personal.png) |
| 430px | [上部](evidence/mypage-dashboard/iphone-large-top.png) | [下部](evidence/mypage-dashboard/iphone-large-personal.png) |

## 実機確認

Windows環境でiPhone相当幅のブラウザ確認とiOS向けJavaScriptの生成を実施した。iOSの実機・SimulatorでのキーボードとVoiceOverの最終確認は未実施。実機用ビルド・ストア配信は行っていない。
