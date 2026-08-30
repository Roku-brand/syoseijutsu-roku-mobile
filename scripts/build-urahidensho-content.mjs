import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_PATH = path.join(
  ROOT,
  'content',
  'shoseijutsu_urahidensho.md',
);
const OUTPUT_PATH = path.join(
  ROOT,
  'content',
  'shoseijutsu_cards_135_with_explanations.json',
);
const THEORY_PATH = path.join(ROOT, 'content', 'theory_knowledge_base_386.json');
const EXTERNAL_SOURCE_PATH = process.argv[2]
  ? path.resolve(process.argv[2])
  : null;
const EXTERNAL_THEORY_PATH = process.argv[3]
  ? path.resolve(process.argv[3])
  : null;

const categoryOrder = new Map([
  ['対人術', 1],
  ['仕事術', 2],
  ['人生術', 3],
]);

const subcategoryAliases = new Map([
  ['対人術/関係の構築', '関係の構築'],
  ['対人術/関係の管理', '関係の管理'],
  ['対人術/立ち回り', '集団での立ち回り'],
  ['仕事術/評価の獲得', '評価の獲得'],
  ['仕事術/交渉・合意の戦術', '交渉・合意の戦術'],
  ['仕事術/目標達成', '目標達成'],
  ['人生術/人生の指針', '人生の指針'],
  ['人生術/不安の解消', '不安の解消'],
  ['人生術/人生のつまずき', '人生のつまずき'],
]);

const subcategoryOrder = new Map([
  ['対人術/関係の構築', 1],
  ['対人術/関係の管理', 2],
  ['対人術/集団での立ち回り', 3],
  ['仕事術/評価の獲得', 1],
  ['仕事術/交渉・合意の戦術', 2],
  ['仕事術/目標達成', 3],
  ['人生術/人生の指針', 1],
  ['人生術/不安の解消', 2],
  ['人生術/人生のつまずき', 3],
]);

