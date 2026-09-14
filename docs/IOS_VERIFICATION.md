# iOS追加 検証記録・公開ゲート

2026-09-10。App Store公開完了ではない。ローカルで確認できた実装と、Appleアカウント/実機/本番環境が必要な検証を区別する。

コンテンツ権利の監査と初回 iOS 版の除外方針は `IOS_CONTENT_RIGHTS_AUDIT_2026-09-11.md` を参照する。build 4 は除外前のため、App Store 提出には次のビルドを使用する。

## 2026-09-11 コンテンツ権利対応 build 5

- 格言・経験則・作品カテゴリ76件を初回 iOS 版のバンドルと有料配信APIから除外。Web/PWAのカタログは維持。
- iOS生成カタログは717件、`maxims-experience` は0件、引用符付き格言タイトルは0件。
- iOS Hermesバンドルを検索し、代表的な漫画台詞と著名人発言が含まれないことを確認。
- TypeScript、Edge FunctionのDeno型検査、Entitlement統合テストに合格。
- `paid-content` Edge Functionを本番へ再デプロイ済み。
- EAS build ID: `88feda96-217a-4340-a1b7-69b402e56510`、version 1.0.0、build 5。
- EAS submission ID: `0ed5ae03-92e8-47a1-b096-0edb6799ccd3`。App Store Connectへのアップロード成功。Appleの処理が完了し、TestFlightで「提出準備完了」、内部テストグループへの自動配信、テスター1名への配信を確認。App Store versionはまだbuild 4のため、提出前にbuild 5へ関連付ける。
- App Store Connectのコンテンツ配信権で「はい、このアプリはサードパーティのコンテンツに対する必要な権限を有しています」を選択し、保存後表示を確認。

## 2026-09-10 Chrome本番環境確認

