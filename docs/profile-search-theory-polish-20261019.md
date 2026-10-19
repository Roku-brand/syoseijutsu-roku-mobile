# マイページ・検索・理論概要の改善（2026-10-19）

## 画面の変更

- マイページの名前の右にあった歯車を削除。既存の設定画面やプロフィール編集は維持する。
- 表示名の入力文字を18pxにし、入力欄が小さいために生じるモバイルブラウザのフォーカス拡大を避ける。ピンチズームを禁止する設定は追加していない。
- Webでは入力へのフォーカスと画面高の変化後に、入力欄をスクロール領域内の見える位置へ移す。iOS側は画面上端の位置を考慮するKeyboardAvoidingViewを使う。
- 日本語変換中の文字を毎回valueで書き戻さず、編集中は遅れて届くプロフィール情報でも上書きしない。24文字の制限は保存時に確認する。失敗後も入力を保って再試行できる。
- ヘッダー検索の左上にあった「検索」の見出し行を削除。処世術・理論・特集のタブと閉じるボタンを同じ段に置き、入力欄を上へ詰めた。検索実行・閉じる・外側タップ・キーボード操作を維持する。

## 理論概要

正本 `public.theories` の公開945件を、長さ、定義の位置、一般的な否定補助、監査向け注記の混在で点検した。抽出した通常の理論267件と格言19件、計286件を改稿した。意味の核を冒頭に置き、必要な成立条件や具体例を短く残す。

メラビアンの法則：

> 好意や反感を伝える言葉と声・表情が食い違うと、受け手は声や表情を重視して相手の気持ちを判断しやすい、という研究知見。

対象が感情・態度の伝達であることは、[Mehrabian本人の説明](https://www.kaaj.com/psych/smorder.html)に基づく。一般的な注意書きの段落にせず、定義の中に成立条件を含めた。

格言は、承認済みの言葉・著作者・原典・翻訳・権利記録を変更せず、`quotation.contextNote` の説明を改稿した。例えば自由を山頂の空気にたとえる言葉は、科学理論との違いを説明する注記から、自由が持つ負担を読み取る説明へ変更した。

全286件の変更前・変更後・編集理由は [個別変更表](content/theory-summary-review-20261019.json) に記録している。

## 正本・データ保全

- 989レコード（公開945・アーカイブ44）のバックアップを作成。変更対象286件はDB内の `private.theory_reform_backups` にも保存した。phaseは `summary-editorial-20261019`。
- 適用履歴：`20261018163911_theory_summary_editorial_polish.sql`。更新前の文面が一致しない場合に中止するガードを入れた。
- 更新後の照合では、変更は286件の概要、格言の文脈説明、更新日時に限定。安定ID・名前・分類・並び順・別名・関連付け・無料/完全版の区分を保持した。
- 6大分類・36内部分類、19件の引用原文・翻訳・権利情報に変更なし。有料本文の配信テーブルと正本の概要の不一致は0件。
- 作業開始時のバンドル821件に対し、並行して公開された945件への増補を取り込んだ。最終カタログ945件のうち該当する286件の概要を、反映後に再取得した正本から同期した。追加124件も削除・再採番せず保持する。
- 公開バンドルは既存の生成処理で再生成。完全版本文は引き続き空のシェルとし、無料版・完全版の境界を維持する。
- ユーザーのプロフィール、保存、履歴、課金データに本番の書き込みはしていない。プロフィールの保存テストには架空の通信応答を使った。

復元は [ロールバックSQL](content/theory-summary-rollback-20261019.sql) を使う。今回の変更後の文面と一致していることを確認してから、概要と文脈説明だけを戻す。後から行われた別の編集を無条件に上書きしない。

## 検証

- TypeScript・全Lint：成功。
- 全単体テスト73件：成功。更新前のガード、286件の反映と復元、格言の権利情報、ID・公開範囲・関連付け・非対象レコードの保全を含む。945件の増補と286件の改稿を順に適用する統合テストでも、権限・有料配信・CMS・二段階の復元を確認した。
- 統合後の関連ブラウザテスト49件：成功。表示名の入力・日本語変換中の保持・遅い取得・保存失敗と再試行・保存後の再読み込み、検索、分類、格言、保存機能、分類内リールを含む。
- 320 / 375 / 430pxのプロフィールを高さ390pxへ縮め、入力欄が表示領域内に残ることを確認。検索ポップアップは320 / 390pxで見出し行がなく、高さ150px以内に収まる。
- Web生成・SEO出力：成功。有料本文漏洩監査は3,555フィンガープリント・1,768ファイルを検査して成功。

スクリーンショット：

- [表示名・320px](evidence/editorial-ui-20261019/profile-320.png)
- [表示名・375px](evidence/editorial-ui-20261019/profile-375.png)
- [表示名・430px](evidence/editorial-ui-20261019/profile-430.png)
- [検索・320px](evidence/editorial-ui-20261019/search-320.png)
- [検索・390px](evidence/editorial-ui-20261019/search-390.png)
- [メラビアンの法則](evidence/editorial-ui-20261019/mehrabian.png)
- [パスツールの格言](evidence/editorial-ui-20261019/pasteur.png)
- [ワイルドの格言](evidence/editorial-ui-20261019/wilde.png)

これはブラウザの画面高を変更した検証で、iPhone実機のソフトウェアキーボードやSafariの自動拡大を直接操作した検証ではない。iOS・Android実機での最終確認は未実施。新たなストア用ビルドは作成していない。

## 主な変更ファイル

- `src/components/my-page-content.tsx`
- `src/app/settings/profile.tsx`
- `src/components/header-search-action.tsx`
- `src/data/generated/theories.json` / `theories.public.json` / `home-brand-content.json`
- `scripts/review-theory-summaries-20261019.mjs`
- `scripts/build-summary-editorial-migration.mjs`
- `scripts/sync-reviewed-summary-catalog.mjs`
- `supabase/migrations/20261018163911_theory_summary_editorial_polish.sql`
- `tests/e2e/profile-input.spec.ts` / `header-search.spec.ts` / `theory-taxonomy.spec.ts`
- `tests/unit/theory-summary-editorial.test.mjs` / `theory-coverage.test.mjs` / `theory-taxonomy.test.mjs`
- `tests/unit/theory-release-20261018.test.mjs` / `scripts/verify-theory-release-20261018.mjs`（増補と概要改稿の順次適用、権限、CMS、両段階の復元を検証）
- `package.json` / `.github/workflows/pr-check.yml` / `.github/workflows/deploy-pages.yml`
