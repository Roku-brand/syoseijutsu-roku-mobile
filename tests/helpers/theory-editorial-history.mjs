import fs from 'node:fs';

const read = name => JSON.parse(fs.readFileSync(new URL(`../../docs/content/${name}`, import.meta.url), 'utf8'));
// Compose reviewed revisions so historical tests still check the original
// baseline, and compare current content with the latest approved explanation.
export const summaryReviews = new Map(read('theory-summary-review-20261019.json').changes.map(row => [row.id, row]));
for (const revision of ['theory-practical-review-20261021.json', 'theory-plain-review-20261021.json']) {
  for (const row of read(revision).changes) {
    const previous = summaryReviews.get(row.id);
    summaryReviews.set(row.id, { ...row, beforeSummary: previous?.beforeSummary ?? row.beforeSummary,
      contextNote: row.quotation?.contextNote });
  }
}
export const titleReviews = new Map(read('theory-saying-titles-review-20261021.json').changes.map(row => [row.id, row]));
