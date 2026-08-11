export const THEORY_CATEGORY_COUNTS: Record<string, number> = {
  psychology: 228,
  'behavioral-science': 80,
  'organization-management': 136,
  strategy: 57,
  'classics-thought': 43,
  'maxims-experience': 51,
};

export const THEORY_CATEGORY_LABELS: Record<string, string> = {
  psychology: '心理学',
  'behavioral-science': '行動科学',
  'organization-management': '組織・経営論',
  strategy: '戦略論',
  'classics-thought': '古典・思想',
  'maxims-experience': '名言・経験則',
};

export function getTheoryCategoryCount(category: string) {
  if (category === 'all') {
    return Object.values(THEORY_CATEGORY_COUNTS).reduce((total, count) => total + count, 0);
  }
  return THEORY_CATEGORY_COUNTS[category] ?? 0;
}

export function getTheoryCategoryLabel(category: string) {
  return category === 'all' ? 'すべての理論' : THEORY_CATEGORY_LABELS[category] ?? '理論';
}
