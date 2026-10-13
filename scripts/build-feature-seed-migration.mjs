import { writeFile } from 'node:fs/promises';
import { readInitialFeatures } from './feature-seed.mjs';
const destination = process.argv[2];
if (!destination) throw new Error('Provide the CLI-created seed migration filename.');
const quote = value => `'${value.replaceAll("'", "''")}'`;
const rows = await readInitialFeatures();
const inserts = rows.map(row => `insert into public.feature_articles(id,slug,title,lead,body,image_path,image_alt,is_featured,show_in_list,display_order,status) values (${[row.id,row.slug,row.title,row.lead,row.body,row.image_path,row.image_alt].map(quote).join(',')},${row.is_featured},${row.show_in_list},${row.display_order},'published') on conflict(id) do nothing;`).join('\n\n');
await writeFile(destination, `-- Initial original editorial articles. CMS becomes the source of truth after this one-time insert.\n-- Existing editor content is never overwritten by a deployment.\n${inserts}\n`);
for (const row of rows) console.log(`${row.title}: ${Array.from(row.body.replace(/^#{1,3}\s+/gm, '').replace(/\s/g, '')).length}字`);