const groupGuidance = {
  印象がいい人の処世術: {
    body: '第一印象を偶然に任せず、安心・一貫性・相手への扱い方として整える。',
    practice:
      '表情、姿勢、声、言葉、距離感を別々に考え、相手が安心して次の反応を返せる形へそろえる。',
    caution:
      '印象管理を演技だけにすると、行動との不一致が後から大きな不信になる。',
    close: '印象は飾るものではなく、相手がこちらを予測するための入口である。',
  },
  会話がうまい人の処世術: {
    body: '自分が話し切るより、相手が次の言葉を返しやすい会話をつくる。',
    practice:
      '質問、要約、感情への応答、沈黙を使い分け、相手の言葉から次の話題を育てる。',
    caution:
      '深掘りしすぎると関心は尋問に変わる。答えない自由と話題を戻す余白を残す。',
    close: '会話の巧さは、言葉の多さより相手の言葉が自然に増えるかで分かる。',
  },
  信用を積む人の処世術: {
    body: '好かれることより、行動を予測できる人になることで信用を積む。',
    practice:
      '小さな約束、平時の連絡、失敗後の修正を重ね、都合が悪い場面でも態度を安定させる。',
    caution:
      '一度の献身や派手な善意で、継続的な不一致を埋め合わせることはできない。',
    close: '信用は感情ではなく、次も同じ基準で動くという予測可能性から生まれる。',
  },
  関係を維持できる人の処世術: {
    body: '対立をなくすのではなく、壊れる前に距離・期待・伝え方を調整する。',
    practice:
      '感情が強いときは結論を急がず、人格ではなく行動を扱い、修復可能な言葉へ戻す。',
    caution:
      '関係維持を優先しすぎて、自分だけが譲り続ける構造を固定しない。',
    close: '長く続く関係は、摩擦がない関係ではなく修正できる関係である。',
  },
  消耗しない人の処世術: {
    body: '善意を保ちながら、時間・感情・責任の境界線を明確にする。',
    practice:
      'できること、できないこと、応じる条件を短く伝え、反応の激しさに判断を委ねない。',
    caution:
      '距離を取ることと、相手を罰するために無視することは別である。',
    close: '消耗を防ぐ境界線は、冷たさではなく関係を壊さないための運用ルールである。',
  },
  人を見極める人の処世術: {
    body: '言葉の魅力より、反復される行動と不利益時の態度を見る。',
    practice:
      '約束、コスト負担、弱い相手への扱い、拒否された後の反応を時間をかけて観察する。',
    caution:
      '一度の失敗や違和感だけで人格全体を断定せず、反復するパターンで判断する。',
    close: '人の本質は、うまく語れた瞬間より都合が悪くなった後の行動に表れる。',
  },
  集団でうまく立ち回る人の処世術: {
    body: '集団を深掘りの場ではなく、ノリ・所属感・役割を共有する場として扱う。',
    practice:
      '一対一の関係を別に育てながら、集団では全員が参加できる話題と小さな貢献を増やす。',
    caution:
      '一人との親密さを集団内で誇示すると、他の人を観客や競争相手に変えやすい。',
    close: 'サシで信頼をつくり、集団では居場所をつくる。',
  },
  舐められない人の処世術: {
    body: '威圧ではなく、基準・限界・結果を一貫して示すことで軽視を防ぐ。',
    practice:
      '拒否や訂正を短く伝え、必要な場面では言葉より結果と第三者に残る記録で示す。',
    caution:
      '強さを証明し続けると、小さな挑発にも反応する不安定な人に見える。',
    close: '舐められない人は、常に勝つ人ではなく越えられた線を必ず戻す人である。',
  },
  集団を動かす人の処世術: {
    body: '正しさを押し通すより、責任・参加・選択肢が自然に生まれる構造をつくる。',
    practice:
      '最初の問い、役割、期限、異論の出し方を設計し、全員が動きやすい次の一手を明確にする。',
    caution:
      '合意を急ぐと、沈黙を賛成と誤認し、後から抵抗や手抜きを招く。',
    close: '集団を動かす力は、命令の強さより人が動ける条件を先に置く力である。',
  },
  仕事ができる人の処世術: {
    body: '努力量ではなく、成果・再現性・周囲の使いやすさへ仕事を変換する。',
    practice:
      '目的、期限、完成条件を先にそろえ、途中経過とリスクを相手が判断できる形で共有する。',
    caution:
      '速さや抱え込みだけで有能さを示すと、重要な判断や改善が見えなくなる。',
    close: '仕事ができるとは、頑張ることではなく相手が安心して次を任せられることである。',
  },
  出世する人の処世術: {
    body: '実力を、組織が評価し機会へ変えられる形で見せる。',
    practice:
      '成果の可視化、第三者の信用、重要課題への接続を通じて、能力と組織需要を結びつける。',
    caution:
      '上へのアピールだけでは、同僚の協力と長期的な評判を失いやすい。',
    close: '昇進は能力の証明だけでなく、その能力をどこで誰に認識させたかで決まる。',
  },
  交渉がうまい人の処世術: {
    body: '要求の強さではなく、代替案・情報・複数条件で交渉力をつくる。',
    practice:
      '相手の制約と優先順位を聞き、金額だけでなく期限、範囲、責任、撤退条件を組み替える。',
    caution:
      '相手を負かすことに集中すると、長期関係と次の合意可能性を失う。',
    close: '交渉力は声の強さではなく、断っても動ける選択肢の数から生まれる。',
  },
  合意形成がうまい人の処世術: {
    body: '全員一致より、異論を残しても実行できる合意をつくる。',
    practice:
      '立場の背後にある利益を分け、手続き、例外、見直し条件を含めて受け入れ可能な形にする。',
    caution:
      '表面的な賛成を集めても、参加感と面子が損なわれれば実行段階で崩れる。',
    close: '良い合意は全員が正しいと思う状態ではなく、全員が次へ進める状態である。',
  },
  始められる人の処世術: {
    body: '意欲を待たず、着手の抵抗が最小になる環境と一歩を先につくる。',
    practice:
      'いつ、どこで、何をするかを決め、準備を減らし、数分で終わる最初の行動へ分解する。',
    caution:
      '準備や情報収集を着手の代わりにすると、安心だけを買って行動が残らない。',
    close: '始める力は意志の強さではなく、最初の一歩を小さく設計する力である。',
  },
  続けられる人の処世術: {
    body: '好調な日の量より、崩れた後に戻りやすい仕組みをつくる。',
    practice:
      '最低単位、固定したきっかけ、進捗記録を用意し、迷わず再開できる場所を決める。',
    caution:
      '連続記録を守ること自体が目的になると、方法の修正や必要な休息を妨げる。',
    close: '継続は途切れないことではなく、途切れても戻れることで決まる。',
  },
  成果を出す人の処世術: {
    body: '忙しさではなく、成果を止めている制約へ資源を集中する。',
    practice:
      '完成条件を明確にし、最も遅い工程を特定して、小さな検証と修正を短く回す。',
    caution:
      '測りやすい数字だけを追うと、本来の成果が指標の達成へ置き換わる。',
    close: '成果は努力の総量より、どこへ努力を置いたかで変わる。',
  },
  人生を充実させる人の処世術: {
    body: '成功一つへ人生を賭けず、複数の関係・役割・経験で豊かさを支える。',
    practice:
      '自分が深く関われるものを選び、成果だけでなく日常の手応えと関係の質を育てる。',
    caution:
      '効率だけで選択すると、遠回りから生まれる物語や偶然の余地が消える。',
    close: '充実は大成功の強さより、人生を支える土台の多さから生まれる。',
  },
  人生設計がうまい人の処世術: {
    body: '未来を当てるより、外れても立て直せる選択肢と余白を持つ。',
    practice:
      '小さく試し、依存先を分散し、撤退可能性と将来の選択権を残して進む。',
    caution:
      '安全だけを求めると、成長や偶然の機会まで閉じてしまう。',
    close: '良い人生設計は正解を固定することではなく、変化しても選び直せることである。',
  },
  不安に強い人の処世術: {
    body: '不安を消してから動くのではなく、不安があっても選べる状態をつくる。',
    practice:
      '変えられる問題には一手を打ち、答えの出ない不確実さには小さく触れて慣れていく。',
    caution:
      '確認や回避で安心を買い続けると、不安がある状態では動けないという学習が強まる。',
    close: '不安への強さは、恐れないことではなく恐れたまま生活を守れることである。',
  },
  挫折した人の処世術: {
    body: '一度の結果を人格や人生全体の判決にせず、生活と選択肢を再建する。',
    practice:
      '失ったもの、残った資源、変えられる条件を分け、日常のリズムから次の準備を始める。',
    caution:
      '苦しみに成長や意味を急いで求めると、回復の遅さまで新しい失敗にしてしまう。',
    close: '挫折は人生の結論ではなく、次の組み立て方を変える地点である。',
  },
  運がいい人の処世術: {
    body: '偶然を待つだけでなく、機会が入る経路と拾える準備を増やす。',
    practice:
      '人、場所、分野をまたぎ、目標を伝え、小さな機会へすぐ反応して次の接点をつくる。',
    caution:
      '偶然だけを信じて基礎や継続を軽視すると、来た機会を結果へ変えられない。',
    close: '運は偶然そのものより、偶然が落ちる場所と拾った後の行動で育つ。',
  },
};

