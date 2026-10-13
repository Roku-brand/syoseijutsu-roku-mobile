import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readInitialFeatures } from './feature-seed.mjs';

const [destination, snapshotFile] = process.argv.slice(2);
if (!destination || !snapshotFile) throw new Error('Provide a CLI-created migration file and the current CMS snapshot.');
const before = JSON.parse((await readFile(snapshotFile, 'utf8')).replace(/^\uFEFF/, '')).rows;
const after = await readInitialFeatures();
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
const fingerprint = row => createHash('md5').update([row.title, row.lead, row.body.replace(/\r\n/g, '\n')].join('\x1f')).digest('hex');
const blocks = after.map(next => {
  const original = before.find(row => row.id === next.id);
  if (!original || original.draft_revision !== null) throw new Error(`${next.id}: existing draft or missing article`);
  return `
 select * into current_article from public.feature_articles where id=${quote(next.id)} for update;
 if not found then raise exception '特集記事が見つかりません。'; end if;
 current_fingerprint:=md5(current_article.title||chr(31)||current_article.lead||chr(31)||replace(current_article.body,chr(13)||chr(10),chr(10)));
 if current_fingerprint<>${quote(fingerprint(next))} then
  if current_fingerprint<>${quote(fingerprint(original))} or current_article.status<>'published' or exists(select 1 from public.feature_article_drafts where article_id=current_article.id) then
   raise exception '特集「%」の原稿または下書きが変更されています。上書きせずに停止しました。',current_article.title;
  end if;
  update public.feature_articles set lead=${quote(next.lead)},body=${quote(next.body)},updated_at=clock_timestamp() where id=current_article.id;
 end if;`;
}).join('\n');
await writeFile(destination, `-- One-time, user-requested editorial revision. Preserve images, placement and related knowledge.
-- Apply atomically; changed CMS articles and existing drafts are never overwritten.
do $feature_revision$
declare current_article public.feature_articles; current_fingerprint text;
begin${blocks}
end $feature_revision$;
`);
console.log(`Prepared ${after.length} guarded editorial updates.`);
