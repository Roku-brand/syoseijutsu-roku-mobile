import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const techniqueCatalog = JSON.parse(readFileSync(resolve(root, 'src/data/generated/techniques.public.json'), 'utf8'));
const theoryCatalog = JSON.parse(readFileSync(resolve(root, 'src/data/generated/theories.public.json'), 'utf8'));
const scope = JSON.parse(readFileSync(resolve(root, 'src/data/content-scope.json'), 'utf8'));
const presentation = readFileSync(resolve(root, 'src/data/persona-presentation.ts'), 'utf8');
const techniques = techniqueCatalog.categories.flatMap((category) => category.subcategories.flatMap((persona) => persona.items));
const freeTechniques = techniques.filter((item) => item.status !== 'locked' && item.title !== '完全版の処世術').map((item) => item.id);
const freeTheories = theoryCatalog.filter((item) => item.status !== 'locked' && item.summary?.trim()).map((item) => item.tagId);
const freeTechniqueIds = new Set(freeTechniques);
const freeTheoryIds = new Set(freeTheories);
const completeTechniques = techniques.map((item) => item.id).filter((id) => !freeTechniqueIds.has(id));
const completeTheories = theoryCatalog.map((item) => item.tagId).filter((id) => !freeTheoryIds.has(id));
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const list = (values) => values.map(quote).join(',');
const personaRows = [...presentation.matchAll(/'([^']+)': \{ number: (\d+), subtitle: '([^']+)', image: require\('\.\.\/\.\.\/assets\/personas\/([^']+)'\)/g)]
  .map((match) => `(${quote(match[1])},${quote(match[3])},${quote(`bundled:${match[4]}`)},${Number(match[2])})`);
if (freeTechniques.length !== scope.free.techniques || freeTheories.length !== scope.free.theories || personaRows.length !== 26) {
  throw new Error(`Backfill source mismatch: ${freeTechniques.length}/${freeTheories.length}/${personaRows.length}`);
}
const sql = `-- Generated from the shipped public catalog and persona image map.\n` +
`-- This preserves the current free/complete boundary while making it editable in DB.\n` +
`-- Preserve the edition choice of owner-created rows absent from this bundle.\n` +
`update public.techniques set access_tier='complete' where id in (${list(completeTechniques)});\n` +
`update public.techniques set access_tier='free' where id in (${list(freeTechniques)});\n` +
`update public.theories set access_tier='complete' where id in (${list(completeTheories)});\n` +
`update public.theories set access_tier='free' where id in (${list(freeTheories)});\n` +
`update public.techniques set status='draft' where id in (${list(scope.excludedTechniqueIds)}) and status='published';\n` +
`update public.personas p set subtitle=v.subtitle,image_path=v.image_path,display_order=v.display_order\n` +
`from (values\n ${personaRows.join(',\n ')}\n) as v(name,subtitle,image_path,display_order) where p.name=v.name;\n`;
writeFileSync(resolve(root, 'supabase/migrations/20260928093100_cms_existing_content_backfill.sql'), sql);
console.log(`Generated backfill: ${freeTechniques.length} free techniques, ${freeTheories.length} free theories, ${personaRows.length} persona images.`);

