import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const root = path.resolve(process.argv[2] ?? 'store/app-store/v1.0.3');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'manifest.json'), 'utf8'));
const expected = ['01-brand.png', '02-home.png', '03-technique.png', '04-theory.png', '05-feature.png', '06-learn.png', '07-personalize.png'];
assert.deepEqual(manifest.files.map(file => file.file), expected, 'All seven screenshots must be complete and ordered');
assert.deepEqual(manifest.dimensions, [1242, 2688]);
assert.equal(manifest.displayType, 'APP_IPHONE_65');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
for (const item of manifest.files) {
  const file = path.join(root, 'iphone-6.5', item.file);
  const bytes = await fs.readFile(file);
  const metadata = await sharp(bytes).metadata();
  assert.equal(metadata.width, 1242); assert.equal(metadata.height, 2688);
  assert.equal(metadata.format, 'png'); assert.equal(metadata.hasAlpha, false);
  assert.equal(hash(bytes), item.sha256, item.file + ' checksum');
  assert.equal(crypto.createHash('md5').update(bytes).digest('hex'), item.md5);
  if (item.source) assert.equal(hash(await fs.readFile(path.join(root, 'source', item.source))), item.sourceSha256);
  if (item.secondary) assert.equal(hash(await fs.readFile(path.join(root, 'source', item.secondary))), item.secondarySha256);
}
const proof = JSON.parse(await fs.readFile(path.join(root, 'status-edit-proof.json'), 'utf8'));
const beforeBytes = await fs.readFile(path.join(root, 'source/04-happenstance-user.jpg'));
assert.equal(hash(beforeBytes), proof.originalSha256);
const before = await sharp(beforeBytes).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const after = await sharp(path.join(root, 'source/04-happenstance-normalized.png')).removeAlpha().raw().toBuffer({ resolveWithObject: true });
assert.equal(before.info.width, after.info.width); assert.equal(before.info.height, after.info.height);
let changedPixels = 0;
for (let y = 0; y < before.info.height; y++) for (let x = 0; x < before.info.width; x++) {
  const i = (y * before.info.width + x) * 3;
  if ([0, 1, 2].some(c => before.data[i + c] !== after.data[i + c])) {
    changedPixels++;
    assert.ok(proof.regions.some(r => x >= r.left && x < r.left + r.width && y >= r.top && y < r.top + r.height), 'User screenshot content changed outside status patches');
  }
}
assert.equal(changedPixels, proof.changedPixels); assert.equal(proof.outsideStatusChangedPixels, 0);
assert.equal(manifest.files[1].heading.replaceAll('\n', ''), '毎日10分すきま時間に読める。');
assert.equal(manifest.files[2].subject, '名残惜しいくらいで去る');
assert.equal(manifest.files[3].subject, '計画された偶発性理論');
assert.equal(manifest.files[4].subject, 'なぜ私たちは、年齢に焦るのか');
assert.ok(manifest.files[4].heading.endsWith('！'));
console.log('PASS: 7 store screenshots, exact copy, PNG dimensions, checksums, original app pixels preserved outside status edits.');
