import { theories } from './catalog';

export const THEORY_CATEGORY_LABELS: Record<string, string> = {
  psychology: '心理学',
  'behavioral-science': '行動科学',
  'organization-management': '組織・経営論',
  strategy: '戦略',
  'classics-thought': '古典・思想',
  'maxims-experience': '格言・経験則・作品',
};

export function getTheoryCategoryCount(category: string) {
  if (category === 'all') return theories.length;
  return theories.filter((theory) => theory.categoryId === category).length;
}

export function getTheoryCategoryLabel(category: string) {
  return category === 'all' ? 'すべての理論' : THEORY_CATEGORY_LABELS[category] ?? '理論';
}
