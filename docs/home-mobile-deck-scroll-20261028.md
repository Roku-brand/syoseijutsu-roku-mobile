# スマホのホーム末尾・デッキ位置合わせ（2026-10-28）

## 変更

- スマホ幅（700px未満）では、おすすめを最後のセクションとして画面の実際の表示高に合わせる。ホーム末尾の136pxの余白を除き、操作部をボトムナビ上へ配置。
- デッキの先頭まで残り180px以内（画面高の28%以内）に下へスクロールし、指を離してスクロールが止まると位置を揃える。上へのスクロール、遠い位置、画面より長いカード領域の下部には介入しない。
- スクロール中は参照値とタイマーのみを更新し、カードを再描画しない。動きを減らす設定では位置合わせのアニメーションを省く。
- カードから詳細へ移動した場合は、復帰時にデッキの先頭を再計算して復元する。その他の導線では、離れる前のスクロール位置を復元する。5枚の順序・種類・現在位置の既存保存処理は維持。
- Safariのツールバーや画面高変更に伴う一時的なスクロール補正を吸収する。Webの初回寸法取得はハイドレーション前から登録する。
- タブレット・PCのスクロール、共通ヘッダー、ナビ、無料版の完全版バナー、カルーセル、デッキのモーションは維持。

## ローカル検証

- TypeScript、全体Lint、差分チェック：成功。
- デッキ単体テスト：15件成功。
- Web・iOS export：成功。
- 新規スクロールE2E：Chromium 8件成功、WebKit 7件成功（CDP実タッチ1件はChromium専用のためスキップ）。
- 最終コードで、新規スクロールと既存デッキ・フィルタ・ホーム回帰を合わせた36件すべて成功。
- 375・390・430px、667pxの低い画面、932pxへの画面高変更、768・1440pxを確認。詳細復帰はブラウザの戻るとヘッダーの戻るを確認。
- ネイティブiOSはバンドル確認のみ。実機によるネイティブジェスチャーの確認は未実施。

## 公開

- [PR #208](https://github.com/Roku-brand/syoseijutsu-roku-mobile/pull/208) をマージ。配信コミットは `eeb2fe2368142214affc3f2bc3d9e898cd58f522`。
- [PR全体CI](https://github.com/Roku-brand/syoseijutsu-roku-mobile/actions/runs/40671499810)：成功、E2E 321件成功。
- [Web公開CI](https://github.com/Roku-brand/syoseijutsu-roku-mobile/actions/runs/40672078306)：成功、E2E 321件成功。Pagesへの配信バージョンを照合済み。
- 2026-10-28 19:39 JST に [公開先](https://app.shoseijutsuroku.com/) を検証。モックなしの新規ブラウザセッションで、Chromium 375/390/430/768/1440px、WebKit 390pxを確認。
- スマホでの自動位置合わせ、理論詳細からのヘッダー戻る、同じカード・種類・02/05の復元、上方向の自由なスクロール、無料版LP往復、932pxへの画面高変更を確認。タブレット・PCは自由なスクロールと横幅を確認。
- 追加のローカル会員更新fixtureでも、完全版バナー削除後のデッキ位置（458px→334px）を追従することを確認。
- 生の測定結果：[production-verification.json](../release-evidence/home-scroll/production-verification.json)

## 最終画面（公開先で撮影）

- [スマホ390px](../release-evidence/home-scroll/production-chromium-390.webp)
- [詳細から復帰・理論・WebKit](../release-evidence/home-scroll/production-return-webkit-390.webp)
- [スマホ375px](../release-evidence/home-scroll/production-chromium-375.webp) / [430px](../release-evidence/home-scroll/production-chromium-430.webp)
- [タブレット768px](../release-evidence/home-scroll/production-chromium-768.webp) / [PC1440px](../release-evidence/home-scroll/production-chromium-1440.webp)
画像生成・新規画像アセットは不要のため使用なし。
