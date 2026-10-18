export const JAPANESE_APP_STORE_PRICE = '320円';

type AppleProductPrice = { currency: string; price?: number | null };

export function japaneseApplePrice(product: AppleProductPrice) {
  if (product.currency === 'JPY' && typeof product.price === 'number'
    && Number.isFinite(product.price) && product.price > 0) {
    return { label: `${product.price.toLocaleString('ja-JP')}円`, note: '' };
  }
  // A foreign Sandbox storefront can return USD. Keep Japan's published price
  // distinct from the amount and currency charged by the selected Apple account.
  return {
    label: JAPANESE_APP_STORE_PRICE,
    note: '日本のApp Storeでの価格です。決済時の金額・通貨はAppleの購入確認画面でご確認ください。',
  };
}
