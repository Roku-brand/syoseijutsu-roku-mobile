import type { TheoryProvenance } from './types';

/** Brand metadata only; complete-edition text must stay outside the public bundle. */
export function originalPracticalWisdomProvenance(): TheoryProvenance {
  return {
    status: 'オリジナル',
    attribution: '処世術禄',
    works: ['処世術禄オリジナル'],
    sources: [],
    note: '処世術禄によるオリジナルの実践知です。',
  };
}