const defaultEvidence = {
  '対人術/関係の構築': ['kb_011', 'kb_013', 'kb_047'],
  '対人術/関係の管理': ['kb_050', 'kb_051', 'kb_092'],
  '対人術/集団での立ち回り': ['kb_074', 'kb_081', 'kb_088'],
  '仕事術/評価の獲得': ['kb_107', 'kb_113', 'kb_116'],
  '仕事術/交渉・合意の戦術': ['kb_142', 'kb_145', 'kb_147'],
  '仕事術/目標達成': ['kb_172', 'kb_181', 'kb_185'],
  '人生術/人生の指針': ['kb_278', 'kb_279', 'kb_280'],
  '人生術/不安の解消': ['kb_203', 'kb_221', 'kb_228'],
  '人生術/人生のつまずき': ['kb_240', 'kb_243', 'kb_264'],
};

const keywordEvidence = [
  [/名前/, ['kb_016', 'kb_017']],
  [/第一印象|印象/, ['kb_001', 'kb_003']],
  [/共通点|似た/, ['kb_005']],
  [/自己開示/, ['kb_008', 'kb_009']],
  [/沈黙/, ['kb_037', 'kb_050']],
  [/信用|信頼/, ['kb_088', 'kb_113']],
  [/約束|一貫/, ['kb_047', 'kb_163']],
  [/境界|断る|拒否/, ['kb_050', 'kb_051', 'kb_092']],
  [/面子/, ['kb_055', 'kb_159']],
  [/譲歩/, ['kb_047', 'kb_159']],
  [/集団|仲間|居場所/, ['kb_058', 'kb_081', 'kb_085']],
  [/少数派|異論/, ['kb_069', 'kb_089']],
  [/成果|評価|実績/, ['kb_107', 'kb_113', 'kb_116']],
  [/権力|依存/, ['kb_079', 'kb_080']],
  [/交渉|代替案|条件/, ['kb_142', 'kb_144', 'kb_147']],
  [/合意|利害|利益/, ['kb_145', 'kb_149', 'kb_155']],
  [/始め|着手|一歩/, ['kb_172', 'kb_181', 'kb_202']],
  [/続け|継続|習慣/, ['kb_180', 'kb_185', 'kb_186']],
  [/期限|締切/, ['kb_190', 'kb_192']],
  [/選択肢|将来|人生設計/, ['kb_278', 'kb_279', 'kb_287']],
  [/分散|一つ.*依存/, ['kb_280', 'kb_281', 'kb_282']],
  [/不安|確認|恐怖/, ['kb_203', 'kb_207', 'kb_221']],
  [/挫折|失敗|敗れ|再挑戦/, ['kb_240', 'kb_241', 'kb_262']],
  [/運|偶然|機会/, ['kb_279', 'kb_287', 'kb_290']],
];

