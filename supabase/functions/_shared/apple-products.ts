// Shared by the native purchase flow and Apple's server-side verifier.
// Product IDs are public identifiers, not credentials.
export const appleCompleteProductId = 'com.shoseijutsuroku.premium.30days.v2';
const legacyCompleteProductId = 'jp.shoseijutsuroku.app.complete30days';

export function isCompleteAppleProduct(productId: unknown): productId is string {
  // Keep existing signed purchases restorable during the product migration.
  // The mistakenly created non-consumable com.*.30days is deliberately excluded.
  return productId === appleCompleteProductId || productId === legacyCompleteProductId;
}
