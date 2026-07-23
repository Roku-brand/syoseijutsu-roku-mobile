# 処世術禄

「人生の判断と立ち回りにOSを。」をコンセプトにした、iOS／Android対応の本番用モバイルアプリです。

## 実装済み

- 処世術カードの縦型リール
- 関心カテゴリに基づくルールベース表示
- 領域 → 状況 → 目的の選択式検索
- 人間関係／仕事／メンタル／人生／挑戦の体系表示
- 434件の処世術と526件の理論をアプリ内に同梱
- カード詳細、実践の視点、注意点、関連理論、関連カード
- 保存、メモ、コレクション、閲覧履歴
- ネイティブ共有
- 完全オフライン動作
- ログイン、広告、解析、外部データ送信なし
- アプリ内プライバシーポリシー、利用規約、データ消去
- App Store／Google Play向け設定、EAS Build設定

## 開発

Node.js LTSとpnpmを用意します。

```sh
pnpm install
pnpm start
```

型検査とWeb版バンドル確認：

```sh
pnpm typecheck
pnpm export:web
```

## コンテンツ更新

公開Web版のデータを更新した後、次を実行します。

```sh
pnpm content:import
pnpm typecheck
```

アプリは実行時にネットワークへアクセスせず、変換済みJSONをバンドルします。

## リリース

詳細は`RELEASE_CHECKLIST.md`を参照してください。Apple Developer Program、Google Play Console、Expoの各アカウントと、公開済みプライバシーポリシーURLが必要です。
