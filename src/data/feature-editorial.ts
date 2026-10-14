export type FeatureReference = { title: string; url: string | null; note: string };
export function safeReferenceUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try { const url = new URL(value.trim()); return ['https:', 'http:'].includes(url.protocol) && url.hostname ? url.href : null; }
  catch { return null; }
}
export function featureReferences(value: unknown): FeatureReference[] {
  if (!Array.isArray(value)) return [];
  return value.filter(item => item && typeof item === 'object' && typeof item.title === 'string' && item.title.trim()).map(item => ({ title: item.title, url: safeReferenceUrl(item.url), note: typeof item.note === 'string' ? item.note : '' }));
}
