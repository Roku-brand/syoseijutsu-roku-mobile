import './register-data.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const { buildReadingRecommendations, HOME_RECOMMENDED_THEORY_IDS, readingContentId } = await import('../../src/data/reading-recommendations.ts');
const { discoveryFilters, matchesDiscoveryFilter } = await import('../../src/data/discovery-filter.ts');
const { FREE_TECHNIQUE_IDS, FREE_THEORY_ID_SET } = await import('../../src/access/access-config.ts');

test('the theory selection contains 299 existing IDs without changing free access', async () => {
  const { theoryById } = await import('../../src/data/catalog.ts');
  assert.equal(HOME_RECOMMENDED_THEORY_IDS.size, 299);
  assert.ok([...HOME_RECOMMENDED_THEORY_IDS].every(id => theoryById.get(id)?.tagId === id));
  assert.equal([...HOME_RECOMMENDED_THEORY_IDS].filter(id => FREE_THEORY_ID_SET.has(id)).length, 110);
});

for (const accessState of ['free', 'paid']) {
  test(`${accessState}: faster selection preserves personalized ranking`, async () => {
    const { techniqueCards, theories } = await import('../../src/data/catalog.ts');
    const cards = buildReadingRecommendations({ accessState,
      historyIds: techniqueCards.slice(0, 8).map(card => card.id),
      savedIds: techniqueCards.slice(10, 14).map(card => card.id),
      savedTheoryIds: theories.slice(0, 4).map(card => card.tagId),
      interests: ['interpersonal'], seed: 'startup-ranking-parity', count: 5,
    });
    assert.deepEqual(cards.map(item => `${item.type}:${readingContentId(item)}`), [
      'technique:master336-093', 'theory:kb_025', 'technique:master336-092', 'technique:master336-282', 'theory:kb_007',
    ]);
  });
}

for (const accessState of ['free', 'paid']) {
  for (const { key: filter } of discoveryFilters) {
    test(`${accessState}/${filter}: seven distinct eligible cards, stable order and complete replacement`, () => {
      const options = { accessState, filter, historyIds: [], interests: ['interpersonal', 'work', 'life'], savedIds: [], savedTheoryIds: [], seed: '20261028:0', count: 7 };
      let previous = [];
      for (let round = 0; round < 6; round++) {
        const input = { ...options, seed: `20261028:${round}`, excludeIds: previous };
        const cards = buildReadingRecommendations(input);
        const ids = cards.map(item => `${item.type}:${readingContentId(item)}`);
        assert.equal(cards.length, 7);
        assert.equal(new Set(ids).size, 7);
        assert.ok(cards.every(item => matchesDiscoveryFilter(item, filter)));
        assert.ok(cards.every(item => item.type !== 'theory' || HOME_RECOMMENDED_THEORY_IDS.has(item.card.tagId)));
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
  const cards = buildReadingRecommendations({ accessState: 'free', filter: 'work', historyIds: [], interests: [], savedIds: [], savedTheoryIds: [], seed: 'small-pool', count: 7, excludeIds: eligible.slice(0, -2).map(card => `technique:${card.id}`) });
  const ids = cards.map(item => `${item.type}:${readingContentId(item)}`);
  assert.equal(cards.length, 7);
  assert.equal(new Set(ids).size, 7);
  assert.ok(fresh.every(id => ids.includes(id)));
  assert.ok(cards.every(item => matchesDiscoveryFilter(item, 'work')));
});