const theoryLabelAliases = new Map([
  ['作業興奮', ['kb_202']],
  ['スモールステップ', ['kb_186']],
  ['環境デザイン', ['kb_178', 'kb_181']],
]);

function normalize(value) {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('ja-JP')
    .replace(/\*\*/g, '')
    .replace(/[\s"'「」『』（）()・,，、。.:：;；!?！？／/＝=—―\-]/g, '');
}

function sentence(value) {
  return /[。！？]$/.test(value) ? value : `${value}。`;
}

function parseSource(markdown) {
  let category = '';
  let section = '';
  let group = '';
  let lastCard;
  let collectingExplanation = false;
  const cards = [];

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      if (
        collectingExplanation &&
        lastCard?.explanationLines.length &&
        lastCard.explanationLines.at(-1) !== ''
      ) {
        lastCard.explanationLines.push('');
      }
      continue;
    }

    if (/^# [^#]/.test(line)) {
      collectingExplanation = false;
      const value = line.slice(2).trim();
      if (categoryOrder.has(value)) category = value;
      continue;
    }
    if (/^## [^#]/.test(line)) {
      collectingExplanation = false;
      section = line.slice(3).trim();
      continue;
    }
    if (/^### /.test(line)) {
      collectingExplanation = false;
      group = line.slice(4).trim();
      continue;
    }

    const item = line.match(/^(\d+)[.．]\s*(.+)$/u);
    if (item) {
      collectingExplanation = false;
      let title = item[2].trim();
      let inlineTheory = '';
      const inlineMatch = title.match(
        /\s+(?:[-*]\s*)?理論カード[：:]\s*(.+)$/u,
      );
      if (inlineMatch) {
        inlineTheory = inlineMatch[1].trim();
        title = title.slice(0, inlineMatch.index).trim();
      }
      if (!title) continue;
      lastCard = {
        category,
        section,
        group,
        title,
        subtitle: '',
        explanationLines: [],
        theoryLabels: inlineTheory ? [inlineTheory] : [],
        sourceGroups: [group],
      };
      cards.push(lastCard);
      continue;
    }

    const subtitleMatch = line.match(
      /^(?:[-*]\s*)?サブタイトル[：:]\s*(.+)$/u,
    );
    if (subtitleMatch && lastCard) {
      collectingExplanation = false;
      lastCard.subtitle = subtitleMatch[1].trim();
      continue;
    }

    const theoryMatch = line.match(
      /^(?:[-*]\s*)?理論カード[：:]\s*(.+)$/u,
    );
    if (theoryMatch && lastCard) {
      collectingExplanation = false;
      lastCard.theoryLabels.push(theoryMatch[1].trim());
      continue;
    }

    if (/^(?:[-*]\s*)?explanation[：:]\s*$/iu.test(line) && lastCard) {
      collectingExplanation = true;
      continue;
    }

    if (collectingExplanation && lastCard) {
      lastCard.explanationLines.push(line);
    }
  }

  const unique = new Map();
  for (const card of cards) {
    const key = normalize(card.title);
    const existing = unique.get(key);
    if (existing) {
      existing.theoryLabels.push(...card.theoryLabels);
      existing.sourceGroups.push(...card.sourceGroups);
      if (!existing.subtitle && card.subtitle) existing.subtitle = card.subtitle;
      if (
        existing.explanationLines.length === 0 &&
        card.explanationLines.length
      ) {
        existing.explanationLines = card.explanationLines;
      }
    } else {
      unique.set(key, card);
    }
  }
  return [...unique.values()].map((card) => ({
    ...card,
    explanation: card.explanationLines
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  }));
}

