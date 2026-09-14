# 処世術禄 iOSリリース手順

2026-09-11。実装対象は `syoseizyutsu-roku-mobile`。署名済みIPAのEAS BuildとApp Store Connectへのアップロードは完了。build 7の実機ログでHermes起動クラッシュを特定し、iOSのみJSCへ切り替えたbuild 8を送信済み。**build 8のTestFlight実機確認と審査提出・一般公開は未実施**。この文書の未完項目を満たすまで公開しない。監査根拠は `IOS_AUDIT_2026-09-09.md`、テスト記録は `IOS_VERIFICATION.md`。

## 実装とWeb保護

- Expo/React Nativeを維持。iOS専用upgradeはStoreKitの商品価格、30日・自動更新なし、復元を表示。Web upgrade/Stripe Checkout/PayPay設定/stripe-webhookは維持。
- Apple取引は追加テーブル `apple_transactions`。user_id、transaction_id、original_transaction_id、environment、product_id、purchased_at、expires_at、revoked_at、signed_at、verified_atを記録。期限は720時間。復元は期限を延ばさない。購入中の既存権限は購入前に再確認する。
- `get_complete_edition_access` と `has_complete_edition` がWeb・Appleの有効権限を統合。旧Web判定は `get_web_complete_edition_access` として保存。Web台帳をApple処理から上書きしない。両方有効なら期限の長い権限、旧買い切り・ownerは無期限を優先。
- Apple公式Server Library 3.1.0で証明書/JWS/environment/bundleを検証し、Server APIの最新取引を照合。appAccountTokenはSupabase UUID。署名前のclientデータを信用しない。取引IDとenvironmentが一意。返金通知はV2、順序逆転はsigned_atで防ぐ。
- `access`でApple取引を6時間ごとに再照合。通知漏れ時は次回アクセスで再確認。Apple再検証不能が24時間を超えた権限は一時保留となり、Web有効権限は維持。オフラインでも無期限に有料権限を延長しない。返金の反映が通知到達・再照合まで遅れることはある。
- 削除APIはJWTとpassword再認証、avatar削除、ログインユーザーのcontent_events削除、Auth削除。プロフィール/Web台帳は既存cascade、Apple台帳もcascadeで削除。再送されたApple取引は署名済みappAccountTokenが削除前のUUIDに紐づくため新しいアカウントへ移せない。編集者削除で公開コンテンツを消さないため、4つの作成者FKをSET NULLに変更。
- 新規API：`apple-purchase`（認証必須、検証/復元）、`apple-notifications`（JWTを切りJWSで認証）、`delete-account`。変更API：`access`。
- 追加依存：expo-iap 5.5.1、expo-dev-client ~57.0.18。iOS 26の起動クラッシュ対応としてExpo 57.0.21、React Native 0.86.3、expo-modules-core 57.0.17を含むSDK 57互換パッチ一式へ更新済み。テスト依存：@electric-sql/pglite 0.3.14、deno 2.7.4。サーバー依存はDeno設定とlockで管理する。
- Web URL/CNAME/manifest/既存決済・管理画面・本文を維持。プライバシー文書は実収集内容に合わせて追記。既存未コミットのOG画像・生成スクリプト・sw.jsは今回の成果に含めない。

## 最初に本人が設定するもの

1. Apple Developer Program加入済み。App Store ConnectのBusinessでPaid Apps Agreement、税務・銀行情報を完了する。
2. Apple Developerへ明示的Bundle ID `jp.shoseijutsuroku.app` を登録済み。Apple Team IDは `8HN6ZR26LA`。In-App Purchaseは有効、代替決済entitlement、ATT、Sign in with Apple、Pushは無効。
3. Expoアカウント `shoseijutsuroku` とプロジェクト `shoseijutsuroku` は作成済み。EAS Project UUIDは `2f3b738f-15ba-4689-ae0c-5c53cfebf853` と確認し、`app.config.js`へ反映済み。
4. App Store Connectアプリ `処世術禄` は作成済み。Apple IDは `6810376658`、SKUは `shoseijutsuroku-ios-001`。
5. `.env.ios.example` を `.env.local` にコピーして公開設定値を入力。秘密鍵はここに入れない。既存Webと同じ本番Supabaseを使うのはstaging検証後。
6. Expo dashboard → Project → Environment variablesへ `IOS_BUNDLE_IDENTIFIER`、`EAS_PROJECT_ID`、`EXPO_PUBLIC_APPLE_PRODUCT_ID`、`EXPO_PUBLIC_SUPABASE_URL`、`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` をdevelopment/preview/productionの3環境で登録済み。公開設定値のみclientに含め、Apple/Supabaseの秘密鍵は登録していない。
7. `eas.json` の `submit.production.ios.ascAppId` に `6810376658` を設定済み。署名証明書/provisioningはEASの対話で生成・管理可能。Windowsから実行できる。
8. IAP検証キー `処世術禄 IAP検証`（Key ID `QBJ43DL297`）を生成し、`.p8`を2026-09-10に一度だけダウンロード済み。Issuer IDはApp Store Connectで確認済み。秘密鍵はGit・Expo・本文書へ保存しない。
9. Supabase Edge Function SecretsへApple用6項目を保存済み。`.p8`は有効なEC秘密鍵として解析でき、Supabase表示SHA-256とローカルファイルのSHA-256が一致した。`APPLE_SANDBOX_USER_IDS`はテスト用Supabaseアカウント確定後に追加する。

