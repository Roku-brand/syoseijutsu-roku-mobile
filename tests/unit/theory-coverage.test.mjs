import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { coverageRows, coverageSections, developmentMoves } from '../../scripts/theory-coverage-data.mjs';
const read = name => JSON.parse(fs.readFileSync(new URL(`../../${name}`, import.meta.url), 'utf8'));
const cards = read('src/data/generated/theories.json');
const shells = read('src/data/generated/theories.public.json');
const before = read('docs/content/theory-coverage-20261015-catalog-before.json');
const sections = read('src/data/generated/theory-subcategories.json');
const byId = new Map(cards.map(t => [t.tagId, t]));

test('coverage expands named gaps with distinct concepts and full sources', () => {
  assert.equal(cards.length, 842);
  assert.equal(coverageRows.length, 48);
  for (const name of ['ダモクレスの剣', '社会的時計', '脳の可塑性', 'ロミオとジュリエット効果']) assert.ok(cards.some(t => t.title === name));
  const names = new Map();
  for (const t of cards) for (const alias of [t.title, ...t.aliases ?? []]) {
    const key = alias.normalize('NFKC').trim().toLowerCase();
    assert.ok(!names.has(key) || names.get(key) === t.tagId, `Name collision: ${alias}`);
    names.set(key, t.tagId);
  }
  for (const row of coverageRows) {
    const t = byId.get(row.tagId);
    assert.ok(t.summary.length >= 100, t.title);
    assert.equal(t.accessTier, 'complete');
    assert.ok(t.provenance.attribution && t.provenance.note && t.provenance.works.length);
    assert.ok(t.provenance.sources.length);
    for (const s of t.provenance.sources) assert.equal(new URL(s.url).protocol, 'https:');
  }
  assert.ok(byId.get('kb_923').summary.includes('追試'));
  assert.equal(byId.get('kb_923').provenance.sources.length, 2);
  assert.ok(byId.get('kb_949').summary.includes('寓話'));
  assert.ok(byId.get('kb_917').summary.includes('条件'));
});

test('historical content, aliases, access and stable identities survive expansion', () => {
  for (const old of before) {
    const t = byId.get(old.tagId);
    assert.ok(t);
    for (const key of ['title', 'summary', 'categoryId', 'categoryTitle', 'provenance', 'aliases', 'canonicalId', 'legacyIds', 'mergedFromIds', 'accessTier']) assert.deepEqual(t[key], old[key], `${old.tagId}.${key}`);
    for (const id of old.relatedTheoryIds ?? []) assert.ok(t.relatedTheoryIds.includes(id));
    if (!developmentMoves.includes(old.tagId)) assert.equal(t.subcategoryId, old.subcategoryId);
  }
  assert.equal(byId.size, cards.length);
});

test('new sections are populated and ordering is dense without reusing a redirected section ID', () => {
  const redirects = read('src/data/generated/theory-subcategory-redirects.json');
  for (const s of coverageSections) {
    assert.ok(!redirects[s.id]);
    assert.ok(sections.some(x => x.id === s.id));
    assert.ok(cards.some(t => t.subcategoryId === s.id));
  }
  for (const s of sections) {
    const rows = cards.filter(t => t.subcategoryId === s.id);
    assert.ok(rows.length);
    assert.ok(rows.every(t => t.categoryId === s.categoryId));
    assert.deepEqual(rows.map(t => t.sortOrder), rows.map((_, i) => i + 1));
  }
  for (const id of developmentMoves) assert.equal(byId.get(id).subcategoryId, 'psychology-life');
});

test('every new card has reciprocal theory relationships and a working practical entry', () => {
  const techniques = read('src/data/generated/techniques.json').categories.flatMap(c => c.subcategories.flatMap(s => s.items));
  const comprehensive = read('src/data/generated/comprehensive-theory-links.json');
  const beforeTechniques = read('docs/content/theory-coverage-20261015-techniques-before.json').categories.flatMap(c => c.subcategories.flatMap(s => s.items));
  for (const old of beforeTechniques) {
    const t = techniques.find(t => t.id === old.id);
    for (const id of old.relatedTheoryIds ?? old.theoryTagIds ?? []) assert.ok(t.relatedTheoryIds.includes(id), `${old.id}/${id}`);
  }
  for (const row of coverageRows) {
    const t = byId.get(row.tagId);
    for (const id of t.relatedTheoryIds) {
      assert.ok(id !== t.tagId && byId.has(id));
      assert.ok(byId.get(id).relatedTheoryIds.includes(t.tagId));
    }
    assert.ok(row.techniqueIds.length);
    for (const id of row.techniqueIds) {
      assert.ok(techniques.find(t => t.id === id).relatedTheoryIds.includes(t.tagId));
      assert.ok(comprehensive[id].includes(t.tagId));
    }
  }
});

test('public shells remain searchable while paid summaries and sources stay private', () => {
  assert.equal(shells.length, cards.length);
  for (const row of coverageRows) {
    const shell = shells.find(t => t.tagId === row.tagId);
    assert.equal(shell.title, row.title);
    assert.deepEqual(shell.aliases, row.aliases);
    assert.equal(shell.summary, '');
    assert.equal(shell.status, 'locked');
    assert.equal(shell.provenance, undefined);
  }
  const oldScope = read('docs/content/theory-coverage-20261015-scope-before.json');
  const scope = read('src/data/content-scope.json');
  assert.deepEqual(scope.freeTheoryIds, oldScope.freeTheoryIds);
  assert.equal(shells.filter(t => t.summary).length, 151);
});
