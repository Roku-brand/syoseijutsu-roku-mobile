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
    if (theory.categoryId !== 'practical-wisdom') continue;
    if (!/^「[^「」]+」$/.test(theory.title)) failures.push(`Japanese quotation marks required: ${theory.tagId}`);
    const p = theory.provenance;
    if (p?.status !== 'オリジナル' || p.attribution !== '処世術禄' || p.works?.length !== 1 || p.works[0] !== '処世術禄オリジナル' || p.note !== '処世術禄によるオリジナルの実践知です。' || !!p.sources?.length || !!p.period) failures.push(`invalid original provenance: ${theory.tagId}`);
  }
  const practical = theories.filter((item) => item.categoryId === 'practical-wisdom' && item.status !== 'draft' && item.status !== 'archived');
  const sequence = practical.map((item) => item.displayId).sort((a, b) => a - b);
  if (sequence.some((id, index) => id !== index + 1)) failures.push('practical display IDs must be dense within the category');
  for (const item of [...theories, ...techniques]) for (const field of ['relatedTheoryIds', 'primaryTheoryIds', 'theoryTagIds']) {
    for (const id of item[field] ?? []) if (retired.has(id) || !ids.has(id)) failures.push(`dead reference: ${item.tagId ?? item.id}.${field} → ${id}`);
  }
  return failures;
}
