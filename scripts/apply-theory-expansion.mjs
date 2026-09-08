import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseExpansionRows } from './theory-expansion-data.mjs';
import { wisdomSupportTechniqueIdsByTheoryId } from './master336-wisdom-support-links.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'src', 'data', 'generated');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const normalize = (value) => String(value ?? '').normalize('NFKC').toLocaleLowerCase('ja').replace(/[\s・･／/＝=‐‑–—―()（）・]/g, '');
const unique = (values) => [...new Set(values.filter(Boolean))];

const theoryPath = path.join(dataDir, 'theories.json');
const techniquePath = path.join(dataDir, 'techniques.json');
const metadataPath = path.join(dataDir, 'metadata.json');
const comprehensivePath = path.join(dataDir, 'comprehensive-theory-links.json');
const primaryPath = path.join(dataDir, 'primary-theory-links.json');
const scopePath = path.join(root, 'src', 'data', 'content-scope.json');

const theories = readJson(theoryPath);
const techniqueTree = readJson(techniquePath);
const metadata = readJson(metadataPath);
const comprehensive = readJson(comprehensivePath);
const primary = readJson(primaryPath);
const scope = readJson(scopePath);
const rows = parseExpansionRows();
const beforeCount = 630;

const improvementSpecs = [
  {
    id: 'kb_003',
    candidate: 'ホーン効果',
    aliases: ['ホーン効果', 'horn effect', 'devil effect'],
    sentence: '逆に、一つの目立つ欠点が全体評価を引き下げるホーン効果も同じ印象波及の仕組みで説明できる。',
  },
  {
    id: 'kb_133',
    candidate: '反射効果',
    aliases: ['反射効果', 'reflection effect'],
    sentence: '同程度の確率でも、利得局面ではリスク回避、損失局面ではリスク追求へ傾きやすい反射効果を含む。',
  },
  {
    id: 'kb_265',
    candidate: '努力正当化',
    aliases: ['努力正当化', 'effort justification'],
    sentence: '大きな努力を払った対象を過大評価して不協和を減らす努力正当化も、この理論の代表的な現れである。',
  },
  {
    id: 'kb_461',
    candidate: '情報源信頼性モデル',
    aliases: ['情報源信頼性モデル', 'source credibility model', 'source credibility'],
    sentence: '専門性と信頼性を中心に情報源の説得力を捉える情報源信頼性モデルを含み、内容の根拠とは分けて評価する。',
  },
];

for (const spec of improvementSpecs) {
  const theory = theories.find((item) => item.tagId === spec.id);
  if (!theory) throw new Error(`Missing improvement target: ${spec.id}`);
  theory.aliases = unique([...(theory.aliases ?? []), ...spec.aliases]);
  if (!theory.summary.includes(spec.sentence)) theory.summary = `${theory.summary}${spec.sentence}`;
  theory.provenance = {
    ...theory.provenance,
    note: unique([theory.provenance?.note, `${spec.candidate}を同義・下位概念として統合。`]).join(' '),
  };
}

const lookup = new Map();
const register = (theory) => {
  for (const name of [theory.title, ...(theory.aliases ?? [])]) {
    const key = normalize(name);
    if (key && !lookup.has(key)) lookup.set(key, theory);
  }
};
theories.forEach(register);

let nextId = Math.max(...theories.map((item) => Number(item.tagId.match(/\d+/)?.[0] ?? 0))) + 1;
const additions = [];
for (const row of rows) {
  const existing = lookup.get(normalize(row.title));
  if (existing) {
    existing.aliases = row.aliases;
    existing.summary = row.summary;
    existing.categoryId = row.categoryId;
    existing.categoryTitle = row.categoryTitle;
    existing.provenance = row.provenance;
    additions.push({ ...row, theory: existing });
    register(existing);
    continue;
  }
  const theory = {
    tagId: `kb_${String(nextId++).padStart(3, '0')}`,
    title: row.title,
    aliases: row.aliases,
    summary: row.summary,
    categoryId: row.categoryId,
    categoryTitle: row.categoryTitle,
    provenance: row.provenance,
    relatedTheoryIds: [],
  };
  theories.push(theory);
  additions.push({ ...row, theory });
  register(theory);
}

const relationTargetAliases = new Map(Object.entries({
  '熟達者の直観': '熟達者の直観／RPDモデル',
  '公平理論': '手続的公正',
  '平均以上効果': '自己奉仕バイアス',
  '期待効果': 'フレーミング効果',
  '相互依存理論': '相互依存性理論',
  '類似性効果': '類似性魅力効果',
  '社会的支援': '社会的支援理論',
  '二重過程理論': '二重過程モデル',
  '消去学習': '消去理論',
  '想起練習': '検索練習効果',
  '単一事例効果': '感情ヒューリスティック',
  '帯域幅税': '認知負荷理論',
  '意図せざる結果': '結果バイアス',
  '社会的ネットワーク': 'ネットワーク中心性',
  'ストーリーテリング': '真実性錯覚',
  '活性化拡散モデル': '連想ネットワーク',
}));
const unresolvedRelations = [];
for (const addition of additions) {
  for (const relatedTitle of addition.relatedTitles) {
    const resolvedTitle = relationTargetAliases.get(relatedTitle) ?? relatedTitle;
    const related = lookup.get(normalize(resolvedTitle));
    if (!related) {
      unresolvedRelations.push({ theory: addition.theory.title, relatedTitle });
      continue;
    }
    if (related.tagId === addition.theory.tagId) continue;
    addition.theory.relatedTheoryIds = unique([...addition.theory.relatedTheoryIds, related.tagId]);
    related.relatedTheoryIds = unique([...(related.relatedTheoryIds ?? []), addition.theory.tagId]);
  }
}

