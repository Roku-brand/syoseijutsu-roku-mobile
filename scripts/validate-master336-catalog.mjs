import fs from 'node:fs';

const catalog = JSON.parse(fs.readFileSync('src/data/generated/techniques.json', 'utf8'));
const theories = JSON.parse(fs.readFileSync('src/data/generated/theories.json', 'utf8'));
const metadata = JSON.parse(fs.readFileSync('src/data/generated/metadata.json', 'utf8'));
const expectedCounts = {
  interpersonal: {
    '印象がいい人': 14, '会話がうまい人': 13, '聞き上手な人': 10, '信頼される人': 12,
    '人たらしの人': 23, '面白い人': 15, '人を見極められる人': 10, '人に振り回されない人': 12,
    '軽く扱われない人': 12, '人間関係が安定する人': 14, '集団に馴染める人': 14,
    'リーダーシップがある人': 9, 'カリスマ性のある人': 13,
  },
  work: {
    '仕事ができる人': 15, 'タスク処理がうまい人': 14, '頭がいい人': 10,
    '正しく評価される人': 10, '交渉がうまい人': 19, '組織でうまく立ち回れる人': 10,
  },
  life: {
    '充実した人生を過ごせる人': 16, '自分らしく生きられる人': 13, '人生を楽しめる人': 10,
    '不安に強い人': 10, '後悔しない人': 12, '立ち直れる人': 11, '可能性を広げられる人': 15,
  },
};
const cards = catalog.categories.flatMap((category) => category.subcategories.flatMap((persona) => persona.items));
const theoryIds = new Set(theories.map((theory) => theory.tagId));
const duplicateKeys = cards.length - new Set(cards.map((card) => `${card.field}\u0000${card.persona}\u0000${card.title}`)).size;
const duplicateIds = cards.length - new Set(cards.map((card) => card.id)).size;
const explanationParagraphs = cards.flatMap((card) => (card.explanation ?? '').split('\n\n').filter(Boolean));
const explanationParagraphCounts = new Map();
for (const paragraph of explanationParagraphs) explanationParagraphCounts.set(paragraph, (explanationParagraphCounts.get(paragraph) ?? 0) + 1);
const repeatedExplanationParagraphs = [...explanationParagraphCounts.entries()].filter(([, count]) => count > 1);
const duplicateExplanationParagraphs = repeatedExplanationParagraphs.reduce((sum, [, count]) => sum + count - 1, 0);
const bannedExplanationFragments = [
  '表面の振る舞いだけを真似',
  '相手は余計な推測や警戒',
  '本来進めたいことまで止まり',
  '判断として自分の場面へ定着',
];
const mismatchedGroups = catalog.categories.flatMap((category) => category.subcategories.flatMap((persona) => {
  const expected = expectedCounts[category.key]?.[persona.name];
  return expected === persona.items.length ? [] : [`${category.name}/${persona.name}: ${persona.items.length} (expected ${expected ?? 'none'})`];
}));
const checks = {
  categories: catalog.categories.length,
  personas: catalog.categories.reduce((count, category) => count + category.subcategories.length, 0),
  techniques: cards.length,
  duplicateKeys,
  duplicateIds,
  missingEssence: cards.filter((card) => !card.essence?.trim()).length,
  missingExplanations: cards.filter((card) => !card.explanation?.trim()).length,
  invalidExplanationLengths: cards.filter((card) => {
    const length = [...(card.explanation ?? '').replace(/\s/g, '')].length;
    return length < 420 || length > 660;
  }).length,
  invalidExplanationParagraphs: cards.filter((card) => (card.explanation ?? '').split(/\n\s*\n/).filter(Boolean).length !== 3).length,
  duplicateExplanations: cards.length - new Set(cards.map((card) => card.explanation)).size,
  duplicateExplanationParagraphs,
  repeatedExplanationParagraphSamples: repeatedExplanationParagraphs.slice(0, 3).map(([paragraph, count]) => ({ count, paragraph: paragraph.slice(0, 80) })),
  bannedExplanationHits: cards.filter((card) => bannedExplanationFragments.some((fragment) => card.explanation?.includes(fragment))).length,
  invalidTheoryLinks: cards.flatMap((card) => (card.relatedTheoryIds ?? []).filter((id) => !theoryIds.has(id))).length,
  missingTheoryLinks: cards.filter((card) => !card.relatedTheoryIds?.length).length,
  metadataTechniqueCount: metadata.techniqueCount,
  metadataPersonaCount: metadata.personaCount,
  source: metadata.source,
  mismatchedGroups,
};
console.log(JSON.stringify(checks, null, 2));
if (
  checks.categories !== 3 || checks.personas !== 26 || checks.techniques !== 336 ||
  checks.duplicateKeys || checks.duplicateIds || checks.missingEssence || checks.missingExplanations ||
  checks.invalidExplanationLengths || checks.invalidExplanationParagraphs || checks.duplicateExplanations ||
  checks.duplicateExplanationParagraphs || checks.bannedExplanationHits ||
  checks.invalidTheoryLinks || checks.missingTheoryLinks || checks.metadataTechniqueCount !== 336 ||
  checks.metadataPersonaCount !== 26 || checks.source !== 'shoseijutsuroku_全336項目_本質追加版.md' || checks.mismatchedGroups.length
) throw new Error('336-item master catalog validation failed.');
