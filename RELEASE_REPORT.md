# 処世術禄 v1.0.0 リリース準備レポート

作成日：2026年7月23日

## 結論

アプリ本体、同梱コンテンツ、ストア掲載文、アイコン、プライバシーポリシー原稿、App Store／Google Play用画像は完成しています。署名済みのIPA/AAB作成とストア提出は、Expo、Apple Developer、Google Play Consoleの各アカウント認証後に実行できます。

## 完成しているもの

- Expo SDK 57／React Native／TypeScriptのiOS・Androidアプリ
- メイン、探す、体系、マイOSの4タブ
- 処世術434件、理論526件のオフラインデータ
- 保存、メモ、コレクション、閲覧履歴、関心カテゴリの端末内保存
- ログイン、広告、解析SDK、AI、外部データ送信なし
- App Store用 1290 × 2796 px スクリーンショット6枚
- Google Play用 1080 × 2160 px スクリーンショット6枚
- Google Play用 512 pxアイコン、1024 × 500 pxフィーチャー画像
- App Store／Google Play掲載文案、App Review向けメモ
- EAS Build／Submit設定
- Apple Privacy Manifest設定

## 検証結果

| 項目 | 結果 |
|---|---|
| TypeScript型検査 | 合格 |
| Expo Doctor | 20/20 合格 |
| iOSバンドル生成 | 合格 |
| Androidバンドル生成 | 合格 |
| Web静的出力 | 合格 |
| 処世術IDの重複 | 0件 |
| 理論IDの重複 | 0件 |
| 存在しない理論参照 | 0件 |
| モバイル幅での主要画面確認 | 合格 |
| 保存後のマイOS反映 | 合格 |

## 公開前に運営者が確定する項目

1. Expoアカウントへのログイン
2. Apple Developer ProgramとGoogle Play Consoleの契約
3. Bundle ID／Package名 `jp.shoseijutsuroku.app` の最終確定
4. 公開用のプライバシーポリシーURL
5. サポート用メールアドレスまたは問い合わせURL
6. コンテンツの最終校閲、理論説明の出典確認
7. iOS／Android実機でのVoiceOver、TalkBack、共有、端末保存確認

## 署名済みビルドの作成手順

```text
eas login
eas init
eas build --platform all --profile preview
eas build --platform all --profile production
```

内部テスト後、App Store ConnectとGoogle Play Consoleへ提出します。現環境ではExpoが未ログインのため、アカウントや署名情報を推測してビルドすることはしていません。