- Supabase本番プロジェクトは `syoseizyutsu-roku-production`、project refは `psfexomjhivqieehcrzx`、リージョンはAWS東京。
- Apple用3関数（apple-purchase、apple-notifications、delete-account）と更新版accessを本番へデプロイ済み。既存Stripe/PayPay関連関数は維持。
- Edge Function SecretsへApple Server API用6項目（Bundle ID、Apple ID、Product ID、Issuer ID、Key ID、IAP秘密鍵）を登録済み。`.p8`をローカルでEC秘密鍵として解析できることと、Supabase表示SHA-256がローカルファイルと一致することを確認済み。`APPLE_SANDBOX_USER_IDS`はテスト用Supabaseアカウント確定後に登録する。
- AuthのSite URLを `https://shoseijutsuroku.com` へ変更済み。Redirect URLsへ `https://shoseijutsuroku.com/**` と `shoseijutsuroku://auth` を登録し、Supabaseの成功通知と保存後表示を確認済み。
- Supabase組織は前請求期間のEgress超過（10.02 GB / 5 GB、200%）。プロジェクト別フィルターで10.02 GB全量が本番プロジェクト由来と確認。猶予期限は2026-10-05で、それ以降は制限時にHTTP 402となる可能性がある。TestFlight前に利用量削減またはプラン変更を判断する。
- Apple Developer Program加入済み。Team ID `8HN6ZR26LA` で明示的Bundle ID `jp.shoseijutsuroku.app` を登録し、識別子一覧への表示を確認済み。In-App Purchaseは有効、不要なCapabilityは無効。
- App Store Connectの初回利用規約に同意済み。アプリ `処世術禄`（Apple ID `6810376658`、SKU `shoseijutsuroku-ios-001`）を作成済み。
- 非更新サブスクリプション `処世術禄 完全版 30日`（Apple ID `6810376972`、Product ID `jp.shoseijutsuroku.app.complete30days`）を作成済み。日本限定、基準地域日本、JPY 280、日本語表示名 `完全版 30日間アクセス`、説明 `完全版コンテンツを30日間利用できます。自動更新はありません。` をApp Store Connect上で保存確認済み。審査メモは登録済み。審査用への追加は実機スクリーンショット必須としてAppleに拒否されたため、画像登録後に再実行する。
- App Store ConnectでIAP検証キー `処世術禄 IAP検証`（Key ID `QBJ43DL297`）を生成し、`.p8`を2026-09-10に一度だけダウンロード済み。Issuer IDも確認済み。秘密鍵本文はGit・Expo・文書へ記録せず、Supabase Edge Function Secretへの登録だけに使う。
- Expoはアカウント `shoseijutsuroku`、プロジェクト `shoseijutsuroku` を作成済み。EAS Project ID `2f3b738f-15ba-4689-ae0c-5c53cfebf853` をコードへ反映。必要な公開設定5変数を3環境へ登録済み。初回リリースは未検証のiPadを対象外にして `supportsTablet: false` とした。2026-09-11にbuild 6のiPhone 13 Pro / iOS 26.6起動クラッシュ報告を受領。該当ビルドの初期SDK一式をExpo 57.0.21、React Native 0.86.3、expo-modules-core 57.0.17へ更新した。production build `36d6de2b-121c-48d6-871d-b0ae50e55e8c`（1.0.0 / build 7）とEAS Submit `306a2444-b834-4587-9d85-b9d7fab40edc` が成功し、TestFlightで「提出準備完了」と内部テストへの自動配信を確認済み。build 7の実機再確認は未完。
- App Store Connectのアプリ情報へサブタイトル、主カテゴリ `教育`、副カテゴリ `ライフスタイル`、コンテンツ配信権を保存。アプリ価格は無料、配信地域は日本のみ、MacとApple Vision Proへの配信は無効。年齢質問票は内容監査に基づいて入力し、Apple算定の `9+` を保存した。App PrivacyはプライバシーポリシーURLと収集7データ型、用途、ユーザーへの関連付け、トラッキングなしを登録して公開済み。version 1.0へ説明、キーワード、Support/Marketing URL、手動リリース、詳細な審査メモを保存し、build 4を外してbuild 6を関連付けた。著作権、実機スクリーンショット、審査資格情報、初回IAPの審査追加は未完。
- Supabase CLI 2.117.0で本番refを照合・linkし、dry-runで今回の `20260909090000_apple_iap.sql` 1件だけを確認後、本番へ適用済み。再dry-runは `Remote database is up to date`。Apple用3関数と更新版accessも本番デプロイ済みで、全9関数がACTIVE。FreeプランではPreview Branchが利用できず、作成にはProと時間課金が必要。Docker/PodmanがないためCLIスキーマdumpは実行できなかった。
- App Store ConnectのBusinessでは無料アプリ契約は有効。米国税務フォーム2件（W-8BEN、外国の実質的所有者に関する証明書）は2026-09-11提出済みで `有効`。有料アプリ契約とみずほ銀行口座は `処理中`（Apple表示では銀行情報の反映まで最大24時間）。
- version 1.0の `審査用に追加` でAppleの入力検証を実行。必須未完了は、6.5インチiPhoneスクリーンショット、著作権、審査用ユーザー名・パスワード、審査連絡先の名・姓・メール・国コード付き電話番号。初回IAP側も審査用スクリーンショット不足のため、いずれも実データ登録後に再実行する。

## 実施済み

