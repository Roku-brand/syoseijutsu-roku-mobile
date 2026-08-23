export type GuidedTopic = {
  slug: string;
  label: string;
  mark: string;
  group: '対人術' | '仕事術' | '人生術';
  description: string;
  tag: string;
};

export const guidedTopics: GuidedTopic[] = [
  {
    slug: 'good-impression',
    label: '印象がいい人',
    mark: '印',
    group: '対人術',
    description: '第一印象、親しみやすさ、感じのよさを整える処世術。',
    tag: '印象がいい人',
  },
  {
    slug: 'good-conversation',
    label: '会話がうまい人',
    mark: '話',
    group: '対人術',
    description: '会話を始め、深め、心地よく終えるための処世術。',
    tag: '会話がうまい人',
  },
  {
    slug: 'build-trust',
    label: '信用を積む人',
    mark: '信',
    group: '対人術',
    description: '小さな行動から、長く残る信用を築く処世術。',
    tag: '信用を積む人',
  },
  {
    slug: 'maintain-relationships',
    label: '関係を維持できる人',
    mark: '維',
    group: '対人術',
    description: '近づきすぎず離れすぎず、関係を守る処世術。',
    tag: '関係を維持できる人',
  },
  {
    slug: 'avoid-exhaustion',
    label: '消耗しない人',
    mark: '守',
    group: '対人術',
    description: '境界線を保ち、不要な摩耗を避ける処世術。',
    tag: '消耗しない人',
  },
  {
    slug: 'read-people',
    label: '人を見極める人',
    mark: '見',
    group: '対人術',
    description: '言葉だけでなく、行動と利害から相手を見る処世術。',
    tag: '人を見極める人',
  },
  {
    slug: 'navigate-groups',
    label: '集団でうまく立ち回る人',
    mark: '集',
    group: '対人術',
    description: '場の空気、立場、役割を読みながら動く処世術。',
    tag: '集団でうまく立ち回る人',
  },
  {
    slug: 'command-respect',
    label: '舐められない人',
    mark: '盾',
    group: '対人術',
    description: '攻撃的にならず、軽く扱われないための処世術。',
    tag: '舐められない人',
  },
  {
    slug: 'move-groups',
    label: '集団を動かす人',
    mark: '動',
    group: '対人術',
    description: '目的・役割・意思決定を整え、チームを前へ進めるリーダーシップ。',
    tag: '集団を動かす人',
  },
  {
    slug: 'work-well',
    label: '仕事ができる人',
    mark: '仕',
    group: '仕事術',
    description: '成果、段取り、信頼を仕事の評価へつなぐ処世術。',
    tag: '仕事ができる人',
  },
  {
    slug: 'advance-career',
    label: '出世する人',
    mark: '昇',
    group: '仕事術',
    description: '実力を機会と役割へ変えるための処世術。',
    tag: '出世する人',
  },
  {
    slug: 'negotiate-well',
    label: '交渉がうまい人',
    mark: '交',
    group: '仕事術',
    description: '条件、代替案、相手の利害を読んで交渉する処世術。',
    tag: '交渉がうまい人',
  },
  {
    slug: 'build-consensus',
    label: '合意形成がうまい人',
    mark: '合',
    group: '仕事術',
    description: '対立をほどき、納得できる着地点をつくる処世術。',
    tag: '合意形成がうまい人',
  },
  {
    slug: 'get-started',
    label: '始められる人',
    mark: '始',
    group: '仕事術',
    description: '迷いや準備過多を越えて、最初の一歩を出す処世術。',
    tag: '始められる人',
  },
  {
    slug: 'keep-going',
    label: '続けられる人',
    mark: '続',
    group: '仕事術',
    description: '意志だけに頼らず、行動を続けるための処世術。',
    tag: '続けられる人',
  },
  {
    slug: 'produce-results',
    label: '成果を出す人',
    mark: '果',
    group: '仕事術',
    description: '努力を分散させず、結果へ結びつける処世術。',
    tag: '成果を出す人',
  },
  {
    slug: 'fulfill-life',
    label: '人生を充実させる人',
    mark: '充',
    group: '人生術',
    description: '日々の選択から、納得できる人生をつくる処世術。',
    tag: '人生を充実させる人',
  },
  {
    slug: 'design-life',
    label: '人生設計がうまい人',
    mark: '路',
    group: '人生術',
    description: '長い時間軸で、進路と選択肢を整える処世術。',
    tag: '人生設計がうまい人',
  },
  {
    slug: 'handle-anxiety',
    label: '不安に強い人',
    mark: '心',
    group: '人生術',
    description: '不確実さを抱えたまま、必要な行動を選ぶ処世術。',
    tag: '不安に強い人',
  },
  {
    slug: 'recover-from-setbacks',
    label: '挫折した人',
    mark: '再',
    group: '人生術',
    description: 'つまずきを最終判決にせず、次へつなぐ処世術。',
    tag: '挫折した人',
  },
  {
    slug: 'make-luck',
    label: '運がいい人',
    mark: '運',
    group: '人生術',
    description: '偶然を拾える位置に身を置き、機会へ変える処世術。',
    tag: '運がいい人',
  },
];

export const guidedTopicGroups = (['対人術', '仕事術', '人生術'] as const).map(
  (title) => ({
    title,
    topics: guidedTopics.filter((topic) => topic.group === title),
  }),
);

export const guidedTopicBySlug = new Map(
  guidedTopics.map((topic) => [topic.slug, topic]),
);
