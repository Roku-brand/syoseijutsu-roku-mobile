import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { selectPublicContent } from './public-content-selection.mjs';

const root = process.cwd();
const generated = path.join(root, 'src', 'data', 'generated');
const distDir = path.join(root, 'dist');

async function readJson(name) {
  return JSON.parse(await readFile(path.join(generated, name), 'utf8'));
}

async function collectFiles(directory) {
  const result = [];
  for (const name of await readdir(directory)) {
    const filePath = path.join(directory, name);
    const info = await stat(filePath);
    if (info.isDirectory()) result.push(...await collectFiles(filePath));
    else if (/\.(html|js|json|map|txt|css)$/i.test(filePath)) result.push(filePath);
  }
  return result;
}

function decodeBundleText(text) {
  return text
    .replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/\\x([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
}

function fingerprint(text) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length < 24) return null;
  if (normalized.length <= 80) return normalized;
  const start = Math.max(0, Math.floor((normalized.length - 64) / 2));
  return normalized.slice(start, start + 64);
}

function collectTextFingerprints(value, label, fingerprints) {
  if (typeof value === 'string') {
    const valueFingerprint = fingerprint(value);
    if (valueFingerprint) fingerprints.set(valueFingerprint, label);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectTextFingerprints(item, `${label}[${index}]`, fingerprints));
    return;
  }
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => collectTextFingerprints(item, `${label}.${key}`, fingerprints));
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const [techniques, theories, learning, publicTechniques, publicTheories, publicLearning, homeBrandContent, metadata] = await Promise.all([
  readJson('techniques.json'),
  readJson('theories.json'),
  readJson('learning.full.json'),
  readJson('techniques.public.json'),
  readJson('theories.public.json'),
  readJson('learning.public.json'),
  readJson('home-brand-content.json'),
  readJson('metadata.json'),
]);
const { allTechniques, freeTechniqueIds, freeTheoryIds, freeLearningIds } = selectPublicContent({ techniques, theories, learning });
const fingerprints = new Map();
const titleCandidates = [];
const publicPreviewTheories = [
  ...homeBrandContent.theorySnapshots,
  ...homeBrandContent.techniqueTheoryMap.theories,
];
const publicPreviewTexts = new Set(publicPreviewTheories.flatMap((theory) => [theory.title, theory.summary].filter(Boolean)));

for (const technique of allTechniques) {
  if (!freeTechniqueIds.has(technique.id)) {
    collectTextFingerprints(technique, `technique:${technique.id}`, fingerprints);
    titleCandidates.push({ id: technique.id, title: technique.title, label: `technique:${technique.id}:title` });
  }
}
for (const theory of theories) {
  if (!freeTheoryIds.has(theory.tagId)) {
    // Paid theory titles are intentionally public so free technique pages can
    // show the complete relationship map. The summary and provenance remain
    // protected and must never enter the public bundle.
    collectTextFingerprints({ summary: theory.summary, provenance: theory.provenance }, `theory:${theory.tagId}`, fingerprints);
  }
}
for (const item of learning) {
  if (!freeLearningIds.has(item.id)) {
    collectTextFingerprints(item, `learning:${item.id}`, fingerprints);
    titleCandidates.push({ id: item.id, title: item.title, label: `learning:${item.id}:title` });
  }
}

if (fingerprints.size === 0) throw new Error('No paid-content fingerprints were generated.');

for (const preview of homeBrandContent.techniqueTheoryMap.theories) {
  const canonical = theories.find((theory) => theory.tagId === preview.tagId);
  if (!canonical || canonical.title !== preview.title || canonical.categoryId !== preview.categoryId) {
    throw new Error(`Home theory preview is not canonical: ${preview.tagId}`);
  }
}
for (const preview of homeBrandContent.theorySnapshots) {
  const canonical = theories.find((theory) => theory.tagId === preview.tagId);
  if (!canonical
    || canonical.title !== preview.title
    || canonical.summary !== preview.summary
    || canonical.categoryId !== preview.categoryId
    || canonical.categoryTitle !== preview.categoryTitle) {
    throw new Error(`Home theory card is not canonical: ${preview.tagId}`);
  }
}
const expectedHomeDomains = techniques.categories.map((category) => category.key);
for (const domain of expectedHomeDomains) {
  const candidates = homeBrandContent.dailyCandidates[domain];
  if (!candidates || candidates.techniqueIds.length !== 15 || !candidates.personaNames.length || !candidates.theoryIds.length) {
    throw new Error(`Home daily candidates are incomplete for ${domain}.`);
  }
  if (candidates.techniqueIds.some((id) => !freeTechniqueIds.has(id))) {
    throw new Error(`Home daily technique candidates include non-public content for ${domain}.`);
  }
  if (candidates.theoryIds.some((id) => !freeTheoryIds.has(id))) {
    throw new Error(`Home daily theory candidates include non-public content for ${domain}.`);
  }
  const fallbackTechnique = homeBrandContent.fallbackTechniqueSnapshots[domain];
  const canonicalTechnique = allTechniques.find((item) => item.id === fallbackTechnique?.id);
  if (!canonicalTechnique || !freeTechniqueIds.has(canonicalTechnique.id) || canonicalTechnique.title !== fallbackTechnique.title) {
    throw new Error(`Home fallback technique is not canonical for ${domain}.`);
  }
  if (homeBrandContent.fallbackPersonaSnapshots[domain]?.categoryKey !== domain) {
    throw new Error(`Home fallback persona is not canonical for ${domain}.`);
  }
}
for (const text of publicPreviewTexts) fingerprints.delete(fingerprint(text));

