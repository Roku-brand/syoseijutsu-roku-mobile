/**
 * The generated theory catalogue intentionally contains only information the
 * app renders or indexes. Raw research fields may exist in import sources,
 * but must never leak into src/data/generated/theories.json.
 */
export function createTheoryCard(record, overrides = {}) {
  const tagId = String(overrides.tagId ?? record.tagId ?? record.id ?? '').trim();
  const title = String(overrides.title ?? record.title ?? '').trim();
  const summary = String(overrides.summary ?? record.summary ?? '').trim();
  const categoryId = String(overrides.categoryId ?? record.categoryId ?? '').trim();
  const categoryTitle = String(overrides.categoryTitle ?? record.categoryTitle ?? '').trim();

  if (!tagId || !title || !summary || !categoryId || !categoryTitle) {
    throw new Error(`Invalid theory card: ${tagId || title || 'unknown'}. tagId, title, summary, categoryId and categoryTitle are required.`);
  }

  const provenance = overrides.provenance ?? record.provenance ?? sourceProvenance(record);
  const aliases = [...new Set((overrides.aliases ?? record.aliases ?? []).map((value) => String(value).trim()).filter(Boolean))];
  const relatedTheoryIds = [...new Set((overrides.relatedTheoryIds ?? record.relatedTheoryIds ?? []).map((value) => String(value).trim()).filter(Boolean))];
  const card = { tagId, title, summary, categoryId, categoryTitle };
  if (aliases.length) card.aliases = aliases;
  if (relatedTheoryIds.length) card.relatedTheoryIds = relatedTheoryIds;
  if (provenance) card.provenance = provenance;
  return card;
}

function sourceProvenance(record) {
  const attribution = String(record.source_name ?? '').trim();
  const work = String(record.source_detail ?? '').trim();
  if (!attribution && !work) return undefined;
  return {
    status: '一部確認',
    ...(attribution ? { attribution } : {}),
    ...(work ? { works: [work] } : {}),
  };
}
