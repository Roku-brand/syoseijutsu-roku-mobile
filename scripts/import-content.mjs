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

// The source dataset contains one deliberately broad
// "ポジティブ心理学・人生設計" bucket. Concepts whose academic origin is
// clearly outside psychology are normalized here so future imports preserve
// the backend's origin-based taxonomy.
const theoryOriginOverrides = new Map([
  ['kb_554', ['行動科学', '意思決定論']],
  ['kb_555', ['戦略論', '戦略・リスク・キャリア設計']],
  ['kb_556', ['行動科学', '判断・意思決定論']],
  ['kb_557', ['行動科学', '行動変容・学習科学']],
  ['kb_561', ['戦略論', '戦略・リスク・キャリア設計']],
  ['kb_567', ['戦略論', '戦略・リスク・キャリア設計']],
  ['kb_568', ['行動科学', '判断・意思決定論']],
  ['kb_569', ['戦略論', '戦略・リスク・キャリア設計']],
  ['kb_570', ['行動科学', '判断・意思決定論']],
  ['kb_571', ['組織・経営論', '人的資源管理・キャリア論']],
  ['kb_575', ['戦略論', '戦略・リスク・キャリア設計']],
  ['kb_584', ['組織・経営論', '人的資源管理・キャリア論']],
  ['kb_585', ['組織・経営論', '人的資源管理・キャリア論']],
  ['kb_592', ['戦略論', '戦略・リスク・キャリア設計']],
  ['kb_593', ['組織・経営論', '人的資源管理・キャリア論']],
  ['kb_594', ['戦略論', '戦略・リスク・キャリア設計']],
  ['kb_595', ['戦略論', '戦略・リスク・キャリア設計']],
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

function createTechniqueTags(card) {
  const tags = new Set(card.tags ?? []);
  const add = (...values) => values.forEach((value) => tags.add(value));

  if (card.category === '対人術') {
    add('人間関係');
    if (card.subcategory === '関係の構築') add('会話', '恋愛');
    if (card.subcategory === '関係の管理') add('境界線', 'なめられない人');
    if (card.subcategory === '集団での立ち回り') add('職場', 'なめられない人');
  }
  if (card.category === '仕事術') {
    add('仕事ができる人');
    if (card.subcategory === '評価の獲得') add('評価', 'キャリア');
    if (card.subcategory === '交渉・合意の戦術') add('交渉', '合意形成');
    if (card.subcategory === '目標達成') add('目標達成', '習慣');
  }
  if (card.category === '人生術') {
    add('人生設計');
    if (card.subcategory === '不安の解消') add('不安', 'メンタル');
    if (card.subcategory === '人生のつまずき') add('立ち直り', 'メンタル');
    if (card.subcategory === '人生の指針') add('自己理解');
  }

  const text = `${card.title} ${card.body ?? ''}`;
  if (/初対面|印象|名前|褒め/.test(text)) add('第一印象');
  if (/信頼|約束|誠実|関心/.test(text)) add('信頼');
  if (/断る|拒否|境界|搾取/.test(text)) add('境界線', 'なめられない人');
  if (/恋愛|親密|好意|デート/.test(text)) add('恋愛');
  if (/上司|評価|成果|実績/.test(text)) add('評価', '仕事ができる人');
  if (/交渉|合意|譲歩|条件/.test(text)) add('交渉');
  if (/不安|心配|恐怖|緊張/.test(text)) add('不安');
  if (/失敗|挫折|喪失|敗北/.test(text)) add('立ち直り');

  return [...tags].slice(0, 12);
}

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
        tags: createTechniqueTags(card),
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

const rawTheoryRecords = Array.isArray(theoryDataset)
  ? theoryDataset
  : theoryDataset.records;

const theories = rawTheoryRecords.map((record) => {
  const tagId = record.tagId ?? record.id;
  const originOverride = theoryOriginOverrides.get(tagId);
  const sourceType =
    originOverride?.[0] ?? record.sourceType ?? record.source_type;
  const discipline =
    originOverride?.[1] ?? record.discipline;
  const categoryId =
    originOverride
      ? theoryCategoryIds.get(sourceType)
      : record.categoryId ?? theoryCategoryIds.get(sourceType);
  if (!categoryId) {
    throw new Error(`Unknown theory source type: ${sourceType}`);
  }

  const legacyRecord = {
    ...record,
    source_type: sourceType,
    concept_type: record.conceptType ?? record.concept_type,
    domains: record.domains ?? [],
  };

  return {
    tagId,
    originalNumber: record.originalNumber ?? record.original_number,
    title: record.title,
    summary: record.summary ?? createTheorySummary(legacyRecord),
    definition: record.definition,
    keyPoints: record.keyPoints ?? [],
    pitfalls: record.pitfalls ?? [],
    strategies: record.strategies ?? [],
    applicationConditions: record.applicationConditions ?? [],
    sourceType,
    discipline,
    conceptType: record.conceptType ?? record.concept_type,
    sourceName: record.sourceName ?? record.source_name,
    sourceDetail: record.sourceDetail ?? record.source_detail,
    domains: record.domains ?? [],
    principles: record.principles ?? [],
    relatedIds: record.relatedIds ?? record.related_ids ?? [],
    reliability: record.reliability,
    status: record.status,
    notes: record.notes,
    categoryId,
    categoryTitle: originOverride ? sourceType : record.categoryTitle ?? sourceType,
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
  theoryDataset:
    theoryDataset.dataset_name ??
    `統合理論データベース ${theories.length}件`,
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
