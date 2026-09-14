// Web/Android entry: do not import the native StoreKit module into Web bundles.
export async function restoreApplePurchases(): Promise<void> {
  throw new Error('Appleの購入復元はiOSアプリで利用できます。');
}
