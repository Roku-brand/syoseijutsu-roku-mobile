import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';

// Sayings and sentence-like headings reviewed for quote presentation.
// Keep conceptual names (such as 目的論 and 無用の用) as names.
const ids = [
  'kb_311','kb_298','kb_304','kb_624','kb_622','kb_625','kb_299','kb_623',
  'kb_617','kb_618','kb_619','kb_620','kb_621','kb_312','kb_701','kb_702',
  'kb_604','kb_603','kb_606','kb_605','kb_607','kb_615','kb_608','kb_609',
  'kb_611','kb_610','kb_612','kb_613','kb_614','kb_616',
  'kb_626','kb_627','kb_503','kb_628','kb_504','kb_490','kb_505','kb_496',
  'kb_630','kb_629','kb_549',
  'kb_333','kb_334','kb_336','kb_335','kb_301','kb_300','kb_296','kb_631',
  'kb_327','kb_324','kb_315','kb_469','kb_468','kb_359','kb_329','kb_326',
];
assert.equal(ids.length, 57);
assert.equal(new Set(ids).size, 57);
const file = 'src/data/generated/theories.json';
const theories = JSON.parse(fs.readFileSync(file, 'utf8'));
const byId = new Map(theories.map(t => [t.tagId, t]));
const changes = ids.map(id => {
  const theory = byId.get(id);
  assert.ok(theory && theory.categoryId === 'classics-thought' && !theory.quotation, id);
  const beforeTitle = theory.title.replace(/^「([\s\S]*)」$/, '$1');
  const title = `「${beforeTitle}」`;
  assert.ok(theory.title === beforeTitle || theory.title === title, id);
  const { title: _title, ...unchanged } = theory;
  const unchangedFieldsSha256 = createHash('sha256').update(JSON.stringify(unchanged)).digest('hex');
  theory.title = title;
  return { id, beforeTitle, title, subcategory: theory.subcategoryTitle, unchangedFieldsSha256 };
});
const dir = 'docs/content/';
const review = { date: '2026-10-21', changedCount: 57, existingQuotationCount: 19, changes };
fs.writeFileSync(file, JSON.stringify(theories, null, 2) + '\n');
fs.writeFileSync(dir + 'theory-saying-titles-review-20261021.json', JSON.stringify(review, null, 2) + '\n');
for (const rollback of [false, true]) {
  const payload = JSON.stringify(changes.map(row => ({ id: row.id,
    before_title: rollback ? row.title : row.beforeTitle,
    after_title: rollback ? row.beforeTitle : row.title,
  }))).replaceAll("'", "''");
  const backup = rollback ? '' : `
  insert into private.theory_reform_backups(phase,source_table,source_id,snapshot)
  select 'saying_title_quotes_20261021','theories',t.id,to_jsonb(t)
  from public.theories t join jsonb_to_recordset(edits) e(id text) on t.id=e.id
  on conflict(phase,source_table,source_id) do nothing;`;
  const sql = `-- Quote presentation for 57 reviewed sayings; no quotation text is replaced.
do $titles$
declare edits jsonb := '${payload}'::jsonb;
begin
  if jsonb_array_length(edits)<>57 or
    (select count(distinct x->>'id') from jsonb_array_elements(edits) x)<>57 then
    raise exception 'Expected 57 reviewed saying titles';
  end if;
  perform t.id from public.theories t join jsonb_to_recordset(edits) e(id text) on t.id=e.id for update of t;
  if (select count(*) from public.theories t join jsonb_to_recordset(edits) e(id text) on t.id=e.id
      where t.status='published' and t.category_id='classics-thought' and t.quotation is null)<>57 or
    exists(select 1 from public.theories t join jsonb_to_recordset(edits)
      e(id text,before_title text,after_title text) on t.id=e.id
      where t.title is distinct from e.before_title and t.title is distinct from e.after_title) then
    raise exception 'Reviewed saying title changed';
  end if;${backup}
  update public.theories t set title=e.after_title,updated_at=now()
  from jsonb_to_recordset(edits) e(id text,after_title text)
  where t.id=e.id and t.title is distinct from e.after_title;
end $titles$;
`;
  fs.writeFileSync(dir + `theory-saying-titles-${rollback ? 'rollback' : 'update'}-20261021.sql`, sql);
}
console.log(`Quote marks added to ${changes.length} saying titles.`);
