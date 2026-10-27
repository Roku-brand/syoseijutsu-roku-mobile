# ホーム：知識をめくるデッキ

作業ブランチ：`codex/home-discovery-deck-20261028`。基準は既存の最新ローカル作業ツリー `062a9c8`。変更は独立した `home-discovery-deck-20261028` に置き、他の作業ツリーの未コミット変更は変更していない。公開・ストア提出はしていない。

## 調査と再利用した資産

- WebアプリはExpo 57 / React 19 / React Native Web、iOSは同じExpo RouterとReact Native 0.86の画面を使用する。マーケティングサイトは対象外。
- ホームは `src/app/(tabs)/index.tsx`、共通ヘッダーと余白・スクロールは `book-ui.tsx`、主ナビゲーションは既存のレイアウトで提供される。1000px以上は既存サイドナビを維持する。
- 上部カルーセルは `HomeHeroCarousel`。横送り、ループ、選択位置保持、自動再生、停止・再開、フォーカス/バックグラウンド判定を再利用した。
- 従来のおすすめは `buildReadingRecommendations` の7枚を横並びにする構成。日付・保存・履歴の更新ごとに再計算していた。今回、推薦生成と現在のデッキ状態を分離した。
- 続きから読むは `RecentReadingPreview` が履歴IDからアクセス可能な処世術・理論を解決する構成。ホームからだけ削除し、マイページ・履歴・保存データと共有コンポーネントは残した。
- 処世術は `id`、理論は `tagId` をルートキーに使用。デッキには種類付きのIDを保存し、同じタイトルでも異なるIDは統合しない。
- 同梱公開カタログ・購入者向けに取得済みのカタログ・既存のCMS公開内容を使用する。新しい全件取得APIやDB変更は追加していない。
- 明朝体、生成り、金、既存のカテゴリ色、ひし形の `SaveDiamond`、お気に入り操作、詳細の履歴記録、無料/完全版のアクセス設定を再利用した。
- ReanimatedとGesture Handlerは既存依存にある。今回は追加依存を入れず、React Native標準のAnimated / PanResponderを使用した。

## 新しいホーム

共通ヘッダー → 編集テーマのカルーセル → 人物像・ランキング・処世術を作る・特集・五大原則 → おすすめデッキ → 既存の主ナビ。

ホームの読書再開欄と、その間に入っていた購入バナーを除き、依頼された情報順序に揃えた。購入機能と設定・マイページ側の導線は維持している。

デッキは手前1枚と背後2枚だけを描画する。温かい白の表紙、明朝のタイトル、短い要約、写真、ひし形の保存、詳細への矢印で構成。理論は青灰色のラベルと表紙、書籍の写真で区別する。幅は最大356px、スマホでは画面幅から70pxを引き、左右に奥のカードを見せる。本文下にボトムナビ用の余白を確保する。

## 操作と演出

- 横9pxかつ縦移動の1.35倍を超えてからドラッグを取得する。縦スクロールには `touchAction: pan-y` を使う。画面左22pxから始まるジェスチャーは取得せず、前のカードへは44pxのボタンでも戻れる。
- 指に水平移動が追従し、回転は最大±7度。奥のカードも移動量に応じて拡大・整列する。
- 幅の24%以上、または直前の速度が0.55px/msを超えるフリックで確定。指を止めてから離す場合は古い速度を無効にする。
- 確定後は250〜360msで抜け、奥のカードが昇格する。未確定はstiffness 240 / damping 28のスプリングで戻る。
- シャッフルは収束・交差・再配置・整列を各150ms、計600ms。カード本体の移動・回転・縮小と短いフェードを組み合わせ、見えない時点で順序を交換する。
- ロック用refを使って二重入力を遮断し、ドラッグ後の誤タップを抑える。左右キーはデッキかカルーセルにフォーカスがある場合にだけ作用する。
- 保存は既存の状態を直接更新し、ひし形を短く拡大して戻す。Reduced Motion時は移動・回転を省き、設定が途中で変わっても操作を復帰させる。
- iOSではtransform/opacityにnative driverを使用。Webもtransform/opacityを中心にして、次の2枚の画像を先読みする。

## 推薦と状態保持

