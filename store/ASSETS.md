# ストア提出素材

## App Store

`app-store/iphone-6.9/` は、2026-10-22時点の公開ページに掲載されている4枚を反映しています。公開ページには次の順で表示されます。

1. `01-main.png` — 処世術専門メディアの紹介とホーム画面
2. `02-app-overview.png` — アプリの概要画面
3. `03-technique.png` — 処世術の使い方
4. `04-theory.png` — 理論の解説

公開ページで配信される縮小プレビューを `screenshots/app-store-live-preview/` に、PNG化した参照画像を上記フォルダーに保存しています。これらは縮小プレビュー由来のため、App Store Connectへの再アップロード用には使わないでください。Apple側で公開中の原寸画像は公開ページで確認できます。公開ページの4枚は添付画像を含めすでに最新の状態だったため、App Store Connectへの再提出は行っていません。

以前の6枚は `archive/app-store/iphone-6.9-before-20261022/` に原本のまま保存しています。旧6枚へ戻すには、アプリ版リポジトリ直下で以下を実行します。

```powershell
Copy-Item store/archive/app-store/iphone-6.9-before-20261022/*.png store/app-store/iphone-6.9/ -Force
```

## Google Play

- `google-play/app-icon-512.png` — 512 × 512 px
- `google-play/feature-graphic-1024x500.png` — 1024 × 500 px
- `google-play/phone/` — 1080 × 2160 px の電話スクリーンショット6枚

Google Play素材は `screenshots/raw/` のアプリ画面から生成しています。App Store向け画像は公開中の掲載画像を参照元にしています。

## 再生成

プロジェクト直下で `pnpm store:assets` を実行します。App Store向け参照画像は `screenshots/app-store-live-preview/`、Google Play向け画像は `screenshots/raw/` にあります。
