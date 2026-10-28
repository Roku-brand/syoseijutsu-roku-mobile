import type { ReadingContent } from './reading-recommendations';

export const discoveryFilters = [
  { key: 'all', label: 'すべて' },
  { key: 'interpersonal', label: '対人術' },
  { key: 'work', label: '仕事術' },
  { key: 'life', label: '人生術' },
  { key: 'theory', label: '理論' },
] as const;
export type DiscoveryFilter = typeof discoveryFilters[number]['key'];
export const isDiscoveryFilter = (value: unknown): value is DiscoveryFilter => discoveryFilters.some(option => option.key === value);
export const matchesDiscoveryFilter = (item: ReadingContent, filter: DiscoveryFilter) => filter === 'all'
  || (filter === 'theory' ? item.type === 'theory' : item.type === 'technique' && item.card.categoryKey === filter);