| 検証 | 結果 |
| --- | --- |
| 変更前TypeScript | 成功 |
| 変更後TypeScript | 成功 |
| Expo iOS JS/Hermes export | 成功。IPA署名・Swiftコンパイルの検証ではない |
| Expo Web static export | 成功。新規削除ルートを含め1239 static routes |
| Web Playwright回帰 | **87/87成功**。購入画面/認証導線、無料版、検索、学習、管理画面保護、画面サイズ、遷移、SEO等。Apple IAPや本番決済を実行したテストではない |
| 公開ビルド有料漏えい監査 | 成功。2191 fingerprints、1497 files |
| SEO監査 | 成功。indexable 254 URLs、理論150、処世術50、タイトル/説明の一意性とprivate routes維持 |
| PostgreSQL互換PGlite | free、Apple付与、厳密720時間、再送、別user拒否、返金、古い通知、再購入、Web/Apple独立返金、24h検証lease、旧買い切り、RPC権限、削除cascadeのテスト成功 |
| Deno Edge型検査 | apple-purchase、apple-notifications、delete-account、access成功 |
| Apple JWS検証runtime | Deno互換検証器でSandbox TEST通知の署名を検証。未署名/偽造/不正x5cを拒否。正規Sandbox購入は未実施 |
| Expo config introspect | 成功。ATS arbitrary loads=false、不要camera/microphone項目なし、tracking=false、収集7型、代替決済entitlementなし |
| App Icon | 1024×1024 PNG、不透明を確認 |
| 追加文言のブラウザ確認 | FAQ連絡先リンクとPrivacy収集説明の表示成功 |
| iOS preflight未設定検査 | 必須5変数がない場合に意図どおり停止。登録前の誤ビルドを防止 |
| Apple PKI | 公式Root/G2/G3を取得。CA属性・自己署名・期限確認。JSONにSHA-256記録 |
| git diff --check | 成功 |

Web buildは既存public/sw.jsやOG作業を保護するため、stamp/画像再生成を省き、Expo export→Pages fallback→SEO生成→各監査を実行。コンテンツ変更なし。通常の将来公開コマンド `pnpm export:pages` は維持。

## Phase別状態

| Phase | 状態 |
| --- | --- |
| 1 監査 | 完了。別紙監査参照 |
| 2 方式 | Expo継続、native分岐を採用 |
| 3 Apple要件 | 公式資料確認、非自動更新を選定 |
| 4 EAS設定 | 設定実装。EAS Project ID、Apple Team ID、Bundle ID、ASC App ID確定。Dashboard変数5件を3環境へ登録済み |
| 5 iOS UI | 実装・JS export。実機未確認 |
| 6 IAP | StoreKitライブラリ/画面/observer実装。ASC商品・日本280円・日本語情報登録済み。Sandbox未確認 |
| 7 権限統合 | migration/RPC実装・ローカルSQL成功。本番migrationと更新版accessを適用済み |
| 8 検証/復元 | サーバー署名/API/通知・再照合実装。IAPキー・Secret・Apple用3関数を本番設定済み。Apple実通信は未確認 |
| 9 Privacy/審査 | 文書と削除導線実装。公開ポリシーURL、ASC収集7型・用途・関連付け・トラッキングなしを登録し公開済み。運用保持期間の最終確認は未完 |
| 10 TestFlight | build 7の実機クラッシュログを解析し、iOS 26上のHermes実行時コンパイルでSIGABRTすることを確認。iOSのみJSCへ切替え、React Compilerを解除した署名済production build 8をEASで作成・送信。Apple処理完了と内部テストへの自動配信を確認済み。修正後の実機確認は未完 |
| 11 掲載 | ASCアプリ/IAP商品と文案を準備。無料価格、日本限定配信、9+、App Privacy、審査メモ、税務フォームを設定済み。提出対象は実機確認後にbuild 7へ差し替える。著作権、実機画像、審査資格情報は未完。契約・銀行口座はApple処理中 |
| 12 最終監査 | ローカル検査は上記。以下の公開ゲートは未通過 |

## 2026-09-12 起動クラッシュ再調査

- Build 8配信後もユーザーからクラッシュ継続の報告。端末側build番号と最新ログは未確認。
- 前回のHermes原因の断定を撤回する。Build 7のfaulting threadはRCTExceptionsManager経由のfatal例外であり、別スレッドのHermesコンパイルスタックだけではエンジン不具合を立証できない。
- root layoutが読み込む `src/lib/pwa-install.ts` は `typeof window` のみでWeb判定していた。React Native 0.86.3の `Libraries/Core/setUpGlobals.js` もwindowを定義するため、ブラウザー用イベントAPIがない環境でモジュール評価時にTypeErrorになる。
- `scripts/test-pwa-install.mjs` でnative相当のwindowを与えて修正前の `window.addEventListener is not a function` を再現。Platform.OSによるWeb限定のガード追加後、iOS/Android、Web SSR、PWA購入とは無関係のインストールイベントのテストが成功。typecheck成功。
- 今回の修正と実機クラッシュが同一原因か、他の起動エラーが残るかは次のTestFlight実機確認が必要。エンジン設定は今回変更せず、PWAガードのみ修正して比較する。

