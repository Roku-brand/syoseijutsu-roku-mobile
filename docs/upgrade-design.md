# 完全版購入ページ UI

添付の縦長デザインを完成基準とした、スマートフォン用の1カラムLPです。

- `/upgrade-preview`：参考指定の **¥320** で確認するUI専用画面。購入ボタンから決済は作成しません。
- `/upgrade`：同じLPを実際の購入画面に適用。Webは既存の決済設定の価格、iOSは取得したApp Store価格を表示します。決済・認証・購入復元の処理は既存のものを使用します。
- 現行Web決済設定は¥280です。この変更では決済設定や商品価格を変更していません。

共通UI：`src/components/upgrade-landing.tsx`。

## デザイン

上部の専用ヘッダー → 金色の山岳風景と2台のスマートフォン → 無料版／完全版の比較カード → 明るい書斎とおすすめの箇条書き → 暗い図書館と知識ネットワーク → FAQの順序です。

960px未満の画面は最大480pxのスマホ比率を保ちます。Webの960px以上では最大1600pxのPC専用レイアウトに切り替わります。見出しは明朝、本文はゴシック。白／温かい生成り、濃紺に近い深緑、金で統一しました。ネットワークのラベルと本文は画像に焼き込まず、読み取れるUIテキストです。

購入バーはScrollViewの外に置き、画面下端に固定しています。通常状態は約99px。ホームインジケーターのセーフエリアと購入状況の通知がある場合には必要な高さを加えます。本文末尾にはバーの実際の高さに合わせた余白を確保しています。購入CTAはこのバー内の1つだけです。

FAQは最初の質問だけを開き、他の質問を押すと開いている質問を切り替えます。購入復元は「購入後すぐに使えますか？」の回答から利用できます。

## 写真素材と生成プロンプト

組み込みの **image_gen / imagegenスキル** を使用。添付画像は構図・光・色調の参照として指定しました。全素材で「文字、ロゴ、UIを含めない」を指定し、写真上の文字・カード・アイコンを実装側で配置しています。

最終保存先はこのリポジトリの `assets/upgrade/`。WebPに最適化済みです。既存の `complete-mark.png` はブランドロゴに使用しました。

### `landscape-hero-portrait.webp`

初期生成：Photorealistic mountain valley and distant lakes and hillside town at warm golden sunset. A young dark-haired man in a black jacket and backpack sits on a rocky summit at far right, seen from behind. Bright warm clouds at upper left and center for black headings, detailed dark mountain rocks at bottom. Natural editorial photography, quiet grandeur, muted antique gold, warm cream, deep charcoal. No text, smartphones, UI or logos.

縦長への編集：Adapt the generated landscape mountain photo into a portrait 4:5 mobile hero photograph by expanding sky above and detailed dark rocky foreground below. Preserve the natural golden sunset, lake, mountain valley, town and the man on the far right. Head at approximately 44 percent of image height; upper 38 percent bright cream-gold sky for headline overlay. Leave lake and mountains visible at center and lower left. Bottom quarter dark detailed rocks for phone overlays. No text, logo, phones, interface or diagram.

縦長に調整した最終素材を公開版に使用しています。

### `sunlit-library.webp`

Photorealistic elegant old study with tall dark wooden bookshelves at far right, tall window at right-center with honey-colored afternoon light, small green plant and writing desk at bottom-right. Left two thirds are light warm ivory plaster wall and luminous soft daylight for dark text overlays. Quiet upscale publisher aesthetic, muted warm cream and walnut. Reference the warm library photograph in the comparison section. No text, UI, logo or cards.

### `morning-study.webp`

Bright airy elegant morning study. Sunlit window centered in background, fresh green leaves at top and upper right, luminous cream negative space for list copy. Wooden desk across bottom quarter with hardcover books at lower left, open notebook and fountain pen at lower center, charcoal ceramic mug and slim open laptop at lower right. Editorial natural photography, warm fresh daylight, calm intellectual luxury. Reference the recommendation photograph. No text or UI.

### `dark-library.webp`

Quiet elegant dark historic study, towering wooden bookshelves on left, antique desk lamp glowing warm amber at bottom-left, stacks of books in lower left. Center and right mostly deep black-green navy shadow with subtle bookcase texture, leaving space for white copy and gold network overlays. Photorealistic, dark forest green, charcoal navy and muted brass highlights. Reference the dark library section. No text, UI, diagram, network lines or people.

## 確認

確認用URL：`http://localhost:8086/upgrade-preview`（ローカル開発サーバー起動中）。

画面キャプチャとレイアウト検証結果は `diagnostics/upgrade-design/` に保存します。

実施済み：TypeScript型チェック、iOS向けExpoエクスポート、ブラウザの320／375／390／430px幅での確認。768px幅でも480pxの1カラムを維持します。購入バーは全幅で高さ99px、スクロール前後に座標の変化なし、横はみ出しなし、CTAは1つ。FAQの開閉・回答表示、既存Web購入確認ダイアログの¥280表示も確認済みです。実際の決済は開始していません。ブラウザの実行時エラーは0件でした。

`full-lp-390.png` は縦長デザインを一覧するために表示領域を伸ばした確認画像です。通常のスマホ画面での固定バーの状態は `first-view-390.png` と `faq-fixed-390.png` で確認できます。iOSはバンドルと素材の解決を確認しており、実機での表示確認は含みません。

## 購入ポップアップの仕上げ（2026-10-01）

背景をほぼ黒（#151918 → #090D0E → #050809）に変更し、金色の細い縁と仕切り線を加えました。ボタンは真鍮色のグラデーション（#E4C27F → #D2AE66 → #BE9346 → #A77C30）、価格は金色（#EBC989）です。柔らかな光沢で高級感を出しています。固定位置、通常時99pxの高さ、CTAの1本化は維持しています。

Web公開は最新のmainを基準に、購入LPと専用ヘッダーのみを統合しています。他の画面や決済・コンテンツ設定は既存の公開版を使用します。

## 光沢とPC専用レイアウト（2026-10-01）

購入ボタンに明るい上部の反射、斜めのハイライト、中央の金属的な明暗、下部の陰影を重ねています。黒いバーの上縁とボタン周辺に弱い金色の光を加えました。点滅や光のアニメーションはありません。

PC版は横長の山岳写真 `landscape-hero.webp`（上記の初期生成写真）を使用し、左に大きな見出しと価格、右に2台のスマートフォンを配置します。比較は説明の右に2枚のカード、知識ネットワークは説明の右に大きな図、FAQは見出しの右に質問を並べます。おすすめは写真上の箇条書きを維持します。PCの固定購入バーはコンテンツの幅に合わせ、画面下端から18px浮かせています。購入CTAはスマホ・PCともに1つだけです。

型チェック、Webエクスポート、公開データ監査、購入・法務・画面遷移の10件の操作テストを確認しました。960／1024／1440／1920pxの横並び、横はみ出し、スクロール後の購入バー固定、スマホへの切り替えも検証しています。
