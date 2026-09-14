# 今回の変更ファイル

変更先はsyoseizyutsu-roku-mobile。publish checkoutに変更なし。Git commit/push、本番DB適用、EASアップロードは未実施。

## 既存ファイルの変更
- `.gitignore`
- `PRIVACY_POLICY.md`
- `README.md`
- `RELEASE_CHECKLIST.md`
- `eas.json`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `public/privacy/index.html`
- `src/app/_layout.tsx`
- `src/app/auth.tsx`
- `src/app/legal/[document].tsx`
- `src/app/settings.tsx`
- `src/auth/auth-state.tsx`
- `src/lib/purchase.ts`
- `supabase/functions/access/index.ts`

## 新規ファイル
- `.easignore`
- `.env.ios.example`
- `app.config.js`
- `docs/IOS_AUDIT_2026-09-09.md`
- `docs/IOS_CHANGED_FILES.md`
- `docs/IOS_RELEASE.md`
- `docs/IOS_VERIFICATION.md`
- `scripts/eas-post-install.mjs`
- `scripts/ios-preflight.mjs`
- `scripts/test-apple-entitlements.mjs`
- `scripts/update-apple-roots.mjs`
- `src/app/settings/delete-account.tsx`
- `src/app/settings/install.ios.tsx`
- `src/app/upgrade.ios.tsx`
- `src/components/apple-purchase-observer.ios.tsx`
- `src/components/apple-purchase-observer.tsx`
- `src/data/ios-legal.ts`
- `src/lib/apple-purchase.ios.ts`
- `src/lib/apple-purchase.ts`
- `src/lib/native-auth-callback.ts`
- `src/lib/purchase-timeout.ts`
- `supabase/functions/_shared/apple-roots.json`
- `supabase/functions/_shared/apple.ts`
- `supabase/functions/apple-notifications/index.ts`
- `supabase/functions/apple-purchase/index.ts`
- `supabase/functions/delete-account/index.ts`
- `supabase/functions/deno.json`
- `supabase/functions/deno.lock`
- `supabase/migrations/20260909090000_apple_iap.sql`
- `tests/backend/apple-verification.test.ts`

## 依存・DB・API

- Runtime: expo-iap 5.5.1、expo-dev-client ~57.0.18。
- Test: @electric-sql/pglite 0.3.14、deno 2.7.4。Server: Apple公式app-store-server-library 3.1.0（Deno lock）。
- DB: apple_transactions追加、共通read RPC合成、作成者4 FKのSET NULL対応。Web購入grant/refundは維持。Apple取引もアカウント削除時にcascade削除。
- API: apple-purchase / apple-notifications / delete-account追加、accessへApple再照合追加。
- iOS: StoreKit購入/復元/再起動observer、native upgrade、メールdeep link、キーボード/Safe Area、削除、法務・権限設定。
- Web: 元の購入画面・Stripe・PayPay・URL・SEO・PWA・管理機能を維持。Privacy説明追記と共通read APIが変更点。

## 今回の変更に含めないもの

- `public/og.png`：開始前からの変更を保持。
- `public/sw.js`：開始前からの変更を保持。
- `scripts/generate-og-image.mjs`：開始前からの変更を保持。

詳細な根拠・操作・検証はIOS_AUDIT_2026-09-09.md、IOS_RELEASE.md、IOS_VERIFICATION.md。
