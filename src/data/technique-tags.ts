import type { TechniqueSource } from './types';
import { suggestSearchTags } from './search-ranking';

type TechniqueContext = TechniqueSource & { categoryName: string; subcategory: string; articleTitle: string };

export function getTechniqueTags(card: TechniqueContext) {
  // An explicit empty array is an owner's choice, not a request to regenerate.
  if (Array.isArray(card.tags)) return [...new Set(card.tags.map(tag => tag.trim()).filter(Boolean))];
  return suggestSearchTags([card.title, card.essence, card.subtitle].filter(Boolean).join(' '));
}

export function getTechniqueSearchText(card: TechniqueContext) {
  return [card.title, card.essence, card.subtitle, card.explanation, card.categoryName,
    card.subcategory, card.articleTitle, ...getTechniqueTags(card)].filter(Boolean).join(' ');
}
