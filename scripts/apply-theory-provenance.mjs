import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const source = new URL('../src/data/generated/theories.json', import.meta.url);
const reviewed = new URL('../docs/content/theory-provenance-verified.json', import.meta.url);
const theories = JSON.parse(await fs.readFile(source, 'utf8'));
const { records } = JSON.parse(await fs.readFile(reviewed, 'utf8'));
const byId = new Map(theories.map((theory) => [theory.tagId, theory]));
const seen = new Set();
const statuses = new Set(['確認済み', '書誌確認済み', '一部確認', '出典不明']);

// Resolve by stable ID and also check the title: a renamed/reused ID requires
// human source review, never a fuzzy match or silent attribution to a new card.
for (const record of records) {
  const theory = byId.get(record.tagId);
  if (seen.has(record.tagId) || !theory || theory.title !== record.title) {
    throw new Error(`Provenance identity mismatch: ${record.tagId}`);
  }
  seen.add(record.tagId);
  const provenance = record.provenance;
  if (!statuses.has(provenance?.status) || !provenance.attribution?.trim()
    || !provenance.works?.length || !provenance.sources?.length || !provenance.note?.trim()) {
    throw new Error(`Incomplete reviewed provenance: ${record.tagId}`);
  }
  for (const source of provenance.sources) {
    const url = new URL(source.url);
    if (url.protocol !== 'https:' || url.username || url.password || !source.title?.trim()) {
      throw new Error(`Invalid provenance source: ${record.tagId}`);
    }
  }
}

const reviewedById = new Map(records.map((record) => [record.tagId, record.provenance]));
const result = theories.map((theory) => reviewedById.has(theory.tagId)
  ? { ...theory, provenance: reviewedById.get(theory.tagId) }
  : theory);
await fs.writeFile(source, `${JSON.stringify(result, null, 2)}\n`);
console.log(`Applied reviewed provenance to ${records.length}/${theories.length} theories (${fileURLToPath(reviewed)}).`);
