import { getTechniqueDisplayId, getTechniqueNumber, techniqueCards } from './catalog';

export function getTechniqueIndex(category = 'all', query = '') {
  const normalized = query.trim().normalize('NFKC');
  const numberMatch = normalized.match(/^(?:no\.?\s*)?(\d+)$/i);
  const keyword = normalized.toLocaleLowerCase();
  return techniqueCards.filter(card => {
    if (category !== 'all' && card.categoryKey !== category) return false;
    if (numberMatch) return getTechniqueNumber(card) === Number(numberMatch[1]);
    return !keyword || [getTechniqueDisplayId(card), card.title, card.categoryName, card.subcategory]
      .some(value => value.normalize('NFKC').toLocaleLowerCase().includes(keyword));
  }).sort((a, b) => (getTechniqueNumber(a) ?? Infinity) - (getTechniqueNumber(b) ?? Infinity));
}
