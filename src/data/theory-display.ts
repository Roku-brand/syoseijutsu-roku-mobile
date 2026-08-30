/**
 * 外部データやJSX属性から渡る表示文を、画面向けの文字列へ整える。
 * literalな「\\n」も実際の改行へ戻し、行頭・行末の空白を取り除く。
 */
export function normalizeDisplayText(value?: string | null): string {
  return (value ?? '')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}

export function getTheoryCategoryLabel(theory: Pick<{ categoryId: string; categoryTitle: string }, 'categoryId' | 'categoryTitle'>): string {
  const displayLabels: Record<string, string> = {
    'maxims-experience': '格言',
    'organization-management': '組織・経営論',
    'classics-thought': '古典',
  };
  if (displayLabels[theory.categoryId]) return displayLabels[theory.categoryId];
  return normalizeDisplayText(theory.categoryTitle);
}

/** 表紙・一覧用に、理論の意味を説明する最初の1文だけを返す。 */
export function getTheoryCoverSummary(summary: string): string {
  const text = normalizeDisplayText(summary).replace(/\n+/g, ' ').replace(/[ \t]{2,}/g, ' ').trim();
  if (!text) return '';
  const sentenceEnd = text.search(/[。！？!?]/);
  return sentenceEnd === -1 ? text : text.slice(0, sentenceEnd + 1);
}
