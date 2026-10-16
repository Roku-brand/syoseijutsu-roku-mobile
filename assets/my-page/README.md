# マイページ背景素材

2026-10-16、ユーザー指定の2画面に合わせて制作。背景のみを画像化し、名前・座右の銘・フォルダー名・件数・操作はReact NativeのUIとして表示する。

| ファイル | モチーフ | 転送サイズ |
|---|---|---:|
| folder-gold.webp | 金の麻の葉・青海波・山水 | 28,172 B |
| folder-sage.webp | 淡緑の竹・山水 | 36,852 B |
| folder-blue.webp | 淡青の青海波 | 49,426 B |
| folder-pink.webp | 淡紅の桜・青海波 | 24,176 B |

生成: imagegenスキル / `image_gen.imagegen`。透過なし。生成PNGの原本を残し、Sharpで全体を幅1,200pxに縮小してWebP quality 82で書き出した。トリミングは行っていない。

共通プロンプト:

> Create a textless background illustration asset for a refined Japanese knowledge library folder card. Wide horizontal 4:1 panoramic composition, [theme]. Almost white quiet left 55 percent reserved for dark UI text; all ornament confined to rightmost 45 percent and subtle along bottom. Fine Japanese washi paper grain, elegant hand-painted traditional Japanese watercolor, luminous airy and understated, sophisticated. Full bleed rectangle, no border, no frame, no shadow, NO letters, NO numbers, NO text, NO logo, NO UI elements. This is a production app background, not a mockup.

テーマ差分:

- gold: warm ivory and very pale champagne gold, fine asanoha hemp leaf pattern on upper right and gentle seigaiha waves bottom right
- sage: very pale ivory sage green, delicate watercolor bamboo leaves entering from upper right, distant Japanese mountains and mist along bottom right
- blue: very pale ivory ice blue, traditional Japanese seigaiha overlapping semicircle waves on right half, soft watercolor blue wash and tiny gold flecks
- pink: very pale ivory blush pink, elegant Japanese cherry blossom branch entering from upper right with a few falling petals, faint seigaiha waves bottom right

既存の `personal-principle-scroll-refined.webp` は引き続き巻物の外枠に使用する。