## 実機・stagingで本人と確認するテスト

全項目未実施。端末/iOS版、build番号、日時、担当者、結果、必要なtransaction ID（秘密キーは不可）を記録。

| 項目 | 操作と期待結果 |
| --- | --- |
| 新規インストール | ログインを強制せず無料版が起動。初回案内・検索・学習・保存を操作 |
| メール登録 | 確認メールからcold/warm起動して登録完了。購入意図はiOSの完全版画面へ戻る |
| ログイン | メール/password、失敗、ログアウト、再起動、別アカウント切替。前ユーザーの有料内容を表示しない |
| password reset | メールリンクからアプリへ復帰、password更新、再ログイン |
| IAP商品 | ASC商品名とローカライズ価格、30日、自動更新なしが一致 |
| 購入成功 | Apple sheet→サーバー検証→台帳1件→完全版。有料配信も同じ権限で成功 |
| キャンセル/承認待ち | 課金取消で解放なし。Ask to Buy承認後のobserver/復元、再起動で反映 |
| 通信断 | 購入完了直後に通信を切断。client成功のみで解放せず、復帰後の復元で同じ取引1件のみ付与 |
| 重複/再送 | 同じtransaction IDを複数回検証して期限と件数が増えない。別userへの紐づけは拒否 |
| 期限境界 | staging専用fixtureで直前/期限同時/直後。厳密720時間。端末時計の変更で延長されない |
| 再購入 | 期限後の新取引でその取引日時から30日。古い取引を復元しても延長なし |
| 復元 | 同一端末、再インストール、別iPhoneで同じアカウントから復元。別アカウントには移さない |
| Web購入者 | 有効なStripe/PayPay/旧買い切りでiOSログイン→追加購入なしで利用 |
| iOS購入者のWeb利用 | iOS付与後にWebへログイン→共通APIと有料配信で利用 |
| 返金/取消 | Sandbox返金→V2通知→Apple権限を停止。別Web権限は残る。逆順通知で再解放なし |
| 通知障害 | 受信エラーは非2xx、Apple再送を処理。6h再照合と24hleaseの保留。Web権限は残る |
| 不正API | JWTなし、他user、偽造JWS、違うbundle/product/environment、Xcodeローカル取引を拒否 |
| 削除 | password不一致は拒否。削除成功後Auth/profile/avatar/関連イベント消去、Web権限cascade、Apple台帳cascade。別userによる再利用拒否 |
| owner削除 | stagingで作成者FKと管理画面を確認。公開カード・版履歴は消えず作成者がnullになる |
| オフライン | 無料版利用、サーバー確認不能の有料内容はロック。復帰/再試行で正常化 |
| API遅延/エラー | loadingが終了し再試行可能。購入処理の結果不明時は復元案内 |
| ネイティブUI | 小型iPhone/大型iPhone/iPad、Safe Area、文字拡大、VoiceOver、縦横回転、キーボード、スクロール、戻るgesture、長文 |
| ダークモード | システムdarkでも指定light外観・入力欄・status barが崩れない |
| 外部リンク | 出典/メールは適切に外部へ。Stripe/PayPay/Web購入誘導なし。PWAインストール画面は出ない |
| Privacy/network | 実通信を確認し、宣言したデータ型/SDK/サービスと一致。不要権限・IDFAなし |
| Web最終回帰 | 実際のstaging Webカード/PayPayとStripe webhook、既存guest claim、旧権限、SEO/PWA/管理画面 |

## 公開前ゲート

