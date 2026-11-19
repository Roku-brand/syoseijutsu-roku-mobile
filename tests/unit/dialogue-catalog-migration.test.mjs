import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const read = (name) => JSON.parse(fs.readFileSync(name, 'utf8'));
const generated = 'src/data/generated/';
const sectionIds = ['kb_1151', 'kb_1152', 'kb_1153'];
const archiveIds = Object.keys(read('src/data/technique-id-redirects.json'));
const revisedIds = ['338', '340', '345', '348', '350', '351', '353', '357'].map((number) => `master336-${number}`);
const techniqueCards = (source) => source.categories.flatMap(({ subcategories }) => subcategories.flatMap(({ items }) => items));

test('dialogue migration matches the bundled catalog, archives duplicates and keeps paid content private', async () => {
  const db = new PGlite();
  try {
    const fixture = read('tests/fixtures/theory-release-20261018-db.json');
    const before = read('docs/content/theory-release-20261018-snapshot.json');
    const catalog = techniqueCards(read(`${generated}techniques.json`));
    const guidance = read(`${generated}practical-actions.json`);
    const theories = read(`${generated}theories.json`);
    const relations = read(`${generated}theory-relations.json`).filter(({ sourceId, targetId }) => sectionIds.some((id) => id === sourceId || id === targetId));
    const endpoints = new Set(relations.flatMap(({ sourceId, targetId }) => [sourceId, targetId]));
    const entityIds = [...revisedIds, ...archiveIds];
    const persona = '一緒にいて疲れない人';
    await db.exec(`create schema auth;
      create function auth.uid() returns uuid language sql as 'select null::uuid';
      create function public.can_read_complete_content() returns boolean language sql as 'select false';
      create table public.personas(name text primary key, category text, status text, access_tier text);
      create table public.content_categories(kind text, id text, title text);
      create table public.theory_subcategories(id text primary key, category_id text, title text, display_order integer);
      insert into public.content_categories values ('technique', 'interpersonal', '対人術'), ('theory', 'strategy', '戦略論');
      insert into public.theory_subcategories values ('strategy-l', 'strategy', '論理・因果推論', 7);`);
    for (const table of ['theories', 'techniques', 'theory_relations', 'paid_content']) {
      const fields = fixture.columns.filter((column) => column.table === table).map((column) =>
        `${column.name} ${column.type}${column.default ? ` default ${column.default}` : ''}${column.nullable === 'NO' ? ' not null' : ''}`);
      const key = table === 'theory_relations' ? 'source_id,target_id' : table === 'paid_content' ? 'content_type,content_id' : 'id';
      await db.exec(`create table public.${table}(${fields.join(',')}, primary key(${key}))`);
    }
    await db.query("insert into public.personas values ($1, 'interpersonal', 'published', 'complete')", [persona]);
    await db.exec(`create unique index technique_order on public.techniques(persona_id, display_order) where status = 'published';
      create unique index theory_display on public.theories(category_id, display_id) where status = 'published';
      alter table public.theory_relations add foreign key (source_id) references public.theories(id), add foreign key (target_id) references public.theories(id);`);
    const seedCards = techniqueCards(before[`${generated}techniques.json`]).filter((card) => entityIds.includes(card.id));
    for (const card of seedCards) {
      await db.query(`insert into public.techniques (id, persona_id, category, title, essence, explanation, display_order, theory_ids, primary_theory_ids)
        values ($1, $2, 'interpersonal', $3, $4, $5, $6, $7, $8)`, [card.id, persona, card.title, card.essence, card.explanation, card.displayOrder, JSON.stringify(card.relatedTheoryIds), JSON.stringify(card.primaryTheoryIds)]);
    }
    const newTechnique = catalog.find(({ id }) => id === 'master336-452');
    const requiredTheories = new Set([...endpoints, ...newTechnique.relatedTheoryIds]);
    for (const theory of theories.filter(({ tagId }) => requiredTheories.has(tagId) && !sectionIds.includes(tagId))) {
      await db.query(`insert into public.theories (id,title,summary,category_id,display_id,canonical_id,related_theory_ids)
        values ($1,$2,$3,$4,$5,$1,$6)`, [theory.tagId, theory.title, theory.summary, theory.categoryId, theory.displayId, JSON.stringify(theory.relatedTheoryIds.filter((id) => !sectionIds.includes(id)))]);
    }
    const functions = [...read('tests/fixtures/theory-release-20261018-functions.json'), ...read('tests/fixtures/content-network-functions.json')];
    for (const name of ['enforce_technique_persona', 'sync_canonical_paid_content', 'sync_taxonomy_paid_theory', 'validate_knowledge_relation', 'sync_knowledge_relation_arrays', 'sync_legacy_theory_relations']) {
      await db.exec(functions.find((definition) => definition.toLowerCase().includes(`function public.${name}(`)));
    }
    await db.exec(`create trigger technique_persona_integrity before insert or update of persona_id,category,status on public.techniques for each row execute function public.enforce_technique_persona();
      create trigger sync_canonical_paid_technique after insert or update or delete on public.techniques for each row execute function public.sync_canonical_paid_content();
      ${fixture.triggers.filter((trigger) => /sync_canonical_paid_theory|legacy_theory_relations_sync|knowledge_relation_(guard|arrays)/.test(trigger)).join(';\n')};
      create view public.public_theories as ${fixture.view};`);
    await db.exec(`update public.techniques set updated_at = now()`);

    const filename = fs.readdirSync('supabase/migrations').find((name) => name.endsWith('_refine_fatigue_free_persona_and_logic.sql'));
    const sql = fs.readFileSync(`supabase/migrations/${filename}`, 'utf8');
    await db.exec("update public.techniques set title = title || ' CMS edit' where id = 'master336-348'");
    await assert.rejects(db.exec(sql), /Technique source changed/);
    await db.exec("rollback; update public.techniques set title = regexp_replace(title, ' CMS edit$', '') where id = 'master336-348'");
    await db.exec(sql);
    await db.exec(sql);

    const result = await db.query('select id,title,essence,explanation,status from public.techniques order by id');
    assert.equal(result.rows.length, entityIds.length);
    for (const row of result.rows) {
      const card = catalog.find(({ id }) => id === row.id);
      assert.deepEqual(row, { id: card.id, title: card.title, essence: card.essence, explanation: card.explanation, status: archiveIds.includes(card.id) ? 'archived' : 'published' });
      const { rows: [paid] } = await db.query("select payload from public.paid_content where content_type = 'technique' and content_id = $1", [row.id]);
      if (archiveIds.includes(row.id)) { assert.equal(paid, undefined); continue; }
      assert.equal(paid.payload.explanation, card.explanation);
      assert.deepEqual(paid.payload.practicalActions.todayActions, guidance.find(({ id }) => id === card.id).todayActions);
    }
    for (const id of requiredTheories) {
      const theory = theories.find(({ tagId }) => tagId === id);
      const { rows: [entry] } = await db.query('select title,summary,related_theory_ids,subcategory_id,display_id from public.theories where id = $1', [id]);
      assert.deepEqual(entry.related_theory_ids, theory.relatedTheoryIds);
      if (!sectionIds.includes(id)) continue;
      assert.equal(entry.title, theory.title);
      assert.equal(entry.summary, theory.summary);
      assert.equal(entry.subcategory_id, 'strategy-l');
      assert.equal(entry.display_id, theory.displayId);
      const { rows: [publicRow] } = await db.query('select summary,provenance from public.public_theories where id = $1', [id]);
      assert.deepEqual(publicRow, { summary: '', provenance: null });
      const { rows: [paid] } = await db.query("select payload from public.paid_content where content_type = 'theory' and content_id = $1", [id]);
      assert.equal(paid.payload.summary, theory.summary);
      assert.deepEqual(paid.payload.provenance, theory.provenance);
    }
  } finally {
    await db.close();
  }
});
