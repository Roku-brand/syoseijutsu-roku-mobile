import type { CategoryKey, TechniqueCard } from './types';

export type SearchGoal = {
  id: string;
  label: string;
  description: string;
  keywords: string[];
};

const sharedGoals: SearchGoal[] = [
  {
    id: 'protect',
    label: '自分を守りたい',
    description: '損失や消耗を増やさない',
    keywords: ['守', '避け', '距離', '断', '撤退', '境界', 'リスク', '防'],
  },
  {
    id: 'improve',
    label: '状況を改善したい',
    description: '今より少し良い状態へ動かす',
    keywords: ['改善', '高め', '増や', '得る', '築', '回復', '整え', '安定'],
  },
  {
    id: 'decide',
    label: '冷静に判断したい',
    description: '迷いを整理して選ぶ',
    keywords: ['判断', '選択', '決め', '見極め', '優先', '比較', '基準'],
  },
  {
    id: 'communicate',
    label: 'うまく伝えたい',
    description: '摩擦を抑えて意思を届ける',
    keywords: ['伝え', '話', '説明', '質問', '聞', '交渉', '会話', '報告'],
  },
  {
    id: 'act',
    label: '行動に移したい',
    description: '小さく始め、前へ進む',
    keywords: ['始め', '行動', '着手', '続け', '実行', '試', '習慣'],
  },
  {
    id: 'reset',
    label: '気持ちを切り替えたい',
    description: '感情の波から一歩離れる',
    keywords: ['感情', '不安', '疲', '回復', '後悔', '焦', '休', '切り替え'],
  },
];

const goalOrder: Record<CategoryKey, string[]> = {
  interpersonal: ['improve', 'communicate', 'protect', 'decide', 'reset'],
  work: ['improve', 'communicate', 'decide', 'protect', 'act'],
  life: ['decide', 'reset', 'protect', 'act', 'improve'],
};

export function goalsForCategory(category: CategoryKey) {
  return goalOrder[category]
    .map((id) => sharedGoals.find((goal) => goal.id === id))
    .filter((goal): goal is SearchGoal => Boolean(goal));
}

export function rankByGoal(cards: TechniqueCard[], goalId: string) {
  const goal = sharedGoals.find((candidate) => candidate.id === goalId);
  if (!goal) return cards;

  return [...cards]
    .map((card, index) => {
      const text = `${card.title} ${card.subtitle ?? ''} ${card.subcategory}`;
      const matches = goal.keywords.filter((keyword) => text.includes(keyword)).length;
      return { card, score: matches * 10 - index / 1000 };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ card }) => card);
}

export const practiceGuidance: Record<
  CategoryKey,
  { actions: string[]; cautions: string[] }
> = {
  interpersonal: {
    actions: [
      '相手との関係と力関係を一度、言葉にする',
      '一度に変えず、小さな反応を見ながら試す',
      '短期の勝ちより、今後の関係に残るものを見る',
    ],
    cautions: [
      '操作ではなく、互いの尊厳を守るために使う',
      '危険や継続的な侵害がある場合は、対話より安全確保を優先する',
    ],
  },
  work: {
    actions: [
      '目的・期限・完了条件を先に揃える',
      '事実と解釈を分けて伝える',
      '次に取る一手を小さく具体化する',
    ],
    cautions: [
      '社内ルールや契約、法令に反する使い方はしない',
      '成果だけでなく、再現性と周囲への影響も確認する',
    ],
  },
  life: {
    actions: [
      '何を得るかと同時に、何を失うかも書き出す',
      '一年後の自分が納得できる基準を一つ決める',
      '取り返しのつく選択は、小さく試してから決める',
    ],
    cautions: [
      '大きな金銭・法律・医療判断は専門家の確認も取る',
      '他人の正解を、自分の価値観へそのまま移植しない',
    ],
  },
};
