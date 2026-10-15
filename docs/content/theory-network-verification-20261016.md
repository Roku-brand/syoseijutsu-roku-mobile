# 検証・公開記録

確認日：2026-10-16。ネイティブビルド・ストア配信は行わない。

## ローカル検証

- TypeScript、ESLint：成功。
- 実践知・編集・有料キャッシュ・更新通知：19テスト成功。
- 分類・旧ID・検索・追加済み理論：19テスト成功。
- 利用状況の任意送信：4テスト成功。
- PGliteによる実SQL移行：3スイート成功。39件の公開終了、原典未確認・権利NULLの公開拒否、自己参照・重複・包含循環、匿名・非所有者アクセス、競合更新、旧リンク・ID・表示番号・6分類36内部分類を検証。
- 全Web回帰：205件を実行し202件成功。新しい関連欄と正本の参照差分に対応する3件を更新し、今回の8件とあわせた11件の最終ビルド検証がすべて成功。
- 公開本文監査：3,055個の有料本文・原文・訳文等の識別文字列を1,644ファイルで検査し漏洩0。短い格言も文字数で除外しない。39件の旧名称が公開ビルドに残っていないことも確認。
- SEO：273の公開URL、理論141・処世術95、私的ルート12を確認。
- コンテンツ：821理論・356処世術、権利監査、リンク整合性、21学習ケースと63選択肢、320円の一回払い・購入条件の回帰検査に成功。
- 本番DB：匿名と利用権なしのauthenticatedロールで、有料本文・格言メタデータ・監査候補・保護された関連の根拠が読めないことを確認。

## 正本と生成物の既存差分

改修前のSupabase正本の処世術リンクは1,092件、過去の生成JSONは1,388件で、114処世術に差があった。[比較記録](theory-source-link-reconciliation-20261015.json)を保存した。今回の正本は指示どおりSupabaseを採用し、生成物だけに存在する296件分の差を無審査で再投入していない。

正本1,092件からオリジナル名言への参照35件を外し、個別に確認した仕事術と格言への追加・解除を反映した最終値は1,075件（主要436、補足639）。この差分を、313件の関連を今回の編集で一括削除したものとして扱わない。

kb_706への処世術リンクは改修前の正本にも存在しないため、UIは存在しない関係を作らない。master336-072の主要理論も正本の空配列を保持。今後、生成物だけの候補を再収録する場合は個別の本文照合が必要。

## スクリーンショット

撮影はブラウザの検証用アカウント・通信モックを使用し、実利用者の情報は含まない。

- [格言詳細・スマートフォン](evidence/theory-network-20261015/historical-quotation-mobile.png)
- [関係図320px](evidence/theory-network-20261015/knowledge-network-320.png)
- [関係図390px](evidence/theory-network-20261015/knowledge-network-390.png)
- [関係図PC](evidence/theory-network-20261015/knowledge-network-1440.png)
- [CMS原典・翻訳区分](evidence/theory-network-20261015/cms-quotation-editor.png)
- [CMS公開拒否・保留候補](evidence/theory-network-20261015/cms-rights-and-candidates.png)

中央を含むノードの重なりは、1〜6件・272／296／320／360／560pxの描画領域で単体検証し、320／390／1440pxのブラウザ画面で確認した。

## 公開

- Web公開の変更：[PR #159](https://github.com/Roku-brand/syoseijutsu-roku-mobile/pull/159)
- 全CIの結果：[PRの検証一覧](https://github.com/Roku-brand/syoseijutsu-roku-mobile/pull/159/checks)
- Web配信の結果：[Pages公開履歴](https://github.com/Roku-brand/syoseijutsu-roku-mobile/actions/workflows/deploy-pages.yml)
- 公開先：[処世術禄](https://app.shoseijutsuroku.com/)

上記のリンクから、この変更に対する最新の検証・公開状態を確認できる。全CIの成功を確認してからマージし、Web配信後に本番の公開終了URL・無料理論・格言のアクセス制限・関連図を確認する手順。

変更ファイルは [ファイル一覧](theory-reform-changed-files-20261015.txt) を参照。
