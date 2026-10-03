# 完全版のv2商品への移行（2026-10-03）

## 完了

- App Store Connect商品6818513478を読み取り確認。Product ID `com.shoseijutsuroku.premium.30days.v2`、NON_RENEWING_SUBSCRIPTION、READY_TO_SUBMIT、日本の手動価格320JPY、日本語ローカリゼーション、審査画像COMPLETE。
- クライアントとサーバーの商品設定を `supabase/functions/_shared/apple-products.ts` に一本化。新規購入はv2のみ。旧 `jp.shoseijutsuroku.app.complete30days` は既存署名済み購入の検証・復元互換として認識する。誤作成の非消耗型 `com.shoseijutsuroku.premium.30days` は認識しない。
- サーバーのApple署名・Bundle・環境・Non-Renewing Subscription・数量・購入者の照合は維持。720時間の期限・返金・取引所有者のDB処理は変更なし。
- 本番 `apple-purchase` v8、`apple-notifications` v10へ配布し、取得したデプロイ済みソースが同じ共有設定であることを確認。デプロイ時は既存の各関数ファイルを保存したまま検証部分のみ差し替えた。既存 `access` v19は変更していない。
- 本番スモーク：未認証購入は401 authentication_required。偽通知は503 notification_not_processedで権限を付与しない。
- TypeScriptチェック、ユニット50件、Deno実行テスト3件、PGlite権限回帰テスト、共有商品設定のDeno型チェックが成功。Denoの全サーバー型チェックはローカルnode_modulesの@types/node解決エラーのため実行できず、実行テストは --no-check を使用。
- `ios:preflight` は新商品IDとの一致を必須にした。`build24` プロファイルに同じ公開商品IDを明記。アプリ番号24を準備。
- ローカルiOSエクスポート成功。ソースマップに共有設定が1件だけ含まれ、購入処理が新IDを参照し、最新「探す」の共有画面を維持していることを確認。

## 未完了

1. build24を1回実行したが、共有商品IDファイルが `.easignore` で除外され、POST_INSTALL_HOOKがERR_MODULE_NOT_FOUNDで停止した。ビルドID `cb6aa790-3885-44c1-950c-8e6cadca2673`、予約提出 `170ccca1-26bd-4ba6-b39c-b9c01f5ed9d1` はCANCELED。IPAは生成されていない。除外ルールを修正し、EASのarchive検査で旧ルールの欠落を再現・修正後のフック成功を確認した。サーバー関連では公開商品IDファイル1件だけが含まれ、秘密鍵・環境ファイルは含まれない。再ビルドは追加許可待ち。
2. 配信されたIPAでビルド番号・新規購入IDを再確認。
3. iPhoneでv2商品のSandbox購入、完全版の解放、再起動・復元を確認。ソーステストを実機購入成功として扱わない。
4. 指定動画 `WQJF6177[1].MP4`（158.22秒）の撮影OSはユーザー回答でiOS 26.6。2026-10-03のApple公式情報では最新は27.0.1なので「最新OSで撮影」と記載できない。既存録画をv2商品での購入成功証明と誤記しない。配信後の新ビルドを最新OSで確認した追加録画が必要。
5. 審査メッセージ・Notes・下書きのビルドを新番号に合わせ、アプリとv2商品の2項目を同じ提出物として審査提出する。自動公開へ変更しない。

ビルドは1回の明示許可に基づいて開始した。失敗後の再実行・審査メッセージ送信・審査提出は行っていない。失敗原因の修正は `.easignore` のみに限定し、商品ID・購入ロジック・価格・期間は変更していない。
