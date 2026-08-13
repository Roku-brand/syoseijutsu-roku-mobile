import { categories } from './catalog';
import type { CategoryKey } from './types';

export function getTechniqueCount(category: CategoryKey, persona: string, fallback: number) {
  return categories.find((item) => item.key === category)?.subcategories.find((group) => group.name === persona)?.items.length ?? fallback;
}

export function getTechniqueCountTotal() {
  return categories.reduce((total, category) => total + category.subcategories.reduce((count, group) => count + group.items.length, 0), 0);
}

export function getCategoryTechniqueCount(category: CategoryKey) {
  return categories.find((item) => item.key === category)?.subcategories.reduce((total, group) => total + group.items.length, 0) ?? 0;
}

export function getThemeTechniqueCount(category: CategoryKey, personas: string[]) {
  return personas.reduce((total, persona) => total + getTechniqueCount(category, persona, 0), 0);
}
