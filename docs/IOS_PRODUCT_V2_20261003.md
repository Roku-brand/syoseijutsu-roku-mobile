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

## ビルド24の配信

- 初回は `cb6aa790-3885-44c1-950c-8e6cadca2673` が送信対象の不足で失敗。追加の1回についてユーザーが明示許可した後、同じビルド番号24を再実行した。合計2回の実行、成功は1回。追加ビルドは行っていない。
- 修正版のローカルコミット `47c1749`。EAS Build `e1e2a3f1-3066-43e3-b803-87b091a40640` はFINISHED、2026-10-03 11:04 JSTに完了。TestFlight送信 `ecfa79ad-13b7-480c-af3c-64b871bd84cb` はFINISHEDで、このビルドを送信したことを照合した。
- Apple build `8122d714-c9eb-4a93-b49c-a927c1a8531e` はVALID／IN_BETA_TESTING。内部グループ「１２３」にビルド24が含まれる。外部ベータはREADY_FOR_BETA_SUBMISSIONで、外部審査には送信していない。
- 配信IPAのBundle ID・1.0.0（24）・App Store署名・v2商品ID・旧商品の復元互換・最新「探す」・共通サブタイトル・運営者連絡先・StoreKitモジュール・トラッキング無効を検査し成功。配信JavaScriptで有料本文2,030指紋の検査も成功。

ビルド：https://expo.dev/accounts/shoseijutsuroku/projects/shoseijutsuroku/builds/e1e2a3f1-3066-43e3-b803-87b091a40640

## Sandbox取引の確認

2026-10-03、ユーザーが購入ページの表示を「完全版を購入」と回答した後、本番DBを読み取り確認した。v2商品にSandbox取引が1件あり、購入は2026-10-03 11:14:08 JST、期限は2026-11-02 11:14:08 JST。正確に720時間、失効なし、現在有効、関連アプリアカウントは存在する。取引・権限・アカウントへの書き込みは行っていない。現在iPhoneでログイン中のアカウントとの一致、実機での完全版表示、再起動後の復元はまだユーザー確認待ち。追加購入を求めず、先に有料詳細へのアクセスを確認する。

## 未完了

1. v2商品のSandbox取引・正確な30日間の期限はDBで確認済み。iPhoneで同じアプリアカウントに完全版が解放されたことと、再起動・復元を確認する。DB確認・ソーステスト・IPA検査を実機表示成功として扱わない。
2. 指定動画 `WQJF6177[1].MP4`（158.22秒）の撮影OSはユーザー回答でiOS 26.6。2026-10-03のApple公式情報では最新は27.0.1なので「最新OSで撮影」と記載できない。ユーザーの端末はiPhone 13 Proで、26.7.1への更新中との最新回答。更新の完了と、その後27へのアップグレード表示を確認する。既存録画をv2商品での購入成功証明と誤記しない。配信後の新ビルドを最新OSで確認した追加録画が必要。
3. 審査メッセージ・Notes・下書きのビルドを24に合わせ、アプリとv2商品の2項目を同じ提出物として審査提出する。自動公開へ変更しない。

失敗原因の修正は `.easignore` のみに限定し、商品ID・購入ロジック・価格・期間は変更していない。追加の1回は明示許可を得て実行・TestFlight配信まで完了した。審査メッセージ送信・App Review提出・一般公開は、動画と実機購入の不足があるため行っていない。