## IAP商品登録

採用タイプは **Non-Renewing Subscription（非自動更新サブスクリプション）**。Appleは固定内容への期間制アクセスをこのタイプで認めている。Consumableは使い切り、Non-Consumableは無期限、Auto-Renewableは自動更新で既存仕様と異なるため採用しない。

App Store Connect → 対象App → Monetization → Subscriptions → Non-Renewing Subscriptions → Manage → +。

- Reference name：`処世術禄 完全版 30日`（登録済み）
- Product ID：`jp.shoseijutsuroku.app.complete30days`（登録済み、Apple ID `6810376972`）。client/serverのProduct IDを一致させる。
- Japanese display name：`完全版 30日間アクセス`（登録済み）
- Description：`完全版コンテンツを30日間利用できます。自動更新はありません。`（登録済み）
- Price：基準地域は日本、JPY 280（登録済み）。clientはStoreKitのdisplayPriceを表示。
- Availability：日本のみ（登録済み）。税区分は親アプリに一致。審査スクリーンショットと審査メモは実機ビルド後に登録する。
- 初回IAPはアプリversionと一緒に審査へ追加。自動更新グループや無料トライアルを作らない。Family Sharingや代替決済は今回使わない。

公式：https://developer.apple.com/help/app-store-connect/manage-in-app-purchases/create-non-renewing-subscriptions/

## Supabase / Apple Server設定（先にstaging）

本番DBのバックアップを取得し、stagingでmigrationとWeb購入回帰を確認する。既存main pushは自動DB適用を含むので、検証前にpushしない。新規migrationは一度だけ適用する。

2026-09-10時点のFreeプランではPreview Branchを利用できず、Proへの変更後はbranch computeが時間課金される。CLIで本番refを照合してlinkし、`db push --linked --dry-run`で未適用が `20260909090000_apple_iap.sql` の1件だけと確認後、本番へ適用済み。再dry-runは `Remote database is up to date`。Apple用3関数と更新版accessも本番デプロイ済みで全9関数がACTIVE。Docker/Podman未導入のためCLIスキーマdumpは未取得。

ASC → Users and Access → Integrations → In-App PurchaseでIAPキーを生成済み。Issuer ID、Key ID、.p8を安全に管理する。Supabase Dashboard → Edge Functions → Secretsに次を保存：

| 名前 | 内容 |
| --- | --- |
| APPLE_BUNDLE_ID | 確定したBundle ID |
| APPLE_APP_ID | ASCの数値Apple ID |
| APPLE_PRODUCT_ID | 登録した非自動更新商品ID |
| APPLE_IAP_ISSUER_ID | Issuer UUID |
| APPLE_IAP_KEY_ID | IAP Key ID |
| APPLE_IAP_PRIVATE_KEY | .p8のPEM全文。client/Git/EXPO_PUBLICには置かない |
| APPLE_SANDBOX_USER_IDS | Sandboxを許可する**SupabaseユーザーUUID**のカンマ区切り。TestFlightテスターと審査用アカウントを事前登録 |

Apple rootの取得元：https://www.apple.com/certificateauthority/ 。2026-09-09に公式Root/G2/G3を取得し、自己署名・CA属性・期限を確認して `supabase/functions/_shared/apple-roots.json` に指紋とともに同梱済み。手動Secret設定は不要。将来は `node scripts/update-apple-roots.mjs` で取得し直し、指紋差分を確認してFunctionsを再配布する。rootは公開情報だが.p8は秘密。

