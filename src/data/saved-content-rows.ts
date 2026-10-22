import { isRetiredTheoryId, RETIRED_THEORY_TITLE } from '@/data/theory-knowledge';
import { techniqueById, theoryById } from '@/data/catalog';
import { uniqueSavedIds } from '@/data/personal-dashboard';
import type { FeatureArticle } from '@/data/features';
import type { PersonalContentRow } from '@/components/personal-content-card';

export function buildSavedContentRows({ savedIds, savedTheoryIds, savedFeatureIds, featureArticles }: {
  savedIds: readonly string[];
  savedTheoryIds: readonly string[];
  savedFeatureIds: readonly string[];
  featureArticles: readonly FeatureArticle[];
}): PersonalContentRow[] {
  const rows: PersonalContentRow[] = [];
  for (const id of uniqueSavedIds(savedIds)) {
    const card = techniqueById.get(id);
    rows.push({ kind: 'technique', id, label: card?.categoryName ?? '処世術', category: card?.categoryKey ?? 'interpersonal', title: card?.title ?? '保存済みの処世術', description: card?.subcategory ?? '' });
  }
  for (const id of uniqueSavedIds(savedTheoryIds)) {
    if (isRetiredTheoryId(id)) {
      rows.push({ kind: 'theory', id, label: '公開終了', category: 'practical-wisdom', title: RETIRED_THEORY_TITLE, description: '保存の記録は保持されています。' });
      continue;
    }
    const theory = theoryById.get(id);
    rows.push({ kind: 'theory', id, label: theory?.categoryTitle ?? '理論', category: theory?.categoryId ?? 'psychology', title: theory?.title ?? '保存済みの理論', description: [theory?.categoryTitle, theory?.subcategoryTitle].filter(Boolean).join(' > ') });
  }
  for (const id of uniqueSavedIds(savedFeatureIds)) {
    const article = featureArticles.find(item => item.id === id);
    rows.push({ kind: 'feature', id, label: '特集', category: 'feature', article, title: article?.title ?? '保存した特集', description: article?.lead ?? '' });
  }
  return rows;
}