const techniques = techniqueTree.categories.flatMap((category) => category.subcategories.flatMap((subcategory) => subcategory.items));
const techniqueById = new Map(techniques.map((item) => [item.id, item]));
const wisdomSupportByTechniqueId = new Map(techniques.map((item) => [item.id, []]));
for (const [theoryId, techniqueIds] of Object.entries(wisdomSupportTechniqueIdsByTheoryId)) {
  for (const techniqueId of techniqueIds) wisdomSupportByTechniqueId.get(techniqueId)?.push(theoryId);
}
const linkedPairs = [];
for (const addition of additions) {
  for (const techniqueId of addition.techniqueIds) {
    const technique = techniqueById.get(techniqueId);
    if (!technique) throw new Error(`Unknown technique ${techniqueId} for ${addition.theory.title}`);
    technique.relatedTheoryIds = unique([...(technique.relatedTheoryIds ?? technique.theoryTagIds ?? []), addition.theory.tagId]);
    comprehensive[techniqueId] = unique([...(comprehensive[techniqueId] ?? []), addition.theory.tagId]);
    primary[techniqueId] = primary[techniqueId] ?? technique.primaryTheoryIds ?? [];
    linkedPairs.push({ theoryId: addition.theory.tagId, theory: addition.theory.title, techniqueId, technique: technique.title, layer: 'あわせて読む理論' });
  }
}

for (const technique of techniques) {
  comprehensive[technique.id] = comprehensive[technique.id] ?? technique.relatedTheoryIds ?? [];
  primary[technique.id] = primary[technique.id] ?? technique.primaryTheoryIds ?? [];
  technique.relatedTheoryIds = unique([...(comprehensive[technique.id] ?? []), ...(wisdomSupportByTechniqueId.get(technique.id) ?? [])]);
  technique.primaryTheoryIds = primary[technique.id];
}

const idSet = new Set(theories.map((item) => item.tagId));
if (idSet.size !== theories.length) throw new Error('Duplicate theory IDs detected.');
const normalizedNames = new Map();
for (const theory of theories) {
  for (const name of [theory.title, ...(theory.aliases ?? [])]) {
    const key = normalize(name);
    const owner = normalizedNames.get(key);
    if (owner && owner !== theory.tagId) throw new Error(`Duplicate theory name/alias: ${name} (${owner}, ${theory.tagId})`);
    normalizedNames.set(key, theory.tagId);
  }
  theory.relatedTheoryIds = unique(theory.relatedTheoryIds ?? []).filter((id) => idSet.has(id) && id !== theory.tagId);
}

metadata.theoryCount = theories.length;
metadata.productTheoryCount = theories.length;
metadata.categoryCounts = Object.fromEntries([...new Set(theories.map((item) => item.categoryId))].map((categoryId) => [categoryId, theories.filter((item) => item.categoryId === categoryId).length]));
scope.complete.theories = theories.length;

const integrations = [
  ['観察学習・社会的学習理論', '包含関係を一枚へ統合'],
  ['メンタル・コントラスティング・WOOP・MCII', '理論・手順・実装意図の関係を一枚へ統合'],
  ['曖昧性回避・エルズバーグ・パラドックス', '選好と代表課題を一枚へ統合'],
  ['ゼロサムゲーム・非ゼロサムゲーム', '対概念として一枚へ統合'],
  ['熟達者の直観・RPD', '自然主義的意思決定として一枚へ統合'],
  ['専門性とチャンク化', 'チャンク化カードへ統合'],
  ['情報回避・オーストリッチ効果', '同一行動傾向として一枚へ統合'],
  ['希少性マインドセット・トンネリング', '原因と注意集中の機序を一枚へ統合'],
  ['リスク補償・ペルツマン効果', '一般仮説と代表研究を一枚へ統合'],
  ['経験曲線・学習曲線', '実務上の重複範囲を一枚へ統合'],
  ['ミニマックス・マキシミン', 'ゼロ和ゲームでの双対的関係を一枚へ統合'],
];