既存SUPABASE_SERVICE_ROLE_KEY/STRIPE_*の値は変更しない。

```powershell
npx supabase login
npx supabase link --project-ref <stagingのproject-ref>
npx supabase db push --linked --dry-run
npx supabase db push --linked
npx supabase functions deploy apple-purchase --no-verify-jwt
npx supabase functions deploy apple-notifications --no-verify-jwt
npx supabase functions deploy delete-account --no-verify-jwt
npx supabase functions deploy access --no-verify-jwt
```

上記のJWT gateway無効化はSupabaseの非対称JWTとの互換性のため。apple-purchase/delete-account/accessは関数内 `auth.getUser` で必ず認証する。通知だけは公開受信しApple署名を検証する。paid-content等の既存配信関数はそのまま。migration→新Functions→access→iOSの順に公開する。本番に適用するときはproject-refを明示的に再確認。

ASC → App Information → App Store Server NotificationsのProduction/Sandbox URLに `https://<project-ref>.supabase.co/functions/v1/apple-notifications`、Version 2を設定。Server APIのRequest a Test NotificationとGet Test Notification Statusで到達を確認。通知失敗率を監視する。

Supabase Auth → URL ConfigurationのSite URLは2026-09-10に公開Webの `https://shoseijutsuroku.com` へ変更済み。Redirect URLsにも `https://shoseijutsuroku.com/**` と `shoseijutsuroku://auth` を登録済み。登録確認・password reset・購入ログインの実リンク確認はTestFlightで行う。

本番project refは2026-09-10のChrome確認時点で `psfexomjhivqieehcrzx`。App Store Server Notifications URLは `https://psfexomjhivqieehcrzx.supabase.co/functions/v1/apple-notifications`。Apple用3関数と更新した `access` は本番へデプロイ済みで、Apple Sandbox TEST通知は `SUCCESS`。SupabaseのEgressは前期間10.02 GB / 5 GBで、プロジェクト別表示でも全量が本番由来。猶予期限が2026-10-05のため、TestFlight前にHTTP 402制限を避ける対応も完了する。

初回は既存custom URL schemeでメール認証を復帰させる。associated domains/Universal Linksは未追加。導入する場合は確定Team IDとBundle IDによるapple-app-site-associationが必要で、既存Web URLを勝手に変更しない。

## 2026-09-12 起動障害の追記

Build 8でもクラッシュ継続の報告あり。下記の過去記録にある「Hermes起動クラッシュを特定」は断定できないため撤回する。RCTExceptionsManagerのfatal例外の発生源は従来ログだけでは特定できない。

今回、root layoutがimportするPWAモジュールで `window.addEventListener is not a function` をnative相当の環境にて再現した。React Nativeもwindowを定義するため、Web判定をPlatform.OSで明示する修正を追加した。修正前の失敗、修正後のnative import・Web SSR・PWAイベント動作成功を `node scripts/test-pwa-install.mjs` で確認。Build 9に含める。実機起動成功までは障害解決扱いにしない。

## TestFlightとWindowsコマンド

以下はmobileディレクトリ内で実行。Node LTSとpnpmを用意する。

```powershell
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test:entitlements
npx eas-cli login
npx eas-cli init
# 表示されたProject IDと本人が確定した値を.env.local/EAS環境へ設定してから:
pnpm ios:preflight
npx eas-cli build --platform ios --profile development
pnpm start --dev-client --tunnel
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios --profile production --latest
```

EAS developmentは登録実機向け。Expo GoではIAPを検証できない。WindowsではiOS Simulator/`expo run:ios`を実行できない。iPhone実機とEASクラウドを使う。

EAS SubmitはApp Store Connectへバイナリをアップロードし、処理後にTestFlightへ表示する。**審査への最終送信や一般公開は別操作**。ASC → TestFlightで内部グループへ追加、必要なら外部Beta App Reviewを申請する。

2026-09-10実績：production build `28f8d0b4-e000-4c62-9fab-103813f3187d`、version 1.0.0、build 4。EAS BuildはFINISHED。最小権限APP_MANAGERのEAS Submitキーを作成し、App Store Connectへのバイナリアップロードに成功。2026-09-11にApple側の処理完了を確認し、TestFlightの説明、URL、連絡先、審査メモ、build 4のテスト内容を保存。自動配信の内部グループ `内部テスト` を作成し、Account Holder 1名を招待、build 4を配信済み。次は招待された実機でTestFlightをインストールして下記項目を確認する。

