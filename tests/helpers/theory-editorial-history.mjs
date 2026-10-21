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
export const latestCatalogReview = read('knowledge-editorial-catalog-review-20261022.json');
export const catalogReviews = new Map(latestCatalogReview.changes.map(row=>[row.id,row]));
export const removedTheoryIds = new Set(latestCatalogReview.changes.filter(row=>row.removed).map(row=>row.id));
export const reviewedDisplayIds = category => read('knowledge-editorial-published-20261022.json').theories
  .filter(t=>t.category_id===category).map(t=>t.display_id).sort((a,b)=>a-b);
for (const row of latestCatalogReview.changes.filter(row=>!row.removed)) {
  if (row.fields.includes('summary')) {
    const previous=summaryReviews.get(row.id);
    summaryReviews.set(row.id,{id:row.id,beforeSummary:previous?.beforeSummary??row.before.summary,summary:row.after.summary,contextNote:row.after.quotation?.contextNote});
  }
  if (row.fields.includes('title')) {
    const previous=titleReviews.get(row.id);
    titleReviews.set(row.id,{id:row.id,beforeTitle:previous?.beforeTitle??row.before.title,title:row.after.title});
  }
}
