export function auditTheoryRights({ theories, techniques = [], retiredIds = [] }) {
  const failures = [];
  const retired = new Set(retiredIds);
  const ids = new Set();
  for (const theory of theories) {
    if (!theory.tagId || ids.has(theory.tagId)) failures.push(`duplicate or empty ID: ${theory.tagId}`);
    ids.add(theory.tagId);
    if (retired.has(theory.tagId)) failures.push(`retired theory: ${theory.tagId}`);
    if (!theory.title?.trim()) failures.push(`empty title: ${theory.tagId}`);
    if (theory.categoryId === 'maxims-experience') failures.push(`retired category: ${theory.tagId}`);
    if (theory.provenance?.status === 'オリジナル') failures.push(`original maxim: ${theory.tagId}`);
    if (theory.categoryId === 'practical-wisdom' && /^「[^「」]+」$/.test(theory.title)) failures.push(`slogan in practical wisdom: ${theory.tagId}`);
    if (theory.knowledgeType === 'aphorism' && theory.status !== 'locked') {
      const q = theory.quotation;
      if (!q || q.verification !== 'verified' || q.rightsStatus !== 'cleared' || !q.originalText || !q.translationText || !q.work || !q.locator || !q.rightsBasis || !q.sourceUrls?.length || !Number.isInteger(q.authorDeathYear) || q.authorDeathYear > 1950 || !Number.isInteger(q.publicationYear) || q.publicationYear > 1950 || !['original_japanese','independent_translation','classical_transcription'].includes(q.translationKind)) failures.push(`unreviewed quotation: ${theory.tagId}`);
      if (q && theory.title !== '「'+q.translationText+'」') failures.push(`quotation headline differs from approved text: ${theory.tagId}`);
    }
  }
  for (const categoryId of new Set(theories.map(t=>t.categoryId))) {
    const sequence = theories.filter(t=>t.categoryId===categoryId && t.status!=='archived' && t.status!=='draft').map(t=>t.displayId);
    if (sequence.some(id=>!Number.isInteger(id)||id<1) || new Set(sequence).size!==sequence.length) failures.push('display IDs must be positive and unique within '+categoryId);
  }
  for (const item of [...theories, ...techniques]) for (const field of ['relatedTheoryIds', 'primaryTheoryIds', 'theoryTagIds']) {
    for (const id of item[field] ?? []) if (retired.has(id) || !ids.has(id)) failures.push(`dead reference: ${item.tagId ?? item.id}.${field} → ${id}`);
  }
  return failures;
}
