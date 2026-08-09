# 処世術禄 リリースチェックリスト

## リリース前に必ず確定する項目

- [ ] Apple Developer ProgramとGoogle Play Consoleの事業者情報
- [ ] `app.json`のBundle ID／Package名が登録予定のIDと一致
- [ ] App Store ConnectとGoogle Play Consoleでアプリを新規作成
- [ ] 公開URL上のプライバシーポリシー
- [ ] サポート窓口のメールアドレス
- [x] App Store用スクリーンショットとGoogle Play用画像
- [ ] 実機での文字サイズ、VoiceOver／TalkBack、共有、端末保存の確認
- [ ] 全カードの編集・校閲と、理論説明の出典確認

## 品質確認

- [x] `pnpm typecheck`
- [x] `pnpm export:web`
- [x] 初回導線・無料版ホーム・購入確認・復旧／法務導線のE2EスモークテストをCIへ追加
- [x] PWAキャッシュ世代をソース内容から自動生成
- [x] `npx expo-doctor@latest`
- [x] 初回起動 → 関心カテゴリ設定 → メイン表示
- [ ] リールの上下スワイプ
- [x] 保存／保存解除、再起動後の保持
- [ ] 選択式検索の全カテゴリ
- [ ] 体系 → 小分類 → カード詳細
- [ ] 理論辞典 → 理論詳細 → 関連カード
- [ ] メモ、コレクション、閲覧履歴
- [ ] データ全消去
- [ ] 機内モードで全機能が動く
- [ ] iPhone SE相当と大型iPhone、Android小型端末、タブレット

## EAS初期設定

1. Expoアカウントを用意する。
2. `npx eas-cli@latest login`
3. `npx eas-cli@latest init`
4. 生成された`projectId`がアプリ設定に入ったことを確認する。
5. `npx eas-cli@latest build --platform all --profile preview`
6. 内部テスト後、`npx eas-cli@latest build --platform all --profile production`

## ストア提出

- iOS: `npx eas-cli@latest submit --platform ios --profile production`
- Android: `npx eas-cli@latest submit --platform android --profile production`

iOSはTestFlightへのアップロード後、App Store Connectから審査へ提出する。Google Playは初回のみ、Google Play Consoleから手動アップロードが必要になる場合がある。
