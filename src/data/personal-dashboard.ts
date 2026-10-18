// Display-only projections. The persisted records and their IDs stay intact.
export const uniqueSavedIds = (ids: readonly string[]) => [...new Set(ids)];

export function latestPersonalMemos<T extends { id: string; createdAt: string }>(memos: readonly T[]) {
  return [...new Map(memos.map(memo => [memo.id, memo])).values()]
    .sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
}

export function personalMemoCopy(text: string) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length > 1) return { title: lines[0], excerpt: lines.slice(1).join('\n').trim() };
  const sentence = text.match(/^(.+?[。！？])\s*([\s\S]+)$/);
  return sentence ? { title: sentence[1], excerpt: sentence[2] } : { title: text, excerpt: '' };
}