const publicTechniqueItems = publicTechniques.categories.flatMap((category) => category.subcategories.flatMap((persona) => persona.items));
if (publicTechniqueItems.length !== allTechniques.length || publicTheories.length !== theories.length) {
  throw new Error(`Public catalog shape is incomplete: techniques=${publicTechniqueItems.length}/${allTechniques.length}, theories=${publicTheories.length}/${theories.length}`);
}
if (publicTechniqueItems.filter((item) => item.status === 'locked').length !== allTechniques.length - freeTechniqueIds.size) {
  throw new Error('Public technique catalog does not contain the expected locked shells.');
}
const lockedPublicTheories = publicTheories.filter((item) => item.status === 'locked' && !item.summary);
if (lockedPublicTheories.length !== theories.length - freeTheoryIds.size) {
  throw new Error('Public theory catalog does not contain the expected locked shells.');
}
for (const shell of lockedPublicTheories) {
  const canonical = theories.find((theory) => theory.tagId === shell.tagId);
  if (!canonical || shell.title !== canonical.title || shell.categoryId !== canonical.categoryId || shell.categoryTitle !== canonical.categoryTitle) {
    throw new Error(`Public theory title shell is not canonical: ${shell.tagId}`);
  }
}
if (publicLearning.length !== freeLearningIds.size) throw new Error(`Public learning catalog contains ${publicLearning.length} cases; expected ${freeLearningIds.size}.`);

const actualCategoryCounts = Object.fromEntries([...new Set(theories.map((theory) => theory.categoryId))]
  .map((categoryId) => [categoryId, theories.filter((theory) => theory.categoryId === categoryId).length]));
if (JSON.stringify(metadata.categoryCounts) !== JSON.stringify(actualCategoryCounts)) {
  throw new Error(`Metadata category counts are stale: ${JSON.stringify(metadata.categoryCounts)} !== ${JSON.stringify(actualCategoryCounts)}`);
}

const files = await collectFiles(distDir);
const bundleFiles = await Promise.all(files.map(async (filePath) => ({
  filePath,
  text: decodeBundleText(await readFile(filePath, 'utf8').catch(() => '')),
})));
const candidates = [...fingerprints.entries()];
const leaks = [];
for (let index = 0; index < candidates.length; index += 120) {
  const batch = candidates.slice(index, index + 120);
  const pattern = new RegExp(batch.map(([value]) => escapeRegex(value)).join('|'), 'g');
  for (const file of bundleFiles) {
    const match = pattern.exec(file.text);
    if (!match) continue;
    const label = fingerprints.get(match[0]) ?? 'unknown paid content';
    leaks.push(`${label} in ${path.relative(root, file.filePath)}`);
    if (leaks.length >= 25) break;
  }
  if (leaks.length >= 25) break;
}

const usableTitleCandidates = titleCandidates.filter((candidate) =>
  typeof candidate.title === 'string' && candidate.title.trim().length >= 4,
);
for (let index = 0; index < usableTitleCandidates.length; index += 80) {
  const batch = usableTitleCandidates.slice(index, index + 80);
  const pattern = new RegExp(batch.map((candidate) =>
    `${escapeRegex(candidate.id)}[\\s\\S]{0,1000}${escapeRegex(candidate.title)}`,
  ).join('|'), 'g');
  for (const file of bundleFiles) {
    const match = pattern.exec(file.text);
    if (!match) continue;
    const candidate = batch.find((item) => match[0].includes(item.id) && match[0].includes(item.title));
    leaks.push(`${candidate?.label ?? 'unknown paid title'} in ${path.relative(root, file.filePath)}`);
    if (leaks.length >= 25) break;
  }
  if (leaks.length >= 25) break;
}

if (leaks.length) {
  console.error('Paid content leakage detected in public build:');
  leaks.forEach((leak) => console.error(`- ${leak}`));
  process.exit(1);
}

console.log(`Public build audit passed. Checked ${fingerprints.size} paid text fingerprints across ${files.length} files.`);