- [x] Bundle ID、EAS Project ID、Apple Team、ASCアプリ数値Apple IDを確定
- [ ] 米国税務フォーム2件は提出・有効。有料契約と銀行口座の処理完了を確認。IAP商品、日本価格280円、日本限定の提供地域、日本語情報、審査メモは登録済み。実機スクリーンショットを登録
- [ ] staging migration→Functions→通知→Web/native実通信テスト成功
- [ ] 本番バックアップ・適用計画・監視・サポート担当を確認
- [ ] Sandboxテスターと審査用非owner UUIDをallowlistへ登録
- [x] EASで署名済production buildを作成しApp Store Connectへ送信
- [ ] TestFlightで全必須実機テストに合格
- [ ] TestFlight build 7以降の起動確認済みビルドのiPhone実機スクリーンショット。必須6.5インチ欄はASC表示の1242 × 2688、2688 × 1242、1284 × 2778、2778 × 1284のいずれか。`store/app-store/iphone-6.9` の旧Web拡大画像は提出しない
- [ ] 公開Privacy/Support URLとApp Privacy登録は完了。全データ保持期間・問い合わせ削除手順を最終確認
- [ ] 年齢質問票、権利、掲載文、Review Notesは完了。輸出コンプライアンス、著作権、審査アカウントを完成
- [ ] 同じ検証済ビルドと初回IAPをASCで審査へ追加し提出
- [ ] 承認後、本人が一般公開を実行

## 再実行コマンド

### 2026-09-10 配布後の確認

- Apple Sandbox TEST通知：Appleの配信結果 `SUCCESS` を確認。
- `apple-notifications`、`apple-purchase`、`access` にDeno互換JWS検証を配布済み。
- 配布後の未認証POST：`apple-purchase` は401 `authentication_required`、`access` は200でguest。実購入・復元の実機検証は未実施。
- Apple本番テスト通知APIは401のまま。原因未確定であり、本番決済の準備完了とは判断しない。
- OCSP無効化だけではEdgeの `ERR_NOT_IMPLEMENTED` は解消せず、証明書/JWS検証をjsrsasignへ変更。固定Apple root、証明書チェーン、Apple固有OID、ES256署名、署名日時の証明書期限、Bundle ID、環境を確認する。オンライン証明書失効確認は行わない。
- jsrsasign 11.1.5は保守終了の警告あり。独自検証器の否定系テスト・セキュリティレビューと保守可能な検証基盤の検討を本番公開前の未解決事項として残す。

### 2026-09-11 build 7クラッシュとbuild 8

- build 7の `.ips` は起動約0.26秒後の `SIGABRT`。main threadが `hermes::LowerScopes::runOnFunction`、`createBCProviderFromSrc`、`evalInEnvironment` にあり、例外はReact NativeのTurboModule例外マネージャ経由でfatalになっていた。
- 同じiPhone 13 Pro / iOS 26系でHermesとWorkletsの実行時ソースコンパイルを含む類似クラッシュ報告がある。アプリコードに直接のReanimated利用はないが、Expo Routerの依存としてReanimated/Workletsが含まれる。
- `app.json` の `ios.jsEngine` を `jsc` に設定し、実験設定 `reactCompiler` を解除。AndroidとWebのエンジン・配信設定は変更していない。
- typecheck、iOS preflight、entitlementテスト、JSC設定でのiOS clean exportに合格。
- EAS build 8: `2bb2ed0b-9ea8-483d-9507-bce988e76847`。EAS submit: `bef8e433-4978-434d-9b1f-34b5aa58a7e8`。Apple処理完了、ステータス「提出準備完了」、内部テストへ自動配信済み。

```powershell
pnpm typecheck
pnpm test:entitlements
$env:DENO_NO_PACKAGE_JSON = '1'
pnpm exec deno check --config supabase/functions/deno.json supabase/functions/apple-purchase/index.ts supabase/functions/apple-notifications/index.ts supabase/functions/delete-account/index.ts supabase/functions/access/index.ts
pnpm exec deno test --allow-env --allow-read --config supabase/functions/deno.json tests/backend/apple-verification.test.ts
pnpm export:ios
pnpm export:pages
node scripts/audit-public-build.mjs
pnpm seo:audit
pnpm test:e2e --workers=2 --reporter=line
```

Windowsの依存ラッパーが再installを要求する場合も、lockを勝手に更新しない。必要なら `pnpm install --frozen-lockfile` で整えてから再実行する。