const audit = {
  generatedAt: new Date().toISOString(),
  beforeCount,
  addedCount: additions.length,
  improvedCount: improvementSpecs.length,
  integratedGroups: integrations.length,
  skippedCount: 0,
  afterCount: theories.length,
  additions: additions.map(({ theory }) => ({ id: theory.tagId, title: theory.title, category: theory.categoryTitle })),
  improvements: improvementSpecs.map((item) => ({ candidate: item.candidate, targetId: item.id, targetTitle: theories.find((theory) => theory.tagId === item.id)?.title })),
  integrations: integrations.map(([candidates, action]) => ({ candidates, action })),
  linkedPairs,
  unresolvedRelations,
};

const countDistribution = (values) => Object.fromEntries([...values.reduce((map, value) => map.set(value, (map.get(value) ?? 0) + 1), new Map()).entries()].sort(([left], [right]) => left - right));
const allLinkedIds = new Set(techniques.flatMap((item) => item.relatedTheoryIds ?? []));
const categoryCoverage = Object.fromEntries([...new Set(theories.map((item) => item.categoryId))].map((categoryId) => {
  const categoryIds = new Set(theories.filter((item) => item.categoryId === categoryId).map((item) => item.tagId));
  return [categoryId, {
    theories: categoryIds.size,
    linkedTheories: [...categoryIds].filter((id) => allLinkedIds.has(id)).length,
    links: techniques.reduce((sum, item) => sum + (item.relatedTheoryIds ?? []).filter((id) => categoryIds.has(id)).length, 0),
  }];
}));
const linkReviewSummary = {
  reviewPolicy: 'Prefer comprehensive coverage. Primary theories are representative entry points; supplementary theories contain similar, complementary, and alternate perspectives without implying lower importance.',
  techniques: techniques.length,
  theories: theories.length,
  links: techniques.reduce((sum, item) => sum + item.relatedTheoryIds.length, 0),
  primaryLinks: techniques.reduce((sum, item) => sum + item.primaryTheoryIds.length, 0),
  linkedTheories: allLinkedIds.size,
  unlinkedTheories: theories.length - allLinkedIds.size,
  minimumLinksPerTechnique: Math.min(...techniques.map((item) => item.relatedTheoryIds.length)),
  maximumLinksPerTechnique: Math.max(...techniques.map((item) => item.relatedTheoryIds.length)),
  distribution: countDistribution(techniques.map((item) => item.relatedTheoryIds.length)),
  primaryDistribution: countDistribution(techniques.map((item) => item.primaryTheoryIds.length)),
  supplementaryDistribution: countDistribution(techniques.map((item) => item.relatedTheoryIds.length - item.primaryTheoryIds.length)),
  wisdomSupportLinks: techniques.reduce((sum, item) => sum + item.relatedTheoryIds.filter((id) => ['classics-thought', 'maxims-experience'].includes(theories.find((theory) => theory.tagId === id)?.categoryId)).length, 0),
  categoryCoverage,
  generatedAt: new Date().toISOString().slice(0, 10),
};
linkReviewSummary.supplementaryLinks = linkReviewSummary.links - linkReviewSummary.primaryLinks;

writeJson(theoryPath, theories);
writeJson(techniquePath, techniqueTree);
writeJson(metadataPath, metadata);
writeJson(comprehensivePath, comprehensive);
writeJson(primaryPath, primary);
writeJson(scopePath, scope);
writeJson(path.join(root, 'docs', 'theory-expansion-audit.json'), audit);
writeJson(path.join(root, 'docs', 'theory-link-audit', 'content-review-summary.json'), linkReviewSummary);

const markdown = [
  '# 理論データベース網羅性改善監査',
  '',
  `作業前 ${beforeCount}件から、独立価値のある${additions.length}件を追加し、${improvementSpecs.length}件を既存カードへ改善統合。作業後は${theories.length}件。`,
  '',
  '## 判定集計',
  '',
  `- 新規追加：${additions.length}件`,
  `- 既存改善：${improvementSpecs.length}件`,
  `- 統合グループ：${integrations.length}組`,
  '- 見送り：0件（C・Xは依頼どおり監査対象外）',
  `- 手動の関連処世術リンク：${linkedPairs.length}件（すべて「あわせて読む理論」、既存主要理論は維持）`,
  '',
  '## 新規追加',
  '',
  ...audit.additions.map((item) => `- ${item.id}｜${item.title}｜${item.category}`),
  '',
  '## 既存改善',
  '',
  ...audit.improvements.map((item) => `- ${item.candidate} → ${item.targetId} ${item.targetTitle}｜別名・定義・注記を統合`),
  '',
  '## 統合判断',
  '',
  ...audit.integrations.map((item) => `- ${item.candidates}｜${item.action}`),
  '',
  '## 関連表示',
  '',
  `意味的に強い関連理論を双方向で登録。解決できなかった関連候補：${unresolvedRelations.length}件。`,
  '',
];
fs.writeFileSync(path.join(root, 'docs', 'theory-expansion-audit.md'), `${markdown.join('\n')}\n`);

console.log(JSON.stringify({ beforeCount, added: additions.length, improved: improvementSpecs.length, afterCount: theories.length, linkedPairs: linkedPairs.length, unresolvedRelations }, null, 2));
