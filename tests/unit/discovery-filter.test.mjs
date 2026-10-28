import './register-data.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const { buildReadingRecommendations, readingContentId } = await import('../../src/data/reading-recommendations.ts');
const { discoveryFilters, matchesDiscoveryFilter } = await import('../../src/data/discovery-filter.ts');
const { FREE_TECHNIQUE_IDS, FREE_THEORY_ID_SET } = await import('../../src/access/access-config.ts');

for (const accessState of ['free', 'paid']) {
  for (const { key: filter } of discoveryFilters) {
    test(`${accessState}/${filter}: five distinct eligible cards, stable order and complete replacement`, () => {
      const options = { accessState, filter, historyIds: [], interests: ['interpersonal', 'work', 'life'], savedIds: [], savedTheoryIds: [], seed: '20261028:0', count: 5 };
      let previous = [];
      for (let round = 0; round < 6; round++) {
        const input = { ...options, seed: `20261028:${round}`, excludeIds: previous };
        const cards = buildReadingRecommendations(input);
        const ids = cards.map(item => `${item.type}:${readingContentId(item)}`);
        assert.equal(cards.length, 5);
        assert.equal(new Set(ids).size, 5);
        assert.ok(cards.every(item => matchesDiscoveryFilter(item, filter)));
        assert.deepEqual(buildReadingRecommendations(input), cards);
        assert.deepEqual(ids.filter(id => previous.includes(id)), []);
        if (accessState === 'free') assert.ok(cards.every(item => item.type === 'theory' ? FREE_THEORY_ID_SET.has(readingContentId(item)) : FREE_TECHNIQUE_IDS.has(readingContentId(item))));
        if (filter === 'all') assert.ok(cards.some(item => item.type === 'theory') && cards.some(item => item.type === 'technique'));
        previous = ids;
      }
    });
  }
}

test('a small remaining pool reuses only enough old cards and stays in the chosen category', async () => {
  const { techniqueCards } = await import('../../src/data/catalog.ts');
  const eligible = techniqueCards.filter(card => FREE_TECHNIQUE_IDS.has(card.id) && card.categoryKey === 'work');
  const fresh = eligible.slice(-2).map(card => `technique:${card.id}`);
  const cards = buildReadingRecommendations({ accessState: 'free', filter: 'work', historyIds: [], interests: [], savedIds: [], savedTheoryIds: [], seed: 'small-pool', count: 5, excludeIds: eligible.slice(0, -2).map(card => `technique:${card.id}`) });
  const ids = cards.map(item => `${item.type}:${readingContentId(item)}`);
  assert.equal(cards.length, 5);
  assert.equal(new Set(ids).size, 5);
  assert.ok(fresh.every(id => ids.includes(id)));
  assert.ok(cards.every(item => matchesDiscoveryFilter(item, 'work')));
});
