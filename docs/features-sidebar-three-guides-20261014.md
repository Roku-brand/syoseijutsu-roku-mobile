# 特集の縦タブと3名の編集案内人

## 表示

PC（1000px以上）は分類を左側の縦タブに移し、重複する左側の見出しと「5つの処世術指針」の独立リンクを削除した。記事一覧は余白を減らし、横タブが占めていた高さもなくして上へ詰めた。スマートフォンでは本文幅を確保するため横スクロールのタブを維持する。

「架空」という注記は記事・プロフィール・編集方針・管理画面・SEOから外した。制作主体は処世術禄編集部、人物は編集案内人として表示し、学歴・研究実績・取材・監修実績などは追加しない。

## 3名と担当

| 案内人 | 関心 | 記事 |
| --- | --- | --- |
| 澄野 遥 | 人間関係・心理・自己理解 | ティルト／メタ発言 |
| 榊 直人 | 生き方・選択・意思決定 | 5つの処世術指針／熱血と冷笑 |
| 小野瀬 紬 | 社会・時代・SNS・価値観 | 年齢への焦り |

全員の名前・肩書き・紹介文・関心領域・画像・公開状態・表示順は既存CMSで変更できる。編集方針に3名のプロフィールへのリンクを掲載する。

## データ保護

マイグレーション `20261014133738_expand_editorial_guides.sql` は既存テーブルを再利用し、2名を追加し、画像プリセットの制約を3名に拡張する。元の案内人の初期設定が残っている対象記事のみ担当を振り分ける。記事のタイトル・本文・URL・画像・カテゴリ・関連知識・掲載順・公開状態・更新日時・下書きは変更しない。元の案内人の画像説明は短い説明に整える。

本番適用は既存記事・下書き・案内人の比較を含む単一トランザクションで行い、差があればロールバックする。履歴に記録済み。適用結果は公開案内人3名、担当記事は2・2・1件。

## 検証

TypeScript・ESLint、特集E2E12件、PGliteでの保護・互換性・RLS検証が成功した。E2Eでは320～1440px、左タブの縦並び、独立リンクの削除、一覧の上詰め、フィルタ、3名のプロフィール、CMSの選択肢を確認した。Web/iOS/AndroidのエクスポートとSEO291 URLの監査が成功した。実機・ストア配布は対象外。

## 肖像アセット

- `assets/editorial/sakaki-naoto.webp`：512px、37,234 bytes。
- `assets/editorial/onose-tsumugi.webp`：512px、34,640 bytes。
- 既存の澄野遥の画像は維持する。生成原本は残し、配信用の縮小・WebP化のみ行った。

生成プロンプトの共通部分：

> Use case: illustration-story. A single original square portrait avatar for a fictional editorial guide of the Japanese knowledge app 処世術禄. Clearly a literary editorial illustration, not a photograph. Delicate ink contours and soft watercolor/gouache shading, warm ivory textured plain background, muted olive, charcoal and restrained ochre palette. Quiet, intelligent and approachable atmosphere. Head and upper shoulders centered, generous safe margin for a circular crop. Natural facial proportions and gentle expression. No text, no logo, no frames, no watermark, no diplomas, no fabricated credentials, no exaggerated anime eyes, no celebrity likeness. Only one person.

榊の追記：

> Character: 榊 直人 (Sakaki Naoto), a Japanese adult man around forty, short slightly tousled dark hair with a few gray strands, thin round dark glasses, simple off-white shirt and muted olive-brown jacket. Soft attentive eyes, subtle natural smile, contemplative and grounded. Match a refined Japanese literary magazine's understated watercolor portrait.

小野瀬の追記：

> Character: 小野瀬 紬 (Onose Tsumugi), a Japanese adult woman around thirty, shoulder-length straight dark brown hair tucked behind one ear, simple ivory blouse and muted moss green jacket. Thoughtful warm expression, lightly smiling, observant and approachable. Match a refined Japanese literary magazine's understated watercolor portrait.

原本は `C:/Users/tsuba/.codex/generated_images/01a13535-1618-7ae2-92fe-1a4160290a2f/exec-ebcc2083-0522-49ad-8312-47865191d5b6.png` および `exec-247224ee-ab3c-4057-8e47-39365c8bd7b7.png`。
