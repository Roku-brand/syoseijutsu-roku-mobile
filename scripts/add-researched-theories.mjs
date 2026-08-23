import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const theoriesPath = path.join(root, 'src', 'data', 'generated', 'theories.json');
const techniquesPath = path.join(root, 'src', 'data', 'generated', 'techniques.json');
const metadataPath = path.join(root, 'src', 'data', 'generated', 'metadata.json');

const additions = [
  {
    tagId: 'kb_596', originalNumber: 596, title: '確証バイアス',
    summary: 'すでに信じている仮説に合う情報を集め、反する情報を軽く扱いやすい傾向。第一印象や自分の結論を疑うときは、反証になる事実を意識して探す必要がある。',
    sourceType: '心理学', discipline: '認知心理学・意思決定', conceptType: '効果・バイアス',
    sourceName: 'Raymond S. Nickerson', sourceDetail: 'Confirmation Bias: A Ubiquitous Phenomenon in Many Guises (1998)',
    domains: ['対人術', '関係の管理', '仕事術', '思考・判断'], principles: ['結論を強める情報だけでなく、結論を崩す事実を先に探す。'], relatedIds: [],
    reliability: '一次文献確認済み', status: 'published', notes: '追加調査により補完。', categoryId: 'psychology', categoryTitle: '心理学',
  },
  {
    tagId: 'kb_597', originalNumber: 597, title: '利用可能性ヒューリスティック',
    summary: '思い出しやすい事例ほど、実際より頻繁・重大・起こりやすいと見積もりやすい判断の近道。印象的な失敗談やニュースは、確率そのものではない。',
    sourceType: '行動科学', discipline: '認知心理学・意思決定', conceptType: '効果・バイアス',
    sourceName: 'Amos Tversky / Daniel Kahneman', sourceDetail: 'Availability: A Heuristic for Judging Frequency and Probability (1973)',
    domains: ['仕事術', '思考・判断', '人生術', '不安の解消'], principles: ['鮮明な一例と、全体の頻度・確率を分けて扱う。'], relatedIds: [],
    reliability: '一次文献確認済み', status: 'published', notes: '追加調査により補完。', categoryId: 'behavioral-science', categoryTitle: '行動科学',
  },
  {
    tagId: 'kb_598', originalNumber: 598, title: '心理的契約',
    summary: '雇用条件に明記されなくても、本人が組織や上司との間にあると受け取っている相互の約束。期待を言葉にしないまま破られると、信頼や協力意欲が傷つきやすい。',
    sourceType: '組織・経営論', discipline: '組織行動論・人的資源管理', conceptType: '概念・フレームワーク',
    sourceName: 'Denise M. Rousseau', sourceDetail: 'Psychological and Implied Contracts in Organizations (1989)',
    domains: ['仕事術', '仕事の進め方', '評価の獲得'], principles: ['役割、評価、支援の期待は、暗黙の了解にせず早めにすり合わせる。'], relatedIds: [],
    reliability: '一次文献確認済み', status: 'published', notes: '追加調査により補完。', categoryId: 'organization-management', categoryTitle: '組織・経営論',
  },
  {
    tagId: 'kb_599', originalNumber: 599, title: 'プレモーテム',
    summary: '計画が失敗した未来を先に仮定し、その原因を洗い出す意思決定手法。失敗を恐れるためではなく、言いにくい懸念を計画段階で表に出すために使う。',
    sourceType: '行動科学', discipline: '意思決定・プロジェクト管理', conceptType: '概念・フレームワーク',
    sourceName: 'Gary Klein', sourceDetail: 'Performing a Project Premortem (2007)',
    domains: ['仕事術', '仕事の進め方', '人生術', '不安の解消'], principles: ['失敗を仮定して原因を列挙し、早く兆候を見つける基準を決める。'], relatedIds: [],
    reliability: '一次資料確認済み', status: 'published', notes: '追加調査により補完。', categoryId: 'behavioral-science', categoryTitle: '行動科学',
  },
  {
    tagId: 'kb_600', originalNumber: 600, title: 'ライキング・ギャップ',
    summary: '会話の後、人は相手が自分を好いてくれた度合いを実際より低く見積もりやすい傾向。自分の言い淀みばかりに注意が向くと、相手の好意の手がかりを見落としやすい。',
    sourceType: '心理学', discipline: '社会心理学・対人認知', conceptType: '効果・バイアス',
    sourceName: 'Erica J. Boothby et al.', sourceDetail: 'The Liking Gap in Conversations: Do People Like Us More Than We Think? (2018)',
    domains: ['対人術', '関係の構築'], principles: ['会話直後の自己採点だけで、相手の関心や関係の可能性を閉じない。'], relatedIds: [],
    reliability: '一次文献確認済み', status: 'published', notes: '追加調査により補完。', categoryId: 'psychology', categoryTitle: '心理学',
  },
  {
    tagId: 'kb_601', originalNumber: 601, title: '予期的味わい',
    summary: 'これから起こる良い出来事を思い浮かべ、前もって喜びを味わう心の働き。楽しみは実現した瞬間だけでなく、待つ時間の使い方でも大きくなる。',
    sourceType: '心理学', discipline: 'ポジティブ心理学', conceptType: '概念・フレームワーク',
    sourceName: 'Fred B. Bryant', sourceDetail: 'A Four-Factor Model of Perceived Control: Avoiding, Coping, Obtaining, and Savoring (1989)',
    domains: ['人生術', '人生の楽しみ'], principles: ['楽しみを予定に置き、待つ時間にも注意を向ける。'], relatedIds: [],
    reliability: '一次文献確認済み', status: 'published', notes: '追加調査により補完。', categoryId: 'psychology', categoryTitle: '心理学',
  },
  {
    tagId: 'kb_602', originalNumber: 602, title: '拡張・形成理論',
    summary: '喜びや興味などのポジティブ感情は、その場の視野と行動の選択肢を広げ、後から使える人間関係・知識・回復力を育てるという見方。楽しい経験は気分転換だけで終わらない。',
    sourceType: '心理学', discipline: 'ポジティブ心理学', conceptType: '理論',
    sourceName: 'Barbara L. Fredrickson', sourceDetail: 'The Role of Positive Emotions in Positive Psychology: The Broaden-and-Build Theory of Positive Emotions (2001)',
    domains: ['人生術', '人生の楽しみ'], principles: ['好奇心が動く小さな経験を増やし、選択肢とつながりを育てる。'], relatedIds: [],
    reliability: '一次文献確認済み', status: 'published', notes: '追加調査により補完。', categoryId: 'psychology', categoryTitle: '心理学',
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
