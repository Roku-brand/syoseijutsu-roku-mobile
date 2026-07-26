import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const OUTPUT_DIR = path.join(ROOT, 'src', 'data', 'generated');

const categoryConfig = [
  {
    key: 'interpersonal',
    name: '対人術',
    sourceName: '対人術',
    subcategories: [
      {
        name: '関係の構築',
        articleTitle: '出会いを信頼へ変え、自然なつながりを育てる',
      },
      {
        name: '関係の管理',
        articleTitle: '距離と境界線を整え、関係を長く保つ',
      },
      {
        name: '集団での立ち回り',
        articleTitle: '集団の力学を読み、協力と影響力を得る',
      },
    ],
  },
  {
    key: 'work',
    name: '仕事術',
    sourceName: '仕事術',
    subcategories: [
      {
        name: '評価の獲得',
        articleTitle: '成果を正しく伝え、信頼と機会につなげる',
      },
      {
        name: '交渉・合意の戦術',
        articleTitle: '対立をほどき、互いに動ける合意をつくる',
      },
      {
        name: '目標達成',
        articleTitle: '意志に頼らず、前進が続く仕組みをつくる',
      },
    ],
  },
  {
    key: 'life',
    name: '人生術',
    sourceName: '人生術',
    subcategories: [
      {
        name: '人生の指針',
        articleTitle: '長い時間軸で、自分の判断軸と進路を持つ',
      },
      {
        name: '不安の解消',
        articleTitle: '不確実さと感情に飲まれず、今を整える',
      },
      {
        name: '人生のつまずき',
        articleTitle: '失敗や喪失を、次の生き方へつなぎ直す',
      },
    ],
  },
];

const theoryCategoryIds = new Map([
  ['心理学', 'psychology'],
  ['行動科学', 'behavioral-science'],
  ['組織・経営論', 'organization-management'],
  ['戦略論', 'strategy'],
  ['古典・思想', 'classics-thought'],
  ['格言・経験則・作品', 'maxims-experience'],
]);

const theoryContexts = {
  '心理学': '人の認知・感情・対人関係の動き',
  '行動科学': '人が選び、習慣化し、行動を変える仕組み',
  '組織・経営論': '組織の評価・権力・協働をめぐる力学',
  '戦略論': '競争・交渉・不確実性の中で資源を配る考え方',
  '古典・思想': '長い時間を生き抜くための判断と人間観',
  '格言・経験則・作品': '経験から抽出された、行動を選ぶための視点',
};

function createTheorySummary(record) {
  const context = theoryContexts[record.source_type] ?? '現実の判断と行動';
  const domains = (record.domains ?? []).join('・');
  const kind = record.concept_type ?? '考え方';

  if (record.source_type === '古典・思想') {
    return `「${record.title}」は、${context}を示す${kind}です。${domains || '日常の判断'}で、目先の得失だけでなく長い時間軸から状況を見る手がかりになります。`;
  }

  if (record.source_type === '格言・経験則・作品') {
    return `「${record.title}」は、${context}を言葉にした${kind}です。${domains || '日常の判断'}で、迷ったときの見方や行動の軸として使えます。`;
  }

  return `「${record.title}」は、${context}を捉える${kind}です。${domains || '日常の判断'}で起きることを整理し、次に取る行動を考える手がかりになります。`;
}

async function readJson(filename) {
  const source = await readFile(path.join(CONTENT_DIR, filename), 'utf8');
  return JSON.parse(source);
}

const [techniqueDataset, theoryDataset] = await Promise.all([
  readJson('shoseijutsu_cards_135_with_explanations.json'),
  readJson('theory_knowledge_base_386.json'),
]);

const sourceCategoryByName = new Map(
  categoryConfig.map((category) => [category.sourceName, category]),
);

const categories = categoryConfig.map((category) => ({
  key: category.key,
  name: category.name,
  subcategories: category.subcategories.map((subcategory) => ({
    name: subcategory.name,
    articleTitle: subcategory.articleTitle,
    items: techniqueDataset.cards
      .filter(
        (card) =>
          card.category === category.sourceName &&
          card.subcategory === subcategory.name,
      )
      .sort((a, b) => a.display_order - b.display_order)
      .map((card) => ({
        id: card.id,
        title: card.title,
        subtitle: card.body,
        explanation: card.explanation,
        theoryTagIds: card.evidence_ids,
        tags: card.tags ?? [],
        status: card.status,
        displayOrder: card.display_order,
      })),
  })),
}));

const unmappedTechniqueCards = techniqueDataset.cards.filter((card) => {
  const category = sourceCategoryByName.get(card.category);
  return !category?.subcategories.some(
    (subcategory) => subcategory.name === card.subcategory,
  );
});
if (unmappedTechniqueCards.length) {
  throw new Error(
    `Unmapped technique cards: ${unmappedTechniqueCards
      .map((card) => card.id)
      .join(', ')}`,
  );
}

const theories = theoryDataset.records.map((record) => {
  const categoryId = theoryCategoryIds.get(record.source_type);
  if (!categoryId) {
    throw new Error(`Unknown theory source_type: ${record.source_type}`);
  }

  return {
    tagId: record.id,
    originalNumber: record.original_number,
    title: record.title,
    summary: record.summary ?? createTheorySummary(record),
    sourceType: record.source_type,
    discipline: record.discipline,
    conceptType: record.concept_type,
    sourceName: record.source_name,
    sourceDetail: record.source_detail,
    domains: record.domains ?? [],
    principles: record.principles ?? [],
    relatedIds: record.related_ids ?? [],
    reliability: record.reliability,
    status: record.status,
    notes: record.notes,
    categoryId,
    categoryTitle: record.source_type,
  };
});

const theoryIds = new Set(theories.map((theory) => theory.tagId));
const missingEvidenceIds = [
  ...new Set(
    techniqueDataset.cards.flatMap((card) =>
      card.evidence_ids.filter((id) => !theoryIds.has(id)),
    ),
  ),
];
if (missingEvidenceIds.length) {
  throw new Error(`Missing evidence IDs: ${missingEvidenceIds.join(', ')}`);
}

const techniqueCount = categories.reduce(
  (total, category) =>
    total +
    category.subcategories.reduce(
      (categoryTotal, subcategory) =>
        categoryTotal + subcategory.items.length,
      0,
    ),
  0,
);

const metadata = {
  importedAt: new Date().toISOString(),
  source: 'content/*.json',
  techniqueDataset: techniqueDataset.dataset_name,
  theoryDataset: theoryDataset.dataset_name,
  techniqueCount,
  theoryCount: theories.length,
  categoryCount: categories.length,
  subcategoryCount: categories.reduce(
    (total, category) => total + category.subcategories.length,
    0,
  ),
};

await mkdir(OUTPUT_DIR, { recursive: true });
await Promise.all([
  writeFile(
    path.join(OUTPUT_DIR, 'techniques.json'),
    `${JSON.stringify({ categories }, null, 2)}\n`,
    'utf8',
  ),
  writeFile(
    path.join(OUTPUT_DIR, 'theories.json'),
    `${JSON.stringify(theories, null, 2)}\n`,
    'utf8',
  ),
  writeFile(
    path.join(OUTPUT_DIR, 'metadata.json'),
    `${JSON.stringify(metadata, null, 2)}\n`,
    'utf8',
  ),
]);

console.log(
  `Imported ${metadata.techniqueCount} techniques and ${metadata.theoryCount} theories.`,
);
