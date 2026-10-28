# 無料版LP導線の復元とホームデッキの軽量化

## 変更

- 無料版ホームに従来の完全版バナーを復元。既存の画像、文言、価格定数、`upgradeRoute('home_banner')` をそのまま使用する。完全版利用者には表示しない。
- 5枚のデッキと全件交換の推薦仕様は維持し、文字・画像を描画するのは手前と次の2枚だけにした。奥の3枚は色・枠・影・傾きを持つ紙面にして、隠れている画像やテキストの処理を減らす。
- WebのドラッグはrequestAnimationFrameで1フレームにつき1回だけtransformを反映。指を離した後はWeb Animations APIで5枚のtransformを処理し、AnimatedのJavaScript補間を毎フレーム実行しない。
- 戻りは一度だけ計算した減衰スプリングのキーフレームをブラウザへ渡す。カード送りは190〜270msへ短縮。nativeは既存のnative driverを維持する。
- スワイプ中のシャッフルボタンの透明度変更を廃止。入力の重複防止は維持し、シャッフル自体の実行中だけ表示を変える。
- 画像の先読み、縦スクロールとの分離、Reduced Motion、キーボード、保存、詳細往復、5枚循環、全件交換は維持する。

## 検証

TypeScript・全体Lint、Web/iOS書き出し成功。Chromiumの関連49件通過。無料版LP遷移、完全版でのバナー非表示、ドラッグ追従、スプリング、前後移動、5枚循環、全件交換、保存・履歴・詳細往復、シャッフルボタンの透明度がスワイプ中ずっと1であることを検証した。

WebKit一式は15件通過・Chromium専用CDPテスト1件対象外。ドラッグ・スプリング・全件交換・LP遷移・ボタン非点滅を確認した。ドラッグの反映を同期的に読む旧テストは、次のアニメーションフレームを待つように更新して再検証した。公開前CI・公開ワークフローの全306件が通過し、本番検証も完了した。計測はWindows上のChromiumで行う参考値であり、実機のFPSを保証するものではない。iOSはJS/アセット書き出しまでで、実機テスト・ストア配信は行っていない。

## 負荷計測

同じWindows環境のChromiumでCPUスロットリング4倍、8回のスワイプを計測。他のローカルブラウザテストを停止して計測した。

| 指標 | 変更前 | 変更後 |
| --- | --- | --- |
| デッキ内の画像ノード | 5 | 2 |
| 平均フレーム間隔 | 20.50ms | 17.09ms |
| 95パーセンタイル | 33.4ms | 16.8ms |
| 99パーセンタイル | 83.3ms | 33.4ms |
| 34msを超えるフレーム | 17 | 0 |
| スワイプ中のシャッフルボタン最小透明度 | 0.65 | 1 |

計測記録は `release-evidence/home-swipe/performance-before.json` と `performance-after.json`。変更後の初回計測は他のテストと並行していたため、比較表には使用せず、テスト終了後に単独計測した結果を採用した。実機のFPSを保証する数値ではない。
## 公開・本番確認

- 公開URL：https://app.shoseijutsuroku.com/
- PR：https://github.com/Roku-brand/syoseijutsu-roku-mobile/pull/203 （マージ済み）
- 公開コミット：`f393d77791940c9736c367e51e8006d144aa842c`
- 公開ワークフロー：https://github.com/Roku-brand/syoseijutsu-roku-mobile/actions/runs/40629358265 （成功、306件通過）
- PR CI：https://github.com/Roku-brand/syoseijutsu-roku-mobile/actions/runs/40628946279 （成功、306件通過）
- 公開後に390px・1440pxの実サイトで確認。無料版バナーと旧LP遷移、手前2枚の画像と奥3枚の紙面、実際のドラッグ中からリリース後までシャッフルボタンの透明度が1のままであることを確認した。
- 5枚循環・前戻り・全5枚交換・保存・詳細往復・再読込保持・PC左右矢印・横はみ出しなしも通過。
- 本番は実際の公開CMS・画像・フォントで検証し、APIモックは使っていない。DB移行とバックエンド配信は実施していない。

[本番スマホ初期画面](../release-evidence/home-swipe/production-390.webp) / [スマホのデッキ](../release-evidence/home-swipe/production-deck-390.webp) / [本番PC](../release-evidence/home-swipe/production-1440.webp)

本番の記録は `release-evidence/home-swipe/production-verification.json`。iPhone実機・署名済みiOSストア配信は未実施。