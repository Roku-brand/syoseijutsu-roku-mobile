// Reviewed card-level mechanisms; IDs and the legacy export name remain stable.
import review from '../docs/content/content-network-review-20261016.json' with { type: 'json' };
export const master336PrimaryTheoryLinks = Object.fromEntries(review.techniques.map(t => [t.id, t.primary]));
export const master336TheoryLinks = master336PrimaryTheoryLinks;