`useHomeDiscovery` が日付・順序・位置・シャッフル回数・最近の表示IDを管理する。推薦は24枚ずつ生成し、履歴・保存・関心カテゴリ・関連理論から親和性を得る。4枠につき「親和性2、関連1、未開拓1」を目安に、処世術と理論、連続カテゴリ、既読、直近表示を調整する。割合は暫定のルールで、ユーザー調査に基づく最適化は未実施。

表示したIDは直近120件を避ける材料にする。補充時にはまだ引いていない末尾のIDも避け、補充の境界で同じカードが再登場しないようにした。候補が尽きた場合は再循環する。戻れる順序は150枚を上限に整理し、位置の通算値は保持する。

日本時間の既存 `getHomeDayKey` で日替わりを決める。訪問中は日付が変わっても切り替えない。次回のマウント/再読み込み時に新しい日のデッキを生成する。同日なら詳細往復・再読み込み・シャッフル後の順序をAsyncStorageから復元する。保存や履歴の更新では現在のデッキを並べ替えない。

端末に保存するのはIDと順序情報だけで、有料本文は保存しない。無料/完全版の保存領域を分け、現時点でアクセスできるカタログでIDを再解決する。ストレージ読み込みは900msでフォールバックし、破損キャッシュから復旧できる。既存の「端末内データをすべて消去」はデッキ履歴も削除し、待機中の古い書き込みが復活させないようにする。

## カルーセル

1. **編集部の特集**：既存CMSの公開特集から `is_featured`・表示順で選択。未取得時は特集一覧へ案内する。週次の編集日付が存在しないため、未確認の「今週」という表現は付けていない。
2. **注目の人物像**：既存の日替わり人物像を使い、実在する人物像の一覧へ移動する。対象がなくなった場合は人物像一覧に戻す。
3. **知識のつながり**：既存のホーム編集データにある処世術と、その関連理論を表示する。専用の架空ページは作らず、関連知識を辿れる既存の詳細へ移動する。
4. **今日の問い**：実在する無料学習ケースから日替わりで選び、そのケースへ移動する。

## 画像

画像生成スキルの組み込みツールで新規写真を1点制作した。`assets/home/editorial-window-v1.webp`（1280px、78,464 bytes）を特集のフォールバック写真に使用する。既存CMSで写真が設定されていればそちらが優先される。

既存写真は `deck-interpersonal.webp`（30,728 bytes）、`deck-work.webp`（23,822 bytes）、`deck-life.webp`（86,758 bytes）、`deck-theory.webp`（21,074 bytes）へ640px幅で圧縮した。元の共有画像は上書きしていない。CMSの個別画像があれば優先し、読み込み失敗時はカテゴリ写真へ戻す。写真領域を固定しレイアウトシフトを避ける。

生成に使用した最終プロンプト：

> Create a single photorealistic editorial photograph asset for the Japanese knowledge app Shoseijutsuroku. Landscape 3:2 composition. A quiet, tasteful Japanese study beside a large wooden window in soft late afternoon natural light: one open unmarked cream paper book on a warm oak desk, a simple dark ceramic coffee cup, a small vase with green branches, soft garden bokeh outside. Restrained ivory, deep charcoal, warm honey light, subtle muted olive. Camera at desk height, intimate and authentic, fine material textures, premium literary magazine photography. The book and window light are concentrated in the right two thirds; left third is a darker naturally shadowed uncluttered area suitable for white UI title overlay. No people. No text, typography, logos, labels, writing, watermarks or UI. Avoid excessive decorative clutter and artificial bloom. Calm intellectual atmosphere matching an ivory and gold book-inspired interface.

## 検証

画面証跡は `release-evidence/home-discovery/`。375・390・430・768・1440pxの初期/次カード/シャッフル後と、ドラッグ途中・スクロール後を保存している。参考B案と比較し、左右のカードの張り出し、影、改行、余白、画像を調整した。

