export const THEORY_CATEGORIES = [
  { id: 'psychology', label: '心理学' },
  { id: 'behavioral-science', label: '行動科学' },
  { id: 'organization-management', label: '組織・経営論' },
  { id: 'strategy', label: '戦略論' },
  { id: 'practical-wisdom', label: '実践知' },
  { id: 'classics-thought', label: '古典・思想' },
] as const;

export type TheoryCategoryId = (typeof THEORY_CATEGORIES)[number]['id'];

export const THEORY_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  THEORY_CATEGORIES.map(({ id, label }) => [id, label]),
);

export function getTheoryCategoryLabel(category: string) {
  return category === 'all' ? 'すべての理論' : THEORY_CATEGORY_LABELS[category] ?? '理論';
}