function resolveExplicitEvidence(labels, theoriesByLength) {
  const haystack = normalize(labels.join('／'));
  if (!haystack) return [];
  const directMatches = theoriesByLength
    .filter(({ normalizedTitle }) => normalizedTitle.length >= 4)
    .filter(({ normalizedTitle }) => haystack.includes(normalizedTitle))
    .map(({ record }) => record.id);
  const aliasMatches = [...theoryLabelAliases.entries()]
    .filter(([label]) => haystack.includes(normalize(label)))
    .flatMap(([, ids]) => ids);
  return [...new Set([...directMatches, ...aliasMatches])];
}

function createExplanation(title, guidance) {
  return [
    `${sentence(title)}この原則は、${guidance.body}`,
    `実践では、${guidance.practice}`,
    `ただし、${guidance.caution}`,
    `**${guidance.close}**`,
  ].join('\n\n');
}

const sourceReadPath = EXTERNAL_SOURCE_PATH ?? SOURCE_PATH;
const theoryReadPath = EXTERNAL_THEORY_PATH ?? THEORY_PATH;
const [markdown, theoryDataset] = await Promise.all([
  readFile(sourceReadPath, 'utf8'),
  readFile(theoryReadPath, 'utf8').then(JSON.parse),
]);
const normalizedMarkdown = `${markdown
  .replace(/\r\n/g, '\n')
  .replace(/[ \t]+$/gm, '')
  .trim()}\n`;

if (EXTERNAL_SOURCE_PATH || EXTERNAL_THEORY_PATH) {
  await Promise.all([
    EXTERNAL_SOURCE_PATH
      ? writeFile(SOURCE_PATH, normalizedMarkdown, 'utf8')
      : Promise.resolve(),
    EXTERNAL_THEORY_PATH
      ? writeFile(THEORY_PATH, `${JSON.stringify(theoryDataset, null, 2)}\n`, 'utf8')
      : Promise.resolve(),
  ]);
}

const theoryRecords = (
  Array.isArray(theoryDataset) ? theoryDataset : theoryDataset.records
).map((record) => ({
  id: record.tagId ?? record.id,
  title: record.title,
  category_title: record.categoryTitle ?? record.source_type,
}));

const theoriesById = new Map(
  theoryRecords.map((record) => [record.id, record]),
);
const theoriesByLength = theoryRecords
  .map((record) => ({
    record,
    normalizedTitle: normalize(record.title),
  }))
  .sort((a, b) => b.normalizedTitle.length - a.normalizedTitle.length);

const parsedCards = parseSource(normalizedMarkdown);
const displayCountBySubcategory = new Map();