| 検証 | 最終結果 |
| --- | --- |
| TypeScript `tsc --noEmit` | 成功 |
| Expo Web / iOS 同時書き出し | 成功（Web JS、iOS Hermes bundle、画像） |
| Chromium：デッキ14件＋既存回帰32件 | **46件通過**（1.8分） |
| WebKit：デッキ一式 | **13件通過、1件スキップ**（3.0分） |
| Chromium専用CDP実タッチ | 横スワイプ・縦スクロールの分離を確認 |
| 保存・履歴・詳細往復・同日再読込 | 状態維持を確認。既存の理論履歴・お気に入り画面からも参照できる |
| 日付・高速操作・長時間探索 | 日本時間の日替わり、訪問中固定、28枚の非重複、150枚付近の履歴整理後も操作可能 |
| CMS / 購入復元 | 既存APIモックで公開特集の表示、会員表示、購入復元と未反映時の待機を確認 |
| Reduced Motion / キーボード | 動きの途中で設定を変えても復帰。左右キーの連続操作を確認 |
| `git diff --check` | 成功 |

WebKitでスキップした1件はCDP実タッチ入力専用のテストで、Chromiumでは通過している。WebKitでもマウスドラッグ・スプリング・前後移動・シャッフルの実際のtransform/opacityを検証した。リポジトリにLint用スクリプトはないため、Lint実行済みとはしていない。テスト対象は今回に関連する46項目で、リポジトリ全テストの実行ではない。

最終実行ログは同フォルダの `chromium-final.txt`、`webkit-final.txt`、`build-summary.txt` に保存した。

最初の検証で発見して修正した点：依存関係を共有する作業ツリー間でのMetroキャッシュ混入、キーボード操作時のフォーカス維持、Safariの古い速度値、補充時の未表示末尾との重複、長い探索でキューを整理した後の操作ロック、端末内データ消去との同期。

開発設定ファイルのコピーを伴う最初のビルドは自動承認レビューに拒否された。設定ファイルのコピーはしていない。無料同梱データでの書き出しに加え、認証/CMSのモック検証用には架空のSupabase公開URLとダミー公開キーだけをプロセス環境に指定した独立ビルドを用いた。実際の秘密情報を読み出してバンドルしていない。

## 制約

- Windows上のChromium/WebKitで操作・視覚確認を行う。iOS向けJS/アセットの書き出しと、iPhone実機の操作確認は区別する。iPhone実機・Xcodeでの署名ビルドは未実施。
- CMS/購入の回帰検証では既存APIモックを使用する。実際の購入・公開CMSの変更は行っていない。
- 新しいライブラリ、データベース移行、ログイン要求、回数制限、広告は追加していない。

## 画面証跡

- [スマホ初期表示（390px）](../release-evidence/home-discovery/home-390.png)
- [スマホ操作後・理論カード](../release-evidence/home-discovery/scrolled-390.png)
- [スワイプ途中](../release-evidence/home-discovery/drag-390.png)
- [シャッフル後（390px）](../release-evidence/home-discovery/shuffled-390.png)
- [タブレット（768px）](../release-evidence/home-discovery/home-768.png)
- [PC（1440px）](../release-evidence/home-discovery/home-1440.png)
- [スマホ・PCの比較プレビュー](../release-evidence/home-discovery/final-preview.webp)

## 再検証

通常の開発設定では既存のExpoビルドとPlaywright設定を使える。新しい秘密情報の設定は不要。

```powershell
node ./node_modules/typescript/bin/tsc --noEmit
node ./node_modules/expo/bin/cli export --platform web --platform ios --output-dir dist
node ./node_modules/@playwright/test/cli.js test tests/e2e/home-card-deck.spec.ts --workers=1
node ./node_modules/@playwright/test/cli.js test tests/e2e/home-card-deck.spec.ts --browser=webkit --workers=1
```

CMSの表示テストは、公開接続設定を持つビルドに対してAPIをモックする。未設定ビルドではその1件をスキップする。実タッチのCDP入力テストはChromium専用で、WebKitではスキップする。古い7枚の棚・購入バナーの表示テストは、新デッキと4枚の編集バナーの契約へ更新・集約した。購入、法務、保存、履歴、共通ナビの機能そのものは残している。

ローカル検証では架空の公開URL `https://home-deck-fixture.supabase.co` と公開キーのダミー `sb_publishable_e2e_placeholder` だけを使用した。出力先は `dist-e2e`、一時サーバー設定は `.local-e2e*.config.ts`。これらは検証専用で公開用設定には使用しない。
