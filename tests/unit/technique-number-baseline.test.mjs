import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('published display numbers stay fixed when six cards are added', () => {
  const baseline=JSON.parse(fs.readFileSync('docs/content/body-language-display-baseline-20261125.json','utf8'));
  const mapping=JSON.parse(fs.readFileSync('src/data/technique-display-ids.json','utf8'));
  assert.equal(Object.keys(baseline).length,436);
  for (const [id, number] of Object.entries(baseline)) assert.equal(mapping[id],number,id);
  for (let number=453;number<=458;number++) assert.equal(mapping[`master336-${number}`],number);
  assert.equal(new Set(Object.values(mapping)).size,Object.keys(mapping).length);
});
