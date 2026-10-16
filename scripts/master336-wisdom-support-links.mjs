// Philosophical/practical readings are selected for the card's argument,
// without requiring every classical card to have a technique backlink.
import review from '../docs/content/content-network-review-20261016.json' with { type: 'json' };
import theories from '../src/data/generated/theories.json' with { type: 'json' };
const wisdom = new Set(theories.filter(t => ['practical-wisdom','classics-thought'].includes(t.categoryId)).map(t => t.tagId));
export const wisdomSupportTechniqueIdsByTheoryId = {};
for (const card of review.techniques) for (const id of card.supplementary) if (wisdom.has(id)) {
  (wisdomSupportTechniqueIdsByTheoryId[id] ??= []).push(card.id);
}
