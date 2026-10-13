import { readFile } from 'node:fs/promises';
export async function readInitialFeatures(root = process.cwd()) {
  const rows = JSON.parse(await readFile(`${root}/content/features/manifest.json`, 'utf8'));
  return Promise.all(rows.map(async row => {
    const source = (await readFile(`${root}/content/features/${row.slug}.md`, 'utf8')).replace(/\r\n/g, '\n').trim();
    const separator = source.indexOf('\n\n');
    return { ...row, lead: source.slice(0, separator), body: source.slice(separator + 2), related_technique_ids: [], related_theory_ids: [], status: 'published', updated_at: '2026-10-13T00:00:00Z' };
  }));
}
