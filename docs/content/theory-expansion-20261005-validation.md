# 理論追加の検証記録（2026年10月5日）

## 本番DB

2026-10-05 02:09:56 UTCに、ガード付きSQLを適用後の正本を確認した。

- 公開理論：754 → 794（新規40、統合0、削除0）。物理799行、旧ID互換5行。
- 無料151、完全版のみ643。内部分類48。
- 追加40件の本文・出典・別名・分類・表示ID・順番・関連理論がリポジトリと一致。
- 完全版への投影：40/40。匿名のpublic_theoriesは40件とも本文空、出典null。
- 処世術5件の関連集合がリポジトリと一致。本番の既存リンクを削除せず、新規7組と未反映だった既存26組を反映。
- 未分類、理論リンク切れ、処世術リンク切れ、タイトル・別名の所有者競合、legacyId競合、旧ID解決失敗、表示ID重複、並び順重複・欠番：すべて0。
- 本文を含む全794件の正本ハッシュとリポジトリの期待値が一致：`186d7298d9cf5729a531fc7ebf507132`。

詳細：`theory-expansion-20261005-production-audit.json`。変更前は`before.json`と`techniques-before.json`に保持した。スキーマ、RLS、認証、課金判定の変更はない。

## ローカル検証

- lint、typecheck：成功。
- practical-wisdom/editor-schema/secure-hydration：12テスト成功。
- taxonomy：6テスト成功。旧759 IDの解決、保存の移行、全794タイトルと別名検索、対照・親子概念の保持、新規完全版の取得を確認。
- master336 catalog、theory links、theory rights：成功。356処世術、1,255リンク。
- Web export：成功。SEO監査：成功、281 indexable URLs。
- public build監査：成功。2,732個の完全版テキスト指紋を1,553ファイルと照合し、流出なし。
- taxonomy browser：5テスト成功。モバイル一覧、全件検索・旧リンク、保存互換、CMSの分類・並び順編集、新規理論の本文・出典・発達見出しを確認。

最初のブラウザ実行は、テスト環境変数未読込によりモック認証の保存先がビルドの接続先と一致せず失敗した。`node --env-file=.env.local node_modules/@playwright/test/cli.js test tests/e2e/theory-taxonomy.spec.ts`で同じビルドに接続先を合わせ、5/5成功。アプリの認証設定は変更していない。

## Web公開

公開先：[処世術禄の理論一覧](https://app.shoseijutsuroku.com/theories)。GitHubのPRチェックとPagesデプロイが全ブラウザテストを実行する。公開完了後の実行URLと実サイトの確認結果を追記する。