const cards = parsedCards.map((sourceCard, index) => {
  const subcategory = subcategoryAliases.get(
    `${sourceCard.category}/${sourceCard.section}`,
  );
  if (!subcategory) {
    throw new Error(
      `Unmapped section: ${sourceCard.category}/${sourceCard.section}`,
    );
  }
  const group = sourceCard.group;
  const guidance = groupGuidance[group];
  if (!guidance) throw new Error(`Missing guidance for group: ${group}`);

  const key = `${sourceCard.category}/${subcategory}`;
  const withinSubcategory = (displayCountBySubcategory.get(key) ?? 0) + 1;
  displayCountBySubcategory.set(key, withinSubcategory);

  const explicitEvidence = resolveExplicitEvidence(
    sourceCard.theoryLabels,
    theoriesByLength,
  );
  const titleEvidence = theoriesByLength
    .filter(({ normalizedTitle }) => normalizedTitle.length >= 5)
    .filter(({ normalizedTitle }) =>
      normalize(sourceCard.title).includes(normalizedTitle),
    )
    .map(({ record }) => record.id);
  const heuristicEvidence = keywordEvidence
    .filter(([pattern]) => pattern.test(sourceCard.title))
    .flatMap(([, ids]) => ids);
  const evidenceIds = [
    ...new Set([
      ...explicitEvidence,
      ...titleEvidence,
      ...heuristicEvidence,
      ...(defaultEvidence[key] ?? []),
    ]),
  ]
    .filter((id) => theoriesById.has(id))
    .slice(0, 4);

  const sourceGroups = [...new Set(sourceCard.sourceGroups)];
  const tags = [
    ...sourceGroups.map((value) => value.replace(/の処世術$/, '')),
    subcategory,
  ];

  return {
    id: `secret_${String(index + 1).padStart(3, '0')}`,
    category: sourceCard.category,
    subcategory,
    title: sourceCard.title,
    body: sourceCard.subtitle || guidance.body,
    evidence_ids: evidenceIds,
    tags: [...new Set(tags)].slice(0, 6),
    status: 'draft',
    display_order: withinSubcategory,
    category_order: categoryOrder.get(sourceCard.category),
    subcategory_order: subcategoryOrder.get(key),
    evidence_category_titles: [
      ...new Set(
        evidenceIds
          .map((id) => theoriesById.get(id)?.category_title)
          .filter(Boolean),
      ),
    ],
    explanation:
      sourceCard.explanation || createExplanation(sourceCard.title, guidance),
    explanation_structure: [
      '心理・構造',
      '具体的な適用',
      '誤用への注意',
      '示唆的な結論',
    ],
  };
});

const dataset = {
  schema_version: '2.0.0',
  dataset_name: '処世術禄 裏秘伝書・したたかさ強化版',
  card_count: cards.length,
  design: {
    display_policy: '善意を否定せず、善意だけには依存しない',
    frontend_fields: [
      'title',
      'body',
      'explanation',
      'category',
      'subcategory',
    ],
    backend_link: 'evidence_ids で理論データを参照',
    note: '原稿の中分類はタグとして保持し、アプリの9分類へ統合する',
    explanation_policy:
      '構造、具体的な運用、誤用への注意、示唆的な結論の4段構成',
  },
  categories: [
    {
      name: '対人術',
      subcategories: ['関係の構築', '関係の管理', '集団での立ち回り'],
    },
    {
      name: '仕事術',
      subcategories: ['評価の獲得', '交渉・合意の戦術', '目標達成'],
    },
    {
      name: '人生術',
      subcategories: ['人生の指針', '不安の解消', '人生のつまずき'],
    },
  ],
  cards,
  explanation_count: cards.length,
};

await writeFile(OUTPUT_PATH, `${JSON.stringify(dataset, null, 2)}\n`, 'utf8');

const unresolvedLabels = [
  ...new Set(
    parsedCards
      .flatMap((card) => card.theoryLabels)
      .filter(
        (label) =>
          resolveExplicitEvidence([label], theoriesByLength).length === 0,
      ),
  ),
];

console.log(
  JSON.stringify(
    {
      sourceItems: parsedCards.length,
      outputCards: cards.length,
      duplicateTitlesMerged: 0,
      unresolvedTheoryLabels: unresolvedLabels,
    },
    null,
    2,
  ),
);
