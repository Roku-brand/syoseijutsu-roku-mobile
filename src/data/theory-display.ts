/** 表紙・一覧用に、理論の意味を説明する最初の1文だけを返す。 */
export function getTheoryCoverSummary(summary?: string | null, fallback?: string): string {
  const text = summary?.trim();
  if (!text) return fallback ?? '';
  const sentenceEnd = text.search(/[。！？!?]/);
  return sentenceEnd === -1 ? text : text.slice(0, sentenceEnd + 1);
}
