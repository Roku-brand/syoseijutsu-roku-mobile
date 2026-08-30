import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const theoriesPath = path.join(root, 'src', 'data', 'generated', 'theories.json');
const techniquesPath = path.join(root, 'src', 'data', 'generated', 'techniques.json');
const metadataPath = path.join(root, 'src', 'data', 'generated', 'metadata.json');

const additions = [
  {
    tagId: 'kb_596', title: '確証バイアス',
    summary: 'すでに信じている仮説に合う情報を集め、反する情報を軽く扱いやすい傾向。第一印象や自分の結論を疑うときは、反証になる事実を意識して探す必要がある。',
    categoryId: 'psychology', categoryTitle: '心理学',
    provenance: { status: '一部確認', attribution: 'Raymond S. Nickerson', works: ['Confirmation Bias: A Ubiquitous Phenomenon in Many Guises (1998)'] },
  },
  {
    tagId: 'kb_597', title: '利用可能性ヒューリスティック',
    summary: '思い出しやすい事例ほど、実際より頻繁・重大・起こりやすいと見積もりやすい判断の近道。印象的な失敗談やニュースは、確率そのものではない。',
    categoryId: 'behavioral-science', categoryTitle: '行動科学',
    provenance: { status: '一部確認', attribution: 'Amos Tversky / Daniel Kahneman', works: ['Availability: A Heuristic for Judging Frequency and Probability (1973)'] },
  },
  {
    tagId: 'kb_598', title: '心理的契約',
    summary: '雇用条件に明記されなくても、本人が組織や上司との間にあると受け取っている相互の約束。期待を言葉にしないまま破られると、信頼や協力意欲が傷つきやすい。',
    categoryId: 'organization-management', categoryTitle: '組織・経営論',
    provenance: { status: '一部確認', attribution: 'Denise M. Rousseau', works: ['Psychological and Implied Contracts in Organizations (1989)'] },
  },
  {
    tagId: 'kb_599', title: 'プレモーテム',
    summary: '計画が失敗した未来を先に仮定し、その原因を洗い出す意思決定手法。失敗を恐れるためではなく、言いにくい懸念を計画段階で表に出すために使う。',
    categoryId: 'behavioral-science', categoryTitle: '行動科学',
    provenance: { status: '一部確認', attribution: 'Gary Klein', works: ['Performing a Project Premortem (2007)'] },
  },
  {
    tagId: 'kb_600', title: 'ライキング・ギャップ',
    summary: '会話の後、人は相手が自分を好いてくれた度合いを実際より低く見積もりやすい傾向。自分の言い淀みばかりに注意が向くと、相手の好意の手がかりを見落としやすい。',
    categoryId: 'psychology', categoryTitle: '心理学',
    provenance: { status: '一部確認', attribution: 'Erica J. Boothby et al.', works: ['The Liking Gap in Conversations: Do People Like Us More Than We Think? (2018)'] },
  },
  {
    tagId: 'kb_601', title: '予期的味わい',
    summary: 'これから起こる良い出来事を思い浮かべ、前もって喜びを味わう心の働き。楽しみは実現した瞬間だけでなく、待つ時間の使い方でも大きくなる。',
    categoryId: 'psychology', categoryTitle: '心理学',
    provenance: { status: '一部確認', attribution: 'Fred B. Bryant', works: ['A Four-Factor Model of Perceived Control: Avoiding, Coping, Obtaining, and Savoring (1989)'] },
  },
  {
    tagId: 'kb_602', title: '拡張・形成理論',
    summary: '喜びや興味などのポジティブ感情は、その場の視野と行動の選択肢を広げ、後から使える人間関係・知識・回復力を育てるという見方。楽しい経験は気分転換だけで終わらない。',
    categoryId: 'psychology', categoryTitle: '心理学',
    provenance: { status: '一部確認', attribution: 'Barbara L. Fredrickson', works: ['The Role of Positive Emotions in Positive Psychology: The Broaden-and-Build Theory of Positive Emotions (2001)'] },
  },
];

const replacements = new Map([
  ['latest-030', ['kb_600', 'kb_012', 'kb_407']],
  ['latest-114', ['kb_596', 'kb_434', 'kb_449']],
  ['latest-234', ['kb_598', 'kb_170', 'kb_171']],
  ['latest-237', ['kb_599', 'kb_506', 'kb_510']],
  ['latest-284', ['kb_596', 'kb_570', 'kb_574']],
  ['latest-296', ['kb_598', 'kb_116', 'kb_117']],
  ['latest-396', ['kb_601', 'kb_547', 'kb_173']],
  ['latest-398', ['kb_602', 'kb_550', 'kb_575']],
  ['latest-399', ['kb_602', 'kb_568', 'kb_554']],
  ['latest-401', ['kb_602', 'kb_547', 'kb_552']],
  ['latest-406', ['kb_601', 'kb_547', 'kb_174']],
  ['latest-408', ['kb_601', 'kb_560', 'kb_561']],
  ['latest-412', ['kb_599', 'kb_203', 'kb_230']],
  ['latest-416', ['kb_597', 'kb_203', 'kb_214']],
]);

const [theories, catalog, metadata] = await Promise.all([
  readFile(theoriesPath, 'utf8').then(JSON.parse),
  readFile(techniquesPath, 'utf8').then(JSON.parse),
  readFile(metadataPath, 'utf8').then(JSON.parse),
]);
for (const theory of additions) {
  const existingIndex = theories.findIndex((candidate) => candidate.tagId === theory.tagId);
  if (existingIndex >= 0) theories[existingIndex] = theory;
  else theories.push(theory);
}
const cards = catalog.categories.flatMap((category) => category.subcategories.flatMap((persona) => persona.items));
for (const [id, relatedTheoryIds] of replacements) {
  const card = cards.find((candidate) => candidate.id === id);
  if (!card) throw new Error(`Technique not found: ${id}`);
  card.relatedTheoryIds = relatedTheoryIds;
}
metadata.theoryCount = theories.length;
metadata.categoryCounts = theories.reduce((counts, theory) => {
  counts[theory.categoryId] = (counts[theory.categoryId] ?? 0) + 1;
  return counts;
}, {});

await Promise.all([
  writeFile(theoriesPath, `${JSON.stringify(theories, null, 2)}\n`, 'utf8'),
  writeFile(techniquesPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8'),
  writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8'),
]);
console.log(JSON.stringify({ addedTheories: additions.length, linkedTechniques: replacements.size, theoryCount: theories.length }, null, 2));
