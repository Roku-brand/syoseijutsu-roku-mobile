# 特集の編集部・編集案内人導入

## 変更範囲

- `src/data/editorial-policy.{json,ts}`：外部表示と内部方針の共通文言。
- `src/data/editorial-characters.ts`：公開案内人取得・オーナー編集・競合検出。
- `src/data/features.ts` / `feature-editorial.ts`：任意の案内人、関連記事ID、参考文献。旧データの補完、安全なURLのみ表示。
- `src/components/editorial-guide.tsx` / `feature-card.tsx` / `feature-article.tsx`：編集部名義、小さな案内人表示、共通カード、関連知識・出典。
- `src/app/features/index.tsx` / `[slug].tsx` / `guides/[id].tsx` / `editorial-policy.tsx`：既存一覧・記事を維持し、プロフィールと編集方針を追加。
- `src/app/owner/features.tsx` / `editorial-characters.tsx`：既存の下書き・公開・並び替えを維持し、編集情報と案内人管理を追加。
- `src/app/about/shoseijutsu.tsx` / `README.md` / `docs/product-philosophy.md`：蓄積型・不朽型の思想を明記。
- `src/components/seo-meta.tsx` / `scripts/generate-seo-assets.mjs`：公開プロフィール・編集方針のSEO。記事の制作者はOrganizationの処世術禄編集部。
- `src/lib/content-media.ts` / `src/navigation/app-routes.ts` / `book-ui.tsx` / `settings.tsx`：既存画像ストレージ、経路、管理導線を再利用。

## データ

マイグレーション `20261014103609_feature_editorial_desk.sql` で `editorial_characters` を追加。公開状態・掲載順・画像・紹介文・関心領域を管理し、RLSで公開行のみ閲覧、編集はオーナー限定にする。案内人編集は更新日時を使って競合を検出する。

`feature_articles` に `editorial_character_id`（削除時NULL）、`related_feature_ids`（ID配列）、`source_references`（名称・URL・補足のJSON配列）を追加。既存の本文・タイトル・URL・画像・カテゴリ・掲載順・公開状態・更新日時は維持する。既存の知識関連付けが空の行だけに、実在する公開中のIDを追加する。

旧クライアントや旧下書きが新フィールドを含まなくても現行値を保持する。案内人の非公開・削除・取得失敗によって記事を隠さない。関連記事は公開中のものだけ表示し、最大2件に抑える。参考文献は確認済みのものを任意で設定する構造のみ追加し、既存記事に出典を生成しない。

## 既存記事

本番調査で5記事を確認。以下の分類を維持し、全5記事に初期案内人を設定する。

| 記事 | 主カテゴリ | 空欄だった関連知識に追加するID |
| --- | --- | --- |
| 押さえておくべき5つの処世術指針 | 生き方・選択 | master336-004, master336-269, master336-275 / kb_280, kb_553 |
| ティルトを使いこなせ！ | 自己理解・成長 | kb_574 |
| メタ発言はなぜ気分を害するのか | 人間関係 | kb_480, kb_417 |
| 熱血と冷笑の本質 | 自己理解・成長 | kb_574 |
| なぜ私たちは、年齢に焦るのか | 社会・時代 | kb_266, kb_735 |

知識のID・公開状態をDBで確認したうえで設定する。リンク先の既存の無料・完全版区分は維持する。

## 初期イラスト

`assets/editorial/sumino-haruka.webp`（512px、約49KB）。明確にイラストと分かる、水彩・インク調の架空の案内人。実在人物の写真は使用しない。

生成プロンプト：

> Use case: illustration-story. Asset type: a single original square portrait avatar for a fictional editorial guide in the Japanese knowledge app 処世術禄. Create 澄野 遥 (Sumino Haruka), a thoughtful and approachable Japanese adult with a soft natural expression, neat dark hair and a simple ivory shirt with a muted moss-green cardigan. Calm, subtly androgynous adult appearance. Upper shoulders and face centered with generous safe margin for circular avatar crops. Elegant editorial illustration with visible delicate ink contours and softly textured watercolor/gouache shading, reminiscent of a refined literary magazine, clearly drawn rather than a photograph. Warm ivory plain background, charcoal and muted olive palette with restrained ochre accents. Intelligent, gentle, contemplative atmosphere without claiming authority. No text, no logo, no watermark, no frames, no diplomas, no dramatic anime eyes, no exaggerated anime style, no resemblance to a real celebrity or expert. Only one person, no additional characters. This person is explicitly a fictional guide, not a real writer, researcher or journalist.

原本保存先：`C:/Users/tsuba/.codex/generated_images/01a13535-1618-7ae2-92fe-1a4160290a2f/exec-3d3ccf72-7f99-459d-8088-ca483d5acd9b.png`。配信用の縮小・WebP化のみ実施。

## 検証

PGliteによる分離DBテストで、RLS・競合・下書き隔離・旧クライアント・案内人の無効化/削除・出典URL・カテゴリ・既存データ保護を確認。後からCMSで追加された5記事目も含むデータ保護テストが成功した。

Playwrightの特集専用11件が成功。一覧・記事は320/390/700/1000/1280/1440px、プロフィールは320/390/1280pxで検証し、横はみ出しがないことを確認。CMSで案内人・出典・関連記事・理論を設定し、関連する詳細ページへ遷移できること、キャラクターを無効化しても本文を表示できることを確認した。

TypeScript・ESLintが成功。Web/iOS/Androidの共通コードをエクスポートできた。SEO監査は289の公開URLで成功。ネイティブ実機操作とApp Storeへの配布は今回行っていない。

本番DBへの適用は単一トランザクションで実施。既存のタイトル・本文・URL・画像・カテゴリ・掲載順・状態・更新日時・全下書き・非空の関連知識配列を比較し、差があればロールバックする保護を設けた。適用後も記事は5件、案内人付きも5件。実際のSupabase上でもロールバック付きの編集/RLSテストが成功し、検証データは残していない。DB Advisorは適用前後とも既存97件で、新たな指摘は0件。

本番Webの公開確認とGitHubの全体テスト結果は、完了時に追記する。

認証・課金・サブスクリプション・既存の処世術/理論分類は変更しない。新着・ランキング・定期更新・コメント・推薦アルゴリズムは追加しない。
