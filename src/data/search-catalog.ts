import { FREE_TECHNIQUE_IDS } from '@/access/access-config';
import { categories, categoryMeta, getTheoryDisplayId, techniqueCards, theories } from '@/data/catalog';
import { getPersonaPresentation } from '@/data/persona-presentation';
import { getTechniqueTags } from '@/data/technique-tags';
import { getTheoryCategoryLabel } from '@/data/theory-counts';
import { getTheoryPath } from './theory-taxonomy';
import type { FeatureArticle } from './features';
import { featureCategoryLabel } from './feature-categories';
import { prepareSearchQuery, rankSearchItems } from './search-ranking';
import theoryKeywords from './generated/theory-search-keywords.json';

export type BrowseMode = 'techniques' | 'theories' | 'features';
export const SEARCH_MODES: Array<{ id: BrowseMode; label: string }> = [
  { id: 'techniques', label: '処世術' }, { id: 'theories', label: '理論' }, { id: 'features', label: '特集' },
];
export const POPULAR_SEARCHES: ReadonlyArray<{ term: string; mode: BrowseMode }> = [
  { term: '第一印象', mode: 'techniques' }, { term: '挫折', mode: 'techniques' },
  { term: '単純接触効果', mode: 'theories' }, { term: '交渉', mode: 'techniques' },
  { term: '先延ばし', mode: 'techniques' }, { term: '最適化の罠', mode: 'theories' },
];
export function getSearchMode(value: string): BrowseMode {
  return value === 'theories' || value === 'features' ? value : 'techniques';
}
export function getFeatureSearchResults(articles: FeatureArticle[], query: string) {
  const published = articles.filter(article => article.status === 'published')
    .sort((a, b) => a.display_order - b.display_order || a.id.localeCompare(b.id));
  return rankSearchItems(published, article => ({ title: article.title, summary: article.lead,
    body: article.body, context: [featureCategoryLabel(article.category_id)] }), query);
}

export function getSearchKeywords(query: string) {
  return prepareSearchQuery(query).map(term => term.text);
}

export function getSearchResults(query: string, isPaid: boolean) {
  const keywords = getSearchKeywords(query);
  const personas = categories.flatMap(category => category.subcategories.map(persona => ({ category, persona })))
    .sort((left, right) => (getPersonaPresentation(left.persona.name)?.number ?? 999) - (getPersonaPresentation(right.persona.name)?.number ?? 999));
  const personaMatches = rankSearchItems(personas, ({ category, persona }) => ({ title: persona.name,
    summary: getPersonaPresentation(persona.name)?.subtitle,
    context: [category.name, categoryMeta[category.key].label] }), query);
  const techniqueMatches = rankSearchItems(techniqueCards.filter(card => isPaid || FREE_TECHNIQUE_IDS.has(card.id)), card => ({
    title: card.title, tags: getTechniqueTags(card), summary: [card.essence, card.subtitle].filter(Boolean).join(' '),
    context: [card.categoryName, card.subcategory, card.articleTitle], body: card.explanation,
  }), query);
  const theoryMatches = rankSearchItems(theories, theory => ({
    knowledgeId: theory.tagId, title: theory.title, keywords: (theoryKeywords as Record<string, string[]>)[theory.tagId], aliases: [theory.tagId, getTheoryDisplayId(theory), ...(theory.aliases ?? []),
      theory.quotation?.author ?? '', theory.quotation?.work ?? ''],
    summary: [theory.summary, theory.quotation?.translationText].filter(Boolean).join(' '),
    context: [theory.categoryTitle, getTheoryPath(theory), getTheoryCategoryLabel(theory.categoryId)],
  }), query);
  return { keywords, personaMatches, techniqueMatches, theoryMatches };
}
