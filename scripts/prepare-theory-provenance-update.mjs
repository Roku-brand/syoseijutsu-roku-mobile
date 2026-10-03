import fs from 'node:fs/promises';

const read = async (path) => JSON.parse(await fs.readFile(new URL(path, import.meta.url), 'utf8'));
const write = async (path, value) => fs.writeFile(new URL(path, import.meta.url), `${JSON.stringify(value, null, 2)}\n`);
const additions = await read('../docs/content/theory-provenance-additions-20261003.json');
const verified = await read('../docs/content/theory-provenance-verified.json');
const catalog = await read('../src/data/generated/theories.json');
const before = await read('../docs/content/theory-provenance-server-before-20261003.json');
const byId = new Map(catalog.map((x) => [x.tagId, x]));
const reviewedIds = new Set(verified.records.map((x) => x.tagId));

for (const record of additions.records) {
  const original = byId.get(record.tagId);
  if (original && original.title === record.title && reviewedIds.has(record.tagId)
      && JSON.stringify(original.provenance) === JSON.stringify(record.provenance)) continue;
  if (!original || original.title !== record.title || original.provenance?.status
      || original.provenance?.works || original.provenance?.sources || reviewedIds.has(record.tagId)) {
    throw new Error(`Already edited or mismatched provenance: ${record.tagId}`);
  }
  original.provenance = record.provenance;
  verified.records.push(record);
  reviewedIds.add(record.tagId);
}
verified.reviewedAt = additions.reviewedAt;

// Stable identities and the live baseline are checked before producing any SQL.
const live = new Map(before.map((x) => [x.id, x]));
if (live.size !== catalog.length) throw new Error('Server/catalog count mismatch');
const updates = [];
for (const card of catalog) {
  const row = live.get(card.tagId);
  if (!row || row.title !== card.title) throw new Error(`Server identity mismatch: ${card.tagId}`);
  if (!card.provenance?.status || card.provenance.status === '出典不明') continue;
  if (row.provenance && Object.keys(row.provenance).length) continue;
  updates.push({ id: card.tagId, title: card.title, provenance: card.provenance });
}
const json = JSON.stringify(updates);
if (json.includes('$reviewed$')) throw new Error('SQL delimiter in reviewed data');
const sql = `-- Metadata-only update; never writes summaries, access tiers, identities or purchase data.
-- The live baseline is preserved in theory-provenance-server-before-20261003.json.
-- Any identity change, concurrent curation or projection/body change aborts the entire statement.
do $update$
declare
  reviewed constant jsonb := $reviewed$${json}$reviewed$::jsonb;
  expected constant integer := ${updates.length};
  changed integer;
  bodies_before text;
  projection_before text;
  existing_before text;
begin
  lock table public.theories in share row exclusive mode;
  lock table public.paid_content in share row exclusive mode;
  if (select count(*) from public.theories) <> ${catalog.length} then
    raise exception 'Theory catalogue changed since review';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(reviewed) as r(id text,title text,provenance jsonb)
    left join public.theories t on t.id=r.id
    where t.id is null or t.title is distinct from r.title
      or (t.provenance is not null and t.provenance not in ('null'::jsonb,'{}'::jsonb))
  ) then raise exception 'Provenance identity/baseline mismatch'; end if;
  select md5(jsonb_agg(to_jsonb(t)-'provenance'-'updated_at'-'updated_by' order by t.id)::text)
    into bodies_before from public.theories t;
  select md5(jsonb_agg(jsonb_build_array(content_type,content_id,payload-'provenance',sort_order)
    order by content_type,content_id)::text) into projection_before from public.paid_content;
  select md5(jsonb_agg(jsonb_build_array(id,provenance) order by id)::text) into existing_before
    from public.theories where provenance is not null and provenance not in ('null'::jsonb,'{}'::jsonb);
  update public.theories t set provenance=r.provenance, updated_at=now()
    from jsonb_to_recordset(reviewed) as r(id text,title text,provenance jsonb)
    where t.id=r.id and t.title=r.title
      and (t.provenance is null or t.provenance in ('null'::jsonb,'{}'::jsonb));
  get diagnostics changed = row_count;
  if changed <> expected then raise exception 'Expected % updates, got %',expected,changed; end if;
  if bodies_before is distinct from (select md5(jsonb_agg(to_jsonb(t)-'provenance'-'updated_at'-'updated_by' order by t.id)::text) from public.theories t)
    then raise exception 'Non-provenance fields changed'; end if;
  if projection_before is distinct from (select md5(jsonb_agg(jsonb_build_array(content_type,content_id,payload-'provenance',sort_order) order by content_type,content_id)::text) from public.paid_content)
    then raise exception 'Non-provenance paid projection changed'; end if;
  if existing_before is distinct from (select md5(jsonb_agg(jsonb_build_array(t.id,t.provenance) order by t.id)::text) from public.theories t where t.provenance is not null and not exists(select 1 from jsonb_to_recordset(reviewed) as r(id text) where r.id=t.id))
    then raise exception 'Previously curated provenance changed'; end if;
  if exists(select 1 from jsonb_to_recordset(reviewed) as r(id text,provenance jsonb)
    join public.theories t on t.id=r.id
    left join public.paid_content p on p.content_type='theory' and p.content_id=t.id
    where t.provenance is distinct from r.provenance
      or (t.status='published' and t.access_tier='complete' and (p.content_id is null or p.payload->'provenance' is distinct from r.provenance)))
    then raise exception 'Provenance projection mismatch'; end if;
end $update$;
select count(*) as total, count(*) filter(where provenance is null) as unregistered,
  count(*) filter(where provenance->>'status'='出典不明') as explicitly_unknown
  from public.theories;
`;
await write('../docs/content/theory-provenance-verified.json', verified);
await write('../src/data/generated/theories.json', catalog);
await fs.writeFile(new URL('../docs/content/theory-provenance-server-update-20261003.sql', import.meta.url), sql);
console.log(JSON.stringify({ added: additions.records.length, reviewed: verified.records.length, serverUpdates: updates.length }));
