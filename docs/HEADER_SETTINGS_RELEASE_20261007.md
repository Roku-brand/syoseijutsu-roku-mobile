# ヘッダー・設定画面の更新（2026-10-07）

## 公開済みのWeb

- 公開先: https://app.shoseijutsuroku.com/
- PR: https://github.com/Roku-brand/syoseijutsu-roku-mobile/pull/137
- 本番コミット: `865c90dde6eec062975aff867188c85577190e64`
- 最終PR検証: https://github.com/Roku-brand/syoseijutsu-roku-mobile/actions/runs/37587400430
- 公開処理: https://github.com/Roku-brand/syoseijutsu-roku-mobile/actions/runs/37588234121 （成功）

処世術・理論の詳細ヘッダーは戻る・蔵書保存・共有を維持し、設定・五大原則を表示しない。学習ケースや設定・認証等の専用画面は戻るとタイトルを表示する。主要4タブのブランド・検索・設定、およびホームの五大原則への入口は維持する。

データの取得状態にかかわらず、詳細ルートを専用ヘッダーとして扱う。学習ケースへの直接アクセスでも「学ぶ」に戻れる。操作領域は44px以上とし、左右の操作数に応じてタイトル領域を確保する。Webで空白だった共有アイコンを、描画依存のない線画へ変更した。

前回依頼された設定入口の丸いプロフィールアイコンと、設定画面のフラットな区切り一覧も公開した。Webの設定本文とハンドラーは変更前との比較で不変を確認した。認証、購入判定、購入処理、学習進捗、蔵書等の既存データ処理は変更していない。

## 検証

- iOSソースの型チェック成功。
- PRの型チェック・lint・単体検証・購入回帰検証・コンテンツ監査成功。
- 最終版の画面テスト134件成功。
- 本番でも処世術詳細・理論詳細・学習中のヘッダー操作を確認。
- 本番の主要タブから設定へ移動できること、学習ヘッダーから学ぶへ戻れることを確認。
- 320px・390px・1440pxで配置を確認。詳細の保存状態が再読み込み後も維持されることをE2Eで確認。
- 証跡: `diagnostics/header-detail-published-20261007.jpg`、`diagnostics/header-learning-published-20261007.jpg`、`diagnostics/settings-published-20261007.jpg`。

## iOS

`src/components/book-ui.tsx` に同じヘッダー変更を反映済み。前回の設定UI変更もソースに保持している。ユーザーの「明示しない場合はビルドしない」という指定に従い、EASビルド・TestFlight配信・App Store提出は行っていない。インストール済みiOSアプリへの反映には、別途明示された新規ビルドが必要。