同日以降、App Store掲載情報のサブタイトル、カテゴリ（教育／ライフスタイル）、説明、キーワード、Support/Marketing URL、審査承認後の手動リリースを保存した。アプリ価格は無料、配信地域は日本のみ、Mac／Apple Vision Pro配信は無効、コンテンツ配信権は保有、年齢制限はApple算定の9+として登録した。App Privacyは収集7型・用途・関連付け・トラッキングなしを登録して公開し、詳細なReview Notesも保存済み。build 6と7はiPhone 13 Pro / iOS 26.6で起動クラッシュした。build 7の `.ips` はHermesの `LowerScopes` / `evalInEnvironment` 経路を示したため、iOSだけJSCへ切替え、React Compilerを解除したbuild 8を作成・提出した。App versionの対象ビルドはbuild 8の実機合格後に差し替える。米国税務フォーム2件は提出済みで有効。有料アプリ契約と銀行口座はApple処理中。Appleの入力検証で、著作権、6.5インチiPhone実機スクリーンショット、審査用ユーザー名・パスワード、審査連絡先の名・姓・メール・国コード付き電話番号が必須と確認した。初回IAPにも審査用スクリーンショットが必要なため、これらを登録するまで審査へ送信しない。

TestFlight/Sandboxでもこの非自動更新商品の期限はアプリ独自の720時間。自動更新subscriptionのSandbox加速を流用しない。境界の自動テストはローカルSQL、端末での期限切れはstaging専用fixtureアカウントで確認する。本番取引日時を書き換えない。新規テスター/審査アカウントのUUIDをallowlistへ登録し忘れるとSandbox購入検証が拒否される。

## App Store掲載案と本人入力

| 項目 | 案・状態 |
| --- | --- |
| 名前 | 処世術禄 |
| サブタイトル | 人間関係・仕事・人生の知恵を学ぶ |
| 説明 | 下記案。件数は最新公開範囲と一致させてから必要なら追記 |
| Keywords | 処世術,人間関係,仕事,人生,学習,心理学,行動科学,自己理解,実践 |
| 主カテゴリ | 教育（候補、本人確認） |
| 年齢レーティング | 内容監査に基づいてASC質問票を回答し、Apple算定の9+を保存済み |
| Privacy URL | https://shoseijutsuroku.com/privacy/ （更新の公開と閲覧確認が必要） |
| Support URL | https://shoseijutsuroku.com/legal/faq （メール導線追加済み。公開確認が必要） |
| Marketing URL | https://shoseijutsuroku.com/ |
| App Privacy | 次節のコード監査表をもとにサービスログ設定まで照合 |
| Screenshot | 実iPhoneのホーム、検索、詳細、保存、学習、IAP。iPad対応も既存設定でtrueなのでiPadも必要。未撮影 |
| Icon | assets/brand/icon.png。1024×1024、不透明、角丸を焼き込まないことを検査。最終見た目は実機で確認 |
| Review account | ログイン不要の無料版に加えて購入/復元確認用の非ownerアカウント。資格情報はASCだけに入力 |
| IAP | 上記Non-Renewing Subscription。初回versionに関連付ける |
| Copyright / rights | 禄ブランドの権利者表記を本人確認。引用・出典・画像の利用権も確認 |

説明文案：

> 人生をうまく生きる方法を、すべての人へ。
>
> 処世術禄は、人間関係・仕事・人生の悩みに役立つ知恵を、処世術と関連理論から学べるアプリです。気になるテーマを探し、処世術を保存し、ケース学習で日々の実践につなげられます。
>
> 無料版はログインなしで利用できます。完全版はアプリ内購入により、購入完了から30日間利用できます。一回払いで自動更新はありません。購入・復元には処世術禄のアカウントが必要です。有料コンテンツの権限確認には通信が必要です。

Review Notes案（プレースホルダーはASCで実値に置換）：

> Shoseijutsuroku is a native Expo/React Native learning app with search, saved cards, reading history and case-based learning. The free edition works without signing in. Open Settings > Complete edition to purchase or restore.
> The IAP is a non-renewing subscription: 30 days (720 hours) from the verified Apple purchase date. It never renews automatically. Transactions are verified with the App Store Server API and linked to the app account. Restoration requires the same app account. Existing valid website purchases are available after sign-in under guideline 3.1.3(b); no external purchase links are provided in the iOS purchase flow.
> Use the supplied review account for Sandbox purchases and restoration. Account deletion is available at Settings > Delete account and requires the current password. Deletion is permanent and does not automatically request a refund. No social sign-in, advertising or cross-app tracking is used.
> Review login: [ASCの審査用アカウント欄に入力]. Backend and IAP are live and testable [確認後のみ記載].

