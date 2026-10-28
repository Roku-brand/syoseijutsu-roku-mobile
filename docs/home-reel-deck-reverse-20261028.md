# 全幅リールと最下段から戻るカード

## 変更

- 上部リールの最大幅1040px・左右12px・上8px・角丸を外し、ヘッダー直下の利用可能幅いっぱいに復元。PCは従来の380px高、スマホ・タブレットは従来の幅/高さ1.7・最低205pxに合わせた。編集テーマ4枚・遷移先・自動再生・操作は維持する。
- デッキのカード順を常に `現在位置 + 深さ` に固定した。戻る方向へ操作した時に背後の並びを反転させない。5枚構成では直前のカードは常に最下段（深さ4）になる。
- 右スワイプでは現在のカードを右へ捨てず、最下段の直前カードを指に追従して右へ引き出す。右側を抜けた時点で前面へ移し、中央に重ね直す。他の4枚は一段ずつ奥へ移る。
- 閾値未満なら、最下段のカードと残りのデッキを元の位置に戻す。前へ・戻るボタンと左右キーも同じ規則を使用する。
- Webは前回導入したrequestAnimationFrame / Web Animations API、nativeはnative driverを維持。内容を描画するのは現在と次（戻る間は最下段）の2枚で、残り3枚は紙面。スワイプ中のシャッフルボタンの見た目は変えない。
- 無料版の完全版LP導線、5枚循環・全件交換、保存・履歴・状態保持は維持する。

## 検証

- 型チェック・全体Lint・Web/iOS書き出し成功。
- カード座標の単体テスト3件通過。逆方向の終端が新しいデッキの配置と一致すること、キャンセル時に全カードが元の位置へ戻ることを確認。
- Chromium関連51件通過。375/390/430/768/1440pxで全幅・ヘッダー直下を座標検証。
- 戻る経路の実描画を検証。最下段の内容が直前のカードであること、前面のカードが飛び出さないこと、引き出したカードが前面で中央へ戻ること、次へ進めば同じ順序へ戻ることを確認。
- WebKitでも逆方向の実描画を3回連続で検証済み。前面に移る瞬間の位置と実際のキーフレームを観測し、ブラウザのRAF採取頻度に依存しない検証にした。WebKit一式は16件通過・Chromium専用CDPテスト1件対象外。公開CI・本番確認も完了した。

iOSはJS/アセットの書き出しまでで、実機・署名済みストア配信は対象外。

## 公開と本番確認

- 公開URL：https://app.shoseijutsuroku.com/
- PR：https://github.com/Roku-brand/syoseijutsu-roku-mobile/pull/204 （マージ済み）
- 公開コミット：`870931dc2a4dac92d67ea7fc777dffdb6b916b6f`
- PR CI：https://github.com/Roku-brand/syoseijutsu-roku-mobile/actions/runs/40633129962 （全307件通過）
- 公開ワークフロー：https://github.com/Roku-brand/syoseijutsu-roku-mobile/actions/runs/40633555114 （成功、全307件通過）
- 本番390px・1440pxでヘッダーとリールの左右端、ヘッダー直下であることを座標検証。5枚循環・循環境界の前戻り・全件交換・無料LP・保存・詳細往復・再読込・PC矢印・ボタン非点滅も通過。
- 本番の実コンテンツで、最下段から引き出す途中、前面へ戻る途中、復帰後を撮影・目視確認。中間画面は実際のWeb Animations APIのアニメーションを一時停止して撮影した。
- CPU4倍負荷の前送り8回計測でも、画像2枚、平均約16.9ms・p95約16.8ms・34ms超0回・シャッフルボタン透明度1を維持。実機FPSの保証ではない。

記録：`release-evidence/home-reverse/production-verification.json`、`production-reverse.json`、`performance.json`。

[本番スマホ](../release-evidence/home-reverse/production-home-390.webp) / [本番PC](../release-evidence/home-reverse/production-1440.webp) / [最下段から引き出す](../release-evidence/home-reverse/production-pull-bottom.webp) / [前面へ戻る途中](../release-evidence/home-reverse/production-return-over-front.webp) / [戻った状態](../release-evidence/home-reverse/production-returned.webp)