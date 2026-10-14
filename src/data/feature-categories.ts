export const FEATURE_CATEGORIES = [
  { id: 'relationships', label: '人間関係', description: '人とどう関わり、関係を築くのか。' },
  { id: 'self-growth', label: '自己理解・成長', description: '人はなぜそう感じ、どのように成長・成熟するのか。' },
  { id: 'life-choices', label: '生き方・選択', description: '人生で何を選び、何を大切にして生きるのか。' },
  { id: 'society-era', label: '社会・時代', description: '社会の仕組みや時代の変化が、人間に何をもたらすのか。' },
] as const;

export type FeatureCategoryId = typeof FEATURE_CATEGORIES[number]['id'];
export type FeatureCategoryFilter = 'all' | FeatureCategoryId;
export function featureCategoryId(value: unknown): FeatureCategoryId | null {
  return FEATURE_CATEGORIES.find(category => category.id === value)?.id ?? null;
}
export function featureCategoryLabel(value: unknown) {
  return FEATURE_CATEGORIES.find(category => category.id === value)?.label ?? '未設定';
}
