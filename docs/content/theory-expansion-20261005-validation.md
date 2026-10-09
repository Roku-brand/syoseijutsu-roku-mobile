# 理論追加の検証記録（2026年10月5日）

## 本番DB

2026-10-05 02:09:56 UTCに、ガード付きSQLを適用後の正本を確認した。

- 公開理論：754 → 794（新規40、統合0、削除0）。物理799行、旧ID互換5行。
- 無料151、完全版のみ643。内部分類48。
- 追加40件の本文・出典・別名・分類・表示ID・順番・関連理論がリポジトリと一致。
- 完全版への投影：40/40。匿名のpublic_theoriesは40件とも本文空、出典null。
- 実際の匿名REST APIでも40件のタイトル・分類が一致（HTTP 200）、完全版本文・出典の露出0。匿名でのpaid-content取得はHTTP 401。`anonymous-audit.json`に結果を保存。
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

GitHubの初回全体テストは124/125成功。残る1件は行動科学の件数を変更前の102件に固定していたため失敗した。正本metadataの件数（108件）を参照する検証へ修正し、再実行で125/125成功した。

## Web公開

公開先：[処世術禄の理論一覧](https://app.shoseijutsuroku.com/theories)。本番DBへの反映とWeb公開は完了した。

- [PR #132](https://github.com/Roku-brand/syoseijutsu-roku-mobile/pull/132)：2026-10-05 02:28:32 UTCに統合。公開コミット`8b33ae9e7448d3a006bfe5cd296dd59aac4e1ada`。
- [修正後のPRチェック](https://github.com/Roku-brand/syoseijutsu-roku-mobile/actions/runs/37255118240)：成功、125/125ブラウザテスト。
- [完全版データ保護チェック](https://github.com/Roku-brand/syoseijutsu-roku-mobile/actions/runs/37255118239)：成功。
- [Pages公開](https://github.com/Roku-brand/syoseijutsu-roku-mobile/actions/runs/37255548745)：build-and-sync、deployとも成功。公開直前にも125/125ブラウザテスト。
- 実サイトの匿名ブラウザで`Proteus effect`、`CBT`、`SWOT`、`カリギュラ効果`を検索し、該当タイトルが表示されることを確認した（すべてHTTP 200）。
- 公開一覧に794件が表示され、「心理学 > 発達」とピアジェのカードを確認。モバイル横はみ出しなし。起動画面が消えた後の発達見出し・追加カードも目視確認した。
- 実サイトの記録：`theory-expansion-20261005-live-audit.json`。スクリーンショット：`test-results/theory-expansion-live-development.png`（ローカル検証用）。

この追記は監査資料のみの変更であり、配信されたアプリ・カタログ・DBは変更していない。