購入確認用の未購入アカウントと、Web購入済みの非ownerアカウントを用意。無料/購入/復元の操作はReview Notesに明記。owner権限を審査アカウントへ付けない。

## App Privacy監査表

| データ | コード上の用途/送信先 | 申告案 |
| --- | --- | --- |
| Email / UUID | Supabase Auth、権限紐づけ | Email Address / User ID、App Functionality、linked |
| 表示名 / avatar | profiles、Storage | Name / Photos or Videos、App Functionality、linked |
| Apple/Web購入履歴 | Server API、DB | Purchase History、App Functionality、linked |
| anonymous actor ID | AsyncStorageからSupabase RPCへ永続ID送信 | Device ID（インストール識別）、Analytics、linkedとして保守的に申告 |
| view/save、対象、時刻 | content_events、人気表示 | Product Interaction、Analytics / Product Personalization、linked |
| メモ/学習記録/関心 | 原則AsyncStorageのみ | 端末外に送らない内容は収集に含めない。将来同期時は再監査 |
| 問い合わせ | mailto→本人のメールアプリ→運営Gmail/運用DB | サポート送信内容、メール等。任意サポートの免除条件を満たすか運用実態で判断 |
| IP/Diagnostics | Supabase/Auth/Edge/配信サービスのログ | 保持設定と利用目的を本人確認。障害ログとして保持するならDiagnostics等を追加。未確認のまま「なし」としない |
| IDFA/広告/外部追跡 | SDK・コードに該当呼出しなし | Trackingなし、ATTなし。新SDK追加時に再監査 |
| Cookie/session | Webはbrowser session、nativeはAsyncStorage | WebのCookieがそのままiOSに入る構成ではない。User ID/認証目的に反映 |
| カード番号/PayPay情報 | Web Stripeが処理 | nativeからStripe決済を開かない。購入履歴と支払情報を区別 |

Privacy ManifestはApp Privacyフォームの代替ではない。SDKが追加するRequired Reason APIをEASの集約manifestで確認。現在のUserDefaults CA92.1は自己アプリの保存データ用途。

## 審査・公開の順序

1. `IOS_VERIFICATION.md` の実機表をすべて実施。Sandbox購入、再インストール、返金通知とWeb共存は必須。
2. ASCの各URL・スクリーンショット・年齢・プライバシー・輸出コンプライアンス・連絡先・IAP審査情報を埋める。
3. TestFlightで確認した同じproductionビルドをApp versionに選択。IAPを追加。Review Notesと審査資格情報を設定。
4. 公開方式は手動リリースを推奨。Add for Review → Submit to App Review。EAS Submitだけではこの手順は完了しない。
5. 承認後、Web/APIの正常性、IAP価格/提供地域、サポート対応を確認してRelease This Version。
6. 更新はapp.jsonのversionを上げ、typecheck/権限テスト/Web回帰→EAS production build→submit→TestFlight→新version審査。buildNumberはEAS remote autoIncrement。

## 残るリスク・運用確認

- 2.1：Apple登録値・署名・本番商品・実機未確認。設定とTestFlightを完了させる。
- 3.1.1：誤商品タイプ/価格/未承認IAP、Sandbox allowlist不足。ASCとclient/server IDを照合。
- 4.2：学習/検索/保存の実機体験を示す。WebViewラッパーではないが合格保証はない。
- 5.1：実収集と申告、保持期間、運営Gmail/問い合わせDBの削除運用、公開ポリシーを一致させる。匿名イベントやサーバーログの保持期間を本人が決定する必要がある。
- 4.8：現状メール/passwordのみなので追加social login不要。Google等を導入すると再判定。
- 削除：公開コンテンツ作成者FK変更の管理画面回帰、最後のowner削除時の事業継続、問い合わせ情報の削除運用を確認。
- 価格/権利/年齢：JPY 280選択可否、商品/画像/引用の権利、正しい年齢質問票はアカウント操作と全内容の確認が必要。
- ネイティブコンパイルと署名はEAS production buildで成功。Expo/IAPの実動作、集約Privacy Manifest、実機サイズ/性能はTestFlight実機で確認が必要。
